"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function InviteAcceptPage() {
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setStatus("loading");
      try {
        const auth = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (auth) headers["Authorization"] = `Bearer ${auth}`;

        const res = await fetch("http://127.0.0.1:8000/ai/invites/accept", {
          method: "POST",
          headers,
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus("success");
          setMessage("Invite accepted. You were added to the group.");
          // short delay then navigate to projects
          setTimeout(() => router.push("/projects"), 1400);
        } else {
          setStatus("error");
          setMessage(data?.detail || data?.error || JSON.stringify(data) || "Failed to accept invite");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || String(err));
      }
    })();
  }, [token, router]);

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Accept Invite</h1>
      {!token && (
        <div>
          <p className="mb-4">No invite token found in the URL.</p>
          <a className="text-blue-600 underline" href="/projects">Go to Projects</a>
        </div>
      )}

      {token && status === "loading" && <p>Accepting invite…</p>}
      {token && status === "success" && (
        <div>
          <p className="text-green-600 mb-2">{message}</p>
          <p>Redirecting to your projects…</p>
        </div>
      )}
      {token && status === "error" && (
        <div>
          <p className="text-red-600 mb-2">{message}</p>
          <div className="flex gap-4">
            <a className="text-blue-600 underline" href="/login">Log in</a>
            <a className="text-blue-600 underline" href="/projects">View Projects</a>
          </div>
        </div>
      )}
    </div>
  );
}
