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
];

const longAttributeRow: AttributeRow = {
  id: "long",
  attribute: "customer_lifetime_value_estimate_usd",
  label: "Estimated Customer Lifetime Value in US Dollars (Rolling 12 Months)",
  sample: "184920.55",
};

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
    initialSelected ?? new Set<string>()
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
                prev.map((row) => (row.id === id ? { ...row, label } : row))
              )
          : undefined
      }
    />
  );
}

/**
 * A table for reviewing the attributes detected in an uploaded file. Users can
 * select which attributes to keep, and assign human-readable labels before
 * import. The component fills whatever height its parent gives it and only the
 * body scrolls internally. Built on shadcn's `Table` primitives with a sticky
 * header.
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
 * A single table instance with a typical set of attributes: select rows via
 * checkbox and edit their generated labels inline.
 */
export const Default: Story = {
  render: () => (
    <ControlledAttributeTable rows={rows} className="h-100 w-114" />
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
      className="h-100 w-114"
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
        canvas.getByRole("checkbox", { name: `Select ${row.attribute}` })
      );
    }

    await waitFor(() => {
      expect(headerCheckbox).toHaveAttribute("data-checked");
      expect(headerCheckbox).not.toHaveAttribute("data-indeterminate");
    });
  },
};

/**
 * Long values in the Attribute and Sample columns are truncated with an
 * ellipsis instead of widening the column or wrapping the row. A tooltip is
 * shown immediately. The Label column behaves differently because it is an input. The existing
 * text field affordances (focus, select, scroll) already enable users to
 * examine any text overflow.
 */
export const LongLabelTruncation: Story = {
  render: () => (
    <ControlledAttributeTable
      rows={[...rows.slice(0, 2), longAttributeRow, ...rows.slice(2, 4)]}
      className="h-100 w-114"
    />
  ),
};

/**
 * With no rows — e.g. a file that produced no detected attributes — the
 * table shows a single empty-state message and the "Select all" checkbox is
 * disabled.
 */
export const Empty: Story = {
  render: () => <ControlledAttributeTable rows={[]} className="h-100 w-114" />,
};

/**
 * The narrowest width `AttributeTable` supports is 400px. Columns resize
 * proportionally rather than breaking or requiring horizontal scroll.
 */
export const ResponsiveBehavior: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {[400, 600, 900].map((width) => (
        <div key={width} className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {width}px {width === 400 ? "(minimum supported width)" : ""}
          </p>
          <div style={{ width }}>
            <ControlledAttributeTable
              rows={[...rows.slice(0, 2), longAttributeRow, ...rows.slice(2)]}
              className="h-75"
            />
          </div>
        </div>
      ))}
    </div>
  ),
};
