# Scented slider: design decisions

**Date:** 2026-08-04
**Components:** `components/ui/scented/scented-slider.tsx`,
`components/ui/scented/scent-histogram.tsx`,
`components/ui/scented/use-scent-histogram.ts`
**Spec:** `notes/specs/scented-slider.md`
**Reference:** Heer, J., et al. "Scented Widgets: Improving Navigation Cues
with Embedded Visualizations."
**Related:** `notes/scented-combobox.md`

## Goal

A range/threshold slider used as a chart filter, with the distribution of the
underlying data drawn as a histogram against the track. The user should be
able to see *where the data actually is* before dragging — the whole point of
a scented widget — and see how much of it their current selection keeps.

---

## The axis is present, but hidden until hover

A scented slider is primarily a **filter**, so the user needs something to
orient against: "38 to 62" means nothing without knowing the scale runs 0–100.
That argues for an axis.

But the axis is not the most important thing on screen — the *current value*
is. So the two are separated:

- **Value labels: always shown.** They answer the question the user actually
  has while dragging.
- **Axis: hidden at rest, revealed on hover or keyboard focus.** It answers a
  question the user only has when they're about to interact.

Both are independently configurable (`alwaysShowAxis`, `showValuesOnHover`)
because "which one is ambient and which is on-demand" is a per-context call.

The accepted cost: at rest, the user infers the range by eye from where the
thumbs sit relative to the track. That inference is only reliable on a linear
scale — under a log or sqrt scale the thumb position isn't proportional to
value, so the guess will be wrong until they hover. That's a real limitation,
accepted deliberately: the axis is one hover away, and paying for the rare
non-linear case with permanent visual noise in the common linear one is a bad
trade.

Reveal is on `pointerenter` **and** `focus`, so keyboard users get the axis
too rather than it being a pointer-only affordance.

## Binning: `max(Sturges, Freedman–Diaconis)`

Matching NumPy's `bins='auto'`, because the component can't assume anything
about the shape of an arbitrary filter field.

- **Sturges alone** (d3's own default) uses only sample size,
  `ceil(log2(n)) + 1`. It ignores spread entirely and systematically
  under-bins anything beyond a few hundred points or with real skew.
- **Scott** accounts for spread via standard deviation — but σ is precisely
  the statistic outliers distort most, and one extreme value in a filter
  field is entirely plausible. It would wash out resolution across the bulk
  of the distribution.
- **Freedman–Diaconis** uses the IQR instead, so it's robust to outliers and
  doesn't assume normality. That makes it the right primary rule here.

FD's weakness is the low end: it under-bins small samples, and d3's
implementation returns a single bin whenever the IQR is 0 (e.g. many repeated
values), which would flatten the histogram completely. Sturges depends only
on `n` and so can't collapse that way — taking the larger of the two uses it
as a floor. This is why the guard is `max()` and not `min()`: the failure
being defended against is too *few* bins, not too many.

Power users pass their own `d3.bin()` operator instead. That follows the same
principle as `scale` on the dropdown scent hooks: accept the d3 primitive
rather than re-exposing its options as a parallel set of props that would
have to be kept in sync forever. `getValue` is applied on top of whatever
operator arrives, so a caller customising `.thresholds()`/`.domain()` never
has to redundantly wire up `.value()` as well.

## Two layers: a fixed shadow, a primary selection

The histogram draws twice:

1. A **shadow** layer in muted colour, computed from the whole dataset and
   independent of the current value.
2. A **primary** layer in the primary colour, drawn over it, showing the
   selected portion.

The shadow layer is what keeps the scent *visible while the user interacts*.
If the histogram only drew the selection, then narrowing the range would
progressively destroy the very information that tells the user where to drag
next — the widget would go blind exactly when it's being used. Keeping the
full distribution fixed underneath means the context never moves, and the
selection reads against it.

The selected portion takes the primary colour so it stands out as the answer
rather than as more context. Two layers, one muted and one prominent, is
simply the most legible arrangement: it needs no legend and no interaction to
explain itself.

This is the same "global and fixed" principle recorded in
`notes/scented-combobox.md` — the reference distribution is never rescaled
against the current selection.

## Partial bars come from the data, not the geometry

A histogram divides the domain **discretely**, but the values a thumb can
take are **continuous**. So a thumb almost always lands *inside* a bin rather
than on a boundary, and that bin is neither fully selected nor fully
excluded.

The bin straddling a boundary is filled by **how many of its data points are
actually in range**, not by how far across the bin's width the thumb sits.
Those differ whenever the points aren't uniform within the bin — which is
most of the time, and increasingly so as bins get wider. A bin whose points
all cluster below the cut should read as fully selected even if the thumb
sits only 20% across it; interpolating on width would wrongly show it 20%
full.

This needs no special-casing. Because both layers are binned against the same
materialized thresholds, a boundary bin simply *contains* fewer selected
items, and the fill follows for free.

Two invariants make the layering read correctly, and both are why this lives
in one hook (`useLayeredScentHistogram`) rather than two independent
histogram calls:

- **Bin alignment.** The selected subset is counted against the same
  thresholds as the full set. Any count- or rule-based `thresholds` would
  re-derive boundaries from whatever subset it was handed, so the bins would
  shift as the user dragged.
- **Shared normalization.** Both counts run through one monotonic ratio
  function pinned to the full set's peak, so `selectedRatio <= ratio` holds
  *by construction* rather than by convention. Normalizing the selection
  against its own max would let a primary bar out-grow its shadow, and would
  make bars resize relative to each other as the selection changed.

The bin domain is also forced to the slider's `[min, max]` rather than left
to the data's extent, so the bars span the track. Otherwise a dataset that
happens to occupy 40–60 would draw a full-width histogram that lines up with
nothing.

## Bar scaling is zero-based and linear — unlike dropdown scent

Dropdown scent uses a sqrt scale over `[min, max]` of the counts. The
histogram deliberately does not, for two reasons:

- **Zero-based.** Over `[min, max]`, the *smallest* bin renders at ratio 0 —
  invisible. For a bar chart the thing that should read as zero is an
  **empty** bin, not merely the quietest one.
- **Linear.** Layered bars have to read as "this much *of* that bar." Under
  sqrt, a bin that is half selected draws at ~71% of its shadow's height,
  overstating the selection. Length must stay proportional to count.

Same reasoning as the sibling components, different conclusion, because a
hairline under a menu item is doing a different job than a bar in a chart.

## Tick labels yield to value labels

When a thumb sits near an axis tick, their labels collide. The value label
wins and the axis tick's label is hidden, because the value is the more
important of the two (same ranking as above).

Collision is decided by **measuring rendered bounding boxes**, not by
comparing the underlying values. Whether "38" and "40" overlap depends on
rendered text width, font, and track length — proximity in value space is a
poor proxy for it.

Hidden labels use `visibility`, not `display`. This is load-bearing: an
element hidden with `display: none` leaves the layout, which would free up
space, which would make it not collide, which would show it again — an
oscillation. With `visibility` the geometry never changes, so the measurement
that drives the decision is stable and the effect settles in one pass.

Only the tick's *label* is hidden; its tick mark stays, so the axis keeps its
rhythm.

## The bars are part of the hit target

The bars are the largest and most visually prominent thing in the widget, so
they read as the thing to click — clicking one and having nothing happen is a
papercut. Clicking a bar now seeks exactly as clicking the track does.

Implemented by extending the slider control's **hit area** with a
pseudo-element covering the histogram band, rather than by forwarding events
or reimplementing seek behaviour. Base UI's press handler lives on the
control and doesn't check what was hit, and it derives the value from the
main axis only — so widening the cross-axis costs nothing. A pseudo-element
hit-tests as its originating element without changing that element's border
box, so the pointer→value math is untouched. Verified by checking that a
click on a bar and a click on the track at the same coordinate produce
identical values.

The area extends over the histogram only, never below the track, so reading
the axis labels can't accidentally seek.

Supporting this, the histogram sits 1px from the track with the thumbs
layered over the bars. The near-contact is deliberate: a visible gap would
read as two separate elements, which is the wrong affordance now that they're
one control.

## `invert` is separate from `dir` — and the track follows it

For a single thumb, "selected" is ambiguous: it could mean `[min, value]` or
`[value, max]`. The default is `[min, value]`; `invert` flips it.

`invert` is deliberately **not** `dir`. Text direction is a layout concern and
is handled separately (logical properties mean positioning follows `dir`
automatically). Which side of a threshold counts as "kept" is a semantic
concern about the filter, and an LTR page can perfectly well want a
"everything above this" filter. Conflating them would make one impossible to
express without the other.

The track fill flips with `invert`, so the histogram and the slider never
disagree about what's selected. An earlier revision had the histogram
highlighting one side while the track filled the other — a widget
contradicting itself. Base UI's indicator only ever fills `min`→`value`, so
inverting swaps the two backgrounds (the track paints the filled colour, the
indicator masks the unselected side) rather than hiding the indicator and
overlaying a custom bar — which would then have to fight the thumbs for
stacking order. The track's own clipping and rounding apply unchanged.

`invert` is ignored for two-thumb sliders, where the selection is
unambiguously the span between the thumbs.

## Axis config, not a `d3.axis` instance

The axis takes `{ ticks, tickFormat }`. This breaks the "accept the d3
primitive" pattern used for `bin` and `scale`, and deliberately so:
`d3-axis` is not a pure computation, it renders imperatively into an SVG it
owns, and would fight React over the same DOM. `ticks` still accepts a count
hint that is handed to `d3.scaleLinear().ticks()`, so d3 keeps choosing the
tick *values* — only the rendering is React's.

## Alignment is pinned to the thumb inset

The design system's slider uses `thumbAlignment="edge"`, which insets thumb
travel by half a thumb width so a thumb at `min` doesn't overflow the track.
So a value's position is `thumbSize/2 + pct * (width - thumbSize)`, not
`pct * width`.

Everything that has to line up with a value — histogram bars, axis ticks,
value labels — is offset by that same inset, exposed as `--scent-inset`.
Getting this wrong would be subtle and pervasive: labels would drift from
their thumbs by a few pixels, worst at the extremes. Verified by measuring
that thumb centres and value-label centres coincide to 0.000px.

## One muted value across the scent family

The shadow bars use the same `bg-muted-foreground/25` as `ComboboxItemScent`
and `SelectItemScent`, and the components are kept locked to a single value
rather than tuned individually.

The value moved from `/20` to `/25` because the dropdown hairlines were too
faint in a real list — they have to hold up next to label text, where a
2px line at 20% recedes too far. The histogram's larger bars read fine at
either. The rule of thumb going forward: if the scent needs more or less
presence, move the shared value, don't let one widget fork. A 5-point opacity
difference is imperceptible in isolation, so divergence buys nothing and
costs consistency.

(Note that equal opacity does *not* mean equal perceived weight — a large
block reads stronger than a hairline at the same alpha. Matching the token
was chosen over matching perceived weight, because a single value is one
decision to maintain across a growing family.)
