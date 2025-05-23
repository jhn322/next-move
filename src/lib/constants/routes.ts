export const API_AUTH_PATHS = {
  VERIFY_EMAIL: "/api/auth/verify",
  CLEANUP_UNVERIFIED_USERS: "/api/auth/cleanup-unverified",
} as const;

export const AUTH_PATHS = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  AUTH_ERROR: "/auth/error",
} as const;
