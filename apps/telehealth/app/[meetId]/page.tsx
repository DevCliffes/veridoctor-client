"use client";
export const dynamic = "force-dynamic";
import { useParams, useSearchParams } from "next/navigation";
import socketService from "@/utils/socketService";
import webRTCService from "@/utils/webRTCService";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import {
  Video,
  VideoOff,
  PhoneOff,
  MicIcon,
  MicOffIcon,
} from "@veridoctor/design/icons";
import { toast } from "sonner";
import { useAppDispatch, UseAppSelector } from "@/states/store/hooks";
import { setHasJoined, setIsOfferer, setOffer } from "@/states/features/webrtc";

interface DocumentWithPiP extends Document {
  pictureInPictureEnabled: boolean;
}

interface NavigatorWithWakeLock extends Navigator {
  wakeLock: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
}

// How long a "disconnected" connectionState is allowed to persist before we
// treat it as a real failure and trigger a full reconnect. "disconnected" is
// frequently transient (brief packet loss, a momentary network path change,
// short-lived NAT/ICE hiccup) and often self-recovers back to "connected"
// within a couple of seconds without any action needed. Reconnecting
// immediately on every "disconnected" event was tearing down and rebuilding
// the peer connection far more often than necessary, which is what produced
// the repeated offer/answer/ICE-candidate replay cycles (and the buffering/
// disconnection this was meant to fix) visible in the signaling server logs.
const DISCONNECT_GRACE_PERIOD_MS = 4000;

function TelehealthInner() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const initLocalVideoRef = useRef<HTMLVideoElement>(null);
  const userId = searchParams.get("userId");
  const isOffererParam = searchParams.get("isOfferer") === "true";
  const { meetId } = useParams<{ meetId: string }>();
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const { hasJoined, offer } = UseAppSelector((state) => state.webrtc);
  const [localMediaAvailable, setLocalMediaAvailable] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isPiP, setIsPiP] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);

  // ── End-call confirmation modal ───────────────────────────────────────────
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  // Flag so popstate guard knows the user intentionally confirmed exit
  const isEndingRef = useRef(false);

  // ── Reconnection state ────────────────────────────────────────────────────
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectingRef = useRef(false);
  const reconnectRef = useRef<(() => Promise<void>) | undefined>(undefined);
  // Holds the pending "disconnected -> reconnect" timer so it can be
  // cancelled if the connection recovers on its own within the grace period.
  const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const TELEHEALTH_BACKEND_URL =
    process.env.NEXT_PUBLIC_TELEHEALTH_BACKEND_URL || "http://localhost:4000";

  const localVideoCallbackRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node && localStreamRef.current) {
        node.srcObject = localStreamRef.current;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasJoined]
  );

  useEffect(() => {
    setPipSupported(
      typeof document !== "undefined" &&
        "pictureInPictureEnabled" in document &&
        (document as DocumentWithPiP).pictureInPictureEnabled === true
    );
  }, []);

  useEffect(() => {
    if (!hasJoined) return;
    window.history.pushState({ callActive: true }, "");
    const handlePopState = () => {
      // If user confirmed end-call via our modal, allow navigation
      if (isEndingRef.current) return;
      // Otherwise intercept and show our modal instead
      window.history.pushState({ callActive: true }, "");
      setShowEndCallModal(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasJoined]);

  useEffect(() => {
    if (!hasJoined) return;
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (
            navigator as NavigatorWithWakeLock
          ).wakeLock.request("screen");
        }
      } catch {}
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLock?.release().catch(() => {});
    };
  }, [hasJoined]);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;
    const onEnter = () => setIsPiP(true);
    const onLeave = () => setIsPiP(false);
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [remoteConnected]);

  useEffect(() => {
    let context: AudioContext;
    const initAudio = async () => {
      context = new window.AudioContext();
      setAudioContext(context);
      try {
        const response = await fetch("/sounds/notification.mp3");
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(arrayBuffer);
        setAudioBuffer(buffer);
      } catch (error) {
        console.error("Error loading audio:", error);
      }
    };
    initAudio();
    return () => {
      context?.close();
    };
  }, []);

  useEffect(() => {
    webRTCService.setOffererType(isOffererParam);
    dispatch(setIsOfferer(isOffererParam));
    webRTCService.initilaizeMedia().then((stream) => {
      if (stream && initLocalVideoRef.current) {
        initLocalVideoRef.current.srcObject = stream;
        initLocalVideoRef.current.muted = true;
      }
      localStreamRef.current = stream;
      setLocalMediaAvailable(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      setRemoteConnected(true);
    }
  }, [remoteStream, hasJoined]);

  useEffect(() => {
    if (!isOffererParam) {
      socketService.on(
        "availableOffer",
        (incomingOffer: RTCSessionDescriptionInit) => {
          dispatch(setOffer(incomingOffer));
          webRTCService.setOffererType(false);
        }
      );
    }
    socketService.connect(TELEHEALTH_BACKEND_URL, {
      userName: userId,
      roomName: meetId,
    });
    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupPeerConnection = async () => {
    const pc = await webRTCService.createPeerConnection();

    pc.addEventListener("icecandidate", (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socketService.emit("icecandidate", {
          candidate: event.candidate,
          roomId: meetId,
          isOfferer: isOffererParam,
        });
      }
    });

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.addEventListener("track", (event: RTCTrackEvent) => {
      const [remoteStr] = event.streams;
      setRemoteStream(remoteStr);
    });

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") {
        toast.success("Call connected");
        setIsReconnecting(false);
        reconnectingRef.current = false;
        // Connection recovered (or was never lost) — cancel any pending
        // grace-period reconnect so it doesn't fire after the fact.
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
      }

      if (pc.connectionState === "failed") {
        // "failed" is unambiguous — ICE has given up, reconnect immediately.
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
        reconnectRef.current?.();
      }

      if (pc.connectionState === "disconnected") {
        // FIX: don't reconnect immediately on "disconnected" — it's often
        // transient and self-recovers. Wait a grace period; only reconnect
        // if the state is still disconnected/failed once it elapses, and
        // bail out entirely if the connection has since recovered.
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
        }
        disconnectTimeoutRef.current = setTimeout(() => {
          disconnectTimeoutRef.current = null;
          if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed"
          ) {
            reconnectRef.current?.();
          }
        }, DISCONNECT_GRACE_PERIOD_MS);
      }
    });

    socketService.on("receiveIceCandidate", (candidate: RTCIceCandidate) => {
      webRTCService.addIceCandidate(candidate).catch(console.error);
    });

    socketService.emit("requestIceCandidates", { isOfferer: isOffererParam });

    socketService.on("peerLeft", () => {
      reconnectRef.current?.();
    });

    return pc;
  };

  const reconnect = useCallback(async () => {
    if (reconnectingRef.current) return;
    reconnectingRef.current = true;

    setRemoteConnected(false);
    setRemoteStream(null);
    setIsReconnecting(true);

    toast.error("Participant disconnected — waiting for them to rejoin...");

    webRTCService.peerConnection?.close();

    if (isOffererParam) {
      try {
        await setupPeerConnection();
        socketService.on(
          "remoteAnswer",
          (answer: RTCSessionDescriptionInit) => {
            webRTCService.handleRemoteAnswer(answer).catch(console.error);
          }
        );
        const newOffer = await webRTCService.createOffer();
        socketService.emit("newOffer", newOffer);
      } catch (err) {
        console.error("[reconnect] offerer re-init failed:", err);
        reconnectingRef.current = false;
      }
    } else {
      reconnectingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffererParam]);

  useEffect(() => {
    reconnectRef.current = reconnect;
  }, [reconnect]);

  // Clear any pending grace-period timer on unmount so it can't fire after
  // the component (or the whole call) has already gone away.
  useEffect(() => {
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!hasJoined || !isReconnecting || isOffererParam || !offer) return;

    const rejoinAsAnswerer = async () => {
      try {
        await setupPeerConnection();
        const answer = await webRTCService.createAnswer(offer);
        socketService.emit("newAnswer", answer);
      } catch (err) {
        console.error("[reconnect] answerer rejoin failed:", err);
      }
    };

    rejoinAsAnswerer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer, hasJoined, isReconnecting, isOffererParam]);

  const joinMeeting = async (incomingOffer?: RTCSessionDescriptionInit) => {
    if (isOffererParam) {
      await setupPeerConnection();
      socketService.on("remoteAnswer", (answer: RTCSessionDescriptionInit) => {
        webRTCService.handleRemoteAnswer(answer).catch(console.error);
      });
      const newOffer = await webRTCService.createOffer();
      socketService.emit("newOffer", newOffer);
    } else {
      if (!incomingOffer) {
        toast.error("No offer available yet — please wait for the provider.");
        return;
      }
      await setupPeerConnection();
      const answer = await webRTCService.createAnswer(incomingOffer);
      socketService.emit("newAnswer", answer);
    }
    dispatch(setHasJoined(true));
  };

  const playNotificationAudio = () => {
    if (audioBuffer && audioContext) {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    }
  };

  const toggleAudio = () => {
    if (webRTCService.localStream) {
      const audioTracks = webRTCService.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = audioMuted;
      });
      setAudioMuted(!audioMuted);
      playNotificationAudio();
      toast.success(`Microphone ${audioMuted ? "on" : "off"}`);
    }
  };

  const toggleVideo = () => {
    if (webRTCService.localStream) {
      const videoTracks = webRTCService.localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = videoOff;
      });
      setVideoOff(!videoOff);
      playNotificationAudio();
      toast.success(`Camera ${videoOff ? "on" : "off"}`);
    }
  };

  const togglePiP = async () => {
    const video = remoteVideoRef.current;
    if (!video || !remoteConnected) {
      toast.error("No remote video to float yet.");
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      toast.error("Picture-in-Picture is not supported on this device.");
      console.error("PiP error:", err);
    }
  };

  // ── End-call flow ─────────────────────────────────────────────────────────
  // Step 1: user clicks "End call" → show confirmation modal (no teardown yet)
  const requestEndCall = () => {
    setShowEndCallModal(true);
  };

  // Step 2a: user confirms → tear down and navigate back
  const confirmEndCall = () => {
    isEndingRef.current = true;
    setShowEndCallModal(false);
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
    webRTCService.peerConnection?.close();
    socketService.disconnect();
    window.history.back();
  };

  // Step 2b: user cancels → just close the modal, call continues
  const cancelEndCall = () => {
    setShowEndCallModal(false);
  };

  // ─── PRE-CALL LOBBY ───────────────────────────────────────────────────────
  if (!hasJoined) {
    return (
      <div className="relative min-h-screen bg-gray-900 overflow-hidden">
        <video
          ref={initLocalVideoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          autoPlay
          playsInline
        />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />

        {!localMediaAvailable && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm bg-gray-900/80">
            Accessing camera...
          </div>
        )}

        <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3">
          <p className="text-white text-base font-medium drop-shadow">
            {isOffererParam ? "Ready to start your call?" : "Waiting to join..."}
          </p>

          {isOffererParam ? (
            localMediaAvailable ? (
              <button
                onClick={() => joinMeeting()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-full text-white font-medium transition-colors shadow-lg"
              >
                <Video size={18} /> Start Call
              </button>
            ) : null
          ) : offer ? (
            <button
              onClick={() => joinMeeting(offer)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-8 py-3 rounded-full text-white font-medium transition-colors shadow-lg"
            >
              <Video size={18} /> Join Call
            </button>
          ) : (
            <p className="text-gray-300 text-sm">
              Waiting for the provider to start the call...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── ACTIVE CALL ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* Main video area */}
      <div className="relative flex-1 bg-gray-800 overflow-hidden">

        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />

        {!remoteConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 bg-gray-800">
            {isReconnecting ? (
              <>
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-300 font-medium">
                  Participant disconnected
                </p>
                <p className="text-xs text-gray-500">
                  Waiting for them to rejoin...
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-500">
                  ?
                </div>
                <p className="text-sm">Waiting for the other participant...</p>
              </>
            )}
          </div>
        )}

        {/* Local self-view PIP */}
        <div className="absolute bottom-4 right-4 rounded-xl overflow-hidden shadow-lg border border-gray-700 w-[220px] h-[160px] bg-gray-900">
          {videoOff ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 text-xs">
              Camera off
            </div>
          ) : (
            <video
              ref={localVideoCallbackRef}
              className="w-full h-full object-cover scale-x-[-1]"
              autoPlay
              playsInline
              muted
            />
          )}
        </div>

        {isPiP && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
            Call running in floating window
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex-shrink-0 h-20 bg-gray-900 flex items-center justify-center gap-6 px-6 border-t border-gray-800">

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={toggleAudio}
            className={
              "p-3 rounded-full transition-colors " +
              (audioMuted
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-white")
            }
          >
            {audioMuted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
          </button>
          <span className="text-gray-400 text-xs">
            {audioMuted ? "Unmute" : "Mute"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={toggleVideo}
            className={
              "p-3 rounded-full transition-colors " +
              (videoOff
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-white")
            }
          >
            {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
          <span className="text-gray-400 text-xs">
            {videoOff ? "Start" : "Stop"}
          </span>
        </div>

        {pipSupported && (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={togglePiP}
              title={isPiP ? "Exit floating window" : "Float call in a window"}
              className={
                "p-3 rounded-full transition-colors " +
                (isPiP
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white")
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <rect x="12" y="11" width="8" height="6" rx="1" />
              </svg>
            </button>
            <span className="text-gray-400 text-xs">
              {isPiP ? "Exit float" : "Float"}
            </span>
          </div>
        )}

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={requestEndCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <PhoneOff size={20} />
          </button>
          <span className="text-gray-400 text-xs">End call</span>
        </div>
      </div>

      {/* ── End-call confirmation modal ──────────────────────────────────── */}
      {showEndCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 mx-6 max-w-sm w-full flex flex-col items-center gap-4 border border-gray-700">
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-red-600/20 flex items-center justify-center">
              <PhoneOff size={28} className="text-red-500" />
            </div>

            <div className="text-center">
              <h2 className="text-white font-semibold text-lg">End this call?</h2>
              <p className="text-gray-400 text-sm mt-1">
                The other participant will be notified. You can rejoin from your appointments.
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={cancelEndCall}
                className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
              >
                Stay
              </button>
              <button
                onClick={confirmEndCall}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              >
                End call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TelehealthVideoPlayer() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TelehealthInner />
    </Suspense>
  );
}
