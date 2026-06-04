import { createSlice } from "@reduxjs/toolkit";

export type webrtcState = {
  isOfferer: boolean | null;
  hasJoined: boolean;
  peerConnection: RTCPeerConnection | null;
  offer: RTCSessionDescriptionInit | null;
};
const initialState: webrtcState = {
  isOfferer: null,
  hasJoined: false,
  peerConnection: null,
  offer: null,
};

export const webrtcSlice = createSlice({
  name: "webrtc",
  initialState,
  reducers: {
    setIsOfferer: (state, action) => {
      state.isOfferer = action.payload;
    },
    setHasJoined: (state, action) => {
      state.hasJoined = action.payload;
    },
    setPeerConnection: (state, action) => {
      state.peerConnection = action.payload;
    },
    setOffer: (state, action) => {
      state.offer = action.payload;
    },
    // Add other reducers here
  },
});

export const { setHasJoined, setIsOfferer, setPeerConnection, setOffer } =
  webrtcSlice.actions;

export default webrtcSlice.reducer;
