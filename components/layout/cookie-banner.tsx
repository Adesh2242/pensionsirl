"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { readConsent, writeConsent } from "@/lib/consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so consent can only be read after
    // mount — deliberately deferred, not a synchronization-from-props effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(readConsent() === null);
  }, []);

  function acceptAll() {
    writeConsent(true);
    setVisible(false);
  }

  function rejectAll() {
    writeConsent(false);
    setVisible(false);
  }

  function saveManaged() {
    writeConsent(analytics);
    setManageOpen(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      <div className="animate-fade-up fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 shadow-lift backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
        <div className="container-page flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            We use essential cookies to run PensionIQ, and optional analytics cookies to
            understand usage. No advertising or tracking pixels. See our{" "}
            <a href="/privacy" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
            .
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={rejectAll}>
              Reject
            </Button>
            <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
              Manage
            </Button>
            <Button size="sm" onClick={acceptAll}>
              Accept All
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage cookie preferences</DialogTitle>
            <DialogDescription>
              Necessary cookies keep the app working and can&apos;t be disabled. Analytics
              cookies are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-xl border p-3.5">
              <div>
                <p className="text-sm font-medium">Necessary</p>
                <p className="text-xs text-muted-foreground">Required for login and core features.</p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3.5">
              <div>
                <p className="text-sm font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">
                  Helps us understand which pages are useful.
                </p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveManaged}>Save preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
