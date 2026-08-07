import * as React from "react";
import { expect, userEvent, waitFor } from "storybook/test";
// Replace nextjs-vite with the name of your framework
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  AttributeTable,
  type AttributeRow,
} from "@/components/ui/file-upload/attribute-table";

const rows: AttributeRow[] = [
  { id: "1", attribute: "customer_id", label: "Customer Id", sample: "8841" },
  {
    id: "2",
    attribute: "order_date",
    label: "Order Date",
    sample: "2026-03-04",
  },
  { id: "3", attribute: "region", label: "Region", sample: "West" },
  {
    id: "4",
    attribute: "product_sku",
    label: "Product Sku",
    sample: "SKU-2291",
  },
  { id: "5", attribute: "quantity", label: "Quantity", sample: "12" },
  {
    id: "6",
    attribute: "unit_price",
    label: "Unit Price",
    sample: "24.99",
  },
  {
    id: "7",
    attribute: "discount_pct",
    label: "Discount Pct",
    sample: "0.1",
  },
  { id: "8", attribute: "notes", label: "Notes", sample: "" },
];

/**
 * A stateful wrapper used by these stories. `AttributeTable` itself is fully
 * controlled — a real consumer would lift this same state up to wherever the
 * upload wizard step tracks its data.
 */
function ControlledAttributeTable({
  rows: initialRows,
  initialSelected,
  editable = true,
  className,
}: {
  rows: AttributeRow[];
  initialSelected?: Set<string>;
  editable?: boolean;
  className?: string;
}) {
  const [rowState, setRowState] = React.useState(initialRows);
  const [selected, setSelected] = React.useState(
    initialSelected ?? new Set<string>(),
  );

  return (
    <AttributeTable
      className={className}
      rows={rowState}
      selected={selected}
      onSelectedChange={setSelected}
      onLabelChange={
        editable
          ? (id, label) =>
              setRowState((prev) =>
                prev.map((row) => (row.id === id ? { ...row, label } : row)),
              )
          : undefined
      }
    />
  );
}

/**
 * A table for reviewing the attributes detected in an uploaded file:
 * selecting which ones to keep, and editing the generated label before
 * import. Built on shadcn's `Table` primitives with a sticky header — the
 * component fills whatever height its parent gives it and only the body
 * scrolls internally.
 */
const meta: Meta<typeof AttributeTable> = {
  title: "ui/file-upload/AttributeTable",
  component: AttributeTable,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * At 456px wide — the narrowest width this component is expected to
 * handle — the fixed-width Attribute and Label columns and the flexible
 * Sample column still fit without triggering horizontal scroll.
 */
export const Default: Story = {
  render: () => (
    <ControlledAttributeTable rows={rows} className="h-[400px] w-[456px]" />
  ),
};

/**
 * Selecting some, but not all, rows puts the "Select all" header checkbox
 * into its indeterminate state. Selecting the remaining rows (or none)
 * returns it to fully checked or fully unchecked.
 */
export const IndeterminateHeaderCheckbox: Story = {
  render: () => (
    <ControlledAttributeTable
      rows={rows}
      initialSelected={new Set(["1", "2"])}
      className="h-[400px] w-[456px]"
    />
  ),
  play: async ({ canvas }) => {
    const headerCheckbox = canvas.getByRole("checkbox", {
      name: "Select all attributes",
    });

    await waitFor(() => {
      expect(headerCheckbox).toHaveAttribute("data-indeterminate");
    });

    const remainingRows = rows.slice(2);
    for (const row of remainingRows) {
      await userEvent.click(
        canvas.getByRole("checkbox", { name: `Select ${row.attribute}` }),
      );
    }

    await waitFor(() => {
      expect(headerCheckbox).toHaveAttribute("data-checked");
      expect(headerCheckbox).not.toHaveAttribute("data-indeterminate");
    });
  },
};

/**
 * A long, user-edited label truncates with an ellipsis inside its input
 * instead of widening the column or wrapping the row — a real risk given
 * the Label column's fixed width at narrow viewports.
 */
export const LongLabelTruncation: Story = {
  render: () => (
    <ControlledAttributeTable
      rows={[
        ...rows.slice(0, 2),
        {
          id: "long",
          attribute: "customer_lifetime_value_estimate_usd",
          label:
            "Estimated Customer Lifetime Value in US Dollars (Rolling 12 Months)",
          sample: "184920.55",
        },
        ...rows.slice(2, 4),
      ]}
      className="h-[400px] w-[456px]"
    />
  ),
};

/**
 * With no rows — e.g. a file that produced no detected attributes — the
 * table shows a single empty-state message and the "Select all" checkbox is
 * disabled.
 */
export const Empty: Story = {
  render: () => (
    <ControlledAttributeTable rows={[]} className="h-[400px] w-[456px]" />
  ),
};
