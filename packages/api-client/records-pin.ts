import { axiosClient } from "./axios-client";

export interface PinStatusResponse {
  has_pin: boolean;
}

export interface VerifyPinSuccess {
  unlock_token: string;
  expires_in: number;
}

export interface PinErrorResponse {
  error?: string;
  remaining_attempts?: number;
  locked_until?: string;
}

// Union type: on success the body matches VerifyPinSuccess, on any
// non-200 (400/423/etc) it matches PinErrorResponse instead. Both shapes
// are declared here so res.data?.error and res.data?.remaining_attempts
// type-check correctly regardless of which branch actually ran.
export type VerifyPinResponse = VerifyPinSuccess & PinErrorResponse;

// Only treat these as "not exceptional" — genuine PIN-domain outcomes.
// 401/403 must still reject so axiosClient's response interceptor can
// catch them and redirect to /auth/login instead of being shown as a
// PIN error.
const PIN_REQUEST_CONFIG = {
  validateStatus: (s: number) => s === 200 || s === 400 || s === 423,
};

export const recordsPinApi = {
  status: () =>
    axiosClient.get<PinStatusResponse>("/records/pin/status", PIN_REQUEST_CONFIG),

  setPin: (pin: string) =>
    axiosClient.post<PinErrorResponse>("/records/pin/set", { pin }, PIN_REQUEST_CONFIG),

  verifyPin: (pin: string) =>
    axiosClient.post<VerifyPinResponse>("/records/pin/verify", { pin }, PIN_REQUEST_CONFIG),

  changePin: (currentPin: string, newPin: string) =>
    axiosClient.post<PinErrorResponse>(
      "/records/pin/change",
      { current_pin: currentPin, new_pin: newPin },
      PIN_REQUEST_CONFIG
    ),

  resetPin: (password: string, newPin: string) =>
    axiosClient.post<PinErrorResponse>(
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
