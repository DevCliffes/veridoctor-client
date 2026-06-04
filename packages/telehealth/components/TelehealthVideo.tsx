import * as React from "react";
import { Button } from "@veridoctor/design/components";
import {
  LucideMic,
  LucideMicOff,
  LucidePhoneOff,
  LucideVideo,
  LucideVideoOff,
} from "@veridoctor/design/icons";
import WebRTCService from "../utils/WebRTCService";
import socketService from "../utils/socketService";
import { toast } from "sonner";
import { webrtcState } from "../types";

function TelehealthVideo({
  meetId,
  userId,
  isOfferer,
}: {
  meetId: string;
  userId: string;
  isOfferer: boolean;
}) {
  const initLocalVideoRef = React.useRef<HTMLVideoElement>(null);

  const [audioMuted, setAudioMuted] = React.useState(false);
  const [videoOff, setVideoOff] = React.useState(false);
  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);
  const [audioContext, setAudioContext] = React.useState<AudioContext | null>(
    null,
  );
  const [audioBuffer, setAudioBuffer] = React.useState<AudioBuffer | null>(
    null,
  );
  // const { hasJoined, offer } = UseAppSelector((state: any) => state.webrtc);
  const [webRTCstate, setWebRTCState] = React.useState<webrtcState>({
    isOfferer: isOfferer,
    hasJoined: false,
    peerConnection: null,
    offer: undefined,
  });
  const [localMediaAvailable, setLocalMediaAvailable] = React.useState(false);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(
    null,
  );
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(
    null,
  );
  const TELEHEALTH_BACKEND_URL = "http://localhost:4000"; // TODO: move to env variable

  // Get audio file
  React.useEffect(() => {
    // Initialize audio context
    const initAudio = async () => {
      const context = new window.AudioContext();
      setAudioContext(context);

      // Load audio file
      try {
        const response = await fetch("/assets/sounds/notification.mp3");
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

  React.useEffect(() => {
    // initialize media
    WebRTCService.setOffererType(isOfferer);
    setWebRTCState((prev) => ({ ...prev, isOfferer: isOfferer }));
    WebRTCService.initilaizeMedia().then((stream) => {
      // set localvideo tag to play stream
      if (stream && initLocalVideoRef.current) {
        initLocalVideoRef.current.srcObject = stream;
        initLocalVideoRef.current.muted = true;
      }
      setLocalMediaAvailable(true);
      setLocalStream(stream);
    });
  }, []);

  React.useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, webRTCstate.hasJoined]);

  React.useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteVideoRef.current, remoteStream, webRTCstate.hasJoined]);

  React.useEffect(() => {
    // listen to incoming offer
    socketService.connect(TELEHEALTH_BACKEND_URL, {
      userName: userId,
      roomName: meetId,
    });
    // listen  to available offer for receiver side
    if (!isOfferer) {
      socketService.on("availableOffer", (offer: RTCSessionDescriptionInit) => {
        setWebRTCState((prev) => ({ ...prev, offer: offer }));
        WebRTCService.setOffererType(false);
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
    const pc = await WebRTCService.createPeerConnection();
    pc.addEventListener("icecandidate", (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socketService.emit("icecandidate", {
          candidate: event.candidate,
          roomId: meetId,
          isOfferer: isOfferer,
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
      WebRTCService.addIceCandidate(candidate);
    });

    // for offeres create an offer and for answerers create an answer
    if (isOfferer) {
      socketService.on("remoteAnswer", (answer) => {
        WebRTCService.handleRemoteAnswer(answer);
      });
      const offer = await WebRTCService.createOffer();
      socketService.emit("newOffer", offer);
    } else if (offer) {
      // At this point the answer is available and so we can just g ahead and create an answer and send it to the signaling server
      const answer = await WebRTCService.createAnswer(offer);
      socketService.emit("newAnswer", answer);
    } else {
      return toast.error("No offer available");
    }
    setWebRTCState((prev) => ({ ...prev, hasJoined: true }));
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
    if (WebRTCService.localStream) {
      const audioTracks = WebRTCService.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = audioMuted;
      });
      setAudioMuted(!audioMuted);
      playNotificationAudio();
      toast.success(`Audio ${audioMuted ? "UNMUTED" : "MUTED"}`);
    }
  };

  const toggleVideo = () => {
    if (WebRTCService.localStream) {
      const videoTracks = WebRTCService.localStream.getVideoTracks();
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
    <div className="flex flex-col gap-4 mb-10">
      {webRTCstate.hasJoined ? (
        // VIdeo component for remote and local streams
        <>
          <div className="relative flex gap-4 justify-center items-center">
            {/* if video exists render the video tag and if not render the initials of the user */}
            <video
              ref={remoteVideoRef}
              id="remoteVideo"
              // className="bg-primary-100 w-full max-h-[70vh]"
              autoPlay
              playsInline
            />
            <video
              ref={localVideoRef}
              // className="absolute bottom-1 right-1 md:bottom-4 md:right-4 w-[100px] lg:w-[150px] bg-black max-w-6xl rounded-lg transform scale-x-[-1]"
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
                  <LucideMicOff />
                </div>
              ) : (
                <div
                  className="border border-blue-500 p-4 rounded-full text-lg cursor-pointer text-blue-500"
                  onClick={toggleAudio}
                >
                  <LucideMic />
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
                  <LucideVideoOff />
                </div>
              ) : (
                <div
                  className="border border-blue-500 p-4 rounded-full text-lg cursor-pointer text-blue-500"
                  onClick={toggleVideo}
                >
                  <LucideVideo />
                </div>
              )}
              <p className="text-xs">Video</p>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="border border-red-500 p-4 rounded-full text-lg cursor-pointer text-red-500"
                onClick={endCall}
              >
                <LucidePhoneOff />
              </div>
              <p className="text-xs">End call</p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4 items-center justify-center">
          <video
            ref={initLocalVideoRef}
            className="max-w-[400px] max-h-[400px] bg-black rounded-lg transform scale-x-[-1]"
            autoPlay
            playsInline
          />
          {isOfferer ? (
            localMediaAvailable ? (
              <Button onClick={() => joinMeeting()}>
                Start Call <LucideVideo className="text-2xl" />
              </Button>
            ) : (
              <p>Loading your camera...</p>
            )
          ) : // Get available offers from signaling server
          webRTCstate.offer ? (
            <button onClick={() => joinMeeting(webRTCstate.offer)}>
              Join <LucideVideo className="text-2xl" />
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

export { TelehealthVideo };
