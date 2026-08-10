import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
} from "@/components/ui/stepper";

type ImportWizardStepInfo = {
  id: string;
  title: string;
  subtitle: string;
};

type ImportWizardShellProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** All steps in the flow, in order. */
  steps: ImportWizardStepInfo[];
  /** ID of the step currently shown — drives the stepper header's complete/active/default states. */
  currentStepId: string;
  /** The active step's own content (form body + its own navigation buttons). */
  children: React.ReactNode;
};

function ImportWizardShell({
  className,
  steps,
  currentStepId,
  children,
  ...props
}: ImportWizardShellProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <div
      data-slot="import-wizard-shell"
      className={cn(
        "flex w-full flex-col overflow-clip rounded-xl border bg-background",
        className
      )}
      {...props}
    >
      <div className="flex w-full items-center bg-accent py-6">
        <Stepper className="w-full px-6">
          {steps.map((step, index) => {
            const state =
              index < currentIndex
                ? "complete"
                : index === currentIndex
                  ? "active"
                  : "default";
            return (
              <StepperItem
                key={step.id}
                state={state}
                title={step.title}
                subtitle={step.subtitle}
              >
                <StepperIndicator>{index + 1}</StepperIndicator>
              </StepperItem>
            );
          })}
        </Stepper>
      </div>
      {children}
    </div>
  );
}

export { ImportWizardShell };
export type { ImportWizardShellProps, ImportWizardStepInfo };
