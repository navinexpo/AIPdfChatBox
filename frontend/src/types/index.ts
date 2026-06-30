/**
 * Core domain types.
 *
 * These mirror the FastAPI / PostgreSQL models described in
 * BACKEND_IMPLEMENTATION_GUIDE.md. Keeping the frontend types in lockstep
 * with the backend schema means swapping `lib/api.ts` from mock mode to
 * real `fetch` calls requires no type changes anywhere else in the app.
 */

// ---------------------------------------------------------------------------
// User & Organization
// ---------------------------------------------------------------------------

/** A locally-generated anonymous identity. No auth — just a stable UUID
 *  persisted in localStorage so chat history can be scoped to "a user"
 *  once the backend exists. Maps 1:1 to the `users` table. */
export interface LocalUser {
  id: string; // UUID v4, generated client-side on first load
  displayName: string; // e.g. "Guest-7F3A" — cosmetic only
  createdAt: string; // ISO 8601
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export type DocumentType = "pdf" | "docx" | "markdown" | "txt";

export type DocumentStatus =
  | "uploading" // client-side upload in progress
  | "queued" // received by backend, waiting for processing
  | "processing" // text extraction + chunking + embedding in progress
  | "ready" // embedded into ChromaDB, available for chat
  | "failed"; // processing error — see `statusMessage`

export interface AppDocument {
  id: string;
  userId: string;
  organizationId: string | null;
  fileName: string;
  fileType: DocumentType;
  fileSizeBytes: number;
  status: DocumentStatus;
  statusMessage: string | null; // human-readable error / progress detail
  pageCount: number | null;
  chunkCount: number | null;
  uploadedAt: string;
  processedAt: string | null;
}

// ---------------------------------------------------------------------------
// Chats & Chat History
// ---------------------------------------------------------------------------

export interface Chat {
  id: string;
  userId: string;
  title: string; // derived from first question, editable later
  documentIds: string[]; // documents this conversation is scoped to
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = "user" | "assistant" | "system";

/** A single citation back to a source chunk, used to render
 *  "Sources" under an assistant message. */
export interface SourceCitation {
  documentId: string;
  fileName: string;
  page: number | null; // null for DOCX/Markdown without page semantics
  snippet: string; // short excerpt of the retrieved chunk
  score: number; // similarity score 0..1
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  citations: SourceCitation[];
  model: string | null; // e.g. "llama3:8b" — which Ollama model answered
  createdAt: string;
  isStreaming?: boolean; // client-only UI flag
}

// ---------------------------------------------------------------------------
// API request / response contracts (see BACKEND_IMPLEMENTATION_GUIDE.md)
// ---------------------------------------------------------------------------

export interface UploadDocumentResponse {
  document: AppDocument;
}

export interface SendMessageRequest {
  chatId: string;
  content: string;
  documentIds?: string[];
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface CreateChatRequest {
  title?: string;
  documentIds?: string[];
}

export interface ApiError {
  detail: string;
  code?: string;
}
