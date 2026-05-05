"use client";

import { useState } from "react";

export default function OpenAIKeySetter() {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/set-openai-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openai_key: key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setStatus("Saved. Restarting backend recommended.");
    } catch (err: any) {
      setStatus("Error: " + String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <textarea
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="sk-..."
        className="w-full rounded-md border p-2"
        rows={2}
      />
      <div className="mt-2 flex items-center gap-2">
        <button onClick={handleSubmit} disabled={loading || !key} className="rounded-md bg-blue-600 px-3 py-1 text-white">
          {loading ? "Saving..." : "Set OpenAI Key"}
        </button>
        <div className="text-sm text-[var(--app-muted)]">{status}</div>
      </div>
    </div>
  );
}
