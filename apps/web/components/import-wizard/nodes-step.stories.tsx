import * as React from "react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NodesStep } from "@/components/import-wizard/nodes-step";
import {
  ImportWizardShell,
  type ImportWizardStepInfo,
} from "@/components/import-wizard/wizard-shell";
import type { AttributeRow } from "@/components/ui/file-upload/attribute-table";
import {
  AttributeTableDetail,
  type AttributeDetailSeed,
} from "@/components/ui/file-upload/attribute-table-detail";
import type { UploadFile } from "@/components/ui/file-upload/types";

const steps: ImportWizardStepInfo[] = [
  { id: "nodes", title: "Nodes", subtitle: "Choose entities to include" },
  {
    id: "relationships",
    title: "Relationships",
    subtitle: "Define how they connect",
  },
  { id: "filters", title: "Filters", subtitle: "Set up filter controls" },
];

const attributeRows: AttributeRow[] = [
  {
    id: "1",
    attribute: "customer_id",
    label: "Customer Id",
    sample: "8841",
  },
  {
    id: "2",
    attribute: "order_date",
    label: "Order Date",
    sample: "2026-03-04",
  },
  { id: "3", attribute: "region", label: "Region", sample: "West" },
];

/** Story-local state. NodesStep is fully controlled — the host page owns this. */
function ControlledNodesStep({
  primaryFile,
  relatedFiles,
  initialSelectedId,
  attributeDetails,
  onBack,
  onNext,
  onDeleteFile,
}: {
  primaryFile: UploadFile | null;
  relatedFiles: UploadFile[];
  initialSelectedId?: string;
  attributeDetails: Record<string, AttributeDetailSeed>;
  onBack?: () => void;
  onNext: () => void;
  onDeleteFile?: (id: string) => void;
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
    <ImportWizardShell steps={steps} currentStepId="nodes" className="w-200">
      <NodesStep
        primaryFile={primaryFile}
        onPrimaryFileSelected={fn()}
        relatedFiles={relatedFiles}
        onRelatedFilesSelected={fn()}
        selectedFileId={selectedId}
        onSelectFile={setSelectedId}
        onCancelFile={fn()}
        onDeleteFile={onDeleteFile}
        onBack={onBack}
        onNext={onNext}
      >
        {content}
      </NodesStep>
    </ImportWizardShell>
  );
}

/**
 * Step 1 of the node import wizard. Upload a primary entity file and any
 * related files, then review and select attributes. The Validate section stays
 * hidden until `primaryFile` or `relatedFiles` is non-empty — compare the Empty
 * story. Rendered inside `ImportWizardShell`, the way the host page composes it.
 */
const meta: Meta<typeof NodesStep> = {
  title: "ui/import-wizard/NodesStep",
  component: NodesStep,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof NodesStep>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * No files uploaded. The Validate section is hidden, Next is disabled without a
 * primary file, and Back is disabled because there's no step before this one.
 */
export const Empty: Story = {
  render: () => (
    <ImportWizardShell steps={steps} currentStepId="nodes" className="w-200">
      <NodesStep
        primaryFile={null}
        onPrimaryFileSelected={fn()}
        relatedFiles={[]}
        onRelatedFilesSelected={fn()}
        onNext={fn()}
      />
    </ImportWizardShell>
  ),
  play: async ({ canvas }) => {
    expect(canvas.queryByText("Validate")).not.toBeInTheDocument();
    expect(canvas.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(canvas.getByRole("button", { name: "Next" })).toBeDisabled();
  },
};

/**
 * Every file parsed, nothing selected yet. Select `hospitals.csv` to see its
 * attribute table.
 */
export const AllFilesValid: Story = {
  render: () => (
    <ControlledNodesStep
      primaryFile={{
        id: "1",
        filename: "physicians.csv",
        status: "success",
        rowCount: 23000,
      }}
      relatedFiles={[
        {
          id: "2",
          filename: "hospitals.csv",
          status: "success",
          rowCount: 512,
        },
      ]}
      attributeDetails={{
        "1": {
          entityLabel: "Physician",
          rows: attributeRows,
          selectedAttributes: new Set(),
        },
        "2": {
          entityLabel: "Hospital",
          rows: attributeRows,
          selectedAttributes: new Set(),
        },
      }}
      onBack={fn()}
      onNext={fn()}
    />
  ),
  play: async ({ canvas }) => {
    expect(canvas.getByText("No file selected")).toBeVisible();
    expect(canvas.getByRole("button", { name: "Back" })).toBeEnabled();
    expect(canvas.getByRole("button", { name: "Next" })).toBeEnabled();

    await userEvent.click(canvas.getByText("hospitals.csv"));
    await waitFor(() =>
      expect(canvas.getByLabelText("Entity Label")).toHaveValue("Hospital")
    );
  },
};

/**
 * A mix of statuses: the primary file and one related file parsed, one related
 * file failed. Nothing is loading, so Next stays enabled. Click it and you get
 * the discard-errors confirmation.
 */
export const MixedStatusesWithError: Story = {
  render: () => (
    <ControlledNodesStep
      primaryFile={{
        id: "1",
        filename: "physicians.csv",
        status: "success",
        rowCount: 23000,
      }}
      relatedFiles={[
        {
          id: "2",
          filename: "hospitals.csv",
          status: "error",
          error: {
            message:
              "Could not parse this file. Please check that it is a valid CSV with a header row, then re-upload.",
            details: `The following rows failed validation:

- Row 3: missing \`hospital_id\`
- Row 7: \`beds\` is not a number
- Row 12: duplicate \`hospital_id\``,
          },
        },
        {
          id: "3",
          filename: "publications.csv",
          status: "success",
          rowCount: 812,
        },
      ]}
      initialSelectedId="1"
      attributeDetails={{
        "1": {
          entityLabel: "Physician",
          rows: attributeRows,
          selectedAttributes: new Set(),
        },
        "3": {
          entityLabel: "Publication",
          rows: attributeRows,
          selectedAttributes: new Set(),
        },
      }}
      onBack={fn()}
      onNext={fn()}
      onDeleteFile={fn()}
    />
  ),
  play: async ({ canvas }) => {
    expect(canvas.getByLabelText("Entity Label")).toHaveValue("Physician");
    expect(canvas.getByRole("button", { name: "Next" })).toBeEnabled();

    await userEvent.click(canvas.getByText("hospitals.csv"));
    await waitFor(() => {
      expect(
        canvas.getByText("Could not parse this file.", { exact: false })
      ).toBeVisible();
    });
  },
};

/**
 * Clicking Next while a file has `status: "error"` opens a confirmation
 * first, since continuing discards it. Confirming calls `onDeleteFile` once per
 * errored file, then `onNext` so the host page deletes files through the same
 * callback it already users in the Validate section.
 */
export const ConfirmDiscardDialogOpen: Story = {
  render: () => (
    <ControlledNodesStep
      primaryFile={{
        id: "1",
        filename: "physicians.csv",
        status: "success",
        rowCount: 23000,
      }}
      relatedFiles={[
        {
          id: "2",
          filename: "hospitals.csv",
          status: "error",
          error: {
            message:
              "Could not parse this file. Please check that it is a valid CSV with a header row, then re-upload.",
          },
        },
        {
          id: "3",
          filename: "publications.csv",
          status: "success",
          rowCount: 812,
        },
      ]}
      initialSelectedId="1"
      attributeDetails={{
        "1": {
          entityLabel: "Physician",
          rows: attributeRows,
          selectedAttributes: new Set(),
        },
      }}
      onBack={fn()}
      onNext={fn()}
      onDeleteFile={fn()}
    />
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));

    // The dialog renders through a portal into `document.body`, outside
    // `canvasElement` — query it via `screen` rather than `canvas`.
    await waitFor(() => {
      expect(
        screen.getByText("Are you sure you want to continue?")
      ).toBeVisible();
    });
    expect(
      screen.getByText("All files with errors will be discarded.")
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Discard and continue" })
    ).toBeVisible();
  },
};
