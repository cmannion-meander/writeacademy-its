/**
 * Shared API client constants for the WriteAcademy backend.
 * API key is read from the environment; falls back to the dev key for local development.
 */
export const API_HEADERS = {
  "Content-Type": "application/json",
  "X-API-Key":
    process.env.NEXT_PUBLIC_WRITEACADEMY_API_KEY ?? "devkey123",
} as const;
