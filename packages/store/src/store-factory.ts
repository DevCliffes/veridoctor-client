import { configureStore, combineReducers, Reducer } from "@reduxjs/toolkit";
import { authReducer } from "./slices/common/auth.slice";

/**
 * creates a store for the app with shared reducers and app specific reducers
 * @param appSpecificReducers reducers that are specific to the app and not shared accross apps
 * @returns
 */
export const createAppStore = (
  appSpecificReducers: Record<string, Reducer>,
) => {
  const rootReducer = combineReducers({
    // Shared reducers
    auth: authReducer,
    // App specific reducers
    ...appSpecificReducers,
  });

  return configureStore({
    reducer: rootReducer,
    //TODO: add rtk query middleware here if needed
  });
};
