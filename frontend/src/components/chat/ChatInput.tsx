import * as React from "react";
import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowUp, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/useAppStore";

const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Type a question before sending")
    .max(4000, "Keep questions under 4000 characters"),
});

type MessageFormValues = z.infer<typeof messageSchema>;

interface ChatInputProps {
  onSend: (content: string) => void;
  isSending: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export function ChatInput({ onSend, isSending, disabled, disabledReason }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedDocumentIds = useAppStore((s) => s.selectedDocumentIds);
  const clearSelectedDocuments = useAppStore((s) => s.clearSelectedDocuments);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: "" },
  });

  const { ref: rhfRef, ...rest } = register("content");

  const onSubmit = (values: MessageFormValues) => {
    onSend(values.content.trim());
    reset();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  const autoGrow = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="border-t border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur-sm sm:px-6">
      {selectedDocumentIds.length > 0 && (
        <div className="mx-auto mb-2 flex max-w-3xl items-center gap-1.5 text-xs text-muted-foreground">
          <FileStack className="h-3.5 w-3.5" />
          Scoped to {selectedDocumentIds.length} selected document
          {selectedDocumentIds.length > 1 ? "s" : ""}
          <button
            type="button"
            onClick={clearSelectedDocuments}
            className="text-primary-600 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-soft focus-within:ring-2 focus-within:ring-ring"
      >
        <Textarea
          {...rest}
          ref={(el) => {
            rhfRef(el);
            textareaRef.current = el;
          }}
          rows={1}
          placeholder={disabled ? disabledReason : "Ask a question about your documents…"}
          disabled={disabled || isSending}
          onKeyDown={handleKeyDown}
          onInput={autoGrow}
          className="max-h-40 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || isSending}
          aria-label="Send message"
          className="mb-0.5 shrink-0 rounded-full"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </form>
      {errors.content && (
        <p className="mx-auto mt-1.5 max-w-3xl text-xs text-destructive">
          {errors.content.message}
        </p>
      )}
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
        Answers are generated from your uploaded documents and may be incomplete. Verify
        anything critical.
      </p>
    </div>
  );
}
