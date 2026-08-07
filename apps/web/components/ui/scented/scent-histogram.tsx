"use client";

import * as React from "react";
import type { HistogramGeneratorNumber } from "d3-array";

import { cn } from "@/lib/utils";
import type { ScentScaleFactory } from "@/components/ui/scented/scent-scale";
import {
  useLayeredScentHistogram,
  type LayeredScentBin,
} from "@/components/ui/scented/use-scent-histogram";

interface ScentHistogramProps<Item> extends React.ComponentProps<"div"> {
  items: readonly Item[];
  getValue: (item: Item) => number;
  /** Value range the bars are laid out across — normally the slider's `[min, max]`. */
  domain: readonly [number, number];
  /** Selected span. Bins outside it render shadow-only. */
  range?: readonly [number, number] | null;
  orientation?: "horizontal" | "vertical";
  binOperator?: HistogramGeneratorNumber<Item, number>;
  scale?: ScentScaleFactory;
}

function ScentHistogram<Item>({
  items,
  getValue,
  domain,
  range,
  orientation = "horizontal",
  binOperator,
  scale,
  className,
  ...props
}: ScentHistogramProps<Item>) {
  const bins = useLayeredScentHistogram(
    items,
    getValue,
    domain,
    range,
    binOperator,
    scale
  );
  const vertical = orientation === "vertical";

  return (
    <div
      data-slot="scent-histogram"
      data-orientation={orientation}
      aria-hidden
      className={cn(
        "pointer-events-none flex gap-px",
        vertical
          ? // Lowest bin at the bottom, bars growing away from the track (which
            // sits to the right in vertical mode).
            "h-full w-(--scent-histogram,2.25rem) flex-col-reverse py-(--scent-inset)"
          : "h-(--scent-histogram,2.25rem) w-full items-end px-(--scent-inset)",
        className
      )}
      {...props}
    >
      {bins.map((bin, index) => (
        <ScentHistogramBar key={index} bin={bin} vertical={vertical} />
      ))}
    </div>
  );
}

function ScentHistogramBar({
  bin,
  vertical,
}: {
  bin: LayeredScentBin;
  vertical: boolean;
}) {
  const size = (ratio: number) =>
    vertical ? { width: `${ratio * 100}%` } : { height: `${ratio * 100}%` };

  return (
    <div className={cn("relative flex-1", vertical ? "w-full" : "h-full")}>
      <div
        data-slot="scent-histogram-shadow"
        className={cn(
          // Same muted value as ComboboxItemScent / SelectItemScent.
          "absolute rounded-[1px] bg-muted-foreground/25",
          vertical ? "right-0 h-full" : "bottom-0 w-full"
        )}
        style={size(bin.ratio)}
      />
      <div
        data-slot="scent-histogram-primary"
        className={cn(
          "absolute rounded-[1px] bg-primary",
          vertical ? "right-0 h-full" : "bottom-0 w-full"
        )}
        style={size(bin.selectedRatio)}
      />
    </div>
  );
}

export { ScentHistogram };
export type { ScentHistogramProps };
