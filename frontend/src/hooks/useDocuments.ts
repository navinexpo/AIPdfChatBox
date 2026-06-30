import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/constants";
import type { AppDocument } from "@/types";

const DOCUMENTS_KEY = (userId: string) => ["documents", userId] as const;

export function useDocuments(userId: string) {
  return useQuery({
    queryKey: DOCUMENTS_KEY(userId),
    queryFn: () => api.listDocuments(userId),
    refetchInterval: (query) => {
      // Poll while any document is still processing, like a real backend
      // would require until we add websockets/SSE for status push updates.
      const docs = query.state.data as AppDocument[] | undefined;
      const hasPending = docs?.some((d) => d.status === "queued" || d.status === "processing");
      return hasPending ? 1500 : false;
    },
  });
}

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".md", ".markdown", ".txt"];

function validateFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `${file.name}: unsupported file type. Accepted: PDF, DOCX, Markdown, TXT.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `${file.name}: file is larger than ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
}

export function useUploadDocument(userId: string) {
  const queryClient = useQueryClient();
  const [progressByFile, setProgressByFile] = useState<Record<string, number>>({});

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const error = validateFile(file);
      if (error) throw new Error(error);
      return api.uploadDocument(file, userId, (progress) => {
        setProgressByFile((prev) => ({ ...prev, [file.name]: progress }));
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY(userId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Upload failed");
    },
  });

  const uploadFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => mutation.mutate(file));
  };

  return { ...mutation, uploadFiles, progressByFile };
}

export function useDeleteDocument(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY(userId) });
      toast.success("Document removed");
    },
    onError: () => toast.error("Couldn't remove that document"),
  });
}
