import * as React from "react";
import { useRef, useState } from "react";
import { FileText, FileType2, Notebook, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUploadDocument } from "@/hooks/useDocuments";

interface UploadZoneProps {
  userId: string;
}

const UPLOAD_BUTTONS = [
  {
    label: "Upload PDF",
    accept: ".pdf,application/pdf",
    icon: FileText,
    description: "Contracts, policies, reports",
  },
  {
    label: "Upload DOCX",
    accept: ".docx,.doc",
    icon: FileType2,
    description: "Word documents",
  },
  {
    label: "Upload Documentation",
    accept: ".md,.markdown,.txt",
    icon: Notebook,
    description: "Markdown & SOPs",
  },
] as const;

export function UploadZone({ userId }: UploadZoneProps) {
  const { uploadFiles, isPending } = useUploadDocument(userId);
  const [isDragging, setIsDragging] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-xl border-2 border-dashed bg-card/50 p-6 transition-colors",
        isDragging ? "border-primary bg-primary-50/60" : "border-border",
      )}
    >
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
          <UploadCloud className="h-5 w-5 text-primary-600" />
        </div>
        <p className="text-sm font-medium">Drop files here, or choose a type below</p>
        <p className="text-xs text-muted-foreground">PDF, DOCX, Markdown or TXT — up to 25MB</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {UPLOAD_BUTTONS.map(({ label, accept, icon: Icon, description }) => (
          <div key={label}>
            <input
              ref={(el) => (inputRefs.current[label] = el)}
              type="file"
              accept={accept}
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => inputRefs.current[label]?.click()}
              className="h-auto w-full flex-col items-start gap-1 rounded-lg p-3.5 text-left"
            >
              <Icon className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className="text-xs font-normal text-muted-foreground">{description}</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
