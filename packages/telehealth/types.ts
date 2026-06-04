export type webrtcState = {
  isOfferer: boolean | null;
  hasJoined: boolean;
  peerConnection: RTCPeerConnection | null;
  offer: RTCSessionDescriptionInit | undefined;
};
