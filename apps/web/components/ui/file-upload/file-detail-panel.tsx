"use client";

import * as React from "react";
import { FileClock, SquareMousePointer, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileErrorAlert } from "@/components/ui/file-upload/file-error-alert";
import { FileSelectionItem } from "@/components/ui/file-upload/file-selection-item";
import type { UploadFile } from "@/components/ui/file-upload/types";

type FileDetailPanelProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Files shown in the left-hand list, in display order. */
  files: UploadFile[];
  /** ID of the file shown in the detail pane. */
  selectedFileId?: string;
  /** Not called for files with `status: "loading"` — they aren't selectable. */
  onSelectFile?: (id: string) => void;
  /** Shows a cancel button on rows with `status: "loading"`. */
  onCancelFile?: (id: string) => void;
  /**
   * Shows a delete button on rows with `status: "success" | "error"`, and in
   * the detail heading for the selected file.
   */
  onDeleteFile?: (id: string) => void;
  /**
   * Detail body for the selected file, rendered below the filename + Delete
   * heading. Only shown while the selected file's status is "success" —
   * "loading" and "error" states are handled by the panel itself. Stretches
   * to fill the available space; key it by file ID if it holds any local
   * state (e.g. `key={selectedFile.id}`), so switching files doesn't leak
   * state from the previous selection.
   */
  children?: React.ReactNode;
};

function FileDetailPanel({
  className,
  files,
  selectedFileId,
  onSelectFile,
  onCancelFile,
  onDeleteFile,
  children,
  ...props
}: FileDetailPanelProps) {
  const selectedFile = files.find((file) => file.id === selectedFileId);
  const filesStillLoading =
    files.length > 0 && files.every((file) => file.status === "loading");

  return (
    <div
      data-slot="file-detail-panel"
      className={cn(
        "grid h-full w-full grid-cols-12 gap-6 rounded-lg border bg-card p-4",
        className
      )}
      {...props}
    >
      <div className="col-span-4 flex h-full flex-col items-start">
        {files.map((file) => {
          const selectable = Boolean(onSelectFile) && file.status !== "loading";
          return (
            <FileSelectionItem
              key={file.id}
              filename={file.filename}
              status={file.status}
              fileType={file.fileType}
              rowCount={file.status === "success" ? file.rowCount : undefined}
              selected={file.id === selectedFileId}
              role={selectable ? "button" : undefined}
              aria-pressed={selectable ? file.id === selectedFileId : undefined}
              onSelect={onSelectFile ? () => onSelectFile(file.id) : undefined}
              onCancel={onCancelFile ? () => onCancelFile(file.id) : undefined}
              onDelete={onDeleteFile ? () => onDeleteFile(file.id) : undefined}
            />
          );
        })}
      </div>

      {selectedFile ? (
        <div className="col-span-8 flex h-full min-w-0 flex-col items-start gap-2.5">
          <div className="flex w-full items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-base/6 font-medium text-foreground">
              {selectedFile.filename}
            </p>
            <Button
              variant="secondary"
              destructive
              size="sm"
              onClick={
                onDeleteFile ? () => onDeleteFile(selectedFile.id) : undefined
              }
            >
              Delete
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>

          {selectedFile.status === "success" && (
            <div
              data-slot="file-detail-panel-content"
              className="grid min-h-0 w-full flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]"
            >
              {children}
            </div>
          )}

          {selectedFile.status === "error" && (
            <FileErrorAlert
              className="w-full"
              message={selectedFile.error.message}
              details={selectedFile.error.details}
              defaultDetailsOpen={selectedFile.error.defaultDetailsOpen}
            />
          )}
        </div>
      ) : (
        <div className="col-span-8 flex h-full flex-col items-center justify-center gap-2 rounded-xl bg-secondary p-8 text-center">
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
              {filesStillLoading ? (
                <FileClock
                  className="size-6 text-foreground"
                  aria-hidden="true"
                />
              ) : (
                <SquareMousePointer
                  className="size-6 text-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="flex w-full flex-col items-start gap-1 text-center">
              <p className="w-full text-base/6 font-medium text-foreground">
                {filesStillLoading ? "Files loading" : "No file selected"}
              </p>
              <p className="w-full text-sm/5 text-muted-foreground">
                {filesStillLoading
                  ? "The files you uploaded are being processed. Hold on..."
                  : "Select a processed file from the list"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { FileDetailPanel };
export type { FileDetailPanelProps };
