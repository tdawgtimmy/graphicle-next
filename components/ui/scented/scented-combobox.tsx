"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { extent } from "d3-array"
import { scaleSqrt } from "d3-scale"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemScent,
  ComboboxItemScentLabel,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"

type ScentScaleFactory = (domain: [number, number]) => (value: number) => number

const defaultScale: ScentScaleFactory = (domain) =>
  scaleSqrt().domain(domain).range([0, 1]).clamp(true)

interface ScentEntry {
  scent: number
  ratio: number
}

interface ScentedComboboxProps<
  Value,
  Multiple extends boolean | undefined = false,
> extends Omit<ComboboxPrimitive.Root.Props<Value, Multiple>, "items"> {
  items: readonly Value[]
  getItemScent: (item: Value) => number
  getItemLabel?: (item: Value) => React.ReactNode
  scale?: ScentScaleFactory
  /** Whether to order items by scent, highest first. @default true */
  orderByScent?: boolean
  /** Whether to show the raw scent value next to each item's label. @default false */
  showScentLabel?: boolean
  placeholder?: string
  emptyMessage?: React.ReactNode
  className?: string
}

function ScentedCombobox<Value, Multiple extends boolean | undefined = false>({
  items,
  getItemScent,
  getItemLabel = (item) => String(item),
  scale = defaultScale,
  orderByScent = true,
  showScentLabel = false,
  placeholder,
  emptyMessage = "No results found.",
  className,
  multiple,
  ...props
}: ScentedComboboxProps<Value, Multiple>) {
  const anchorRef = useComboboxAnchor()

  const { orderedItems, scentByItem } = React.useMemo(() => {
    // Compute each item's scent exactly once, up front, instead of letting
    // sort/extent/render each re-invoke getItemScent per item.
    const scents = items.map(getItemScent)
    const [min, max] = extent(scents)
    const domain: [number, number] =
      min === undefined || max === undefined
        ? [0, 0]
        : min === max
          ? [0, max]
          : [min, max]

    const toRatio =
      domain[0] === domain[1] ? () => (domain[1] > 0 ? 1 : 0) : scale(domain)

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

  return (
    <Combobox items={orderedItems} multiple={multiple} {...props}>
      {multiple ? (
        <div ref={anchorRef}>
          <ComboboxChips className={className}>
            <ComboboxValue>
              {(value: Value[]) => (
                <>
                  {value.map((item, index) => (
                    <ComboboxChip key={index}>
                      {getItemLabel(item)}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    placeholder={value.length > 0 ? undefined : placeholder}
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
        </div>
      ) : (
        <ComboboxInput placeholder={placeholder} className={className} />
      )}
      <ComboboxContent anchor={multiple ? anchorRef : undefined}>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(item: Value, index: number) => {
            const entry = scentByItem.get(item)
            return (
              <ComboboxItem key={index} value={item}>
                <span className="flex items-center gap-1">
                  {getItemLabel(item)}
                  {showScentLabel && (
                    <ComboboxItemScentLabel>
                      ({(entry?.scent ?? 0).toLocaleString()})
                    </ComboboxItemScentLabel>
                  )}
                </span>
                <ComboboxItemScent ratio={entry?.ratio ?? 0} />
              </ComboboxItem>
            )
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export { ScentedCombobox }
export type { ScentedComboboxProps, ScentScaleFactory }
