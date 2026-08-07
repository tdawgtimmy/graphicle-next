import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import { FileSelectionItem } from "@/components/ui/file-selection-item";

/**
 * A row representing a single file in an upload/import list. Reuses
 * `Item`/`ItemMedia`/`ItemContent` for layout; the cancel/delete button is
 * absolutely positioned so it can float over a long, truncated filename
 * instead of pushing the row's width.
 */
const meta: Meta<typeof FileSelectionItem> = {
  title: "ui/base/FileSelectionItem",
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
 * While a file is uploading, the row is disabled from interaction except
 * for the cancel button, revealed on hover or focus.
 */
export const Loading: Story = {};

/**
 * A file that finished processing successfully shows a row count,
 * abbreviated above 999 (e.g. "23K rows").
 */
export const Success: Story = {
  args: {
    status: "success",
  },
};

/**
 * A file that failed to process. Only the icon is tinted red — the
 * filename stays neutral.
 */
export const Error: Story = {
  args: {
    status: "error",
  },
};

/**
 * `selected` keeps the row's active look and left indicator bar shown
 * permanently, independent of hover/focus.
 */
export const Selected: Story = {
  args: {
    status: "success",
    selected: true,
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
 * Hovering the row reveals the delete button, which sits on top of the
 * filename.
 */
export const RevealsActionOnHover: Story = {
  args: {
    status: "success",
  },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: /delete/i });

    await userEvent.hover(button);
    await waitFor(() => expect(button).toBeVisible());

    await userEvent.click(button);
    await expect(args.onDelete).toHaveBeenCalledTimes(1);
  },
};

/**
 * Tabbing to a success/error row reveals the delete button without moving
 * focus into it — the item and the button are separate stops. A second Tab
 * reaches and activates the button.
 */
export const KeyboardAccessible: Story = {
  name: "Keyboard accessible: item and action button are separate stops",
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
  },
};

/**
 * The loading row isn't a tab stop itself — focus goes straight to the
 * cancel button.
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
 * Without `onDelete`, no action button renders.
 */
export const NoActionHandler: Story = {
  args: {
    status: "success",
    onDelete: undefined,
  },
};
