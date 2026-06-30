import { FileText, FileType2, Loader2, Notebook, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDeleteDocument, useDocuments } from "@/hooks/useDocuments";
import { useAppStore } from "@/store/useAppStore";
import type { AppDocument, DocumentStatus } from "@/types";

interface FileListProps {
  userId: string;
}

const TYPE_ICON: Record<AppDocument["fileType"], typeof FileText> = {
  pdf: FileText,
  docx: FileType2,
  markdown: Notebook,
  txt: Notebook,
};

function statusBadge(status: DocumentStatus) {
  switch (status) {
    case "ready":
      return <Badge variant="success">Ready</Badge>;
    case "processing":
      return (
        <Badge variant="default" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Processing
        </Badge>
      );
    case "queued":
      return <Badge variant="secondary">Queued</Badge>;
    case "uploading":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading
        </Badge>
      );
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({ userId }: FileListProps) {
  const { data: documents, isLoading } = useDocuments(userId);
  const deleteDocument = useDeleteDocument(userId);
  const selectedDocumentIds = useAppStore((s) => s.selectedDocumentIds);
  const toggleSelectedDocument = useAppStore((s) => s.toggleSelectedDocument);

  if (isLoading) return null;
  if (!documents || documents.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Your documents
        </p>
        {selectedDocumentIds.length > 0 && (
          <p className="text-xs text-primary-600">
            {selectedDocumentIds.length} selected for this chat
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {documents.map((doc) => {
          const Icon = TYPE_ICON[doc.fileType];
          const isSelected = selectedDocumentIds.includes(doc.id);
          return (
            <div
              key={doc.id}
              onClick={() => doc.status === "ready" && toggleSelectedDocument(doc.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-card px-3.5 py-2.5 transition-colors",
                doc.status === "ready" && "cursor-pointer hover:border-primary-300",
                isSelected ? "border-primary-400 bg-primary-50/60" : "border-border",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(doc.fileSizeBytes)}
                  {doc.pageCount ? ` · ${doc.pageCount} pages` : ""}
                  {doc.chunkCount ? ` · ${doc.chunkCount} chunks` : ""}
                </p>
              </div>
              {statusBadge(doc.status)}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument.mutate(doc.id);
                    }}
                    aria-label={`Remove ${doc.fileName}`}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Remove document</TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}
