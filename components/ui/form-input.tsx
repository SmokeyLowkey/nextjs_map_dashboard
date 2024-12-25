import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  value: any;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, type, value, ...props }, ref) => {
    // Convert any value to string for display
    const displayValue = typeof value === 'object' ? '' : String(value || '');

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        value={displayValue}
        {...props}
      />
    )
  }
)
FormInput.displayName = "FormInput"

export { FormInput }
