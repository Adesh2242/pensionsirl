"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Fund, HoldingInput, TrackedFund } from "@/lib/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const fieldClass =
  "tabular mt-2 h-10 rounded-none border-0 border-b border-border bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="lower font-mono text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="lower mt-1.5 font-mono text-[0.7rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Adds a holding, or updates one — most often with the figure from a new
 * statement, which re-anchors every estimate that follows.
 */
export function HoldingDialog({
  open,
  onOpenChange,
  funds,
  excludeFundSlugs,
  defaultFundSlug,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funds: Fund[];
  excludeFundSlugs: Set<string>;
  defaultFundSlug?: string;
  /** The holding being updated; omit to add a new one. */
  editing?: TrackedFund;
  onSave: (input: HoldingInput) => Promise<void>;
}) {
  const [fundSlug, setFundSlug] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [valueAsOf, setValueAsOf] = useState(today());
  const [personal, setPersonal] = useState("");
  const [employer, setEmployer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the dialog opens. Adjusting state during render
  // (rather than in an effect) avoids an extra render pass.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFundSlug(editing?.fundSlug ?? defaultFundSlug ?? "");
      setLabel(editing?.label ?? "");
      // When updating, start the value empty so the user types the new
      // statement figure rather than editing the old one by accident.
      setValue("");
      setValueAsOf(today());
      setPersonal(editing ? String(editing.monthlyContribution) : "");
      setEmployer(editing ? String(editing.employerContribution) : "");
      setError(null);
    }
  }

  const availableFunds = funds.filter((f) => !excludeFundSlugs.has(f.slug) || f.slug === fundSlug);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const startValue = value.trim() === "" && editing ? editing.startValue : Number(value);
    const anchor = value.trim() === "" && editing ? editing.valueAsOf : valueAsOf;
    const monthly = personal.trim() === "" ? 0 : Number(personal);
    const employerMonthly = employer.trim() === "" ? 0 : Number(employer);

    if (!fundSlug) return setError("choose a fund.");
    if (!Number.isFinite(startValue) || startValue < 0) return setError("enter a valid value.");
    if (!anchor || Number.isNaN(new Date(anchor).getTime())) return setError("enter the date of that value.");
    if (anchor > today()) return setError("the value date can't be in the future.");
    if (!Number.isFinite(monthly) || monthly < 0) return setError("enter a valid monthly contribution.");
    if (!Number.isFinite(employerMonthly) || employerMonthly < 0)
      return setError("enter a valid employer contribution.");
    if (startValue === 0 && monthly === 0 && employerMonthly === 0)
      return setError("add a value, a monthly contribution, or both.");

    setSaving(true);
    try {
      await onSave({
        fundSlug,
        label: label.trim() || undefined,
        startValue,
        valueAsOf: anchor,
        monthlyContribution: monthly,
        employerContribution: employerMonthly,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message.toLowerCase() : "something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const fund = funds.find((f) => f.slug === fundSlug);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* noValidate: our checks below own every message. Native constraint
            validation would block submit on a future date with a browser
            tooltip and leave the previous error showing. */}
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="lower font-heading text-2xl font-normal tracking-tight">
              {editing ? "update this holding" : "add a holding"}
            </DialogTitle>
            <DialogDescription className="lower">
              {editing
                ? "enter the value from your latest statement and we'll estimate forward from there."
                : "enter what it's worth and what goes in each month. we estimate it forward from the fund's returns."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            <Field id="h-fund" label="fund">
              <Select
                value={fundSlug}
                onValueChange={(v) => v && setFundSlug(v)}
                disabled={Boolean(editing)}
              >
                <SelectTrigger id="h-fund" className={`${fieldClass} w-full`}>
                  <SelectValue placeholder="choose a fund…">
                    {(slug: string) => {
                      const selected = funds.find((f) => f.slug === slug);
                      return selected ? `${selected.providerName} — ${selected.name}` : slug;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableFunds.map((f) => (
                    <SelectItem key={f.slug} value={f.slug}>
                      {f.providerName} — {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="h-label" label="name it (optional)" hint="e.g. work pension, prsa, avc">
              <Input
                id="h-label"
                maxLength={60}
                className={fieldClass}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-6">
              <Field
                id="h-value"
                label={editing ? "new value (€)" : "value (€)"}
                hint={editing ? "leave empty to keep the current anchor" : "0 if you're just starting"}
              >
                <Input
                  id="h-value"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder={editing ? String(editing.startValue) : "e.g. 42000"}
                  className={fieldClass}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </Field>
              <Field id="h-asof" label="value on" hint="your statement date">
                <Input
                  id="h-asof"
                  type="date"
                  max={today()}
                  className={fieldClass}
                  value={valueAsOf}
                  onChange={(e) => setValueAsOf(e.target.value)}
                  disabled={Boolean(editing) && value.trim() === ""}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Field id="h-personal" label="you pay monthly (€)">
                <Input
                  id="h-personal"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  className={fieldClass}
                  value={personal}
                  onChange={(e) => setPersonal(e.target.value)}
                />
              </Field>
              <Field id="h-employer" label="employer pays monthly (€)">
                <Input
                  id="h-employer"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  className={fieldClass}
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                />
              </Field>
            </div>

            {fund && (
              <p className="lower font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
                tracked at this fund&apos;s 1yr return ({fund.oneYearReturn >= 0 ? "+" : ""}
                {fund.oneYearReturn.toFixed(1)}%), less its{" "}
                {fund.amc !== undefined ? `${fund.amc.toFixed(2)}%` : "unpublished"} charge.
              </p>
            )}

            {error && <p className="lower font-mono text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-8 border-t border-border pt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="lower link-underline font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="lower inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "saving…" : editing ? "update" : "add holding"}
              <span aria-hidden>↗</span>
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
