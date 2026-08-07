/**
 * A file moving through the upload pipeline. Shared across the file-upload
 * components (list, detail panel) — the same object should flow to all of
 * them rather than each deriving its own shape.
 *
 * Treat instances as immutable: a status transition (e.g. "loading" ->
 * "success") must produce a new object, not a mutation, or components
 * already holding the old reference won't re-render.
 */
type UploadFile =
  | {
      id: string;
      filename: string;
      /** Category shown ahead of the status text, e.g. "Primary" or "Related". */
      fileType?: string;
      status: "loading";
    }
  | {
      id: string;
      filename: string;
      fileType?: string;
      status: "success";
      rowCount?: number;
    }
  | {
      id: string;
      filename: string;
      fileType?: string;
      status: "error";
      error: {
        message: string;
        details?: string;
        defaultDetailsOpen?: boolean;
      };
    };

export type { UploadFile };
