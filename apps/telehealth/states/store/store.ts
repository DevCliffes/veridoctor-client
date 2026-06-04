import { configureStore } from "@reduxjs/toolkit";
import webrtcReducer from "../features/webrtc";

export const store = configureStore({
  reducer: {
    webrtc: webrtcReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
