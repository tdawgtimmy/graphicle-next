import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
// Replace nextjs-vite with the name of your framework
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Field, FieldError } from "@/components/ui/field";
import {
  FileDrop,
  FileDropDescription,
} from "@/components/ui/file-upload/file-drop";

/**
 * A drop zone for uploading files by clicking to open the file picker or by
 * dragging files onto it. Accessible by default: it renders a native
 * `<input type="file">` under the hood, so click, keyboard, and screen
 * reader interactions all work without extra wiring.
 */
const meta: Meta<typeof FileDrop> = {
  title: "ui/file-upload/FileDrop",
  component: FileDrop,
  tags: ["autodocs"],
  argTypes: {
    accept: {
      control: "object",
      description:
        'File extensions or MIME types/patterns accepted, e.g. [".csv", ".xlsx"]. Drives the default FileDropDescription text and client-side validation.',
    },
    maxSize: {
      control: "number",
      description:
        "Maximum file size in bytes. Drives the default FileDropDescription text and client-side validation.",
    },
    multiple: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
  },
  args: {
    accept: [".xlsx", ".csv", ".tsv"],
    maxSize: 50 * 1024 * 1024,
    disabled: false,
    onFilesAccepted: fn(),
    onFilesRejected: fn(),
  },
  render: (args) => (
    <FileDrop {...args} className="max-w-sm">
      Click to upload or drag and drop
      <FileDropDescription />
    </FileDrop>
  ),
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FileDrop>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default, at-rest state. The subline is generated automatically from
 * `accept` and `maxSize`.
 */
export const Default: Story = {};

/**
 * Pass children to `FileDropDescription` to override the auto-generated
 * subline entirely.
 */
export const CustomDescription: Story = {
  render: (args) => (
    <FileDrop {...args} className="max-w-sm">
      Click to upload or drag and drop
      <FileDropDescription>
        Spreadsheets only, up to 50 MB each
      </FileDropDescription>
    </FileDrop>
  ),
};

/**
 * Add the `disabled` prop to prevent interaction. The zone is faded and no
 * longer responds to clicks or drags.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

/**
 * Pair `FileDrop` with `Field` and `FieldError` to surface a validation
 * error. Set `aria-invalid` on `FileDrop` to switch its border/ring to the
 * destructive treatment, and `data-invalid` on `Field` for consistent
 * spacing and text color.
 */
export const Invalid: Story = {
  render: (args) => (
    <Field data-invalid className="max-w-sm">
      <FileDrop {...args} aria-invalid aria-describedby="file-drop-error">
        Click to upload or drag and drop
        <FileDropDescription />
      </FileDrop>
      <FieldError id="file-drop-error">
        report.pdf isn&apos;t a supported file type
      </FieldError>
    </Field>
  ),
};

/**
 * Dragging a file over the zone highlights it as a valid drop target.
 */
export const DragActive: Story = {
  play: async ({ canvas }) => {
    const dropzone = (
      await canvas.findByText("Click to upload or drag and drop")
    ).closest("label") as HTMLElement;

    await fireEvent.dragEnter(dropzone);

    await waitFor(() => {
      expect(dropzone).toHaveAttribute("data-state", "active");
    });
  },
};

/**
 * Tabbing to the drop zone focuses the underlying file input and shows a
 * focus ring on the zone itself.
 */
export const Focused: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(/click to upload/i);

    await userEvent.tab();

    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  },
};

/**
 * Selecting a valid file through the file picker calls `onFilesAccepted`
 * with the selected file.
 */
export const AcceptsValidFile: Story = {
  tags: ["!dev", "!autodocs"],
  play: async ({ args, canvas }) => {
    const input = canvas.getByLabelText(/click to upload/i);
    const file = new File(["a,b,c"], "data.csv", { type: "text/csv" });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(args.onFilesAccepted).toHaveBeenCalledWith([file]);
    });
    expect(args.onFilesRejected).not.toHaveBeenCalled();
  },
};

/**
 * Selecting a file with a disallowed extension calls `onFilesRejected` with
 * reason `"type"` instead of accepting it.
 */
export const RejectsDisallowedType: Story = {
  tags: ["!dev", "!autodocs"],
  play: async ({ args, canvas }) => {
    const input = canvas.getByLabelText(/click to upload/i);
    const file = new File(["binary"], "report.pdf", {
      type: "application/pdf",
    });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(args.onFilesRejected).toHaveBeenCalledWith([
        { file, reason: "type" },
      ]);
    });
    expect(args.onFilesAccepted).not.toHaveBeenCalled();
  },
};

/**
 * Selecting a file larger than `maxSize` calls `onFilesRejected` with
 * reason `"size"`.
 */
export const RejectsOversizedFile: Story = {
  tags: ["!dev", "!autodocs"],
  args: {
    maxSize: 10,
  },
  play: async ({ args, canvas }) => {
    const input = canvas.getByLabelText(/click to upload/i);
    const file = new File(["this content is well over ten bytes"], "big.csv", {
      type: "text/csv",
    });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(args.onFilesRejected).toHaveBeenCalledWith([
        { file, reason: "size" },
      ]);
    });
    expect(args.onFilesAccepted).not.toHaveBeenCalled();
  },
};
