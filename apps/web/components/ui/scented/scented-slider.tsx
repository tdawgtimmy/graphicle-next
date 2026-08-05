"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import type { HistogramGeneratorNumber } from "d3-array"
import { scaleLinear } from "d3-scale"

import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { ScentHistogram } from "@/components/ui/scented/scent-histogram"
import type { ScentScaleFactory } from "@/components/ui/scented/scent-scale"

/**
 * Tick generation config.
 *
 * This deliberately takes tick *values* + a formatter rather than a
 * `d3.axis` generator: `d3-axis` renders imperatively into an SVG it owns,
 * which would fight React over the same DOM. `ticks` accepts either an
 * explicit array or a count hint handed to `d3.scaleLinear().ticks()`, so
 * d3 still does the tick-choosing.
 */
interface ScentedSliderAxis {
  /** Explicit tick values, or a count hint. Defaults to `[min, max]`. */
  ticks?: number | readonly number[]
  tickFormat?: (value: number) => string
}

type SliderValue = number | readonly number[]

interface ScentedSliderProps<Item> extends Omit<
  SliderPrimitive.Root.Props<SliderValue>,
  "value" | "defaultValue" | "onValueChange" | "render" | "children"
> {
  items: readonly Item[]
  getValue: (item: Item) => number
  value?: SliderValue
  defaultValue?: SliderValue
  onValueChange?: (
    value: SliderValue,
    eventDetails: SliderPrimitive.Root.ChangeEventDetails
  ) => void
  axis?: ScentedSliderAxis
  /** Render the axis at rest, not only while hovered/focused. @default false */
  alwaysShowAxis?: boolean
  /** Render value labels only while hovered/focused. @default false */
  showValuesOnHover?: boolean
  /**
   * For a single-thumb slider, treat `[min, value]` as selected instead of
   * `[value, max]`. Independent of `dir`/RTL, which controls layout
   * direction only — this controls which side reads as "filtered in".
   * No effect in range (two-thumb) mode.
   * @default false
   */
  invert?: boolean
  binOperator?: HistogramGeneratorNumber<Item, number>
  scale?: ScentScaleFactory
  className?: string
}

function ScentedSlider<Item>({
  items,
  getValue,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  orientation = "horizontal",
  axis,
  alwaysShowAxis = false,
  showValuesOnHover = false,
  invert = false,
  binOperator,
  scale,
  className,
  ...props
}: ScentedSliderProps<Item>) {
  const [internalValue, setInternalValue] = React.useState<SliderValue>(
    () => defaultValue ?? value ?? min
  )
  const currentValue = value ?? internalValue
  const values = React.useMemo(
    () =>
      Array.isArray(currentValue) ? currentValue : [currentValue as number],
    [currentValue]
  )

  const [active, setActive] = React.useState(false)
  const vertical = orientation === "vertical"

  const isRange = values.length > 1
  // Only a single thumb has an ambiguous "selected" side to flip.
  const inverted = invert && !isRange

  const selectedRange = React.useMemo<[number, number]>(() => {
    if (isRange) {
      return [Math.min(...values), Math.max(...values)]
    }
    return inverted ? [values[0], max] : [min, values[0]]
  }, [values, isRange, inverted, min, max])

  const tickValues = React.useMemo(() => {
    const ticks = axis?.ticks
    if (Array.isArray(ticks)) return [...ticks]
    if (typeof ticks === "number") {
      return scaleLinear().domain([min, max]).ticks(ticks)
    }
    return [min, max]
  }, [axis?.ticks, min, max])

  const format = axis?.tickFormat ?? ((v: number) => String(v))

  const { tickRefs, valueRefs, hiddenTicks, rootRef } = useTickCollisions(
    tickValues.length,
    values.length
  )

  // Mirrors base-ui's `thumbAlignment="edge"` math, which insets thumb travel
  // by half a thumb so the thumb never overflows the control. Labels and the
  // histogram use the same inset so a value lines up across all three.
  const offset = (v: number) => {
    const pct = max === min ? 0 : (v - min) / (max - min)
    const position = `calc(var(--scent-inset) + ${pct} * (100% - 2 * var(--scent-inset)))`
    return vertical ? { bottom: position } : { insetInlineStart: position }
  }

  const axisVisible = alwaysShowAxis || active
  const valuesVisible = !showValuesOnHover || active

  // The bars are the most eye-catching target, so clicking one should seek
  // like clicking the track. Base UI's press handler lives on the control and
  // doesn't check what was hit, so extending the control's *hit area* over the
  // histogram is enough — no event forwarding, no duplicated seek logic. A
  // pseudo-element hit-tests as its originating element without changing that
  // element's border box, and the pointer→value math only reads the main
  // axis, so widening the cross-axis leaves positions exact.
  const controlHitArea = vertical
    ? "**:data-[slot=slider-control]:before:absolute **:data-[slot=slider-control]:before:inset-y-0 **:data-[slot=slider-control]:before:end-full **:data-[slot=slider-control]:before:w-[calc(var(--scent-histogram)+1px)] **:data-[slot=slider-control]:before:content-['']"
    : "**:data-[slot=slider-control]:before:absolute **:data-[slot=slider-control]:before:inset-x-0 **:data-[slot=slider-control]:before:bottom-full **:data-[slot=slider-control]:before:h-[calc(var(--scent-histogram)+1px)] **:data-[slot=slider-control]:before:content-['']"

  const labels = (
    <div
      data-slot="scented-slider-axis"
      aria-hidden
      className={cn(
        "relative shrink-0 text-[0.625rem] leading-none",
        vertical ? "h-full w-10" : "h-4 w-full"
      )}
    >
      {tickValues.map((tick, index) => (
        <div
          key={`tick-${index}`}
          data-slot="scented-slider-tick"
          className={cn(
            "absolute transition-opacity",
            vertical ? "translate-y-1/2" : "-translate-x-1/2",
            axisVisible ? "opacity-100" : "opacity-0"
          )}
          style={offset(tick)}
        >
          {/* Absolute, so removing it from the value labels below doesn't
              shift their text out of line with the ticks'. */}
          <div
            className={cn(
              "absolute bg-border",
              // Sits just inside the axis column, next to the track rather
              // than on top of it — the column begins at the track's edge.
              vertical
                ? "top-1/2 left-0 h-px w-1"
                : "top-0 left-1/2 h-1 w-px -translate-x-1/2"
            )}
          />
          <span
            ref={(el) => {
              tickRefs.current[index] = el
            }}
            className={cn(
              "block whitespace-nowrap text-muted-foreground",
              vertical ? "pl-1.5" : "pt-1.5",
              hiddenTicks[index] && "invisible"
            )}
          >
            {format(tick)}
          </span>
        </div>
      ))}

      {values.map((v, index) => (
        <div
          key={`value-${index}`}
          data-slot="scented-slider-value"
          className={cn(
            "absolute z-10 transition-opacity",
            vertical ? "translate-y-1/2" : "-translate-x-1/2",
            valuesVisible ? "opacity-100" : "opacity-0"
          )}
          style={offset(v)}
        >
          <span
            ref={(el) => {
              valueRefs.current[index] = el
            }}
            className={cn(
              "block font-medium whitespace-nowrap text-foreground",
              vertical ? "pl-1.5" : "pt-1.5"
            )}
          >
            {format(v)}
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <div
      ref={rootRef}
      data-slot="scented-slider"
      data-orientation={orientation}
      className={cn(
        "group/scented-slider flex [--scent-histogram:2.25rem] [--scent-inset:0.375rem]",
        vertical ? "h-full flex-row items-stretch" : "w-full flex-col",
        className
      )}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocusCapture={() => setActive(true)}
      onBlurCapture={() => setActive(false)}
    >
      <ScentHistogram
        items={items}
        getValue={getValue}
        domain={[min, max]}
        range={selectedRange}
        orientation={orientation}
        binOperator={binOperator}
        scale={scale}
        className="mb-px data-[orientation=vertical]:mr-px data-[orientation=vertical]:mb-0"
      />
      <Slider
        min={min}
        max={max}
        orientation={orientation}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next, eventDetails) => {
          setInternalValue(next)
          onValueChange?.(next, eventDetails)
        }}
        // The built-in indicator always fills min→value. Rather than hide it
        // and overlay our own bar (which would then have to fight the thumbs
        // for stacking order), swap the two backgrounds: the track paints the
        // filled colour and the indicator masks off the unselected side. The
        // track's own clipping and rounding then apply unchanged.
        className={cn(
          controlHitArea,
          inverted &&
            "**:data-[slot=slider-range]:bg-muted **:data-[slot=slider-track]:bg-primary"
        )}
        {...props}
      />
      {labels}
    </div>
  )
}

/**
 * Hides an axis tick's label when it would collide with a value label.
 *
 * Measures real bounding boxes rather than comparing underlying values,
 * since whether two labels overlap depends on their rendered text width.
 * Collided labels are hidden with `visibility`, not `display`, so hiding one
 * never changes the geometry that decides the next measurement — otherwise
 * hiding a label could free up space, un-hide it, and oscillate.
 */
function useTickCollisions(tickCount: number, valueCount: number) {
  const tickRefs = React.useRef<(HTMLElement | null)[]>([])
  const valueRefs = React.useRef<(HTMLElement | null)[]>([])
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [hiddenTicks, setHiddenTicks] = React.useState<boolean[]>([])

  const measure = React.useCallback(() => {
    const valueRects = valueRefs.current
      .slice(0, valueCount)
      .filter((el): el is HTMLElement => el != null)
      .map((el) => el.getBoundingClientRect())

    const next = tickRefs.current.slice(0, tickCount).map((el) => {
      if (!el) return false
      const rect = el.getBoundingClientRect()
      return valueRects.some(
        (other) =>
          rect.left < other.right &&
          other.left < rect.right &&
          rect.top < other.bottom &&
          other.top < rect.bottom
      )
    })

    setHiddenTicks((prev) =>
      prev.length === next.length && prev.every((v, i) => v === next[i])
        ? prev
        : next
    )
  }, [tickCount, valueCount])

  // Re-measure after every render: labels move whenever the value changes.
  // The equality check above stops this from looping.
  React.useLayoutEffect(measure)

  React.useEffect(() => {
    const root = rootRef.current
    if (!root || typeof ResizeObserver !== "function") return
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [measure])

  return { tickRefs, valueRefs, hiddenTicks, rootRef }
}

export { ScentedSlider }
export type { ScentedSliderProps, ScentedSliderAxis }
