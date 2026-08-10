"use client";

import * as React from "react";
import { FileCheck, FileWarning, LoaderCircle, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemMedia } from "@/components/ui/item";

type FileSelectionItemStatus = "loading" | "success" | "error";

type FileSelectionItemProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Name of the file. Truncated with an ellipsis if it doesn't fit. */
  filename: string;
  status: FileSelectionItemStatus;
  /** Category shown ahead of the status text, e.g. "Primary" or "Related". */
  fileType?: string;
  /** Row count shown once the file has finished loading successfully. */
  rowCount?: number;
  /**
   * Marks the item as the persistently active one in a list (adds the
   * active indicator bar). Has no effect while `status` is "loading".
   */
  selected?: boolean;
  /** Shows a cancel button while `status` is "loading". */
  onCancel?: () => void;
  /** Shows a delete button once `status` is "success" or "error". */
  onDelete?: () => void;
  /**
   * Called when the item itself is activated — click, or Enter while it has
   * focus. Never called for `status` "loading", and never called by
   * clicking the cancel/delete button. Enables the row's own cursor and
   * keyboard handling; omit it to render a non-selectable row.
   */
  onSelect?: () => void;
};

function formatRowCount(count: number) {
  if (count < 1000) return `${count}`;
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(count);
}

function FileSelectionItem({
  className,
  filename,
  status,
  fileType = "Primary",
  rowCount,
  selected = false,
  onCancel,
  onDelete,
  onSelect,
  ...props
}: FileSelectionItemProps) {
  const isInteractive = status !== "loading";
  const isSelected = selected && isInteractive;
  const hasSelectHandler = Boolean(onSelect);
  // Already-selected items have nothing left for a click/Enter to do.
  const canSelect = isInteractive && hasSelectHandler && !isSelected;

  const action =
    status === "loading"
      ? onCancel
        ? { label: `Cancel upload of ${filename}`, icon: X, onClick: onCancel }
        : undefined
      : onDelete
        ? { label: `Delete ${filename}`, icon: Trash2, onClick: onDelete }
        : undefined;

  return (
    <Item
      // Loading is non-interactive, so it's skipped in the tab order and
      // focus goes straight to the cancel button. Otherwise the item is its
      // own stop — focus reveals the delete button without moving into it.
      tabIndex={isInteractive ? 0 : undefined}
      aria-current={isSelected ? "true" : undefined}
      data-status={status}
      data-selected={isSelected || undefined}
      variant="default"
      onClick={canSelect ? onSelect : undefined}
      onKeyDown={
        canSelect
          ? (event) => {
              // Ignore keydowns bubbling up from the nested delete/cancel
              // button — only a key on the item itself selects it.
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter") {
                event.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      className={cn(
        "group/file-item relative gap-4 rounded-lg border-transparent px-4 py-2 transition-colors outline-none",
        isInteractive &&
          "hover:bg-secondary focus-visible:border-transparent focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/30",
        hasSelectHandler &&
          (!isInteractive
            ? "cursor-not-allowed"
            : isSelected
              ? "cursor-default"
              : "cursor-pointer"),
        isSelected && "rounded-l-none bg-secondary",
        className
      )}
      {...props}
    >
      {isSelected && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-border"
        />
      )}

      <ItemMedia className="size-5">
        {status === "loading" && (
          <LoaderCircle
            className="size-5 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
        {status === "success" && (
          <FileCheck className="size-5 text-foreground" aria-hidden="true" />
        )}
        {status === "error" && (
          <FileWarning className="size-5 text-destructive" aria-hidden="true" />
        )}
      </ItemMedia>

      <ItemContent className="min-w-0 gap-0">
        <p
          className={cn(
            "w-full truncate text-sm/5",
            status === "loading"
              ? "font-normal text-muted-foreground"
              : "font-medium text-foreground"
          )}
        >
          {filename}
        </p>
        <p className="w-full truncate text-xs/4 text-muted-foreground">
          {fileType}
          {status === "loading" && (
            <>
              {" • "}
              <span className="italic">Loading</span>
            </>
          )}
          {status === "success" &&
            rowCount !== undefined &&
            ` • ${formatRowCount(rowCount)} rows`}
          {status === "error" && (
            <>
              {" • "}
              <span className="italic">Error</span>
            </>
          )}
        </p>
      </ItemContent>

      {action && (
        <span className="absolute top-1/2 right-4 z-10 -translate-y-1/2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            destructive
            onClick={(event) => {
              // Don't let this bubble into the item's own onClick/onSelect.
              event.stopPropagation();
              action.onClick();
            }}
            aria-label={action.label}
            className={cn(
              "rounded-sm opacity-0 shadow-sm transition-opacity",
              "group-focus-within/file-item:opacity-100 group-hover/file-item:opacity-100"
            )}
          >
            <action.icon className="size-4" aria-hidden="true" />
          </Button>
        </span>
      )}
    </Item>
  );
}

export { FileSelectionItem };
export type { FileSelectionItemProps, FileSelectionItemStatus };
