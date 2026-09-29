"use client";

import React, { useEffect, useState } from "react";

export default function PromoEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [offerText, setOfferText] = useState("");
  const [imageSrc, setImageSrc] = useState("");
  const [duration, setDuration] = useState(600);
  const [planKeys, setPlanKeys] = useState<string[]>(["pro"]);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [showViewButton, setShowViewButton] = useState(true);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("my-prompt-promo-config");
      if (raw) {
        const parsed = JSON.parse(raw);
        // defer state updates slightly to avoid synchronous setState-in-effect warning
        setTimeout(() => {
          setTitle(parsed.title || "");
          setSubtitle(parsed.subtitle || "");
          setDescription(parsed.description || "");
          setOfferText(parsed.offerText || "");
          setImageSrc(parsed.imageSrc || "");
          setDuration(parsed.durationSeconds || 600);
          // support old single planKey or new planKeys array
          if (parsed.planKeys && Array.isArray(parsed.planKeys)) setPlanKeys(parsed.planKeys);
          else if (parsed.planKey) setPlanKeys([parsed.planKey]);
          setDiscountPercent(parsed.discountPercent ?? 10);
          setShowViewButton(parsed.showViewButton ?? true);
        }, 0);
      }
    } catch {
      // ignore
    }
  }, [open]);

  // If the admin types a percent into offerText (e.g. "65% OFF"), keep discountPercent in sync
  useEffect(() => {
    try {
      const m = String(offerText).match(/(\d{1,3})\s*%/);
      if (m) {
        const n = Number(m[1]);
        if (!Number.isNaN(n)) setTimeout(() => setDiscountPercent(n), 0);
      }
    } catch {
      // ignore
    }
  }, [offerText]);

  const save = () => {
    // prefer percent found in offerText if present
    let finalDiscount = Number(discountPercent);
    try {
      const m = String(offerText).match(/(\d{1,3})\s*%/);
      if (m) {
        const n = Number(m[1]);
        if (!Number.isNaN(n)) finalDiscount = n;
      }
    } catch {
      // ignore
    }
    const cfg = { title, subtitle, description, offerText, imageSrc, durationSeconds: Number(duration), planKeys, discountPercent: Number(finalDiscount), showViewButton };
    try {
      localStorage.setItem("my-prompt-promo-config", JSON.stringify(cfg));
      window.dispatchEvent(new Event("promo:updated"));
    } catch {
      // ignore
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 p-6 shadow-lg border border-gray-200 dark:border-slate-700">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Promo Editor</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Promo title" className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-400 px-3 py-2" />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Subtitle</label>
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Short subtitle" className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-400 px-3 py-2" />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description shown on promo" className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-400 px-3 py-2" rows={3} />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Image src (public folder)</label>
          <input value={imageSrc} onChange={(e) => setImageSrc(e.target.value)} placeholder="/my-prompt-logo.svg" className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-400 px-3 py-2" />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Offer text (displayed when no image)</label>
          <input value={offerText} onChange={(e) => setOfferText(e.target.value)} placeholder="55% OFF — limited time" className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-400 px-3 py-2" />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Duration (seconds)</label>
          <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="600" className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-400 px-3 py-2" />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Target plans (select one or more)</label>
          <div className="mt-2 flex gap-3">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={planKeys.includes("student")} onChange={(e) => setPlanKeys((s) => e.target.checked ? Array.from(new Set([...s, "student"])) : s.filter(p => p !== "student"))} />
              <span className="text-sm text-gray-900 dark:text-gray-100">Student Plan (₹0)</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={planKeys.includes("pro")} onChange={(e) => setPlanKeys((s) => e.target.checked ? Array.from(new Set([...s, "pro"])) : s.filter(p => p !== "pro"))} />
              <span className="text-sm text-gray-900 dark:text-gray-100">Pro</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={planKeys.includes("elite")} onChange={(e) => setPlanKeys((s) => e.target.checked ? Array.from(new Set([...s, "elite"])) : s.filter(p => p !== "elite"))} />
              <span className="text-sm text-gray-900 dark:text-gray-100">Elite</span>
            </label>
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Discount percent</label>
          <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} placeholder="10" className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-400 px-3 py-2" />
        </div>
        <div className="mb-3">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showViewButton} onChange={(e) => setShowViewButton(e.target.checked)} />
            <span className="text-sm ml-2 text-gray-900 dark:text-gray-100">Show "View Promo Offer" button in Admin panel</span>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-gray-300 dark:border-slate-700 px-4 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Cancel</button>
          <button onClick={save} className="rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white">Save</button>
        </div>
      </div>
    </div>
  );
}
