import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ScentedSelect } from "@/components/ui/scented/scented-select";

interface Produce {
  label: string;
  count: number;
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
];

/**
 * A select where each item shows an embedded "scent" bar scaled to a count.
 */
const meta: Meta<typeof ScentedSelect<Produce>> = {
  title: "ui/scented/ScentedSelect",
  component: ScentedSelect,
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
} satisfies Meta<typeof ScentedSelect<Produce>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OrderedByInsertion: Story = {
  name: "orderByScent: false (insertion order)",
  args: {
    orderByScent: false,
  },
};

export const WithScentLabel: Story = {
  name: "showScentLabel: true",
  args: {
    showScentLabel: true,
    defaultValue: produce[1],
  },
};

export const Multiple: StoryObj<Meta<typeof ScentedSelect<Produce, true>>> = {
  args: {
    multiple: true,
    defaultValue: [],
    placeholder: "Select produce",
  },
};
