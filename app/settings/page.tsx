"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Mail, TriangleAlert, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { PageHeader } from "@/components/layout/page-header";
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
      <div className="container-page max-w-2xl py-12">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-3 h-5 w-72" />
        <Skeleton className="mt-8 h-44 rounded-xl" />
        <Skeleton className="mt-6 h-40 rounded-xl" />
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
      <PageHeader title="Settings" description="Manage your account and your data." />

      <div className="container-page max-w-2xl py-10">
      <Card className="shadow-soft">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 text-sm">
          <dl className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="icon-tile size-9 text-muted-foreground">
                <User className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="font-medium">{user.name ?? "—"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="icon-tile size-9 text-muted-foreground">
                <Mail className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="truncate font-medium">{user.email}</dd>
              </div>
            </div>
          </dl>
          {isMockMode && (
            <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Demo mode: your account only exists in this browser&apos;s local storage.
            </p>
          )}
          <Button variant="outline" size="sm" className="mt-4" onClick={() => signOut()}>
            Log out
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Your data (GDPR)</CardTitle>
          <CardDescription>Export everything we hold about you, or delete your account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-3">
          <div>
            <Button variant="outline" onClick={exportData} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export my data"}
            </Button>
            {exportError && <p className="mt-2 text-xs text-destructive">{exportError}</p>}
          </div>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <TriangleAlert className="h-4 w-4" />
            Delete account
          </Button>
        </CardContent>
      </Card>

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
