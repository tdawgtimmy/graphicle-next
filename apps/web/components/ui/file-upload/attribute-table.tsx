"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Width, in px, that the checkbox column hugs — sized to its checkbox plus
 * cell padding, not part of the eighths split below.
 */
const CHECKBOX_COLUMN_WIDTH = 32

/**
 * Everything but the checkbox column divides into eighths: Attribute and
 * Label each take 3/8, Sample takes 2/8. This ratio is what keeps the
 * Sample column from collapsing to nothing at narrow widths — don't use
 * `AttributeTable` narrower than 400px, or Sample stops being legible.
 */
function columnWidth(eighths: 2 | 3) {
  return `calc((100% - ${CHECKBOX_COLUMN_WIDTH}px) * ${eighths} / 8)`
}

/** Renders `value` truncated with an ellipsis, and only wires up a tooltip revealing the full value once the text actually overflows. */
function TruncatableCell({ value }: { value: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = React.useState(false)

  React.useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const checkTruncation = () =>
      setIsTruncated(element.scrollWidth > element.clientWidth)

    checkTruncation()
    const observer = new ResizeObserver(checkTruncation)
    observer.observe(element)
    return () => observer.disconnect()
  }, [value])

  return (
    <Tooltip>
      <TooltipTrigger
        disabled={!isTruncated}
        render={
          <span
            ref={ref}
            tabIndex={isTruncated ? 0 : undefined}
            className="block truncate outline-none"
          />
        }
      >
        {value}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  )
}

type AttributeRow = {
  id: string
  /** Raw column name from the source file, shown in monospace. */
  attribute: string
  /** Human-friendly label for the attribute. Editable inline when `onLabelChange` is passed. */
  label: string
  /** Example value from the source file, shown in monospace. */
  sample: string
}

type AttributeTableProps = Omit<React.ComponentProps<"div">, "children"> & {
  rows: AttributeRow[]
  /** IDs of the currently selected rows. */
  selected: Set<string>
  onSelectedChange: (selected: Set<string>) => void
  /** Omit to render the Label column read-only. */
  onLabelChange?: (id: string, label: string) => void
}

function AttributeTable({
  className,
  rows,
  selected,
  onSelectedChange,
  onLabelChange,
  ...props
}: AttributeTableProps) {
  const selectedCount = rows.filter((row) => selected.has(row.id)).length
  const allSelected = rows.length > 0 && selectedCount === rows.length
  const someSelected = selectedCount > 0 && !allSelected

  function toggleRow(id: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) {
      next.add(id)
    } else {
      next.delete(id)
    }
    onSelectedChange(next)
  }

  function toggleAll(checked: boolean) {
    onSelectedChange(checked ? new Set(rows.map((row) => row.id)) : new Set())
  }

  return (
    <TooltipProvider>
      <div
        data-slot="attribute-table"
        className={cn("flex h-full min-h-0 w-full flex-col", className)}
        {...props}
      >
        <div className="flex shrink-0 items-center justify-center px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {selectedCount} of {rows.length} attribute
            {rows.length === 1 ? "" : "s"} selected
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          <table className="w-full table-fixed caption-bottom text-xs">
            <colgroup>
              <col style={{ width: CHECKBOX_COLUMN_WIDTH }} />
              <col style={{ width: columnWidth(3) }} />
              <col style={{ width: columnWidth(3) }} />
              <col style={{ width: columnWidth(2) }} />
            </colgroup>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    disabled={rows.length === 0}
                    aria-label="Select all attributes"
                  />
                </TableHead>
                <TableHead className="h-9">Attribute</TableHead>
                <TableHead className="h-9">Label</TableHead>
                <TableHead className="h-9">Sample</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isSelected = selected.has(row.id)
                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell className="h-11">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          toggleRow(row.id, checked)
                        }
                        aria-label={`Select ${row.attribute}`}
                      />
                    </TableCell>
                    <TableCell className="h-11 font-mono">
                      <TruncatableCell value={row.attribute} />
                    </TableCell>
                    <TableCell className="h-11">
                      <Input
                        value={row.label}
                        onChange={(event) =>
                          onLabelChange?.(row.id, event.target.value)
                        }
                        readOnly={!onLabelChange}
                        className="h-8 truncate"
                        aria-label={`Label for ${row.attribute}`}
                      />
                    </TableCell>
                    <TableCell className="h-11 font-mono">
                      <TruncatableCell value={row.sample} />
                    </TableCell>
                  </TableRow>
                )
              })}
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No attributes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  )
}

export { AttributeTable }
export type { AttributeRow, AttributeTableProps }
