import { expect, userEvent, waitFor } from "storybook/test";
// Replace nextjs-vite with the name of your framework
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FileErrorAlert } from "@/components/ui/file-upload/file-error-alert";

/**
 * A destructive alert for file-processing errors, with an optional
 * collapsible "Details" section that renders markdown.
 */
const meta: Meta<typeof FileErrorAlert> = {
  title: "ui/file-upload/FileErrorAlert",
  component: FileErrorAlert,
  tags: ["autodocs"],
  argTypes: {
    message: {
      control: "text",
    },
    details: {
      control: "text",
      description: "Markdown content rendered inside the Details section.",
    },
    defaultDetailsOpen: {
      control: "boolean",
    },
  },
  args: {
    message:
      "Could not parse this file. Please check that it is a valid CSV with a header row, then re-upload.",
  },
  render: (args) => (
    <div className="w-[456px]">
      <FileErrorAlert {...args} />
    </div>
  ),
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FileErrorAlert>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * With no `details`, the alert renders just the icon and message — no
 * accordion.
 */
export const Default: Story = {};

/**
 * Passing `details` adds a collapsible "Details" section below the message,
 * rendered as markdown.
 */
export const WithDetails: Story = {
  args: {
    details: `The following rows failed validation:

- Row 3: missing \`customer_id\`
- Row 7: \`amount\` is not a number
- Row 12: duplicate \`order_id\`

See the [CSV formatting guide](#) for details.`,
  },
};

/**
 * Use `defaultDetailsOpen` to render the Details section expanded on first
 * render.
 */
export const DetailsOpenByDefault: Story = {
  args: {
    ...WithDetails.args,
    defaultDetailsOpen: true,
  },
};

/**
 * Clicking the "Details" trigger expands the section and reveals the
 * markdown content.
 */
export const ShouldExpandDetailsOnClick: Story = {
  name: "when Details is clicked, should expand and show markdown content",
  args: WithDetails.args,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Details" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
    expect(
      canvas.getByText((text) => text.includes("customer_id")),
    ).toBeVisible();

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  },
};
