import { MessageSquarePlus, MessageSquareText, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/useAppStore";
import { useChats, useCreateChat, useDeleteChat } from "@/hooks/useChats";
import type { Chat } from "@/types";

interface SidebarProps {
  userId: string;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ChatRow({
  chat,
  isActive,
  onSelect,
  onDelete,
}: {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
        isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
      )}
    >
      <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug text-sidebar-foreground">
          {chat.title}
        </p>
        <p className="text-[11px] text-muted-foreground">{formatRelativeTime(chat.updatedAt)}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete chat"
        className="invisible shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:visible group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function SidebarContent({ userId }: SidebarProps) {
  const { data: chats, isLoading } = useChats(userId);
  const createChat = useCreateChat(userId);
  const deleteChat = useDeleteChat(userId);
  const activeChatId = useAppStore((s) => s.activeChatId);
  const setActiveChatId = useAppStore((s) => s.setActiveChatId);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);

  const handleNewChat = async () => {
    const chat = await createChat.mutateAsync({});
    setActiveChatId(chat.id);
    setMobileSidebarOpen(false);
  };

  const handleSelect = (id: string) => {
    setActiveChatId(id);
    setMobileSidebarOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteChat.mutate(id);
    if (activeChatId === id) setActiveChatId(null);
  };

  const sortedChats = [...(chats ?? [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          disabled={createChat.isPending}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <div className="px-3 pb-1.5 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Recent
      </div>

      <ScrollArea className="flex-1 px-2 pb-3">
        <div className="flex flex-col gap-0.5">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="mx-1 h-11 rounded-lg" />
            ))}

          {!isLoading && sortedChats.length === 0 && (
            <p className="px-2.5 py-4 text-sm text-muted-foreground">
              No chats yet. Start one above.
            </p>
          )}

          {sortedChats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              isActive={chat.id === activeChatId}
              onSelect={() => handleSelect(chat.id)}
              onDelete={() => handleDelete(chat.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function Sidebar({ userId }: SidebarProps) {
  const isMobileSidebarOpen = useAppStore((s) => s.isMobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border lg:block">
        <SidebarContent userId={userId} />
      </aside>

      {/* Mobile drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-sidebar-border shadow-float animate-fade-in">
            <div className="flex h-14 items-center justify-end border-b border-sidebar-border px-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="h-[calc(100%-3.5rem)]">
              <SidebarContent userId={userId} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
