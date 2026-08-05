import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { ScentedCombobox } from "@/components/ui/scented/scented-combobox"

interface Produce {
  label: string
  count: number
}

const produce: Produce[] = [
  { label: "Apple", count: 120 },
  { label: "Banana", count: 340 },
  { label: "Blueberry", count: 8 },
  { label: "Grapes", count: 62 },
  { label: "Pineapple", count: 4 },
  { label: "Aubergine", count: 15 },
  { label: "Broccoli", count: 210 },
  { label: "Carrot", count: 90 },
]

/**
 * A combobox where each item shows an embedded "scent" bar scaled to a
 * count, per Heer et al.'s scented widgets. See `notes/scented-combobox.md`
 * for the design decisions behind this component.
 */
const meta: Meta<typeof ScentedCombobox<Produce>> = {
  title: "ui/scented/ScentedCombobox",
  component: ScentedCombobox,
  tags: ["autodocs"],
  args: {
    items: produce,
    getItemScent: (item: Produce) => item.count,
    getItemLabel: (item: Produce) => item.label,
    placeholder: "Select produce",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ScentedCombobox<Produce>>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OrderedByInsertion: Story = {
  name: "orderByScent: false (insertion order)",
  args: {
    orderByScent: false,
  },
}

export const WithScentLabel: Story = {
  name: "showScentLabel: true",
  args: {
    showScentLabel: true,
    defaultValue: produce[1],
  },
}

export const Multiple: StoryObj<Meta<typeof ScentedCombobox<Produce, true>>> = {
  args: {
    multiple: true,
    defaultValue: [],
    placeholder: "Select produce",
  },
}
