"use client";

import React from "react";
import Link from "next/link";
import { ChatWorkspace } from "@/components/chat-workspace";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  // Landing page uses the global ThemeProvider; do not override owner-selected theme here.

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-5xl py-8 px-6">
        <div className="app-card p-6">
          <div className="mb-2 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[var(--app-text)]">My Coding Prompt</h1>
              <p className="mt-1 text-sm text-[var(--app-muted)]">AI chat workspace — try chat for free or sign up for pro features.</p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/login" className="btn btn-secondary">Login</Link>
              <Link href="/signup" className="btn btn-primary">Sign up</Link>
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </div>
          </div>

          <div className="mt-8 w-full">
            <ChatWorkspace publicMode />
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-[var(--app-muted)]">
          <p>Explore the chat experience. Other features require signing up.</p>
        </div>
      </div>
    </div>
  );
}
