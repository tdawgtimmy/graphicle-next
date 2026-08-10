"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  FileDrop,
  FileDropDescription,
  formatBytes,
  isFileAccepted,
  type FileRejection,
} from "@/components/ui/file-upload/file-drop";
import { FileDetailPanel } from "@/components/ui/file-upload/file-detail-panel";
import type { UploadFile } from "@/components/ui/file-upload/types";
import { Input } from "@/components/ui/input";

const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const DEFAULT_ACCEPTED_FILE_TYPES = [".xlsx", ".csv", ".tsv"];

type NodesStepProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The single required primary-entity file, or `null` before one is chosen. */
  primaryFile: UploadFile | null;
  onPrimaryFileSelected: (file: File) => void;
  onPrimaryFileRejected?: (rejection: FileRejection) => void;

  /** Zero or more related-entity files. */
  relatedFiles: UploadFile[];
  onRelatedFilesSelected: (files: File[]) => void;
  onRelatedFilesRejected?: (rejections: FileRejection[]) => void;

  /** Passed straight through to the Validate section's `FileDetailPanel`. */
  selectedFileId?: string;
  onSelectFile?: (id: string) => void;
  /** Shows a cancel button on rows with `status: "loading"`. */
  onCancelFile?: (id: string) => void;
  /**
   * Shows a delete button on rows with `status: "success" | "error"`. Also
   * called once per errored file when the user confirms "Discard and
   * continue" in the Next confirmation dialog — so removing a file from your
   * own state only needs to be handled in this one place.
   */
  onDeleteFile?: (id: string) => void;
  /** Success-state detail body for the selected file, forwarded to `FileDetailPanel`. */
  children?: React.ReactNode;

  /** Omit to render Back disabled — this step has no previous step to return to. */
  onBack?: () => void;
  /**
   * Called once it's safe to advance: immediately if no file has
   * `status: "error"`, or after the user confirms discarding errored files
   * otherwise.
   */
  onNext: () => void;

  /** Destination for "How do I format my data?". Omit to render the link inert. */
  formatHelpHref?: string;

  maxFileSizeBytes?: number;
  acceptedFileTypes?: string[];
};

function NodesStep({
  className,
  primaryFile,
  onPrimaryFileSelected,
  onPrimaryFileRejected,
  relatedFiles,
  onRelatedFilesSelected,
  onRelatedFilesRejected,
  selectedFileId,
  onSelectFile,
  onCancelFile,
  onDeleteFile,
  children,
  onBack,
  onNext,
  formatHelpHref,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
  acceptedFileTypes = DEFAULT_ACCEPTED_FILE_TYPES,
  ...props
}: NodesStepProps) {
  const [confirmDiscardOpen, setConfirmDiscardOpen] = React.useState(false);

  const files = React.useMemo<UploadFile[]>(() => {
    const merged: UploadFile[] = [];
    if (primaryFile) merged.push({ ...primaryFile, fileType: "Primary" });
    for (const file of relatedFiles) {
      merged.push({ ...file, fileType: "Related" });
    }
    return merged;
  }, [primaryFile, relatedFiles]);

  const hasErrorFiles = files.some((file) => file.status === "error");
  const nextDisabled =
    !primaryFile || files.some((file) => file.status === "loading");

  function handleNext() {
    if (hasErrorFiles) {
      setConfirmDiscardOpen(true);
      return;
    }
    onNext();
  }

  function handleConfirmDiscard() {
    for (const file of files) {
      if (file.status === "error") onDeleteFile?.(file.id);
    }
    setConfirmDiscardOpen(false);
    onNext();
  }

  function handlePrimaryInputChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!isFileAccepted(file, acceptedFileTypes)) {
      onPrimaryFileRejected?.({ file, reason: "type" });
      return;
    }
    if (file.size > maxFileSizeBytes) {
      onPrimaryFileRejected?.({ file, reason: "size" });
      return;
    }
    onPrimaryFileSelected(file);
  }

  return (
    <div
      data-slot="nodes-step"
      className={cn("flex w-full flex-col", className)}
      {...props}
    >
      <div className="flex w-full flex-col gap-12 px-12 py-8">
        <div className="flex w-full flex-col gap-6">
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full items-start gap-2">
              <h2 className="flex-1 text-2xl font-semibold tracking-tight text-foreground">
                Nodes
              </h2>
              {formatHelpHref ? (
                <a
                  href={formatHelpHref}
                  className="text-sm font-medium text-foreground underline underline-offset-4"
                >
                  How do I format my data?
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="cursor-not-allowed text-sm font-medium text-muted-foreground underline underline-offset-4"
                >
                  How do I format my data?
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Define the primary entity to visualize and entities that are
              related. Example: Physicians (primary), Hospitals, Society
              Memberships, and Publications.
            </p>
          </div>

          <div className="flex w-full flex-col gap-1">
            <label
              htmlFor="nodes-step-primary-file"
              className="text-sm font-medium text-foreground"
            >
              Primary Entity
            </label>
            <div className="flex w-full items-center gap-4">
              <Input
                id="nodes-step-primary-file"
                type="file"
                accept={acceptedFileTypes.join(",")}
                onChange={handlePrimaryInputChange}
                className="h-auto flex-1 py-1.5"
              />
              <p className="shrink-0 text-xs text-muted-foreground">
                Max {formatBytes(maxFileSizeBytes)} |{" "}
                {acceptedFileTypes.join(", ")}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Related Entities
            </span>
            <FileDrop
              accept={acceptedFileTypes}
              maxSize={maxFileSizeBytes}
              multiple
              onFilesAccepted={onRelatedFilesSelected}
              onFilesRejected={onRelatedFilesRejected}
            >
              Click to upload or drag and drop
              <FileDropDescription />
            </FileDrop>
          </div>
        </div>

        {files.length > 0 && (
          <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-col gap-2">
              <h3 className="text-xl font-semibold text-foreground">
                Validate
              </h3>
              <p className="text-sm text-muted-foreground">
                Select node attributes to include in the visualization below.
                You may also provide an alias label for the attribute that
                will be used throughout the tool. Data types will be verified
                when setting up filters.
              </p>
            </div>
            <FileDetailPanel
              className="h-[542px] max-h-[542px] w-full"
              files={files}
              selectedFileId={selectedFileId}
              onSelectFile={onSelectFile}
              onCancelFile={onCancelFile}
              onDeleteFile={onDeleteFile}
            >
              {children}
            </FileDetailPanel>
          </div>
        )}
      </div>

      <div className="flex w-full items-center justify-between px-12 pt-4 pb-8">
        <Button variant="outline" onClick={onBack} disabled={!onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={nextDisabled}>
          Next
        </Button>
      </div>

      <AlertDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Are you sure you want to continue?
          </AlertDialogTitle>
          <AlertDialogDescription>
            All files with errors will be discarded.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction destructive onClick={handleConfirmDiscard}>
              Discard and continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { NodesStep };
export type { NodesStepProps };
