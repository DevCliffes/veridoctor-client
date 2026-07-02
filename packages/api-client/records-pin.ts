import { axiosClient } from "./axios-client";

export interface PinStatusResponse {
  has_pin: boolean;
}

export interface VerifyPinResponse {
  unlock_token: string;
  expires_in: number;
}

export const recordsPinApi = {
  status: () => axiosClient.get<PinStatusResponse>("/records/pin/status"),

  setPin: (pin: string) => axiosClient.post("/records/pin/set", { pin }),

  verifyPin: (pin: string) =>
    axiosClient.post<VerifyPinResponse>("/records/pin/verify", { pin }),

  changePin: (currentPin: string, newPin: string) =>
    axiosClient.post("/records/pin/change", {
      current_pin: currentPin,
      new_pin: newPin,
    }),

  resetPin: (password: string, newPin: string) =>
    axiosClient.post("/records/pin/reset", { password, new_pin: newPin }),

  // Timeline fetch with the unlock token attached. Uses validateStatus so a
  // 401/403/423 (missing/expired/locked PIN) resolves as a normal response
  // instead of throwing into axiosClient's global interceptor, which would
  // otherwise incorrectly redirect the patient to /auth/login.
  getTimeline: (
    patientIdentityId: string,
    unlockToken: string,
    params?: Record<string, string>
  ) =>
    axiosClient.get(`/records/patient/${patientIdentityId}/timeline`, {
      headers: { "X-Records-Unlock": unlockToken },
      params,
      validateStatus: (s) => s < 500,
    }),
};
