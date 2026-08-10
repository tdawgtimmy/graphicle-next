import * as React from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { AttributeRow } from "@/components/ui/file-upload/attribute-table";
import {
  AttributeTableDetail,
  type AttributeDetailSeed,
} from "@/components/ui/file-upload/attribute-table-detail";
import { FileDetailPanel } from "@/components/ui/file-upload/file-detail-panel";
import type { UploadFile } from "@/components/ui/file-upload/types";

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

/**
 * A stateful wrapper used by these stories. `FileDetailPanel` itself is
 * fully controlled — a real consumer would lift this same state up to
 * wherever the upload wizard step tracks its files.
 */
function ControlledFileDetailPanel({
  files,
  initialSelectedId,
  attributeDetails,
  onSelectFile,
  onCancelFile,
  onDeleteFile,
  className,
}: {
  files: UploadFile[];
  initialSelectedId?: string;
  /** Keyed by file ID, for files with `status: "success"`. */
  attributeDetails: Record<string, AttributeDetailSeed>;
  onSelectFile?: (id: string) => void;
  onCancelFile?: (id: string) => void;
  onDeleteFile?: (id: string) => void;
  className?: string;
}) {
  const [selectedId, setSelectedId] = React.useState(initialSelectedId);
  const [detailState, setDetailState] = React.useState(attributeDetails);

  let content: React.ReactNode = null;
  if (selectedId) {
    const id = selectedId;
    const detail = detailState[id];
    if (detail) {
      content = (
        <AttributeTableDetail
          key={id}
          entityLabel={detail.entityLabel}
          onEntityLabelChange={(value) =>
            setDetailState((prev) => ({
              ...prev,
              [id]: { ...prev[id], entityLabel: value },
            }))
          }
          rows={detail.rows}
          selectedAttributes={detail.selectedAttributes}
          onSelectedAttributesChange={(selected) =>
            setDetailState((prev) => ({
              ...prev,
              [id]: { ...prev[id], selectedAttributes: selected },
            }))
          }
          onAttributeLabelChange={(rowId, label) =>
            setDetailState((prev) => ({
              ...prev,
              [id]: {
                ...prev[id],
                rows: prev[id].rows.map((row) =>
                  row.id === rowId ? { ...row, label } : row
                ),
              },
            }))
          }
        />
      );
    }
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
      onCancelFile={onCancelFile}
      onDeleteFile={onDeleteFile}
    >
      {content}
    </FileDetailPanel>
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
  attributeDetail,
  onCancelFile,
  onDeleteFile,
  className,
}: {
  files: UploadFile[];
  selectedFileId: string;
  attributeDetail: AttributeDetailSeed;
  onCancelFile?: (id: string) => void;
  onDeleteFile?: (id: string) => void;
  className?: string;
}) {
  const [detail, setDetail] = React.useState(attributeDetail);

  return (
    <FileDetailPanel
      className={className}
      files={files}
      selectedFileId={selectedFileId}
      onCancelFile={onCancelFile}
      onDeleteFile={onDeleteFile}
    >
      <AttributeTableDetail
        key={selectedFileId}
        entityLabel={detail.entityLabel}
        onEntityLabelChange={(value) =>
          setDetail((prev) => ({ ...prev, entityLabel: value }))
        }
        rows={detail.rows}
        selectedAttributes={detail.selectedAttributes}
        onSelectedAttributesChange={(selected) =>
          setDetail((prev) => ({ ...prev, selectedAttributes: selected }))
        }
        onAttributeLabelChange={(rowId, label) =>
          setDetail((prev) => ({
            ...prev,
            rows: prev.rows.map((row) =>
              row.id === rowId ? { ...row, label } : row
            ),
          }))
        }
      />
    </FileDetailPanel>
  );
}

/**
 * The file-review pane of an upload wizard: a file list on the left, and a
 * detail pane on the right. Loading, error, and no-selection states are
 * handled by the panel itself; the success state is left to `children`, so
 * different parts of the app can show different detail UIs for a
 * successfully processed file. This story demonstrates that slot with
 * `AttributeTable` — see the "Composing the success state" doc section
 * below for the contract `children` needs to follow.
 */
const meta: Meta<typeof FileDetailPanel> = {
  title: "ui/file-upload/FileDetailPanel",
  component: FileDetailPanel,
  parameters: {
    layout: "padded",
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
            error: {
              message:
                "Could not parse this file. Please check that it is a valid CSV with a header row, then re-upload.",
              details: `The following rows failed validation:

- Row 3: missing \`customer_id\`
- Row 7: \`amount\` is not a number
- Row 12: duplicate \`order_id\``,
            },
          },
          {
            id: "3",
            filename: "regions.csv",
            status: "loading",
            fileType: "Related",
          },
        ]}
        initialSelectedId="1"
        attributeDetails={{
          "1": {
            entityLabel: "Customer",
            rows: attributeRows,
            selectedAttributes: new Set(),
          },
        }}
        onCancelFile={fn()}
        onDeleteFile={fn()}
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

    await userEvent.click(canvas.getByText("orders.csv"));
    await waitFor(() => {
      expect(
        canvas.getByText("Could not parse this file.", { exact: false })
      ).toBeVisible();
    });

    await userEvent.click(canvas.getByText("customers.csv"));
    await waitFor(() =>
      expect(canvas.getByLabelText("Entity Label")).toBeVisible()
    );
  },
};

/**
 * A successfully parsed file shows whatever detail content the consumer
 * passes as `children` — here, an editable entity label and detected
 * attributes via `AttributeTable`. "Delete" removes the whole file, not
 * just the current selection. The file list is frozen — see "Primary
 * Example" atop the Docs page for the click-to-select interaction.
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
          error: {
            message:
              "Could not parse this file. Please check that it is a valid CSV with a header row, then re-upload.",
          },
        },
        {
          id: "3",
          filename: "regions.csv",
          status: "loading",
          fileType: "Related",
        },
      ]}
      selectedFileId="1"
      attributeDetail={{
        entityLabel: "Customer",
        rows: attributeRows,
        selectedAttributes: new Set(),
      }}
      onCancelFile={fn()}
      onDeleteFile={fn()}
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
    onCancelFile: fn(),
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
    onCancelFile: fn(),
  },
};

/**
 * A file that failed to parse shows a destructive alert with a collapsible
 * "Details" section for the underlying validation errors. Fully derived from
 * the selected file's own `error` field — no `children` involved.
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
      {
        id: "2",
        filename: "orders.csv",
        status: "error",
        fileType: "Related",
        error: {
          message:
            "Could not parse this file. Please check that it is a valid CSV with a header row, then re-upload.",
          details: `The following rows failed validation:

- Row 3: missing \`customer_id\`
- Row 7: \`amount\` is not a number
- Row 12: duplicate \`order_id\``,
        },
      },
      {
        id: "3",
        filename: "regions.csv",
        status: "success",
        fileType: "Related",
        rowCount: 310,
      },
    ],
    selectedFileId: "2",
    onDeleteFile: fn(),
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
 * The minimim width `FileDetailPanel` supports is 640px, and is responsive.
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
                  error: {
                    message:
                      "Could not parse this file. Please check that it is a valid CSV with a header row, then re-upload.",
                  },
                },
                {
                  id: "3",
                  filename: "regions.csv",
                  status: "loading",
                  fileType: "Related",
                },
              ]}
              selectedFileId="1"
              attributeDetail={{
                entityLabel: "Customer",
                rows: attributeRows,
                selectedAttributes: new Set(),
              }}
              onCancelFile={fn()}
              onDeleteFile={fn()}
            />
          </div>
        </div>
      ))}
    </div>
  ),
};
