"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemScent,
  SelectItemScentLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useScentedItems,
  type ScentScaleFactory,
} from "@/components/ui/scented/use-scented-items"

interface ScentedSelectProps<Value, Multiple extends boolean | undefined = false>
  extends Omit<SelectPrimitive.Root.Props<Value, Multiple>, "items"> {
  items: readonly Value[]
  getItemScent: (item: Value) => number
  getItemLabel?: (item: Value) => React.ReactNode
  scale?: ScentScaleFactory
  /** Whether to order items by scent, highest first. @default true */
  orderByScent?: boolean
  /** Whether to show the raw scent value next to each item's label. @default false */
  showScentLabel?: boolean
  placeholder?: string
  className?: string
}

function ScentedSelect<Value, Multiple extends boolean | undefined = false>({
  items,
  getItemScent,
  getItemLabel = (item) => String(item),
  scale,
  orderByScent = true,
  showScentLabel = false,
  placeholder,
  className,
  multiple,
  ...props
}: ScentedSelectProps<Value, Multiple>) {
  const { orderedItems, scentByItem } = useScentedItems(
    items,
    getItemScent,
    scale,
    orderByScent
  )

  return (
    <Select multiple={multiple} {...props}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {(value: Value | Value[] | null) => {
            if (Array.isArray(value)) {
              return value.length > 0 ? `${value.length} selected` : placeholder
            }
            return value != null ? getItemLabel(value) : placeholder
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {orderedItems.map((item, index) => {
          const entry = scentByItem.get(item)
          return (
            <SelectItem key={index} value={item}>
              <span className="flex items-center gap-1">
                {getItemLabel(item)}
                {showScentLabel && (
                  <SelectItemScentLabel>
                    ({(entry?.scent ?? 0).toLocaleString()})
                  </SelectItemScentLabel>
                )}
              </span>
              <SelectItemScent ratio={entry?.ratio ?? 0} />
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

export { ScentedSelect }
export type { ScentedSelectProps }
