"use client";

interface MarqueeProps {
  items: readonly string[];
  className?: string;
}

/** Edge-faded infinite ticker. The list is duplicated so the loop is seamless. */
export function Marquee({ items, className = "" }: MarqueeProps) {
  const row = [...items, ...items];
  return (
    <div className={`marquee-mask group overflow-hidden ${className}`}>
      <ul className="animate-marquee flex w-max items-center gap-3 group-hover:[animation-play-state:paused]">
        {row.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="shrink-0 rounded-full border border-border bg-card/40 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm"
            aria-hidden={index >= items.length}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
