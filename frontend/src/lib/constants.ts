export const APP_NAME = "Docked";
export const APP_TAGLINE = "Chat with your documents, locally and privately.";

export const ACCEPTED_FILE_TYPES = {
  pdf: { mime: "application/pdf", ext: ".pdf", label: "PDF" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: ".docx",
    label: "DOCX",
  },
  markdown: { mime: "text/markdown", ext: ".md", label: "Markdown" },
  txt: { mime: "text/plain", ext: ".txt", label: "Text" },
} as const;

export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const LOCAL_STORAGE_KEYS = {
  userId: "docked.user_id",
  userDisplayName: "docked.user_display_name",
  theme: "docked.theme",
} as const;

/** Base path for API calls. In dev this is proxied to FastAPI by Vite
 *  (see vite.config.ts). In production, point this at your deployed
 *  backend via VITE_API_BASE_URL. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** Toggle between mock data (default, for frontend-only development)
 *  and the real FastAPI backend. Flip via .env: VITE_USE_MOCK_API=false */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";
