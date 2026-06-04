import { createSlice } from "@reduxjs/toolkit";

export type webrtcState = {
  isOfferer: boolean | null;
  hasJoined: boolean;
  peerConnection: RTCPeerConnection | null;
};
const initialState: webrtcState = {
  isOfferer: null,
  hasJoined: false,
  peerConnection: null,
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
    // Add other reducers here
  },
});

export const { setHasJoined, setIsOfferer, setPeerConnection } =
  webrtcSlice.actions;

export default webrtcSlice.reducer;
