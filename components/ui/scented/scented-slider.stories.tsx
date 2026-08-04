import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { ScentedSlider } from "@/components/ui/scented/scented-slider"

interface Measurement {
  id: number
  score: number
}

/**
 * A bimodal-ish spread so the histogram has visible structure. Seeded, so
 * the shape is identical on every reload — a histogram that reshuffles per
 * render makes the component impossible to eyeball or snapshot.
 */
function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const measurements: Measurement[] = (() => {
  const random = seededRandom(20260804)
  // Sum of four uniforms ≈ a bell, without pulling in a stats dependency.
  const bell = () => (random() + random() + random() + random()) / 4
  return Array.from({ length: 2000 }, (_, id) => {
    const pick = random()
    const score =
      pick < 0.25
        ? random() * 100 // a thin uniform floor, so no bin is truly empty
        : pick < 0.75
          ? 14 + bell() * 62 // main mass, centred ~45
          : 52 + bell() * 46 // a lighter shoulder to the right, centred ~75
    return { id, score: Math.round(Math.min(100, Math.max(0, score))) }
  })
})()

/**
 * A slider with an embedded distribution histogram — a scented widget per
 * Heer et al. The muted "shadow" layer shows the whole dataset and never
 * moves; the primary layer shows how much of each bin the current selection
 * keeps, so partially-selected bins read as partially filled.
 *
 * See `notes/specs/scented-slider.md`.
 */
const meta: Meta<typeof ScentedSlider<Measurement>> = {
  title: "ui/scented/ScentedSlider",
  component: ScentedSlider,
  tags: ["autodocs"],
  args: {
    items: measurements,
    getValue: (item: Measurement) => item.score,
    min: 0,
    max: 100,
  },
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScentedSlider<Measurement>>

export default meta

type Story = StoryObj<typeof meta>

/** Two thumbs: the selection is the span between them. */
export const Range: Story = {
  args: {
    defaultValue: [38, 62],
  },
}

/** One thumb: everything up to it is selected (`[min, value]`). */
export const SingleThumb: Story = {
  args: {
    defaultValue: 38,
  },
}

/**
 * `invert` flips which side of a single thumb counts as selected, to
 * `[value, max]` — the track fill flips with it, so the histogram and the
 * slider never disagree about what is selected.
 */
export const SingleThumbInverted: Story = {
  name: "single thumb, invert: true",
  args: {
    defaultValue: 38,
    invert: true,
  },
}

/** The axis is hover-only by default; this pins it open. */
export const AlwaysShowAxis: Story = {
  args: {
    defaultValue: [38, 62],
    alwaysShowAxis: true,
  },
}

/**
 * More ticks make collisions likely — drag a thumb over one and its axis
 * label hides, rather than colliding with the value label.
 */
export const ManyTicks: Story = {
  args: {
    defaultValue: [38, 62],
    alwaysShowAxis: true,
    axis: { ticks: 11 },
  },
}

/** Ticks and value labels can be formatted together. */
export const FormattedTicks: Story = {
  args: {
    defaultValue: [38, 62],
    alwaysShowAxis: true,
    axis: { ticks: 5, tickFormat: (v: number) => `${v}%` },
  },
}

/** Value labels can be made hover-only too, independently of the axis. */
export const ValuesOnHover: Story = {
  args: {
    defaultValue: [38, 62],
    showValuesOnHover: true,
  },
}

export const Vertical: Story = {
  args: {
    defaultValue: [38, 62],
    orientation: "vertical",
    alwaysShowAxis: true,
  },
  decorators: [
    (Story) => (
      <div className="h-72 p-6">
        <Story />
      </div>
    ),
  ],
}
