"use client";

import { useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/hooks/use-in-view";

interface MagneticProps {
  children: ReactNode;
  /** How far the element leans toward the cursor, as a fraction of the offset. */
  strength?: number;
  className?: string;
}

/**
 * Pulls its child a little toward the cursor while hovered, then springs back.
 * Position is written straight to the node, so no React re-render per frame.
 */
export function Magnetic({ children, strength = 0.28, className = "" }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);

  function handleMove(event: React.PointerEvent<HTMLSpanElement>) {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - (rect.left + rect.width / 2)) * strength;
    const y = (event.clientY - (rect.top + rect.height / 2)) * strength;
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  }

  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "";
  }

  return (
    <span
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      className={`magnetic ${className}`}
    >
      {children}
    </span>
  );
}
