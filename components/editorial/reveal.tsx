"use client";

import { useRef, type ReactNode } from "react";
import { prefersReducedMotion, useIsomorphicLayoutEffect } from "@/lib/hooks/use-in-view";

type RevealVariant = "up" | "down" | "left" | "right" | "scale" | "blur" | "fade" | "line";

interface RevealProps {
  children?: ReactNode;
  /** Element to render. Defaults to a div. */
  as?: "div" | "section" | "span" | "li" | "article" | "p" | "h1" | "h2" | "h3";
  variant?: RevealVariant;
  /** Stagger in milliseconds. */
  delay?: number;
  className?: string;
}

/**
 * Animates its children in when they enter the viewport.
 *
 * The hidden state is applied in a layout effect rather than in markup, so the
 * server-rendered HTML is always visible: no flash on hydration and no blank
 * sections if JavaScript never runs.
 */
export function Reveal({
  children,
  as = "div",
  variant = "up",
  delay = 0,
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    el.dataset.revealState = "hidden";

    if (typeof IntersectionObserver === "undefined") {
      el.dataset.revealState = "visible";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Also reveal anything the viewport has already moved past, so a fast
        // scroll or a jump to an anchor never leaves a section stuck hidden.
        const scrolledPast = entry.boundingClientRect.top < window.innerHeight;
        if (!entry.isIntersecting && !scrolledPast) return;
        el.dataset.revealState = "visible";
        observer.unobserve(entry.target);
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Rendered as JSX rather than createElement so the ref is a real JSX ref
  // attribute — reading one out of a props object counts as touching a ref
  // during render.
  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={className}
      data-reveal={variant}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
