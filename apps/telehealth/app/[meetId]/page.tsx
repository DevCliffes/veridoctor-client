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
      window.history.pushState({ callActive: true }, "");
      const confirmed = window.confirm(
        "Leaving this page will end your call. Are you sure?"
      );
      if (confirmed) {
        webRTCService.peerConnection?.close();
        socketService.disconnect();
        window.history.go(-2);
      }
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
          wakeLock = await (navigator as NavigatorWithWakeLock).wakeLock.request(
            "screen"
          );
        }
      } catch {
        // not available on this device — silently ignore
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
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
      socketService.on("availableOffer", (incomingOffer: RTCSessionDescriptionInit) => {
        console.log("[telehealth] availableOffer received");
        dispatch(setOffer(incomingOffer));
        webRTCService.setOffererType(false);
      });
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
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    pc.addEventListener("track", (event: RTCTrackEvent) => {
      const [remoteStr] = event.streams;
      setRemoteStream(remoteStr);
    });

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") {
        toast.success("Call connected");
      }
      if (pc.connectionState === "disconnected") {
        toast.error("Disconnected. Reconnecting...");
        setRemoteConnected(false);
      }
    });

    socketService.on("receiveIceCandidate", (candidate: RTCIceCandidate) => {
      webRTCService.addIceCandidate(candidate).catch(console.error);
    });

    socketService.emit("requestIceCandidates", { isOfferer: isOffererParam });

    socketService.on("peerLeft", () => {
      toast.error("The other participant has left the call.");
      setRemoteConnected(false);
    });

    return pc;
  };

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
      audioTracks.forEach((track) => { track.enabled = audioMuted; });
      setAudioMuted(!audioMuted);
      playNotificationAudio();
      toast.success(`Microphone ${audioMuted ? "on" : "off"}`);
    }
  };

  const toggleVideo = () => {
    if (webRTCService.localStream) {
      const videoTracks = webRTCService.localStream.getVideoTracks();
      videoTracks.forEach((track) => { track.enabled = videoOff; });
      setVideoOff(!videoOff);
      playNotificationAudio();
      toast.success(`Camera ${videoOff ? "on" : "off"}`);
    }
  };

  const togglePiP = async () => {
    const video = remoteVideoRef.current;
    // Guard: PiP requires an active remote stream
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

  // FIX: window.close() only works for tabs opened via window.open().
  // Since we navigate here via window.location.href, use history.back() instead.
  const endCall = () => {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
    webRTCService.peerConnection?.close();
    socketService.disconnect();
    window.history.back();
  };

  // ─── PRE-CALL LOBBY ───────────────────────────────────────────────────────
  if (!hasJoined) {
    return (
      <div className="relative min-h-screen bg-gray-900 overflow-hidden">
        {/* Full-screen camera preview */}
        <video
          ref={initLocalVideoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          autoPlay
          playsInline
        />

        {/* Dark gradient overlay at bottom for readability */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Loading indicator when camera not yet ready */}
        {!localMediaAvailable && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm bg-gray-900/80">
            Accessing camera...
          </div>
        )}

        {/* CTA pinned to bottom */}
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

        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />

        {/* Waiting overlay */}
        {!remoteConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 bg-gray-800">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-500">
              ?
            </div>
            <p className="text-sm">Waiting for the other participant...</p>
          </div>
        )}

        {/* Local self-view — larger pip */}
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
            onClick={endCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <PhoneOff size={20} />
          </button>
          <span className="text-gray-400 text-xs">End call</span>
        </div>
      </div>
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
