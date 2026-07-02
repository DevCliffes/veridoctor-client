import { axiosClient } from "./axios-client";

export interface PinStatusResponse {
  has_pin: boolean;
}

export interface VerifyPinResponse {
  unlock_token: string;
  expires_in: number;
}

// validateStatus: (s) => s < 500 on every call here is deliberate.
// It stops 400/401/403/423 responses from being treated as thrown errors,
// which stops them from ever reaching axiosClient's global response
// interceptor — the one that force-redirects to /auth/login on any 401/403.
// Without this, a bug in these specific endpoints logs the whole app out
// instead of just showing an error in the PIN form.
const PIN_REQUEST_CONFIG = { validateStatus: (s: number) => s < 500 };

export const recordsPinApi = {
  status: () =>
    axiosClient.get<PinStatusResponse>("/records/pin/status", PIN_REQUEST_CONFIG),

  setPin: (pin: string) =>
    axiosClient.post("/records/pin/set", { pin }, PIN_REQUEST_CONFIG),

  verifyPin: (pin: string) =>
    axiosClient.post<VerifyPinResponse>("/records/pin/verify", { pin }, PIN_REQUEST_CONFIG),

  changePin: (currentPin: string, newPin: string) =>
    axiosClient.post(
      "/records/pin/change",
      { current_pin: currentPin, new_pin: newPin },
      PIN_REQUEST_CONFIG
    ),

  resetPin: (password: string, newPin: string) =>
    axiosClient.post(
      "/records/pin/reset",
      { password, new_pin: newPin },
      PIN_REQUEST_CONFIG
    ),

  getTimeline: (
    patientIdentityId: string,
    unlockToken: string,
    params?: Record<string, string>
  ) =>
    axiosClient.get(`/records/patient/${patientIdentityId}/timeline`, {
      headers: { "X-Records-Unlock": unlockToken },
      params,
      ...PIN_REQUEST_CONFIG,
    }),
};
