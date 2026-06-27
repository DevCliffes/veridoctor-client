/**
 * cookies - shared generic keys (legacy, kept for backward compat)
 */
export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const AUTH_CODE_KEY = "auth_code";
export const LOGGED_IN_KEY = "loggedin";
export const IDENTITY_KEY = "identity";

// App-scoped keys — prevent cookie bleed between patient and provider
// on the shared .veridoctor.com domain.
export const PATIENT_IDENTITY_KEY = "vd_patient_identity";
export const PATIENT_LOGGED_IN_KEY = "vd_patient_loggedin";
export const PATIENT_ACCESS_TOKEN_KEY = "vd_patient_access_token";
export const PATIENT_AUTH_CODE_KEY = "vd_patient_auth_code";

export const PROVIDER_IDENTITY_KEY = "vd_provider_identity";
export const PROVIDER_LOGGED_IN_KEY = "vd_provider_loggedin";
export const PROVIDER_ACCESS_TOKEN_KEY = "vd_provider_access_token";
export const PROVIDER_AUTH_CODE_KEY = "vd_provider_auth_code";
