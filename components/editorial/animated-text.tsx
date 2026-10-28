"use client";

import { useRef, type ReactNode } from "react";
import { prefersReducedMotion, useIsomorphicLayoutEffect } from "@/lib/hooks/use-in-view";

interface AnimatedTextProps {
  /** Plain text — split on spaces so each word can animate on its own. */
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  className?: string;
  /** Words rendered in the animated gradient, matched exactly (punctuation included). */
  gradient?: readonly string[];
  /** Offset for the stagger, so a stack of lines keeps one continuous rhythm. */
  startIndex?: number;
}

/**
 * Headline that animates in word by word — each word rises out of a blur as the
 * line enters the viewport. Like `Reveal`, the hidden state is applied after
 * mount so the server-rendered text is always readable.
 */
export function AnimatedText({
  text,
  as = "span",
  className,
  gradient = [],
  startIndex = 0,
}: AnimatedTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const words = text.split(" ");

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
        const scrolledPast = entry.boundingClientRect.top < window.innerHeight;
        if (!entry.isIntersecting && !scrolledPast) return;
        el.dataset.revealState = "visible";
        observer.unobserve(entry.target);
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const children: ReactNode[] = [];
  words.forEach((word, i) => {
    children.push(
      <span
        key={`${word}-${i}`}
        style={{ "--i": startIndex + i } as React.CSSProperties}
        className={gradient.includes(word) ? "text-gradient-animated" : undefined}
      >
        {word}
      </span>,
    );
    if (i < words.length - 1) children.push(" ");
  });

  // JSX rather than createElement, so the ref is a real JSX ref attribute.
  const Tag = as as React.ElementType;

  return (
    <Tag ref={ref} className={className} data-text-reveal="">
      {children}
    </Tag>
  );
}
