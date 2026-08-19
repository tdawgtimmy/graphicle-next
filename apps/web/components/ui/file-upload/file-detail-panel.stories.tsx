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

/** Story-local state. FileDetailPanel is fully controlled. */
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
 * The file-review pane of an upload wizard. The panel handles loading, error,
 * and no-selection states. You are responsible for what is rendered via
 * `children` when the user selects a successfully loaded file. This story fills
 * that slot with `AttributeTable`. See "Composing the success state" below for
 * what `children` has to do.
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
 * Powers the canvas at the top of the Docs page. Hidden from the sidebar with
 * `!dev`. Click `customers.csv` or `orders.csv` to switch the detail pane
 * between the success and error views. The stories below freeze their file
 * lists, so this is the only one where selection works.
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
 * A parsed file shows whatever you pass as `children`. Here an editable entity
 * label and an `AttributeTable`. "Delete" removes the file, not just the
 * selection. The list is frozen in this story.
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
 * Once at least one file has finished processing, the detail pane prompts for a
 * selection. The list is frozen in this story.
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
 * "Details" section holding additional error text. It all comes from the file's
 * `error` field.
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
 * `FileDetailPanel` is responsive down to 640px.
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
