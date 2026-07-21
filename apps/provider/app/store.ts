import { createAppStore, themeReducer } from "@veridoctor/store";

const store = createAppStore({ theme: themeReducer });

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
