/**
 * @description this file contains the WebRTCService class which is used to handle the WebRTC connection
 * @author Destiny Kevogo
 */
class WebRTCService {
  localStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  remoteStream: MediaStream | null;
  isOfferer: boolean | null;
  hasJoined: boolean;

  TURN_SERVER_URL =
    process.env.NEXT_PUBLIC_TURN_SERVER_URL ||
    "turn:turnserver.veridoctor.com:3478";
  TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME || "veridoctor";
  TURN_PASSWORD = process.env.NEXT_PUBLIC_TURN_PASSWORD || "veridoctor2024";

  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isOfferer = null;
    this.hasJoined = false;
  }

  setOffererType(isOfferer: boolean) {
    this.isOfferer = isOfferer;
  }

  async initilaizeMedia(): Promise<MediaStream | null> {
    const constraints = {
      video: true,
      audio: true,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.localStream = stream;
    return stream;
  }

  async createPeerConnection(): Promise<RTCPeerConnection> {
    const rtcConfig: RTCConfiguration = {
      iceServers: [
        // STUN — helps on same-network connections
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
          ],
        },
        // Self-hosted TURN (used if configured and running)
        {
          urls: [this.TURN_SERVER_URL],
          username: this.TURN_USERNAME,
          credential: this.TURN_PASSWORD,
        },
        // Public TURN fallback via Metered — works across different networks
        // (desktop WiFi ↔ mobile 4G etc.) when the self-hosted server is unavailable
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
      iceTransportPolicy: "all",
      iceCandidatePoolSize: 10,
    };

    const peerConnection = new RTCPeerConnection(rtcConfig);
    this.peerConnection = peerConnection;
    return peerConnection;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offerOptions: RTCOfferOptions = {
      iceRestart: true,
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    };
    if (this.peerConnection === null) {
      throw new Error("Peer connection is null");
    }
    if (this.isOfferer === false) {
      throw new Error("Peer connection is not offerer");
    }
    const offer = await this.peerConnection.createOffer(offerOptions);
    await this.peerConnection.setLocalDescription(offer);
    this.hasJoined = true;
    return offer;
  }

  async createAnswer(
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    if (this.peerConnection === null) {
      throw new Error("Peer connection is null");
    }
    if (this.isOfferer === true) {
      throw new Error("Peer connection is not answerer");
    }
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer),
    );
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.hasJoined = true;
    return answer;
  }

  async handleRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection === null) {
      throw new Error("Peer connection is null");
    }
    if (this.isOfferer === false) {
      throw new Error("Peer connection is not offerer");
    }
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer),
    );
  }

  async addIceCandidate(candidate: RTCIceCandidate) {
    if (this.peerConnection === null) {
      throw new Error("Peer connection is null");
    }
    if (!this.peerConnection.remoteDescription)
      throw new Error("Remote description not set");
    if (!this.peerConnection.localDescription)
      throw new Error("Local description not set");
    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (e) {
      console.error("Error adding ice candidate", e);
    }
  }

  addMediaTracks(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      if (this.peerConnection) {
        this.peerConnection.addTrack(track, stream);
      } else {
        throw new Error("Peer connection is null");
      }
    });
  }
}

export default new WebRTCService();

