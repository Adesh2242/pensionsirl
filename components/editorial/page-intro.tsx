import type { ReactNode } from "react";
import { Field } from "@/components/editorial/field";
import { HeroCorners } from "@/components/editorial/hero-corners";
import { Ragged } from "@/components/editorial/ragged";
import { SectionLabel } from "@/components/editorial/section-label";

/**
 * The framed gradient panel every inner page opens with — the same hero
 * language as the home page, at a quieter height.
 *
 * The lead sits *below* the panel rather than inside it: body copy laid over
 * the bright end of a gradient field is unreadable, and dimming the field to
 * fix that would cost the hero its colour.
 */
export function PageIntro({
  label,
  lines,
  lead,
  tone = "teal",
  corners,
  children,
}: {
  label: string;
  /** One entry per headline line; each steps further across the measure. */
  lines: readonly string[];
  lead?: ReactNode;
  tone?: "teal" | "sun" | "slate";
  corners?: { left: string; right: string };
  children?: ReactNode;
}) {
  return (
    <>
      <Field className="inset-frame flex flex-col justify-end" tone={tone}>
        {corners && <HeroCorners left={corners.left} right={corners.right} />}
        <div className="px-6 pb-12 pt-36 md:px-10 md:pb-16 md:pt-44">
          <SectionLabel>{label}</SectionLabel>
          <Ragged
            as="h1"
            className="mt-8 max-w-5xl text-[10vw] leading-[0.95] md:text-[5vw]"
            lines={lines}
          />
        </div>
      </Field>

      {(lead || children) && (
        <div className="px-6 pt-10 md:px-10 md:pt-14">
          <div className="container-page px-0 md:px-0">
            {lead && (
              <p className="lower max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {lead}
              </p>
            )}
            {children}
          </div>
        </div>
      )}
    </>
  );
}
