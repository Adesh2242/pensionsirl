"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Mail, TriangleAlert, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { readConsent } from "@/lib/consent";
import { listTrackedFunds } from "@/lib/portfolio/store";
import { PageIntro } from "@/components/editorial/page-intro";
import { SectionLabel } from "@/components/editorial/section-label";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, isMockMode, signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="container-page max-w-3xl px-6 py-32 md:px-10">
        <p className="lower font-mono text-xs text-muted-foreground">loading your settings…</p>
        <Skeleton className="mt-8 h-32 rounded-none" />
      </div>
    );
  }

  async function exportData() {
    if (!user) return;
    setExporting(true);
    setExportError(null);
    const consent = readConsent();
    let trackedFunds: Awaited<ReturnType<typeof listTrackedFunds>> = [];
    try {
      const supabase = createClient();
      trackedFunds = await listTrackedFunds(supabase, user.id);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? `Couldn't include tracked funds: ${err.message}`
          : "Couldn't include tracked funds in this export.",
      );
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      cookieConsent: consent,
      trackedFunds,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pensioniq-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();

    if ("isMock" in supabase) {
      await supabase.auth.deleteAccount();
    } else {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Failed to delete account. Please try again.");
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
    }

    setDeleting(false);
    setConfirmOpen(false);
    router.push("/");
  }

  return (
    <>
      <PageIntro
        label="settings"
        lines={["your account,", "your data."]}
        tone="slate"
        corners={{ left: isMockMode ? "demo mode" : "live account", right: "gdpr export & delete" }}
      />

      <div className="container-page max-w-3xl px-6 py-14 md:px-10 md:py-20">
      <SectionLabel>profile</SectionLabel>
      <dl className="mt-8 border-t border-border">
        <div className="flex items-baseline justify-between gap-6 border-b border-border py-5">
          <dt className="lower flex items-center gap-3 font-mono text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" aria-hidden />
            name
          </dt>
          <dd className="lower font-heading text-lg">{user.name ?? "—"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 border-b border-border py-5">
          <dt className="lower flex items-center gap-3 font-mono text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" aria-hidden />
            email
          </dt>
          <dd className="truncate font-heading text-lg">{user.email}</dd>
        </div>
      </dl>
      {isMockMode && (
        <p className="lower mt-5 font-mono text-xs text-muted-foreground">
          demo mode: your account only exists in this browser&apos;s local storage.
        </p>
      )}
      <button
        onClick={() => signOut()}
        className="lower link-underline mt-6 font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        log out ↗
      </button>

      <SectionLabel className="mt-16">your data (gdpr)</SectionLabel>
      <p className="lower mt-6 max-w-lg text-sm text-muted-foreground">
        export everything we hold about you, or delete your account for good.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-border pt-6">
        <button
          onClick={exportData}
          disabled={exporting}
          className="lower pill inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm transition-colors hover:text-primary disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          {exporting ? "exporting…" : "export my data"}
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          className="lower link-underline inline-flex items-center gap-2 font-mono text-xs text-destructive"
        >
          <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
          delete account
        </button>
        {exportError && <p className="lower font-mono text-xs text-destructive">{exportError}</p>}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your account and cannot be undone. Type{" "}
              <strong>DELETE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm">Confirmation</Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "DELETE" || deleting}
              onClick={deleteAccount}
            >
              {deleting ? "Deleting…" : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
