"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-[var(--app-surface)] p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--app-text)]">Welcome</h3>
            <p className="mt-1 text-sm text-[var(--app-muted)]">Create an account or log in to continue.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close auth dialog"
            title="Close"
            className="rounded-full p-1 text-[var(--app-muted)] hover:text-[var(--app-text)]"
          >
            <X />
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push("/login")}
            className="flex-1 rounded-xl bg-[var(--app-text)] px-4 py-2 text-sm font-semibold text-[var(--app-bg)]"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="flex-1 rounded-xl border border-[var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] bg-[var(--app-surface-2)]"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
