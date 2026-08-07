# Scented combobox: design decision

**Date:** 2026-08-03
**Component:** `components/ui/combobox.tsx`
**Reference:** Heer, J., et al. "Scented Widgets: Improving Navigation Cues with Embedded Visualizations."

## Goal

Enhance the combobox into a "scented widget": render a small bar beneath each
item, scaled to a "count" associated with that item, so the list itself
carries information scent about the underlying data distribution.

## Question

Where should the count → bar-scale computation live?

1. A `scentCounts` prop on `ComboboxList`, which inspects/collects data from
   its rendered `ComboboxItem`s.
2. A prop on `ComboboxItem` that `ComboboxList` reads to build the counts
   list and do the scaling itself.
3. Compute the scale outside the component tree (in the consumer), and pass
   an already-normalized value down to a small presentational piece.

## Decision: option 3

Scaling is computed once by the consumer (wherever the item data with counts
is assembled), producing a normalized `0–1` fraction per item. A new small,
presentational component (e.g. `ComboboxItemScent`) takes that fraction and
renders the bar — no new data plumbing through `ComboboxList` or `Root`.

## Why not option 1 (List inspects children)

`combobox.tsx` renders items via Base UI's `Collection` render-prop pattern:

```tsx
<ComboboxCollection>
  {(item) => <ComboboxItem value={item.value}>{item.label}</ComboboxItem>}
</ComboboxCollection>
```

`ComboboxItem` elements aren't a static children array `ComboboxList` can
walk before rendering — they're produced lazily, per row, by a function
(and Base UI reserves the right to virtualize that list). `List` has no
synchronous view of "all the items with their scent props" to introspect.
To get that data, `List` would have to duplicate the same traversal over the
underlying `items` array the consumer already has in scope — at which point
nothing was saved by inspecting children instead of just using the data
directly.

## Why not option 2 (prop on Item that List reads)

Same underlying problem as option 1: it still relies on `List` collecting
values from children it doesn't have static access to. It also pushes a
business-logic decision (how to normalize/scale a count distribution) into a
component whose job is layout and filtering, not data transformation.

## Why the scale should be global and fixed (not dynamic)

Considered whether the scent bars should re-normalize against the _currently
filtered_ subset as the user types (i.e. relative scent). Rejected:

- The Heer et al. motivation for scented widgets is preserving information
  scent while narrowing down a search — that argues for a **stable, global**
  scale computed once, not one that rescales on every keystroke and shifts
  the reference point out from under the user.
- `ComboboxList` only sees the live filtered set at render time, so it isn't
  the right place to own a "relative to what's currently visible"
  computation even if we wanted it — that data view lives one level up, in
  whatever owns the full item list.

The one case where counts legitimately _do_ change is external
cross-filtering (e.g. another active filter has reduced the population, such
as excluding non-pediatricians before the combobox ever sees the data). This
is not a special case to design around: it's handled naturally by props and
the normal render cycle — the consumer recomputes the global max/scale
whenever its upstream filtered dataset changes, and passes fresh fractions
down. No separate "relative scent" mode is needed inside the combobox itself.

## Planned shape

- A higher-order component wrapping `Combobox` + item rendering, using
  `useMemo` to compute per-item normalized fractions from the full
  (cross-filtered, if applicable) item set once per data change.
- `ComboboxItemScent`: a small, `aria-hidden` presentational component
  (sibling to item content, similar in spirit to `ComboboxItemIndicator`)
  that takes a `0–1` fraction and renders the bar. No context, no data
  plumbing through `ComboboxList`/`Root`.
- Scale function (linear vs. log/sqrt for skewed distributions) is a
  decision left to the consumer's `useMemo`, not baked into the primitive.

## Selection state should not change scent color

**Date:** 2026-08-04

Once `ComboboxItemScent` (the bar) and `ComboboxItemScentLabel` (the
optional `showScentLabel` count) existed, the initial implementation made
both switch from a muted color to `currentColor` when their item was
selected — matching the color of the item's checkmark, via a
`group-data-[selected]/item:` variant keyed off a `group/item` class added
to `ComboboxItem`.

### Question

Should selecting an item change how its scent bar/label are colored?

### Decision: no — scent color always reflects data, never selection state

Reverted both `group-data-[selected]/item:bg-current` (on the bar) and
`group-data-[selected]/item:text-current` (on the label). `ComboboxItem` no
longer carries the `group/item` class at all, since nothing needs it now.

### Why

The core value of a scented widget (Heer et al.) is letting someone compare
magnitude across the _whole_ list at a glance, before they've committed to a
choice. Color/opacity was already the channel encoding that magnitude
information (muted = low emphasis, full = high emphasis in the mental model
we'd built). Reusing that same channel to _also_ mean "this is the selected
item" overloads it with a second, unrelated meaning:

- It's redundant: the checkmark (`ComboboxPrimitive.ItemIndicator`) already
  communicates "selected" unambiguously. The scent decorations didn't need
  to repeat that signal.
- It's actively counterproductive to the comparative-scanning use case: a
  small-count item that happens to be selected would visually outweigh a
  much larger unselected item, since color contrast tends to win over bar
  length in peripheral scanning. That's the opposite of what a scented
  widget is for.
- It created an inconsistency once `showScentLabel` was added: fixing the
  bar's semantics but leaving the label reactive to selection would mean two
  pieces of the same feature following different rules for no visible
  reason.

The rule going forward: scent decorations (bar and label) always render the
data faithfully, full stop. Selection state lives exclusively in the
existing checkmark/background/native indicators. This follows the same
principle as the "global and fixed" scale decision above: keep the scent
channel about the data, and let interaction state be communicated through
the channels already dedicated to it.

Note this is distinct from the _highlight_ (hover/keyboard-focus) state,
which `ComboboxItem` already recolors descendant text via a pre-existing
`data-highlighted:**:text-accent-foreground` rule, for contrast against the
highlighted background — that's a legibility mechanism, not a data/selection
signal, and applies to any text in a highlighted row regardless of this
feature.
