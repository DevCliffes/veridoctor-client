"use client";
import { useParams, useSearchParams } from "next/navigation";
import socketService from "@/utils/socketService";
import webRTCService from "@/utils/webRTCService";
import { useEffect, useRef, useState } from "react";
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

export default function TelehealthVideoPlayer() {
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
  const { hasJoined, offer } = UseAppSelector((state: any) => state.webrtc);
  const [localMediaAvailable, setLocalMediaAvailable] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteConnected, setRemoteConnected] = useState(false);

  const TELEHEALTH_BACKEND_URL =
    process.env.NEXT_PUBLIC_TELEHEALTH_BACKEND_URL || "http://localhost:4000";

  // Initialize notification audio
  useEffect(() => {
    const initAudio = async () => {
      const context = new window.AudioContext();
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
      if (audioContext) audioContext.close();
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
      setLocalMediaAvailable(true);
      setLocalStream(stream);
    });
  }, []);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, hasJoined]);

  // ✅ Fixed: watch remoteStream state (not remoteVideoRef.current) so this
  // fires whenever the remote track actually arrives
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      setRemoteConnected(true);
    }
  }, [remoteStream]);

  // Connect to signaling server
  useEffect(() => {
    socketService.connect(TELEHEALTH_BACKEND_URL, {
      userName: userId,
      roomName: meetId,
    });
    if (!isOffererParam) {
      socketService.on("availableOffer", (offer: RTCSessionDescriptionInit) => {
        dispatch(setOffer(offer));
        webRTCService.setOffererType(false);
      });
    }
  }, []);

  const joinMeeting = async (offer?: RTCSessionDescriptionInit) => {
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

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // ✅ Fixed: this now sets remoteStream state, triggering the useEffect above
    pc.addEventListener("track", (event: RTCTrackEvent) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
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
      webRTCService.addIceCandidate(candidate);
    });

    if (isOffererParam) {
      socketService.on("remoteAnswer", (answer) => {
        webRTCService.handleRemoteAnswer(answer);
      });
      const newOffer = await webRTCService.createOffer();
      socketService.emit("newOffer", newOffer);
    } else if (offer) {
      const answer = await webRTCService.createAnswer(offer);
      socketService.emit("newAnswer", answer);
    } else {
      return toast.error("No offer available");
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

  // ─── ACTIVE CALL — Google Meet style ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">

      {/* Remote video — full screen background */}
      <div className="relative flex-1 bg-gray-800 flex items-center justify-center overflow-hidden">
        {remoteConnected ? (
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
        ) : (
          // Placeholder while waiting for remote peer's stream
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-500">
              ?
            </div>
            <p className="text-sm">Waiting for the other participant...</p>
          </div>
        )}

        {/* Self-preview — small overlay bottom-right (mirrored, like Meet) */}
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

      {/* Controls bar — bottom, dark, Google Meet style */}
      <div className="h-20 bg-gray-900 flex items-center justify-center gap-4 px-6 border-t border-gray-800">

        {/* Mic */}
        <button
          onClick={toggleAudio}
          className={`flex flex-col items-center gap-1 p-3 rounded-full transition-colors ${
            audioMuted
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-white"
          }`}
        >
          {audioMuted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
        </button>
        <span className="text-gray-400 text-xs -mt-4 w-8 text-center">
          {audioMuted ? "Unmute" : "Mute"}
        </span>

        {/* Camera */}
        <button
          onClick={toggleVideo}
          className={`flex flex-col items-center gap-1 p-3 rounded-full transition-colors ${
            videoOff
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-white"
          }`}
        >
          {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        <span className="text-gray-400 text-xs -mt-4 w-8 text-center">
          {videoOff ? "Start" : "Stop"}
        </span>

        {/* End call */}
        <button
          onClick={endCall}
          className="flex flex-col items-center gap-1 p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          <PhoneOff size={20} />
        </button>
        <span className="text-gray-400 text-xs -mt-4 w-16 text-center">
          End call
        </span>

      </div>
    </div>
  );
}
