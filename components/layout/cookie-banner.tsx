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
      <div className="animate-fade-up fixed inset-x-3 bottom-3 z-50">
        <div className="pill flex flex-col gap-4 rounded-[var(--radius)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="lower max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
            essential cookies run pensioniq; analytics cookies are optional. no advertising or
            tracking pixels. see our{" "}
            <a href="/privacy" className="link-underline text-foreground">
              privacy policy
            </a>
            .
          </p>
          <div className="lower flex shrink-0 items-center gap-6 font-mono text-xs">
            <button onClick={rejectAll} className="link-underline text-muted-foreground hover:text-foreground">
              reject
            </button>
            <button
              onClick={() => setManageOpen(true)}
              className="link-underline text-muted-foreground hover:text-foreground"
            >
              manage
            </button>
            <button
              onClick={acceptAll}
              className="rounded-full bg-primary px-5 py-2 text-primary-foreground transition-opacity hover:opacity-90"
            >
              accept all
            </button>
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
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="lower text-sm">necessary</p>
                <p className="lower mt-1 font-mono text-xs text-muted-foreground">
                  required for login and core features
                </p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="lower text-sm">analytics</p>
                <p className="lower mt-1 font-mono text-xs text-muted-foreground">
                  helps us understand which pages are useful
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
