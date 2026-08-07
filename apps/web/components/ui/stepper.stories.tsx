import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Stepper,
  StepperIndicator,
  StepperItem,
} from "@/components/ui/stepper";

/**
 * Displays progress through a sequence of steps, showing which steps are
 * complete, which is active, and which are still to come.
 */
const meta: Meta<typeof Stepper> = {
  title: "ui/base/Stepper",
  component: Stepper,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "default", "lg"],
    },
  },
  args: {
    size: "default",
  },
  render: (args) => (
    <Stepper {...args} className="w-[576px]">
      <StepperItem state="complete" title="First Step" subtitle="Step subtitle">
        <StepperIndicator>1</StepperIndicator>
      </StepperItem>
      <StepperItem state="active" title="Second Step" subtitle="Step subtitle">
        <StepperIndicator>2</StepperIndicator>
      </StepperItem>
      <StepperItem state="default" title="Last Step" subtitle="Step subtitle">
        <StepperIndicator>3</StepperIndicator>
      </StepperItem>
    </Stepper>
  ),
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Stepper>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the stepper: completed steps show a checkmark,
 * the active step is highlighted, and upcoming steps stay muted.
 */
export const Default: Story = {};

/**
 * All steps complete, as shown once the final step in a flow has been
 * reached.
 */
export const AllComplete: Story = {
  render: (args) => (
    <Stepper {...args} className="w-[576px]">
      <StepperItem state="complete" title="First Step" subtitle="Step subtitle">
        <StepperIndicator>1</StepperIndicator>
      </StepperItem>
      <StepperItem
        state="complete"
        title="Second Step"
        subtitle="Step subtitle"
      >
        <StepperIndicator>2</StepperIndicator>
      </StepperItem>
      <StepperItem state="complete" title="Last Step" subtitle="Step subtitle">
        <StepperIndicator>3</StepperIndicator>
      </StepperItem>
    </Stepper>
  ),
};

/**
 * The first step is active and no steps have been completed yet, as shown
 * at the start of a flow.
 */
export const FirstStepActive: Story = {
  render: (args) => (
    <Stepper {...args} className="w-[576px]">
      <StepperItem state="active" title="First Step" subtitle="Step subtitle">
        <StepperIndicator>1</StepperIndicator>
      </StepperItem>
      <StepperItem state="default" title="Second Step" subtitle="Step subtitle">
        <StepperIndicator>2</StepperIndicator>
      </StepperItem>
      <StepperItem state="default" title="Last Step" subtitle="Step subtitle">
        <StepperIndicator>3</StepperIndicator>
      </StepperItem>
    </Stepper>
  ),
};

/**
 * Use the `sm` size for a more compact stepper, suitable for tighter
 * layouts.
 */
export const Small: Story = {
  args: {
    size: "sm",
  },
};

/**
 * Use the `lg` size for a more prominent stepper, such as a full-page
 * onboarding flow.
 */
export const Large: Story = {
  args: {
    size: "lg",
  },
};

/**
 * The subtitle is optional — omit it for a more compact stepper.
 */
export const WithoutSubtitles: Story = {
  render: (args) => (
    <Stepper {...args} className="w-[576px]">
      <StepperItem state="complete" title="First Step">
        <StepperIndicator>1</StepperIndicator>
      </StepperItem>
      <StepperItem state="active" title="Second Step">
        <StepperIndicator>2</StepperIndicator>
      </StepperItem>
      <StepperItem state="default" title="Last Step">
        <StepperIndicator>3</StepperIndicator>
      </StepperItem>
    </Stepper>
  ),
};

/**
 * The stepper supports any number of steps.
 */
export const ManySteps: Story = {
  render: (args) => (
    <Stepper {...args} className="w-[768px]">
      <StepperItem state="complete" title="Account" subtitle="Step subtitle">
        <StepperIndicator>1</StepperIndicator>
      </StepperItem>
      <StepperItem state="complete" title="Profile" subtitle="Step subtitle">
        <StepperIndicator>2</StepperIndicator>
      </StepperItem>
      <StepperItem state="active" title="Preferences" subtitle="Step subtitle">
        <StepperIndicator>3</StepperIndicator>
      </StepperItem>
      <StepperItem state="default" title="Review" subtitle="Step subtitle">
        <StepperIndicator>4</StepperIndicator>
      </StepperItem>
      <StepperItem state="default" title="Confirm" subtitle="Step subtitle">
        <StepperIndicator>5</StepperIndicator>
      </StepperItem>
    </Stepper>
  ),
};
