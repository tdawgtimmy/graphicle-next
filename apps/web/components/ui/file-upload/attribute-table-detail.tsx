"use client";

import * as React from "react";

import {
  AttributeTable,
  type AttributeRow,
} from "@/components/ui/file-upload/attribute-table";
import { Input } from "@/components/ui/input";

type AttributeDetailSeed = {
  entityLabel: string;
  rows: AttributeRow[];
  selectedAttributes: Set<string>;
};

/**
 * An example consumer of `FileDetailPanel`'s `children` slot: an editable
 * entity label above the detected attributes. `FileDetailPanel` itself has
 * no knowledge of either piece — this is composed by whichever step/page
 * shows attribute selection for a successfully processed file.
 */
function AttributeTableDetail({
  entityLabel,
  onEntityLabelChange,
  rows,
  selectedAttributes,
  onSelectedAttributesChange,
  onAttributeLabelChange,
}: {
  entityLabel: string;
  onEntityLabelChange?: (value: string) => void;
  rows: AttributeRow[];
  selectedAttributes: Set<string>;
  onSelectedAttributesChange: (selected: Set<string>) => void;
  onAttributeLabelChange?: (id: string, label: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-6">
      <div className="flex w-full items-center gap-1">
        <span className="w-30 shrink-0 text-sm/5 font-medium text-foreground">
          Entity Label
        </span>
        <Input
          value={entityLabel}
          onChange={(event) => onEntityLabelChange?.(event.target.value)}
          readOnly={!onEntityLabelChange}
          className="h-8 flex-1"
          aria-label="Entity Label"
        />
      </div>
      <AttributeTable
        className="min-h-0 w-full flex-1"
        rows={rows}
        selected={selectedAttributes}
        onSelectedChange={onSelectedAttributesChange}
        onLabelChange={onAttributeLabelChange}
      />
    </div>
  );
}

export { AttributeTableDetail };
export type { AttributeDetailSeed };
