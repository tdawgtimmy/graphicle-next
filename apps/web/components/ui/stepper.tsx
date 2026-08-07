import * as React from "react"
import { cva } from "class-variance-authority"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type StepperItemState = "default" | "active" | "complete"
type StepperSize = "sm" | "default" | "lg"

const StepperItemStateContext = React.createContext<StepperItemState>("default")
const StepperSizeContext = React.createContext<StepperSize>("default")

function Stepper({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"ol"> & { size?: StepperSize }) {
  return (
    <StepperSizeContext.Provider value={size}>
      <ol
        data-slot="stepper"
        className={cn(
          "flex items-start [&>[data-slot=stepper-item]:first-child_[data-side=start]]:invisible [&>[data-slot=stepper-item]:last-child_[data-side=end]]:invisible",
          className
        )}
        {...props}
      />
    </StepperSizeContext.Provider>
  )
}

const stepperIndicatorVariants = cva(
  "relative z-10 inline-flex shrink-0 items-center justify-center rounded-full",
  {
    variants: {
      state: {
        default: "border border-border text-muted-foreground dark:bg-input/30",
        active: "bg-primary text-primary-foreground",
        complete: "bg-primary text-primary-foreground",
      },
      size: {
        sm: "size-6 text-xs",
        default: "size-9 text-base/6",
        lg: "size-12 text-lg",
      },
    },
    defaultVariants: {
      state: "default",
      size: "default",
    },
  }
)

const stepperIndicatorCheckIconSize: Record<StepperSize, string> = {
  sm: "size-3",
  default: "size-5",
  lg: "size-6",
}

function StepperIndicator({
  className,
  state,
  size,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  state?: StepperItemState
  size?: StepperSize
}) {
  const itemState = React.useContext(StepperItemStateContext)
  const contextSize = React.useContext(StepperSizeContext)
  const resolvedState = state ?? itemState
  const resolvedSize = size ?? contextSize

  return (
    <span
      data-slot="stepper-indicator"
      className={cn(
        stepperIndicatorVariants({ state: resolvedState, size: resolvedSize }),
        className
      )}
      {...props}
    >
      {resolvedState === "complete" ? (
        <CheckIcon className={stepperIndicatorCheckIconSize[resolvedSize]} />
      ) : (
        children
      )}
    </span>
  )
}

function StepperSeparator({
  className,
  side,
  active = false,
  ...props
}: React.ComponentProps<"span"> & { side: "start" | "end"; active?: boolean }) {
  return (
    <span
      aria-hidden
      data-slot="stepper-separator"
      data-side={side}
      className={cn(
        "h-px min-w-2 flex-1",
        active ? "bg-primary" : "bg-muted-foreground/25",
        className
      )}
      {...props}
    />
  )
}

function StepperTitle({ className, ...props }: React.ComponentProps<"p">) {
  const state = React.useContext(StepperItemStateContext)

  return (
    <p
      data-slot="stepper-title"
      className={cn(
        "w-full text-base/6 font-semibold",
        state === "active" ? "text-foreground" : "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function StepperSubtitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="stepper-subtitle"
      className={cn("w-full text-sm/5 text-muted-foreground", className)}
      {...props}
    />
  )
}

function StepperItem({
  className,
  state = "default",
  title,
  subtitle,
  children,
  ...props
}: React.ComponentProps<"li"> & {
  state?: StepperItemState
  title: React.ReactNode
  subtitle?: React.ReactNode
}) {
  return (
    <StepperItemStateContext.Provider value={state}>
      <li
        data-slot="stepper-item"
        data-state={state}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center gap-1.75",
          className
        )}
        {...props}
      >
        <div className="flex w-full items-center gap-2">
          <StepperSeparator side="start" active={state !== "default"} />
          {children}
          <StepperSeparator side="end" active={state === "complete"} />
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <StepperTitle>{title}</StepperTitle>
          {subtitle ? <StepperSubtitle>{subtitle}</StepperSubtitle> : null}
        </div>
      </li>
    </StepperItemStateContext.Provider>
  )
}

export {
  Stepper,
  StepperItem,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperSubtitle,
}
