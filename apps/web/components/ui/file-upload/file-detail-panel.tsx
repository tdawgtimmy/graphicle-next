"use client";

import * as React from "react";
import { FileClock, SquareMousePointer, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AttributeTable,
  type AttributeRow,
} from "@/components/ui/file-upload/attribute-table";
import { FileErrorAlert } from "@/components/ui/file-upload/file-error-alert";
import {
  FileSelectionItem,
  type FileSelectionItemStatus,
} from "@/components/ui/file-upload/file-selection-item";

type FileDetailPanelFile = {
  id: string;
  filename: string;
  status: FileSelectionItemStatus;
  /** Category shown ahead of the status text, e.g. "Primary" or "Related". */
  fileType?: string;
  rowCount?: number;
};

type SelectedFileDetail =
  | {
      type: "success";
      entityLabel: string;
      /** Omit to render the Entity Label field read-only. */
      onEntityLabelChange?: (value: string) => void;
      rows: AttributeRow[];
      selectedAttributes: Set<string>;
      onSelectedAttributesChange: (selected: Set<string>) => void;
      onAttributeLabelChange?: (id: string, label: string) => void;
    }
  | {
      type: "error";
      message: string;
      details?: string;
      defaultDetailsOpen?: boolean;
    };

type FileDetailPanelProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Files shown in the left-hand list, in display order. */
  files: FileDetailPanelFile[];
  /** ID of the file shown in the detail pane. */
  selectedFileId?: string;
  /** Not called for files with `status: "loading"` — they aren't selectable. */
  onSelectFile?: (id: string) => void;
  /**
   * Content for the detail pane, matching the selected file's status. Omit
   * while the selected file is still loading, or while nothing is selected,
   * to show the panel's empty state.
   */
  selectedFileDetail?: SelectedFileDetail;
  /** Shows a "Delete" button in the detail heading for the selected file. */
  onDeleteSelectedFile?: () => void;
};

function FileDetailPanel({
  className,
  files,
  selectedFileId,
  onSelectFile,
  selectedFileDetail,
  onDeleteSelectedFile,
  ...props
}: FileDetailPanelProps) {
  const selectedFile = files.find((file) => file.id === selectedFileId);
  const filesStillLoading =
    files.length > 0 && files.every((file) => file.status === "loading");

  return (
    <div
      data-slot="file-detail-panel"
      className={cn(
        "grid h-full w-full grid-cols-12 gap-4 rounded-lg border bg-card p-4",
        className
      )}
      {...props}
    >
      <div className="col-span-4 flex h-full flex-col items-start gap-0.5">
        {files.map((file) => {
          const selectable = file.status !== "loading";
          return (
            <FileSelectionItem
              key={file.id}
              filename={file.filename}
              status={file.status}
              fileType={file.fileType}
              rowCount={file.rowCount}
              selected={file.id === selectedFileId}
              role={selectable ? "button" : undefined}
              aria-pressed={selectable ? file.id === selectedFileId : undefined}
              onClick={selectable ? () => onSelectFile?.(file.id) : undefined}
              onKeyDown={
                selectable
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectFile?.(file.id);
                      }
                    }
                  : undefined
              }
            />
          );
        })}
      </div>

      {selectedFile && selectedFileDetail ? (
        <div
          className={cn(
            "col-span-8 flex h-full min-w-0 flex-col items-start",
            selectedFileDetail.type === "success" ? "gap-6" : "gap-2.5"
          )}
        >
          <div className="flex w-full flex-col items-start gap-2 pl-3">
            <div className="flex w-full items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-base/6 font-medium text-foreground">
                {selectedFile.filename}
              </p>
              <Button
                variant="secondary"
                destructive
                size="sm"
                onClick={onDeleteSelectedFile}
              >
                Delete
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
            {selectedFileDetail.type === "success" && (
              <div className="flex w-full items-center gap-1">
                <span className="w-[120px] shrink-0 text-sm/5 font-medium text-foreground">
                  Entity Label
                </span>
                <Input
                  value={selectedFileDetail.entityLabel}
                  onChange={(event) =>
                    selectedFileDetail.onEntityLabelChange?.(event.target.value)
                  }
                  readOnly={!selectedFileDetail.onEntityLabelChange}
                  className="h-8 flex-1"
                  aria-label="Entity Label"
                />
              </div>
            )}
          </div>

          {selectedFileDetail.type === "success" ? (
            <AttributeTable
              className="min-h-0 w-full flex-1"
              rows={selectedFileDetail.rows}
              selected={selectedFileDetail.selectedAttributes}
              onSelectedChange={selectedFileDetail.onSelectedAttributesChange}
              onLabelChange={selectedFileDetail.onAttributeLabelChange}
            />
          ) : (
            <FileErrorAlert
              className="w-full"
              message={selectedFileDetail.message}
              details={selectedFileDetail.details}
              defaultDetailsOpen={selectedFileDetail.defaultDetailsOpen}
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
export type { FileDetailPanelFile, FileDetailPanelProps, SelectedFileDetail };
