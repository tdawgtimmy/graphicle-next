import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import { FileSelectionItem } from "@/components/ui/file-upload/file-selection-item";

/**
 * A row representing a single file in an upload/import list. Displays status
 * and allows cancelation and or removal of the item via a nested button and
 * callbacks.
 */
const meta: Meta<typeof FileSelectionItem> = {
  title: "ui/file-upload/FileSelectionItem",
  component: FileSelectionItem,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["loading", "success", "error"],
    },
    filename: {
      control: "text",
    },
    fileType: {
      control: "text",
    },
    rowCount: {
      control: "number",
      if: { arg: "status", eq: "success" },
    },
    selected: {
      control: "boolean",
      description: "Persistent active/selected look. No effect while loading.",
      if: { arg: "status", neq: "loading" },
    },
  },
  args: {
    filename: "Filename.ext",
    status: "loading",
    fileType: "Primary",
    rowCount: 23000,
    selected: false,
    onCancel: fn(),
    onDelete: fn(),
    onSelect: fn(),
  },
  render: (args) => (
    <div className="w-[280px]">
      <FileSelectionItem {...args} />
    </div>
  ),
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FileSelectionItem>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A file that is being processed. Can be canceled, but not selected.
 */
export const Loading: Story = {};

/**
 * A file that finished processing successfully. Shows a row count,
 * abbreviated above 999 (e.g. "23K rows"). Can be deleted.
 */
export const Success: Story = {
  args: {
    status: "success",
  },
};

/**
 * A file that failed to process. Can be deleted.
 */
export const Error: Story = {
  args: {
    status: "error",
  },
};

/**
 * A row that has been selected. Can be deleted.
 */
export const Selected: Story = {
  args: {
    status: "success",
    selected: true,
  },
  play: async ({ args, canvas, canvasElement }) => {
    const item = canvasElement.querySelector<HTMLElement>("[data-status]")!;

    expect(item).toHaveClass("cursor-default");

    await userEvent.click(item);
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

/**
 * Hovering the row reveals the delete or cancel button.
 */
export const RevealsActionOnHover: Story = {
  args: {
    status: "success",
  },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: /delete/i });

    await userEvent.click(button);
    await expect(args.onDelete).toHaveBeenCalledTimes(1);
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

/**
 * Long filenames truncate with an ellipsis; the action button floats over
 * the text rather than reflowing the row.
 */
export const LongFilename: Story = {
  args: {
    status: "success",
    filename: "quarterly-revenue-report-final-v3-reviewed-by-finance.xlsx",
  },
};

/**
 * The component is keyboard accessible. Tabbing to a success/error row reveals
 * the delete button, but the item and button are separate stops. A second Tab
 * reaches and activates the button.
 */
export const KeyboardAccessibility: Story = {
  args: {
    status: "success",
  },
  play: async ({ args, canvas, canvasElement }) => {
    const item = canvasElement.querySelector<HTMLElement>("[data-status]")!;
    const button = canvas.getByRole("button", { name: /delete/i });

    await userEvent.tab();
    await waitFor(() => {
      expect(item).toHaveFocus();
      expect(button).toBeVisible();
    });
    expect(button).not.toHaveFocus();

    await userEvent.tab();
    await waitFor(() => expect(button).toHaveFocus());

    await userEvent.keyboard("{Enter}");
    await expect(args.onDelete).toHaveBeenCalledTimes(1);
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

/**
 * For loading rows, focus goes straight to the cancel button.
 */
export const CancelViaKeyboard: Story = {
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: /cancel/i });

    await userEvent.tab();

    await waitFor(() => {
      expect(button).toHaveFocus();
      expect(button).toBeVisible();
    });

    await userEvent.keyboard(" ");
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
  },
};

/**
 * Without `onDelete` or `onCancel` callbacks, no action button renders.
 */
export const NoActionHandler: Story = {
  args: {
    status: "success",
    onDelete: undefined,
  },
};
