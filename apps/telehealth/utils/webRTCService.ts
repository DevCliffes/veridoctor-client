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

  /**
   *
   * @param iceservers  the ice servers to be used for the connection
   * @description INitializes a new webrtcService object
   */
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isOfferer = null;
    this.hasJoined = false;
  }

  /**
   * @description This function sets the local stream
   * @param isOfferer
   */
  setOffererType(isOfferer: boolean) {
    this.isOfferer = isOfferer;
  }

  /**
   * @description This function initializes the media stream from local video cam and audio
   * @returns {Promise<MediaStream | null>} - The media stream from the local video cam and audio
   */
  async initilaizeMedia(): Promise<MediaStream | null> {
    const constraints = {
      video: true,
      audio: true,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.localStream = stream;
    return stream;
  }

  /**
   *
   * @returns {RTCPeerConnection}
   * @description This function creates a peer connection and adds event listeners to it
   */
  async createPeerConnection(): Promise<RTCPeerConnection> {
    const rtcConfig: RTCConfiguration = {
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
          ],
        },
        // TODO: make use of self-hosted turn server and see whether that makes a difference
        {
          urls: [this.TURN_SERVER_URL],
          username: this.TURN_USERNAME,
          credential: this.TURN_PASSWORD,
        },
      ],
      iceTransportPolicy: "all",
      iceCandidatePoolSize: 10,
    };

    const peerConnection: RTCPeerConnection | null = new RTCPeerConnection(
      rtcConfig,
    );

    this.peerConnection = peerConnection;
    return peerConnection;
  }

  /**
   *  @description This function cretes  a new offer and sets the local description
   *  @returns {RTCSessionDescriptionInit}
   */
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
    // send the offer to signaling server to the receiver
    return offer;
  }

  /**
   * @description This function creaes a new answer and sets the local description
   * @param offer session descriptiion offer object
   * @returns {RTCSessionDescriptionInit}
   */
  async createAnswer(
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    const answerOptions: RTCAnswerOptions = {
      // iceRestart: true,
      // offerToReceiveAudio: true,
      // offerToReceiveVideo: true,
    };
    if (this.peerConnection === null) {
      throw new Error("Peer connection is null");
    }
    if (this.isOfferer === true) {
      throw new Error("Peer connection is not answerer");
    }
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer),
    );
    const answer = await this.peerConnection.createAnswer(answerOptions);
    await this.peerConnection.setLocalDescription(answer);
    this.hasJoined = true;
    // send answer to offerer
    return answer;
  }
  /**
   * @description this function handles remote answer
   * @param answer session description amswer object
   * @returns {Promise<void>}
   */
  // adds the answer object to peer connection
  async handleRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection === null) {
      throw new Error("Peer connection is null");
    }
    if (this.isOfferer === false) {
      throw new Error("Peer connection is not offerer");
    }
    const remoteDesc = new RTCSessionDescription(answer);
    await this.peerConnection.setRemoteDescription(remoteDesc);
    // create a function to set the remotevide stream here
  }

  /**
   * @description this function handles remote ice candidate addition to the peerconnection
   * @param candidate the ice candidate to be added
   */
  async addIceCandidate(candidate: RTCIceCandidate) {
    if (this.peerConnection === null) {
      // emit an error
      throw new Error("Peer connection is null");
    }
    // check whether there is a local and remote descriptions before adding ice candidates. Emit an error when one of them is missing
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

  /**
   * @description Adds media tracks to the peer connection objecvt
   * @param stream A media stream object
   */
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
