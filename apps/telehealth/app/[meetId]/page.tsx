"use client";
import { useParams, useSearchParams } from "next/navigation";
import socketService from "@/utils/socketService";
import webRTCService from "@/utils/webRTCService";
import { useEffect, useRef, useState } from "react";
import { Button } from "@veridoctor/design/components";
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
  const TELEHEALTH_BACKEND_URL = "http://localhost:4000"; // TODO: move to env variable

  // Get audio file
  useEffect(() => {
    // Initialize audio context
    const initAudio = async () => {
      const context = new window.AudioContext();
      setAudioContext(context);

      // Load audio file
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
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  useEffect(() => {
    // initialize media
    webRTCService.setOffererType(isOffererParam);
    dispatch(setIsOfferer(isOffererParam));
    webRTCService.initilaizeMedia().then((stream) => {
      // set localvideo tag to play stream
      if (stream && initLocalVideoRef.current) {
        initLocalVideoRef.current.srcObject = stream;
        initLocalVideoRef.current.muted = true;
      }
      setLocalMediaAvailable(true);
      setLocalStream(stream);
    });
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, hasJoined]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteVideoRef.current, remoteStream, hasJoined]);

  useEffect(() => {
    // listen to incoming offer
    socketService.connect(TELEHEALTH_BACKEND_URL, {
      userName: userId,
      roomName: meetId,
    });
    // listen  to available offer for receiver side
    if (!isOffererParam) {
      socketService.on("availableOffer", (offer: RTCSessionDescriptionInit) => {
        dispatch(setOffer(offer));
        webRTCService.setOffererType(false);
      });
    }
    // socketService.on("")
  }, []);

  /**
   * #@description A function to initiate a video call meeting
   * @param offer AN optional offer object if joiner is the answerer, leave it null if joiner is caller
   * @returns null
   */
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

    pc.addEventListener("track", (event: RTCTrackEvent) => {
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
    });

    pc.addEventListener("connectionstatechange", (_event) => {
      if (pc.connectionState === "connected") {
        // probably play a sound when the user joins
        toast.success("Call in progress");
      }

      if (pc.connectionState === "disconnected") {
        toast.error("Disconnected. Connecting....");
      }
    });

    // listen to remote ice candidates and add them to local peerconnection
    socketService.on("receiveIceCandidate", (candidate: RTCIceCandidate) => {
      webRTCService.addIceCandidate(candidate);
    });

    // for offeres create an offer and for answerers create an answer
    if (isOffererParam) {
      socketService.on("remoteAnswer", (answer) => {
        webRTCService.handleRemoteAnswer(answer);
      });
      const offer = await webRTCService.createOffer();
      socketService.emit("newOffer", offer);
    } else if (offer) {
      // At this point the answer is available and so we can just g ahead and create an answer and send it to the signaling server
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
      toast.success(`Audio ${audioMuted ? "UNMUTED" : "MUTED"}`);
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
      toast.success(`Camera turned ${videoOff ? "ON" : "OFF"}`);
    }
  };

  const endCall = () => {
    toast.error("You cannot  end this call now.");
  };

  return (
    <div className="flex flex-col gap-4 min-w-screen">
      <div className="p-4 flex items-center gap-4">
        <img src="/favicon.ico" />
      </div>
      {hasJoined ? (
        // VIdeo component for remote and local streams
        <>
          <div className="relative flex flex-col items-center">
            {/* if video exists render the video tag and if not render the initials of the user */}
            <video
              ref={remoteVideoRef}
              id="remoteVideo"
              className="bg-blue-100 w-full max-h-[70vh]"
              autoPlay
              playsInline
            />
            <video
              ref={localVideoRef}
              className="absolute bottom-1 right-1 md:bottom-4 md:right-4 w-[100px] lg:w-[150px] bg-black max-w-6xl rounded-lg transform scale-x-[-1]"
              autoPlay
              playsInline
              muted
            />
          </div>
          <div className="w-full flex gap-2 items-center justify-center">
            <div className="flex flex-col items-center">
              {audioMuted ? (
                <div
                  className="border border-red-500 p-4 rounded-full text-lg cursor-pointer text-red-500"
                  onClick={toggleAudio}
                >
                  <MicOffIcon />
                </div>
              ) : (
                <div
                  className="border border-blue-500 p-4 rounded-full text-lg cursor-pointer text-blue-500"
                  onClick={toggleAudio}
                >
                  <MicIcon />
                </div>
              )}
              <p className="text-xs">Audio</p>
            </div>
            <div className="flex flex-col items-center">
              {videoOff ? (
                <div
                  className="border border-red-500 p-4 rounded-full text-lg cursor-pointer text-red-500"
                  onClick={toggleVideo}
                >
                  <VideoOff />
                </div>
              ) : (
                <div
                  className="border border-blue-500 p-4 rounded-full text-lg cursor-pointer text-blue-500"
                  onClick={toggleVideo}
                >
                  <Video />
                </div>
              )}
              <p className="text-xs">Video</p>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="bg-red-500 p-4 rounded-full text-lg cursor-pointer text-white"
                onClick={endCall}
              >
                <PhoneOff />
              </div>
              <p className="text-xs">End call</p>
            </div>
          </div>
        </>
      ) : (
        // END HERE
        <div className="flex flex-col gap-4 items-center justify-center">
          <video
            ref={initLocalVideoRef}
            className="max-w-[400px] max-h-[400px] bg-black rounded-lg transform scale-x-[-1]"
            autoPlay
            playsInline
          />
          {isOffererParam ? (
            localMediaAvailable ? (
              <Button
                className="flex items-center gap-2 bg-blue-500 px-8 py-3 rounded-md text-white cursor-pointer"
                onClick={() => joinMeeting()}
              >
                Start Call <Video className="text-2xl" />
              </Button>
            ) : (
              <p>Loading your camera...</p>
            )
          ) : // Get available offers from signaling server
          offer ? (
            <button
              className="flex items-center gap-2 bg-blue-500 px-8 py-3 rounded-md text-white cursor-pointer"
              onClick={() => joinMeeting(offer)}
            >
              Join <Video className="text-2xl" />
            </button>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="w-32" />
              <p>You will be able to join once the provider starts the call</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
