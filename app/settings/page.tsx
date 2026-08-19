"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, TriangleAlert } from "lucide-react";
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

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, isMockMode, signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="mx-auto max-w-2xl px-4 py-10 text-muted-foreground">Loading…</div>;
  }

  function exportData() {
    const consent = readConsent();
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      cookieConsent: consent,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pensioniq-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    setDeleting(true);
    const supabase = createClient();
    if ("isMock" in supabase) {
      await supabase.auth.deleteAccount();
    } else {
      await supabase.auth.signOut();
    }
    setDeleting(false);
    setConfirmOpen(false);
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-muted-foreground">Manage your account and your data.</p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {user.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {user.email}
          </p>
          {isMockMode && (
            <p className="mt-2 text-xs text-muted-foreground">
              Demo mode: your account only exists in this browser&apos;s local storage.
            </p>
          )}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => signOut()}>
            Log out
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Your data (GDPR)</CardTitle>
          <CardDescription>Export everything we hold about you, or delete your account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4" />
            Export my data
          </Button>
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
  );
}
