"use client";

import * as React from "react";
import { FileUp } from "lucide-react";

import { cn } from "@/lib/utils";

type FileRejection = {
  file: File;
  reason: "type" | "size";
};

type FileDropContextValue = {
  accept?: string[];
  maxSize?: number;
};

const FileDropContext = React.createContext<FileDropContextValue | null>(null);

function useFileDropContext(component: string) {
  const context = React.useContext(FileDropContext);
  if (!context) {
    throw new Error(`\`${component}\` must be used within a \`FileDrop\`.`);
  }
  return context;
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

function isFileAccepted(file: File, accept?: string[]) {
  if (!accept?.length) return true;
  return accept.some((pattern) => {
    const normalized = pattern.toLowerCase().trim();
    if (normalized.startsWith(".")) {
      return file.name.toLowerCase().endsWith(normalized);
    }
    if (normalized.endsWith("/*")) {
      return file.type.startsWith(normalized.slice(0, -1));
    }
    return file.type === normalized;
  });
}

function validateFiles(files: File[], accept?: string[], maxSize?: number) {
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];

  for (const file of files) {
    if (!isFileAccepted(file, accept)) {
      rejected.push({ file, reason: "type" });
    } else if (maxSize !== undefined && file.size > maxSize) {
      rejected.push({ file, reason: "size" });
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}

type FileDropProps = Omit<
  React.ComponentProps<"input">,
  "type" | "accept" | "size" | "onChange" | "children"
> & {
  /** File types accepted, as extensions (".csv") or MIME types/patterns ("image/*"). Also drives the default `FileDropDescription` text. */
  accept?: string[];
  /** Maximum file size in bytes. Also drives the default `FileDropDescription` text. */
  maxSize?: number;
  children?: React.ReactNode;
  onFilesAccepted?: (files: File[]) => void;
  onFilesRejected?: (rejections: FileRejection[]) => void;
};

function FileDrop({
  className,
  accept,
  maxSize,
  multiple,
  disabled,
  children,
  onFilesAccepted,
  onFilesRejected,
  ...props
}: FileDropProps) {
  const [isDragActive, setIsDragActive] = React.useState(false);
  const dragCounter = React.useRef(0);

  const handleFiles = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const { accepted, rejected } = validateFiles(
        Array.from(fileList),
        accept,
        maxSize
      );
      if (accepted.length) onFilesAccepted?.(accepted);
      if (rejected.length) onFilesRejected?.(rejected);
    },
    [accept, maxSize, onFilesAccepted, onFilesRejected]
  );

  const contextValue = React.useMemo(
    () => ({ accept, maxSize }),
    [accept, maxSize]
  );

  return (
    <FileDropContext.Provider value={contextValue}>
      <label
        data-slot="file-drop"
        data-state={isDragActive ? "active" : "idle"}
        className={cn(
          "group/file-drop relative flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-transparent bg-background p-6 text-center transition-colors",
          "data-[state=idle]:hover:bg-muted/50",
          "has-[input:focus-visible]:border-solid has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring/30",
          "has-[input[aria-invalid=true]]:border-solid has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-2 has-[input[aria-invalid=true]]:ring-destructive/20 dark:has-[input[aria-invalid=true]]:ring-destructive/40",
          "has-[input:disabled]:pointer-events-none has-[input:disabled]:opacity-50",
          "data-[state=active]:border-solid data-[state=active]:border-border data-[state=active]:bg-secondary",
          className
        )}
        onDragEnter={(event) => {
          if (disabled) return;
          event.preventDefault();
          dragCounter.current += 1;
          setIsDragActive(true);
        }}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          if (disabled) return;
          event.preventDefault();
          dragCounter.current -= 1;
          if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setIsDragActive(false);
          }
        }}
        onDrop={(event) => {
          if (disabled) return;
          event.preventDefault();
          dragCounter.current = 0;
          setIsDragActive(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          data-slot="file-drop-input"
          className="peer/file-drop-input sr-only"
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
          {...props}
        />
        {/* Dashed border as an SVG overlay so the dash/gap length can be set explicitly — CSS `border-dashed` doesn't expose that control. Hidden in favor of the solid CSS border once a solid state (active/focus/invalid) applies. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full overflow-visible stroke-border transition-opacity group-data-[state=active]/file-drop:opacity-0 peer-focus-visible/file-drop-input:opacity-0 peer-aria-invalid/file-drop-input:opacity-0"
        >
          <rect
            width="100%"
            height="100%"
            rx="7"
            ry="7"
            fill="none"
            strokeWidth="1"
            strokeDasharray="8 8"
          />
        </svg>
        <FileUp
          className="size-6 shrink-0 text-foreground"
          aria-hidden="true"
        />
        <div className="flex flex-col items-center gap-0.5 [word-break:break-word]">
          {React.Children.map(children, (child) =>
            typeof child === "string" || typeof child === "number" ? (
              <p className="text-sm font-medium text-foreground">{child}</p>
            ) : (
              child
            )
          )}
        </div>
      </label>
    </FileDropContext.Provider>
  );
}

function defaultFileDropDescription(accept?: string[], maxSize?: number) {
  const parts: string[] = [];
  if (maxSize !== undefined) parts.push(`Max ${formatBytes(maxSize)}`);
  if (accept?.length) parts.push(accept.join(", "));
  return parts.length ? parts.join(" | ") : null;
}

function FileDropDescription({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  const { accept, maxSize } = useFileDropContext("FileDropDescription");
  const content = children ?? defaultFileDropDescription(accept, maxSize);

  if (!content) return null;

  return (
    <p
      data-slot="file-drop-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    >
      {content}
    </p>
  );
}

export { FileDrop, FileDropDescription };
export type { FileRejection };
