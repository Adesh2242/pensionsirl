interface HeroCornersProps {
  left: string;
  right: string;
}

/**
 * The two micro-labels that sit either side of the floating nav. They belong to
 * the hero rather than the header, so they scroll away with it — and so they
 * never land on a light panel they'd be illegible against.
 */
export function HeroCorners({ left, right }: HeroCornersProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[76px] items-center justify-between px-6 md:px-10">
      <span className="lower hidden font-mono text-xs text-muted-foreground lg:block">{left}</span>
      <span className="lower hidden text-right font-mono text-xs text-muted-foreground lg:block">
        {right}
      </span>
    </div>
  );
}
