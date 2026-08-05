"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"

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
import {
  useScentedItems,
  type ScentScaleFactory,
} from "@/components/ui/scented/use-scented-items"

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
  scale,
  orderByScent = true,
  showScentLabel = false,
  placeholder,
  emptyMessage = "No results found.",
  className,
  multiple,
  ...props
}: ScentedComboboxProps<Value, Multiple>) {
  const anchorRef = useComboboxAnchor()

  const { orderedItems, scentByItem } = useScentedItems(
    items,
    getItemScent,
    scale,
    orderByScent
  )

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
