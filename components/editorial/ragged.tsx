"use client";

import { AnimatedText } from "@/components/editorial/animated-text";

interface RaggedProps {
  /** One entry per line; each line steps further across the measure. */
  lines: readonly string[];
  as?: "h1" | "h2";
  className?: string;
  /** Lines rendered in teal rather than off-white. */
  accentLines?: readonly number[];
}

/**
 * Oversized editorial headline whose lines are deliberately mis-aligned, each
 * one animating in word by word.
 */
export function Ragged({ lines, as = "h1", className = "", accentLines = [] }: RaggedProps) {
  const Tag = as;

  // Each line picks up the stagger where the previous one left off, so the
  // whole headline reads as one continuous rhythm. Derived up front rather
  // than accumulated inside the map, which would mutate across renders.
  const startIndices: number[] = [];
  for (let i = 0, offset = 0; i < lines.length; i++) {
    startIndices.push(offset);
    offset += lines[i].split(" ").length;
  }

  return (
    <Tag className={`ragged lower ${className}`}>
      {lines.map((line, i) => {
        const startIndex = startIndices[i];
        return (
          <AnimatedText
            key={line}
            as="span"
            text={line}
            startIndex={startIndex}
            className={accentLines.includes(i) ? "text-accent-teal" : undefined}
          />
        );
      })}
    </Tag>
  );
}
