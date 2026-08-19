import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  ImportWizardShell,
  type ImportWizardStepInfo,
} from "@/components/import-wizard/wizard-shell";

const steps: ImportWizardStepInfo[] = [
  { id: "nodes", title: "Nodes", subtitle: "Choose entities to include" },
  {
    id: "relationships",
    title: "Relationships",
    subtitle: "Define how they connect",
  },
  { id: "filters", title: "Filters", subtitle: "Set up filter controls" },
];

/**
 * The frame for every wizard step. Progress stepper on top, the active step's
 * own body and buttons below. `currentStepId` sets which stepper items are
 * complete, active, or upcoming. Step order and navigation live in the step.
 */
const meta: Meta<typeof ImportWizardShell> = {
  title: "ui/import-wizard/ImportWizardShell",
  component: ImportWizardShell,
  tags: ["autodocs"],
  args: {
    steps,
  },
  render: (args) => (
    <ImportWizardShell {...args} className="w-200">
      <div className="flex h-40 w-full items-center justify-center text-sm text-muted-foreground">
        Active step content renders here
      </div>
    </ImportWizardShell>
  ),
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ImportWizardShell>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The first step of the flow is active; no steps are complete yet. */
export const FirstStep: Story = {
  args: {
    currentStepId: "nodes",
  },
};

/** The middle step is active, with the first step showing as complete. */
export const MiddleStep: Story = {
  args: {
    currentStepId: "relationships",
  },
};

/** The final step is active, with every prior step showing as complete. */
export const LastStep: Story = {
  args: {
    currentStepId: "filters",
  },
};
