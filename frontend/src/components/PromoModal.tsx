"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import startRazorpay from "@/lib/razorpayCheckout";
import { useTheme } from "@/components/theme-provider";

type PromoConfig = {
  title?: string;
  subtitle?: string;
  description?: string;
  imageSrc?: string;
  offerText?: string;
  durationSeconds?: number;
  planKey?: string;
  planKeys?: string[];
  discountPercent?: number;
};

export default function PromoModal({ open, onClose, duration, title, subtitle, description, imageSrc }: { open: boolean; onClose: () => void; duration?: number; title?: string; subtitle?: string; description?: string; imageSrc?: string }) {
  // load config from localStorage if props not provided
  const [config, setConfig] = useState<PromoConfig>({});
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("my-prompt-promo-config");
      if (raw) {
        const parsed = JSON.parse(raw) as PromoConfig;
        // normalize old single planKey to planKeys array
        if (parsed.planKeys && Array.isArray(parsed.planKeys)) setConfig(parsed);
        else if (parsed.planKey) setConfig({ ...parsed, planKeys: [parsed.planKey] });
        else setConfig(parsed);
      }
    } catch {
      setConfig({});
    }
  }, [open]);
  const effectiveDuration = duration ?? config.durationSeconds ?? 10 * 60;
  // duration in seconds (default 10 minutes)
  const [secondsLeft, setSecondsLeft] = useState(effectiveDuration);
  const [showOfferDetails, setShowOfferDetails] = useState(false);

  // react to admin edits elsewhere in the app
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem("my-prompt-promo-config");
        if (raw) {
          const parsed = JSON.parse(raw) as PromoConfig;
          // normalize
          const normalized = parsed.planKeys && Array.isArray(parsed.planKeys) ? parsed : parsed.planKey ? { ...parsed, planKeys: [parsed.planKey] } : parsed;
          setConfig(normalized);
          // reset timer to new duration when config changes
          const newDur = normalized.durationSeconds ?? effectiveDuration;
          setSecondsLeft(newDur);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("promo:updated", handler);
    return () => window.removeEventListener("promo:updated", handler);
  }, [effectiveDuration]);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(effectiveDuration);
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [open, effectiveDuration]);

  // create a portal root so the modal is rendered at document.body and not clipped
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    let el = document.getElementById("promo-modal-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "promo-modal-root";
      document.body.appendChild(el);
    }
    setPortalEl(el);
    return () => {
      // don't remove the root (keep for reuse), but clear state
      setPortalEl(null);
    };
  }, []);

  // theme-aware classes (derived from ThemeProvider)
  const { theme } = useTheme();
  // support three explicit themes: dark, light, mix
  const overlayClass = theme === "dark" ? "bg-black/90" : theme === "light" ? "bg-white/70" : "bg-[#061122]/80";
  const containerClass = theme === "dark"
    ? "bg-gradient-to-b from-[#0b0c0d] to-[#0f1112] text-white border-transparent"
    : theme === "light"
    ? "bg-white text-gray-900 border-gray-200"
    : "bg-gradient-to-b from-[#061122] to-[#0b1630] text-white border-[rgba(124,92,255,0.06)]";
  const primaryTextClass = theme === "light" ? "text-gray-900" : "text-white";
  const secondaryTextClass = theme === "light" ? "text-gray-600" : "text-[rgba(185,181,216,0.9)]";
  const timerNumberClass = theme === "light" ? "text-gray-900" : "text-white";
  const actionBgClass = theme === "light" ? "bg-white/60" : theme === "dark" ? "bg-[rgba(0,0,0,0.2)]" : "bg-[rgba(3,8,30,0.6)]";
  const actionBtnTextClass = theme === "light" ? "text-black" : "text-white";
  const primaryBtnClass = theme === "light"
    ? "rounded-full bg-white px-6 py-2 font-semibold text-black"
    : "rounded-full bg-pink-500 px-6 py-2 font-semibold text-white";

  if (!open || !portalEl) return null;

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  // simple mapping of plan keys to numeric prices (INR)
  const planPrices: Record<string, number> = { student: 0, pro: 700, elite: 1999 };

  // determine discount percent: prefer explicit config.discountPercent, else parse from offerText, else default 55
  const parsedDiscountPercent = (() => {
    if (typeof config.discountPercent === "number") return config.discountPercent;
    try {
      const txt = String(config.offerText ?? "");
      const m = txt.match(/(\d{1,3})\s*%/);
      if (m) return Number(m[1]);
    } catch {
      // ignore
    }
    return 55;
  })();

  const backEnabled = true; // Skip Offer available anytime per admin/user request

  const modal = (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-6 ${overlayClass} backdrop-blur-sm`}>
      <div className="w-full max-w-4xl">
        <div className={`mx-auto rounded-2xl p-0 shadow-lg overflow-hidden relative border ${containerClass}`}>
          {/* top centered pill and page header (matches screenshot) */}
          <div className="pt-6 pb-2 flex flex-col items-center">
            <div className="inline-flex items-center gap-3 bg-pink-500 px-4 py-2 rounded-full text-white font-semibold shadow-sm">
              <span className="text-sm">🎁</span>
              <span className="text-sm">LIMITED PERSONAL OFFER</span>
            </div>
            <div className="mt-6 text-center px-6">
              <h1 className="text-3xl sm:text-4xl font-extrabold">GO PREMIUM</h1>
              <div className="mt-3 text-2xl sm:text-3xl font-extrabold">
                <span className={`${primaryTextClass}`}>WITH PERSONAL </span>
                <span className="text-pink-500">{config.offerText ?? `UP TO ${parsedDiscountPercent}% OFF`}</span>
              </div>
            </div>
          </div>
          {/* top promo code bar */}
          <div className={`px-6 pt-4 pb-3 border-b border-dashed ${theme === 'light' ? 'border-gray-200/60' : 'border-white/8'} bg-transparent`}>
            <div className="flex items-center gap-3 pl-6">
              <div className="text-2xl text-emerald-400">✓</div>
              <div className="text-sm text-emerald-400 font-semibold">{config.title ?? title ?? "Pranav_PERSONAL_PROMO"} promocode is applied</div>
            </div>
          </div>

          {/* ticket body */}
          <div className="relative flex items-stretch">
            {/* right timer panel (fills space after removing left offer) */}
            <div className="flex-1 pl-6 flex items-center justify-center">
              <div className={`rounded-xl p-6 w-full text-center ${theme === 'light' ? 'bg-gray-50' : 'bg-[rgba(255,255,255,0.02)]'}`}>
                <div className="flex items-baseline justify-center gap-8">
                  <div className={`${timerNumberClass} text-[64px] sm:text-[80px] font-bold tracking-tight`}>{String(Math.floor(secondsLeft/60)).padStart(2,'0')}</div>
                  <div className={`${timerNumberClass} text-[64px] sm:text-[80px] font-bold tracking-tight`}>:</div>
                  <div className={`${timerNumberClass} text-[64px] sm:text-[80px] font-bold tracking-tight`}>{String(secondsLeft % 60).padStart(2,'0')}</div>
                </div>
                <div className={`mt-3 flex justify-center gap-6 text-xs ${secondaryTextClass}`}>
                  <div className="text-center">minutes</div>
                  <div className="text-center">seconds</div>
                </div>
              </div>
            </div>
          </div>

          {/* decorative cutouts removed */}
          {/* center bottom notch */}
          <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 h-6 w-6 rounded-t-full border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#0b0c0d] border-white/6'}`} />

          {/* actions */}
          <div className={`px-6 py-4 border-t ${theme === 'light' ? 'border-gray-200' : 'border-white/6'} flex items-center justify-center gap-4 ${actionBgClass}`}>
            <button onClick={() => onClose()} className={primaryBtnClass}>Start 3-day trial</button>
            <button onClick={() => setShowOfferDetails((s) => !s)} className={`rounded-full border ${theme === 'light' ? 'border-gray-300' : 'border-white/20'} px-6 py-2 ${actionBtnTextClass}`}>Offer</button>
            <button onClick={() => onClose()} className={`rounded-full border ${theme === 'light' ? 'border-gray-300' : 'border-white/20'} px-6 py-2 ${actionBtnTextClass}`}>Skip Offer</button>
          </div>

          {/* offer details panel (visible when Offer clicked and timer active) */}
          {showOfferDetails && secondsLeft > 0 && (
            <div className="px-6 pb-6">
              <div className={`mx-auto max-w-xl rounded-lg p-4 ${theme === 'light' ? 'bg-gray-50' : 'bg-[rgba(255,255,255,0.03)]'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`${secondaryTextClass} text-sm`}>Special prices for selected plans — limited time</div>
                          <div className="mt-1 text-lg font-semibold">
                          {(() => {
                            const keys = (config.planKeys && config.planKeys.length > 0) ? config.planKeys : (config.planKey ? [config.planKey] : ["pro"]);
                            const pct = parsedDiscountPercent ?? 0;
                            const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
                            return (
                              <div className="space-y-2">
                                {keys.map((key) => {
                                  const base = planPrices[key] ?? 0;
                                  const discount = Math.round((base * pct) / 100);
                                  const finalPrice = Math.max(0, base - discount);
                                  return (
                                    <div key={key} className="flex items-center justify-between gap-4">
                                        <div className="flex items-baseline gap-3">
                                          <div className={`${secondaryTextClass} line-through`}>{fmt.format(base)}</div>
                                          <div className={`${primaryTextClass}`}>{fmt.format(finalPrice)}</div>
                                          <div className="ml-2 text-sm text-green-400">{pct}% off</div>
                                        </div>
                                        <div className={`text-sm capitalize ${theme === 'light' ? 'text-gray-700' : 'text-white'}`}>{key}</div>
                                      </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                  </div>
                  <div>
                    <div className="flex gap-2">
                      {(config.planKeys && config.planKeys.length > 0 ? config.planKeys : (config.planKey ? [config.planKey] : ["pro"])) .map((k) => (
                        <button
                          key={k}
                          onClick={async () => {
                            try {
                              await startRazorpay(k);
                            } catch (err) {
                              console.error(err);
                              alert("Could not start checkout");
                            }
                          }}
                          className="rounded-full bg-pink-500 px-4 py-2 font-semibold text-white"
                        >
                          Upgrade {k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={`mt-2 text-xs ${secondaryTextClass}`}>Offer valid for the remaining timer set by admin.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  return createPortal(modal, portalEl);
}
