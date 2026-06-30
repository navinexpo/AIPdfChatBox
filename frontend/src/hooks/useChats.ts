import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";

const CHATS_KEY = (userId: string) => ["chats", userId] as const;
const MESSAGES_KEY = (chatId: string) => ["messages", chatId] as const;

export function useChats(userId: string) {
  return useQuery({
    queryKey: CHATS_KEY(userId),
    queryFn: () => api.listChats(userId),
  });
}

export function useCreateChat(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, documentIds }: { title?: string; documentIds?: string[] }) =>
      api.createChat(userId, title, documentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHATS_KEY(userId) });
    },
    onError: () => toast.error("Couldn't start a new chat"),
  });
}

export function useDeleteChat(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => api.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHATS_KEY(userId) });
    },
    onError: () => toast.error("Couldn't delete that chat"),
  });
}

export function useChatMessages(chatId: string | null) {
  return useQuery({
    queryKey: MESSAGES_KEY(chatId ?? "none"),
    queryFn: () => api.getChatMessages(chatId as string),
    enabled: !!chatId,
  });
}

export function useSendMessage(userId: string, chatId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, documentIds }: { content: string; documentIds?: string[] }) => {
      if (!chatId) throw new Error("No active chat");
      return api.sendMessage(chatId, content, documentIds);
    },
    onSuccess: () => {
      if (chatId) {
        queryClient.invalidateQueries({ queryKey: MESSAGES_KEY(chatId) });
        queryClient.invalidateQueries({ queryKey: CHATS_KEY(userId) });
      }
    },
    onError: () => toast.error("Message failed to send — try again"),
  });
}
