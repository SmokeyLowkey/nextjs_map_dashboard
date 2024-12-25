import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

const DialogTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>(({ children, ...props }, ref) => (
  <DialogPrimitive.Trigger ref={ref} {...props}>
    {children}
  </DialogPrimitive.Trigger>
))
DialogTrigger.displayName = DialogPrimitive.Trigger.displayName

export { DialogTrigger }
