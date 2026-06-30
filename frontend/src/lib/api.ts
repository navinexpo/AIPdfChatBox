import { v4 as uuidv4 } from "uuid";
import { API_BASE_URL, USE_MOCK_API } from "@/lib/constants";
import { createMockChat, createMockDocument, generateMockAnswer, mockStore } from "@/lib/mockData";
import type {
  AppDocument,
  Chat,
  ChatMessage,
  DocumentType,
  SendMessageResponse,
} from "@/types";

/**
 * ---------------------------------------------------------------------
 * API CLIENT
 * ---------------------------------------------------------------------
 * This is the ONLY module that should know whether the app is talking
 * to mock data or a real backend. Every function signature here is the
 * frontend's expectation of the FastAPI contract — see
 * BACKEND_IMPLEMENTATION_GUIDE.md for the exact endpoint each one maps
 * to. Swapping USE_MOCK_API to false (via .env) re-points every one of
 * these at `fetch(`${API_BASE_URL}/...`)` with zero call-site changes.
 * ---------------------------------------------------------------------
 */

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inferDocumentType(fileName: string): DocumentType {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "md" || ext === "markdown") return "markdown";
  return "txt";
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * Uploads a document.
 * Backend contract: POST /api/documents (multipart/form-data)
 *   form fields: file, user_id
 * Response: { document: AppDocument }
 */
export async function uploadDocument(
  file: File,
  userId: string,
  onProgress?: UploadProgressCallback,
): Promise<AppDocument> {
  if (USE_MOCK_API) {
    const doc = createMockDocument(userId, file.name, inferDocumentType(file.name), file.size);

    // Simulate multipart upload progress
    for (let p = 10; p <= 100; p += 15) {
      await delay(120);
      onProgress?.(Math.min(p, 100));
    }
    doc.status = "queued";
    await delay(300);
    doc.status = "processing";
    onProgress?.(100);
    await delay(900);
    doc.status = "ready";
    doc.pageCount = doc.fileType === "pdf" ? Math.ceil(file.size / 50_000) || 1 : null;
    doc.chunkCount = Math.ceil(file.size / 1200) || 1;
    doc.processedAt = new Date().toISOString();
    return doc;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);

  const res = await fetch(`${API_BASE_URL}/documents`, { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? "Upload failed");
  }
  const data = await res.json();
  return data.document as AppDocument;
}

/** Backend contract: GET /api/documents?user_id=... */
export async function listDocuments(userId: string): Promise<AppDocument[]> {
  if (USE_MOCK_API) {
    await delay(150);
    return mockStore.documents.filter((d) => d.userId === userId);
  }
  return http<AppDocument[]>(`/documents?user_id=${encodeURIComponent(userId)}`);
}

/** Backend contract: DELETE /api/documents/{document_id} */
export async function deleteDocument(documentId: string): Promise<void> {
  if (USE_MOCK_API) {
    await delay(200);
    mockStore.documents = mockStore.documents.filter((d) => d.id !== documentId);
    return;
  }
  await http<void>(`/documents/${documentId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------

/** Backend contract: GET /api/chats?user_id=... */
export async function listChats(userId: string): Promise<Chat[]> {
  if (USE_MOCK_API) {
    await delay(150);
    return mockStore.chats.filter((c) => c.userId === userId);
  }
  return http<Chat[]>(`/chats?user_id=${encodeURIComponent(userId)}`);
}

/** Backend contract: POST /api/chats  { user_id, title?, document_ids? } */
export async function createChat(
  userId: string,
  title = "New chat",
  documentIds: string[] = [],
): Promise<Chat> {
  if (USE_MOCK_API) {
    await delay(150);
    return createMockChat(userId, title, documentIds);
  }
  return http<Chat>(`/chats`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, title, document_ids: documentIds }),
  });
}

/** Backend contract: DELETE /api/chats/{chat_id} */
export async function deleteChat(chatId: string): Promise<void> {
  if (USE_MOCK_API) {
    await delay(150);
    mockStore.chats = mockStore.chats.filter((c) => c.id !== chatId);
    delete mockStore.messages[chatId];
    return;
  }
  await http<void>(`/chats/${chatId}`, { method: "DELETE" });
}

/** Backend contract: GET /api/chats/{chat_id}/messages */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  if (USE_MOCK_API) {
    await delay(150);
    return mockStore.messages[chatId] ?? [];
  }
  return http<ChatMessage[]>(`/chats/${chatId}/messages`);
}

/**
 * Sends a user question and returns the assistant's grounded answer.
 * Backend contract: POST /api/chats/{chat_id}/messages
 *   body: { content, document_ids? }
 * Response: { user_message, assistant_message }
 *
 * In production this should be upgraded to a streaming endpoint
 * (Server-Sent Events or chunked transfer) — see the RAG pipeline
 * section of BACKEND_IMPLEMENTATION_GUIDE.md for the streaming contract.
 */
export async function sendMessage(
  chatId: string,
  content: string,
  documentIds: string[] = [],
): Promise<SendMessageResponse> {
  if (USE_MOCK_API) {
    const userMessage: ChatMessage = {
      id: uuidv4(),
      chatId,
      role: "user",
      content,
      citations: [],
      model: null,
      createdAt: new Date().toISOString(),
    };
    mockStore.messages[chatId] = [...(mockStore.messages[chatId] ?? []), userMessage];

    await delay(1100);

    const scopedDocs = mockStore.documents.filter(
      (d) => documentIds.length === 0 || documentIds.includes(d.id),
    );
    const { content: answerText, citations } = generateMockAnswer(content, scopedDocs);

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      chatId,
      role: "assistant",
      content: answerText,
      citations,
      model: "llama3:8b (mock)",
      createdAt: new Date().toISOString(),
    };
    mockStore.messages[chatId] = [...mockStore.messages[chatId], assistantMessage];

    const chat = mockStore.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.updatedAt = new Date().toISOString();
      if (chat.title === "New chat") {
        chat.title = content.slice(0, 48) + (content.length > 48 ? "…" : "");
      }
    }

    return { userMessage, assistantMessage };
  }

  return http<SendMessageResponse>(`/chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, document_ids: documentIds }),
  });
}
