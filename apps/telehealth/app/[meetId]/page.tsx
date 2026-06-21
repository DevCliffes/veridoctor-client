"use client";
export const dynamic = "force-dynamic";
import { useParams, useSearchParams } from "next/navigation";
import socketService from "@/utils/socketService";
import webRTCService from "@/utils/webRTCService";
import { useEffect, useRef, useState, Suspense } from "react";
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

function TelehealthInner() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const initLocalVideoRef = useRef<HTMLVideoElement>(null);
  const userId = searchParams.get("userId");
  const isOffererParam = searchParams.get("isOfferer") === "true";
  const { meetId } = useParams<{ meetId: string }>();
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const { hasJoined, offer } = UseAppSelector((state) => state.webrtc);
  const [localMediaAvailable, setLocalMediaAvailable] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  const TELEHEALTH_BACKEND_URL =
    process.env.NEXT_PUBLIC_TELEHEALTH_BACKEND_URL || "http://localhost:4000";

  // Initialize notification audio
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

  // Initialize local media
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
      setLocalStream(stream);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach local stream after joining
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, hasJoined]);

  // Attach remote stream when it arrives.
  //
  // BUG FIX #2 (chicken-and-egg ref dependency):
  // The previous fix made this effect depend on [remoteStream, hasJoined]
  // so it re-runs once the active-call view mounts. But the JSX itself had
  // a second, nested version of the same problem one level deeper: the
  // <video ref={remoteVideoRef}> element was only rendered when
  // `remoteConnected` was true — and `remoteConnected` was only ever set to
  // true INSIDE this very effect, gated on `remoteVideoRef.current` already
  // being non-null. Since the <video> tag didn't exist in the DOM until
  // remoteConnected was already true, remoteVideoRef.current could never
  // become non-null in the first place — a circular dependency that no
  // amount of re-running the effect could break out of.
  //
  // WebRTC itself was fully connected the whole time (confirmed via
  // webrtc-internals on both sides — real inbound-rtp/outbound-rtp with
  // live codecs, stable "connected"/"completed" ICE state) but the ref
  // attaching the stream to the actual <video> element never had anywhere
  // to attach to.
  //
  // Fixed in the JSX below: the remote <video> element is now ALWAYS
  // rendered once hasJoined is true (not conditionally on remoteConnected),
  // so remoteVideoRef.current is reliably available the moment this effect
  // runs. remoteConnected is now used only to control the "Waiting for
  // other participant..." overlay shown ON TOP of the video, not whether
  // the video element exists at all.
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      setRemoteConnected(true);
    }
  }, [remoteStream, hasJoined]);

  // Connect to signaling server
  useEffect(() => {
    // Register the availableOffer listener BEFORE connecting, so the
    // immediate replay from the server (if an offer already exists) isn't missed.
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

    // Register the listener for incoming candidates...
    socketService.on("receiveIceCandidate", (candidate: RTCIceCandidate) => {
      webRTCService.addIceCandidate(candidate).catch(console.error);
    });

    // ...then immediately ask the server for any candidates from the OTHER
    // peer that were already buffered before this listener existed.
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

  const endCall = () => {
    webRTCService.peerConnection?.close();
    socketService.disconnect();
    window.close();
  };

  // ─── PRE-CALL LOBBY ───────────────────────────────────────────────────────
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6 text-white">
        <p className="text-lg font-medium text-gray-300">
          {isOffererParam ? "Ready to start your call?" : "Waiting to join..."}
        </p>

        <div className="relative">
          <video
            ref={initLocalVideoRef}
            className="w-[420px] h-[280px] bg-gray-800 rounded-2xl object-cover scale-x-[-1]"
            autoPlay
            playsInline
          />
          {!localMediaAvailable && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              Loading camera...
            </div>
          )}
        </div>

        {isOffererParam ? (
          localMediaAvailable ? (
            <button
              onClick={() => joinMeeting()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-full text-white font-medium transition-colors"
            >
              <Video size={18} /> Start Call
            </button>
          ) : (
            <p className="text-gray-400 text-sm">Accessing camera...</p>
          )
        ) : offer ? (
          <button
            onClick={() => joinMeeting(offer)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-8 py-3 rounded-full text-white font-medium transition-colors"
          >
            <Video size={18} /> Join Call
          </button>
        ) : (
          <p className="text-gray-400 text-sm">
            Waiting for the provider to start the call...
          </p>
        )}
      </div>
    );
  }

  // ─── ACTIVE CALL ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="relative flex-1 bg-gray-800 flex items-center justify-center overflow-hidden">
        {/*
          BUG FIX: the remote <video> element is now ALWAYS rendered (as
          soon as we're past the lobby / hasJoined is true), regardless of
          remoteConnected. This guarantees remoteVideoRef.current is a real
          DOM node by the time the stream-attach effect runs, breaking the
          chicken-and-egg cycle described above. remoteConnected now only
          controls the "Waiting..." overlay drawn ON TOP of the video via
          absolute positioning + opacity, not whether the video tag exists.
        */}
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />

        {!remoteConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 bg-gray-800">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-500">
              ?
            </div>
            <p className="text-sm">Waiting for the other participant...</p>
          </div>
        )}

        <div className="absolute bottom-4 right-4 rounded-xl overflow-hidden shadow-lg border border-gray-700 w-[140px] h-[100px] bg-gray-900">
          {videoOff ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 text-xs">
              Camera off
            </div>
          ) : (
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              autoPlay
              playsInline
              muted
            />
          )}
        </div>
      </div>

      <div className="h-20 bg-gray-900 flex items-center justify-center gap-6 px-6 border-t border-gray-800">
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
