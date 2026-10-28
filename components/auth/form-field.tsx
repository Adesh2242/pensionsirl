import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A hairline-underlined field: no boxes, just a label, a line and the value. */
export function FormField({
  id,
  label,
  hint,
  ...props
}: { id: string; label: string; hint?: string } & ComponentProps<typeof Input>) {
  return (
    <div className="border-t border-border pt-5">
      <Label htmlFor={id} className="lower font-mono text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        className="mt-2 h-10 rounded-none border-0 border-b border-transparent bg-transparent px-0 text-base placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-0"
        {...props}
      />
      {hint && <p className="lower mt-2 font-mono text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
