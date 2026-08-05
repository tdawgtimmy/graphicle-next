"use client"

import * as React from "react"

import {
  computeScentRatios,
  type ScentScaleFactory,
} from "@/components/ui/scented/scent-scale"

export { defaultScentScale } from "@/components/ui/scented/scent-scale"
export type { ScentScaleFactory } from "@/components/ui/scented/scent-scale"

export interface ScentEntry {
  scent: number
  ratio: number
}

/**
 * Computes each item's scent exactly once (not per sort comparison, per
 * extent call, and per render), then reuses the precomputed values for
 * ordering and lookup. See `notes/scented-combobox.md`.
 */
export function useScentedItems<Value>(
  items: readonly Value[],
  getItemScent: (item: Value) => number,
  scale?: ScentScaleFactory,
  orderByScent = true
) {
  return React.useMemo(() => {
    const scents = items.map(getItemScent)
    const toRatio = computeScentRatios(scents, scale)

    const scentByItem = new Map<Value, ScentEntry>()
    items.forEach((item, i) => {
      const scent = scents[i]
      scentByItem.set(item, { scent, ratio: toRatio(scent) })
    })

    const orderedItems = orderByScent
      ? [...items].sort(
          (a, b) => scentByItem.get(b)!.scent - scentByItem.get(a)!.scent
        )
      : items

    return { orderedItems, scentByItem }
  }, [items, getItemScent, scale, orderByScent])
}
