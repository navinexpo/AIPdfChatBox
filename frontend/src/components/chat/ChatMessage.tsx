import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
  userInitial: string;
}

export function ChatMessage({ message, userInitial }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 px-1 py-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        {isUser ? (
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {userInitial}
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </AvatarFallback>
        )}
      </Avatar>

      <div className={cn("flex max-w-[80%] flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm border border-border bg-card text-card-foreground",
          )}
        >
          {message.isStreaming ? (
            <span className="flex items-center gap-1 py-0.5">
              <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-current [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-current [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-current [animation-delay:300ms]" />
            </span>
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-li:my-0.5 dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground"
                title={c.snippet}
              >
                <FileText className="h-3 w-3 text-primary-600" />
                <span className="max-w-[140px] truncate">{c.fileName}</span>
                {c.page !== null && <span className="text-muted-foreground/70">p.{c.page}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
