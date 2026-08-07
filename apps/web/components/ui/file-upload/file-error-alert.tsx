"use client"

import * as React from "react"
import { CircleAlert } from "lucide-react"
import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const markdownComponents: Components = {
  p: ({ ...props }) => <p className="not-last:mb-2" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc space-y-1 pl-5" {...props} />,
  ol: ({ ...props }) => (
    <ol className="list-decimal space-y-1 pl-5" {...props} />
  ),
  a: ({ ...props }) => (
    <a
      className="underline underline-offset-3 hover:text-foreground"
      {...props}
    />
  ),
  code: ({ ...props }) => (
    <code className="rounded bg-muted px-1 py-0.5 text-xs" {...props} />
  ),
}

type FileErrorAlertProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Plain-text error message shown next to the alert icon. */
  message: string
  /**
   * Extended error detail, rendered as markdown inside a collapsible
   * "Details" section. Omit to render the alert without it.
   */
  details?: string
  /** Whether the details section starts open. @default false */
  defaultDetailsOpen?: boolean
}

function FileErrorAlert({
  className,
  message,
  details,
  defaultDetailsOpen = false,
  ...props
}: FileErrorAlertProps) {
  return (
    <Alert className={cn("flex flex-col gap-4 p-3", className)} {...props}>
      <div className="flex items-start gap-3">
        <CircleAlert
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-destructive"
        />
        <AlertDescription className="text-sm/5 font-medium text-destructive">
          {message}
        </AlertDescription>
      </div>

      {details && (
        <Accordion
          defaultValue={defaultDetailsOpen ? ["details"] : []}
          className="rounded-none border-0"
        >
          <AccordionItem
            value="details"
            className="overflow-hidden rounded-[16px] border bg-background text-foreground data-open:bg-background"
          >
            <AccordionTrigger className="px-4 py-4 text-sm/5 font-medium hover:no-underline">
              Details
            </AccordionTrigger>
            {/* -mx-2 cancels AccordionContent's built-in px-2 so px-4 below lands at the same 16px inset as the trigger. */}
            <AccordionContent className="-mx-2 border-t px-4 py-4 font-mono text-sm/5">
              <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {details}
              </Markdown>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </Alert>
  )
}

export { FileErrorAlert }
export type { FileErrorAlertProps }
