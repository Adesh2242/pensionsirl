import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <div className="icon-tile size-14 text-chart-1">
        <Compass className="h-6 w-6" aria-hidden />
      </div>
      <p className="tabular mt-6 text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className={buttonVariants()}>
          Go home
        </Link>
        <Link href="/funds" className={buttonVariants({ variant: "outline" })}>
          Browse funds
        </Link>
      </div>
    </div>
  );
}
