import Link from "next/link";
import { AppChrome } from "@/components/app-chrome";

export default function NotFound() {
  return (
    <main className="page">
      <AppChrome />
      <div className="mt-20 max-w-lg">
        <p className="eyebrow">404</p>
        <h1 className="title">Page not found</h1>
        <p className="subtitle mt-3 text-base">
          That route doesn’t exist in DOOMCHAT. It may have moved, or the link is
          incorrect.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sessions" className="btn-primary">
            Go to sessions
          </Link>
          <Link href="/" className="btn-secondary">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
