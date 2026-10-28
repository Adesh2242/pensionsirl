interface SectionLabelProps {
  children: string;
  className?: string;
}

/** The small "▸ work" marker that opens each section. */
export function SectionLabel({ children, className = "" }: SectionLabelProps) {
  return (
    <p
      className={`lower flex items-center gap-2 font-mono text-xs text-muted-foreground ${className}`}
    >
      <span className="text-primary" aria-hidden="true">
        ▸
      </span>
      {children}
    </p>
  );
}
