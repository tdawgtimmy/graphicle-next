import * as React from "react";
import {
  Controls,
  Description,
  Primary,
  Stories,
  Subtitle,
  Title,
} from "@storybook/addon-docs/blocks";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { AttributeRow } from "@/components/ui/file-upload/attribute-table";
import {
  FileDetailPanel,
  type FileDetailPanelFile,
  type SelectedFileDetail,
} from "@/components/ui/file-upload/file-detail-panel";

/**
 * Storybook's default autodocs page re-lists the primary story (the one
 * shown in the canvas at top) a second time in its "Stories" section —
 * `includePrimary` defaults to `true`. That's normally harmless, but here
 * the primary is `PrimaryExample`, a story deliberately hidden from the
 * sidebar (`tags: ["!dev"]`); without this override it would leak back into
 * the page as its own duplicate heading. `includePrimary={false}` skips it.
 */
function DocsPage() {
  return (
    <>
      <Title />
      <Subtitle />
      <Description />
      <Primary />
      <Controls />
      <Stories includePrimary={false} />
    </>
  );
}

/**
 * Disables click, hover, and focus-by-click on `FileDetailPanel`'s file list
 * — used on stories where the list should read as a static snapshot while
 * the detail pane on the right stays interactive. Targets the component's
 * public `data-slot="file-detail-panel"` attribute from the outside, so it
 * needs no component changes.
 */
const FROZEN_LIST_CLASS =
  "[&_[data-slot=file-detail-panel]>div:first-child]:pointer-events-none";

const attributeRows: AttributeRow[] = [
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
];

type DetailSeed =
  | Omit<
      Extract<SelectedFileDetail, { type: "success" }>,
      | "onEntityLabelChange"
      | "onSelectedAttributesChange"
      | "onAttributeLabelChange"
    >
  | Extract<SelectedFileDetail, { type: "error" }>;

function updateSuccessDetail(
  prev: Record<string, DetailSeed>,
  id: string,
  patch: Partial<Extract<DetailSeed, { type: "success" }>>
): Record<string, DetailSeed> {
  const current = prev[id];
  if (current?.type !== "success") return prev;
  return { ...prev, [id]: { ...current, ...patch } };
}

/**
 * A stateful wrapper used by these stories. `FileDetailPanel` itself is
 * fully controlled — a real consumer would lift this same state up to
 * wherever the upload wizard step tracks its files.
 */
function ControlledFileDetailPanel({
  files,
  initialSelectedId,
  details,
  onSelectFile,
  onDeleteSelectedFile,
  className,
}: {
  files: FileDetailPanelFile[];
  initialSelectedId?: string;
  details: Record<string, DetailSeed>;
  onSelectFile?: (id: string) => void;
  onDeleteSelectedFile?: () => void;
  className?: string;
}) {
  const [selectedId, setSelectedId] = React.useState(initialSelectedId);
  const [detailState, setDetailState] = React.useState(details);

  let selectedFileDetail: SelectedFileDetail | undefined;
  if (selectedId) {
    const id = selectedId;
    const seed = detailState[id];
    selectedFileDetail =
      seed?.type === "success"
        ? {
            ...seed,
            onEntityLabelChange: (value) =>
              setDetailState((prev) =>
                updateSuccessDetail(prev, id, { entityLabel: value })
              ),
            onSelectedAttributesChange: (selected) =>
              setDetailState((prev) =>
                updateSuccessDetail(prev, id, { selectedAttributes: selected })
              ),
            onAttributeLabelChange: (rowId, label) =>
              setDetailState((prev) => {
                const current = prev[id];
                if (current?.type !== "success") return prev;
                return updateSuccessDetail(prev, id, {
                  rows: current.rows.map((row) =>
                    row.id === rowId ? { ...row, label } : row
                  ),
                });
              }),
          }
        : seed;
  }

  return (
    <FileDetailPanel
      className={className}
      files={files}
      selectedFileId={selectedId}
      onSelectFile={(id) => {
        setSelectedId(id);
        onSelectFile?.(id);
      }}
      selectedFileDetail={selectedFileDetail}
      onDeleteSelectedFile={onDeleteSelectedFile}
    />
  );
}

/**
 * A stateful wrapper for demo stories where the file list should stay
 * static — no `onSelectFile` is wired up, so clicking a row does nothing —
 * while the detail pane (entity label, attribute selection) stays fully
 * interactive.
 */
function FrozenFileDetailPanel({
  files,
  selectedFileId,
  detail,
  onDeleteSelectedFile,
  className,
}: {
  files: FileDetailPanelFile[];
  selectedFileId: string;
  detail: Extract<DetailSeed, { type: "success" }>;
  onDeleteSelectedFile?: () => void;
  className?: string;
}) {
  const [detailState, setDetailState] = React.useState(detail);

  return (
    <FileDetailPanel
      className={className}
      files={files}
      selectedFileId={selectedFileId}
      selectedFileDetail={{
        ...detailState,
        onEntityLabelChange: (value) =>
          setDetailState((prev) => ({ ...prev, entityLabel: value })),
        onSelectedAttributesChange: (selected) =>
          setDetailState((prev) => ({ ...prev, selectedAttributes: selected })),
        onAttributeLabelChange: (rowId, label) =>
          setDetailState((prev) => ({
            ...prev,
            rows: prev.rows.map((row) =>
              row.id === rowId ? { ...row, label } : row
            ),
          })),
      }}
      onDeleteSelectedFile={onDeleteSelectedFile}
    />
  );
}

/**
 * Combines `FileSelectionItem`, `AttributeTable`, and `FileErrorAlert` into
 * the full file-review pane of the upload wizard: a file list on the left,
 * and a detail pane on the right whose content matches the selected file's
 * status. Fully controlled — the detail pane's content is driven entirely by
 * `selectedFileDetail`, not inferred from `files`.
 */
const meta: Meta<typeof FileDetailPanel> = {
  title: "ui/file-upload/FileDetailPanel",
  component: FileDetailPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      page: DocsPage,
    },
  },
} satisfies Meta<typeof FileDetailPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Powers the interactive canvas at the top of the Docs page only — hidden
 * from the sidebar (`!dev`) so it isn't browsable as its own story. Clicking
 * `customers.csv` or `orders.csv` in the file list switches the detail pane
 * between the success and error views; the other stories below keep their
 * file list frozen (see `FROZEN_LIST_CLASS`) and demonstrate this same
 * interaction just once, here.
 */
export const PrimaryExample: Story = {
  tags: ["!dev"],
  render: () => (
    <div className="h-140 w-full">
      <ControlledFileDetailPanel
        files={[
          {
            id: "1",
            filename: "customers.csv",
            status: "success",
            fileType: "Primary",
            rowCount: 23000,
          },
          {
            id: "2",
            filename: "orders.csv",
            status: "error",
            fileType: "Related",
          },
          {
            id: "3",
            filename: "regions.csv",
            status: "loading",
            fileType: "Related",
          },
        ]}
        initialSelectedId="1"
        details={{
          "1": {
            type: "success",
            entityLabel: "Customer",
            rows: attributeRows,
            selectedAttributes: new Set(),
          },
          "2": {
            type: "error",
            message:
              "Could not parse this file. Please check that it is a valid CSV with a header row, then re-upload.",
            details: `The following rows failed validation:

- Row 3: missing \`customer_id\`
- Row 7: \`amount\` is not a number
- Row 12: duplicate \`order_id\``,
          },
        }}
        onDeleteSelectedFile={fn()}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole("checkbox", {
      name: "Select customer_id",
    });
    await userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute("data-checked"));

    const labelInput = canvas.getByLabelText("Entity Label");
    await userEvent.clear(labelInput);
    await userEvent.type(labelInput, "Customer Record");
    await waitFor(() => expect(labelInput).toHaveValue("Customer Record"));

    const ordersRow = canvas.getByRole("button", { name: /orders\.csv/i });
    await userEvent.click(ordersRow);
    await waitFor(() => {
      expect(
        canvas.getByText("Could not parse this file.", { exact: false })
      ).toBeVisible();
    });

    const customersRow = canvas.getByRole("button", {
      name: /customers\.csv/i,
    });
    await userEvent.click(customersRow);
    await waitFor(() =>
      expect(canvas.getByLabelText("Entity Label")).toBeVisible()
    );
  },
};

/**
 * A successfully parsed file shows its generated entity label and detected
 * attributes, editable inline via `AttributeTable`. "Delete" removes the
 * whole file, not just the current selection. The file list is frozen — see
 * "Primary Example" atop the Docs page for the click-to-select interaction.
 */
export const ValidFile: Story = {
  decorators: [
    (Story) => (
      <div className={`h-140 w-full ${FROZEN_LIST_CLASS}`}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <FrozenFileDetailPanel
      files={[
        {
          id: "1",
          filename: "customers.csv",
          status: "success",
          fileType: "Primary",
          rowCount: 23000,
        },
        {
          id: "2",
          filename: "orders.csv",
          status: "error",
          fileType: "Related",
        },
        {
          id: "3",
          filename: "regions.csv",
          status: "loading",
          fileType: "Related",
        },
      ]}
      selectedFileId="1"
      detail={{
        type: "success",
        entityLabel: "Customer",
        rows: attributeRows,
        selectedAttributes: new Set(),
      }}
      onDeleteSelectedFile={fn()}
    />
  ),
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole("checkbox", {
      name: "Select customer_id",
    });
    await userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute("data-checked"));

    const labelInput = canvas.getByLabelText("Entity Label");
    await userEvent.clear(labelInput);
    await userEvent.type(labelInput, "Customer Record");
    await waitFor(() => expect(labelInput).toHaveValue("Customer Record"));
  },
};

/**
 * While every uploaded file is still processing, none are selectable and the
 * detail pane shows a "Files loading" placeholder instead of the usual
 * "No file selected" message.
 */
export const NoLoadedFile: Story = {
  decorators: [
    (Story) => (
      <div className={`h-140 w-full ${FROZEN_LIST_CLASS}`}>
        <Story />
      </div>
    ),
  ],
  args: {
    files: [
      {
        id: "1",
        filename: "customers.csv",
        status: "loading",
        fileType: "Primary",
      },
      {
        id: "2",
        filename: "orders.csv",
        status: "loading",
        fileType: "Related",
      },
      {
        id: "3",
        filename: "regions.csv",
        status: "loading",
        fileType: "Related",
      },
    ],
  },
};

/**
 * Once at least one file has finished processing, the detail pane invites
 * the user to pick one from the list. The file list here is static — see
 * the "Valid File" story above for the click-to-select interaction.
 */
export const NoSelection: Story = {
  decorators: [
    (Story) => (
      <div className={`h-140 w-full ${FROZEN_LIST_CLASS}`}>
        <Story />
      </div>
    ),
  ],
  args: {
    files: [
      {
        id: "1",
        filename: "customers.csv",
        status: "success",
        fileType: "Primary",
        rowCount: 23000,
      },
      {
        id: "2",
        filename: "orders.csv",
        status: "loading",
        fileType: "Related",
      },
      {
        id: "3",
        filename: "regions.csv",
        status: "loading",
        fileType: "Related",
      },
    ],
  },
};

/**
 * A file that failed to parse shows a destructive alert with a collapsible
 * "Details" section for the underlying validation errors.
 */
export const ParseErrorWithExpandableDetails: Story = {
  decorators: [
    (Story) => (
      <div className={`h-140 w-full ${FROZEN_LIST_CLASS}`}>
        <Story />
      </div>
    ),
  ],
  args: {
    files: [
      {
        id: "1",
        filename: "customers.csv",
        status: "success",
        fileType: "Primary",
        rowCount: 23000,
      },
      { id: "2", filename: "orders.csv", status: "error", fileType: "Related" },
      {
        id: "3",
        filename: "regions.csv",
        status: "success",
        fileType: "Related",
        rowCount: 310,
      },
    ],
    selectedFileId: "2",
    selectedFileDetail: {
      type: "error",
      message:
        "Could not parse this file. Please check that it is a valid CSV with a header row, then re-upload.",
      details: `The following rows failed validation:

- Row 3: missing \`customer_id\`
- Row 7: \`amount\` is not a number
- Row 12: duplicate \`order_id\``,
    },
    onDeleteSelectedFile: fn(),
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Details" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
    expect(
      canvas.getByText((text) => text.includes("customer_id"))
    ).toBeVisible();
  },
};

/**
 * Renders the same valid-file data at three widths — 640px, the narrowest
 * `FileDetailPanel` supports, up through 960px — to show that the 12-column
 * layout (4 columns for the file list, 8 for the detail pane) scales
 * proportionally with its container rather than relying on fixed pixel
 * widths.
 */
export const ResponsiveBehavior: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {[640, 800, 960].map((width) => (
        <div key={width} className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {width}px {width === 640 ? "(minimum supported width)" : ""}
          </p>
          <div className={FROZEN_LIST_CLASS} style={{ width, height: 560 }}>
            <FrozenFileDetailPanel
              files={[
                {
                  id: "1",
                  filename: "customers.csv",
                  status: "success",
                  fileType: "Primary",
                  rowCount: 23000,
                },
                {
                  id: "2",
                  filename: "orders.csv",
                  status: "error",
                  fileType: "Related",
                },
                {
                  id: "3",
                  filename: "regions.csv",
                  status: "loading",
                  fileType: "Related",
                },
              ]}
              selectedFileId="1"
              detail={{
                type: "success",
                entityLabel: "Customer",
                rows: attributeRows,
                selectedAttributes: new Set(),
              }}
              onDeleteSelectedFile={fn()}
            />
          </div>
        </div>
      ))}
    </div>
  ),
};
