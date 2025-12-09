import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2"
)

interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  truncate?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, truncate, children, ...props }, ref) => {
  const labelContent = (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        labelVariants(),
        truncate && "block truncate whitespace-nowrap overflow-hidden max-w-full",
        className
      )}
      {...props}
    >
      {children}
    </LabelPrimitive.Root>
  );

  if (truncate && typeof children === 'string') {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {labelContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{children}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return labelContent;
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
