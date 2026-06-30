import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WelcomeSection } from "@/components/welcome/WelcomeSection";
import { UploadZone } from "@/components/upload/UploadZone";
import { FileList } from "@/components/upload/FileList";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatMessages, useCreateChat, useSendMessage } from "@/hooks/useChats";
import { useDocuments } from "@/hooks/useDocuments";
import { useAppStore } from "@/store/useAppStore";
import type { LocalUser } from "@/types";

interface ChatAreaProps {
  user: LocalUser;
}

export function ChatArea({ user }: ChatAreaProps) {
  const activeChatId = useAppStore((s) => s.activeChatId);
  const setActiveChatId = useAppStore((s) => s.setActiveChatId);
  const selectedDocumentIds = useAppStore((s) => s.selectedDocumentIds);

  const { data: documents } = useDocuments(user.id);
  const { data: messages, isLoading: messagesLoading } = useChatMessages(activeChatId);
  const sendMessage = useSendMessage(user.id, activeChatId);
  const createChat = useCreateChat(user.id);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const readyDocs = (documents ?? []).filter((d) => d.status === "ready");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  const handleSend = async (content: string) => {
    let chatId = activeChatId;
    if (!chatId) {
      const chat = await createChat.mutateAsync({
        title: content.slice(0, 48),
        documentIds: selectedDocumentIds,
      });
      chatId = chat.id;
      setActiveChatId(chatId);
    }
    sendMessage.mutate({ content, documentIds: selectedDocumentIds });
  };

  const hasConversation = !!activeChatId && (messages?.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {!hasConversation && (
            <>
              <WelcomeSection />
              <UploadZone userId={user.id} />
              <FileList userId={user.id} />
            </>
          )}

          {hasConversation && (
            <div className="flex flex-col">
              {messagesLoading && (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
              )}
              {messages?.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  userInitial={user.displayName.slice(-4, -2)}
                />
              ))}
              {sendMessage.isPending && (
                <ChatMessage
                  message={{
                    id: "pending",
                    chatId: activeChatId ?? "",
                    role: "assistant",
                    content: "",
                    citations: [],
                    model: null,
                    createdAt: new Date().toISOString(),
                    isStreaming: true,
                  }}
                  userInitial={user.displayName.slice(-4, -2)}
                />
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <ChatInput
        onSend={handleSend}
        isSending={sendMessage.isPending || createChat.isPending}
      />
    </div>
  );
}
