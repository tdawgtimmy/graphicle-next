# Scented Slider — Component Spec

Extends the shadcn `Slider` component with an axis, live value labels, and a
"scent" histogram (via `use-sent-histogram`) showing data distribution above
(horizontal) or to the left (vertical) of the track.

Supports both single-thumb and range (two-thumb) modes, and both horizontal
and vertical orientation.

---

## 1. Axis

- Rendered **below** the slider (horizontal) or **to the right** (vertical).
- Default: two ticks, at the slider's `min` and `max` values.
- Configurable: consumer may pass a `d3.axis` instance (or axis-config
  object) as a prop to override default tick generation (e.g. more ticks,
  custom formatting).
- Visibility: hidden by default, shown on hover/interaction with the slider.
  A `alwaysShowAxis` (name TBD) boolean prop forces it to always render.

## 2. Value labels

- Rendered below the handle(s) (horizontal) / beside the handle(s)
  (vertical), one per thumb.
- Update live during drag — must be driven by the same state that drives
  thumb position (no lag/flicker).
- Horizontally (or vertically) aligned with the corresponding axis tick
  position.
- Stacking order: value label renders on top of the axis.
- **Collision handling:** if a value label's bounding box overlaps an axis
  tick's label bounding box, hide that specific axis tick label (rather than
  clipping/transparency tricks). Collision = actual label bbox overlap, not
  just proximity of underlying values.
- Visibility: shown by default. Consumer can opt into "only on
  hover/interaction" via a prop (same show/hide pattern as the axis, but
  independently configurable).

## 3. Scent histogram

Separate component (e.g. `ScentHistogram`), composed above (horizontal) or
to the left (vertical) of the slider. Fixed size of 36px (`2.25rem`) along
the cross-axis.

### Data source: `use-sent-histogram`

Returns a single array: `{ x0, x1, count, ratio }[]`, `ratio` ∈ [0, 1] for
bar height/width scaling (`${ratio * 100}%`). Bins are uniform width.

The hook will be called multiple times — once for the shadow layer (full
dataset) and once for the primary layer (range-filtered dataset), and
potentially additional calls to handle partial-bin boundary correction (see
below). Two things must stay consistent across these calls:

- **Bin alignment:** all calls must produce the same bin boundaries (same
  `x0`/`x1` per index), so the primary layer overlays the correct shadow
  bin. This likely requires passing explicit bin boundaries or a bin
  count + domain into the hook rather than letting it infer bins from
  whatever subset of data it's given.
- **Height/scale sync:** the primary layer's `ratio` must **not** be
  renormalized against the filtered subset's own max count. If it were,
  a primary bar could render _taller_ than its shadow bar, or bars would
  visually resize/rescale relative to each other as the selection changes
  — which is wrong. The primary bar is meant to render as a **portion of**
  the shadow bar, not as an independently-scaled bar. Concretely: the
  primary layer's height must be computed against the **same normalization
  scale** (e.g. the same max-count denominator) as the shadow layer, so
  `primaryRatio <= shadowRatio` always holds for a given bin, and the
  primary fill reads as "this much of the shadow bar is selected," not as
  its own independent histogram.

This needs to be resolved against the hook's actual implementation — either
the hook accepts an external scale/domain to normalize against, or the
component does the renormalization itself using the shadow layer's ratios
as the scale reference after both hook calls return.

### Two layers

1. **Shadow layer**
   - Global/fixed histogram, computed from the full dataset — independent of
     current slider value(s).
   - Rendered in muted color.
   - Only re-renders if the underlying item list changes (not on
     drag/value change).

2. **Primary layer**
   - Histogram computed from the currently selected range (or, in
     single-thumb mode, presumably `[min, currentValue]` or
     `[currentValue, max]` — **needs confirmation**, see Open Questions).
   - Rendered in primary color, on top of the shadow layer.
   - Uses the same bin boundaries as the shadow layer (see assumption
     above).
   - **Partial bins:** when a selected boundary (thumb value) falls inside a
     bin rather than exactly on a bin edge, that bin's primary-color fill is
     partial, based on the actual data point positions within the bin (not
     a linear interpolation across the bin width). The shadow-color portion
     of that same bin remains visible underneath/beside the partial fill.
   - Bins fully inside the selected range render fully filled in primary
     color; bins fully outside render with no primary fill (shadow only).

---

## Single-thumb histogram semantics

For a single-thumb slider, the primary layer represents:

- `[min, value]` when in **RTL** mode
- `[value, max]` when in **LTR** mode (default)

This is **not** tied to document/text direction (`dir="rtl"`) or shadcn's
built-in RTL slider support — it's a separate, explicit `invert` (name TBD)
boolean prop on this component that flips which side of the single thumb
counts as "selected," independent of text direction. A consumer could have
an LTR-text page but still want the "filled" portion to run from the thumb
to `min` instead of the thumb to `max`.

(For reference, shadcn's own RTL slider handling uses the `dir` attribute
rather than a distinct prop — see
https://ui.shadcn.com/docs/components/base/slider#rtl. This component
should offer both: respect `dir` for actual text-direction/RTL layout, and
offer `invert` as an independent semantic override for which side is
"filled," so the two concerns don't get conflated.)

In range (two-thumb) mode, this question doesn't apply — the primary layer
is always the span between the two thumbs.

## Resolutions (implemented 2026-08-04)

1. **Hook bin-alignment & scale sync** — neither belongs in a second
   `useScentHistogram` call, because *any* count- or rule-based `thresholds`
   re-derives boundaries from whatever data it is handed. Added
   `useLayeredScentHistogram`, which bins once over a forced domain and then
   counts, per bin, how many of that bin's own items fall in range. Both
   layers run through one monotonic `toRatio`, so `selectedRatio <= ratio`
   holds by construction rather than by convention. Partial bins need no
   extra pass — a boundary bin simply contains fewer selected items.
2. **`invert`** — kept as a plain boolean, independent of `dir`. Layout
   direction stays with `dir` (the logical `insetInlineStart` positioning
   follows it automatically); `invert` only decides which side reads as
   "filtered in". Single-thumb selection is `[min, value]`, and `[value, max]`
   when inverted — the reverse of §"Single-thumb histogram semantics" above,
   which is superseded.
3. **Prop naming** — `axis` (config object), `alwaysShowAxis`,
   `showValuesOnHover`, `items` + `getValue` (matching `ScentedCombobox` /
   `ScentedSelect`), `binOperator`, `scale`.
4. **Vertical mode** — as the spec assumed: histogram left, track, then axis
   and value labels right. Bars grow away from the track; lowest bin at the
   bottom.
5. **Styling** — existing tokens, no new ones: `bg-muted-foreground/25`
   shadow, `bg-primary` fill, `text-muted-foreground` ticks,
   `text-foreground` values. Matches the scent styling already used by
   `ComboboxItemScent` / `SelectItemScent`.

### Deviation: no `d3.axis` instance

The axis takes `{ ticks, tickFormat }` rather than a `d3.axis` generator.
`d3-axis` renders imperatively into an SVG it owns, which would fight React
over the same DOM. `ticks` still accepts a count hint that is handed to
`d3.scaleLinear().ticks()`, so d3 keeps choosing the tick values — only the
rendering is React's.

### The track fill follows `invert`

The histogram and the track always agree on which side is selected. Base UI's
indicator only ever fills `min`→`value`, so when inverted the component swaps
the two backgrounds — the track paints the filled colour and the indicator
masks off the unselected side — rather than hiding the indicator and
overlaying a custom bar, which would then have to fight the thumbs for
stacking order. The track's own clipping and rounding apply unchanged.

## Open questions before implementation

1. **Hook bin-alignment & scale sync:** confirm `use-sent-histogram`
   supports (a) passing explicit bin boundaries/domain so shadow and
   primary calls align, and (b) passing an external normalization
   scale/max-count so primary-layer ratios don't get rescaled independently
   of the shadow layer (see section 3). If the hook can't do either, the
   component will need to do this normalization itself after both calls
   return.
2. **`invert` prop naming/API:** finalize the name and confirm it's a
   simple boolean (vs. e.g. an enum for future extensibility), and confirm
   it's independent from `dir`.
3. **Prop naming (general):** finalize prop names for axis config
   (`axis` vs `axisConfig`), visibility toggles (`showAxisOnHover`,
   `showValuesOnHover` or similar), and histogram data input.
4. **Vertical mode:** confirm value-label and axis placement to the right
   of the track is correct (spec assumes this), and whether the histogram
   sits to the left in vertical mode with the same 36px cross-axis sizing.
5. **Styling/tokens:** should primary/shadow colors and label typography
   pull from existing design tokens/theme, or be new tokens specific to
   this component?
