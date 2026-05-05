"use client";

import startRazorpay from "@/lib/razorpayCheckout";
import { startCheckout } from "@/lib/stripeCheckout";
import React, { useEffect, useState } from "react";

type PaymentModalProps = {
  open: boolean;
  onClose: () => void;
  onPay: (details?: Record<string, unknown>) => void;
  plan: { name: string; price: number; key: string };
  loading: boolean;
  loggedIn?: boolean;
  userEmail?: string;
};

export default function PaymentModal(props: PaymentModalProps) {
  const { open, onClose, onPay, plan, loading, loggedIn, userEmail } = props;
  if (!open) return null;
  
  const [razorOrder, setRazorOrder] = useState<{ id: string; key_id: string; amount: number } | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [fetchNonce, setFetchNonce] = useState(0);
  
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    (async function fetchOrder() {
      setOrderLoading(true);
      setOrderError(null);
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const amountPaise = Math.max(0, Math.round((plan.price || 0) * 100));
      const url = `${base}/api/create-razorpay-order`;
      console.log('[PaymentModal] fetching Razorpay order', { url, plan: plan.key, email: userEmail, amountPaise, fetchNonce });
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: plan.key, email: userEmail, amount: amountPaise }),
          signal: controller.signal,
        });
        console.log('[PaymentModal] fetch returned', { ok: res.ok, status: res.status });
        if (!res.ok) {
          const txt = await res.text();
          console.error('[PaymentModal] fetch non-ok body:', txt);
          throw new Error(txt || 'Failed to get order');
        }
        const data = await res.json();
        console.log('[PaymentModal] order data', data);
        if (!cancelled) setRazorOrder(data);
      } catch (e: any) {
        // Distinguish abort vs network/error
        if (e && e.name === 'AbortError') {
          console.warn('[PaymentModal] Razorpay order fetch aborted (timeout)');
          if (!cancelled) setOrderError('Request timed out. Please try again.');
        } else {
          console.error('[PaymentModal] order fetch error', e);
          if (!cancelled) setOrderError(e?.message || 'Order failed');
        }
      } finally {
        clearTimeout(timeout);
        // Always clear loading so UI doesn't get stuck
        setOrderLoading(false);
      }
    })();
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout); };
  }, [open, plan.key, userEmail, fetchNonce]);

  const retryOrder = () => {
    setRazorOrder(null);
    setOrderError(null);
    setFetchNonce((n) => n + 1);
  };

  const handleStripe = async () => {
    try {
      await startCheckout(plan.key, { email: userEmail });
    } catch (e: any) {
      console.error('Stripe checkout error', e);
      setOrderError(e?.message || 'Stripe checkout failed');
    }
  };

  const handleRazor = async () => {
    try {
      if (!razorOrder) return;
      await startRazorpay(plan.key, { email: userEmail, preCreatedOrder: razorOrder });
    } catch (e: any) {
      console.error('Razorpay error', e);
      setOrderError(e?.message || 'Razorpay failed');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-50 flex flex-col items-center">
        <div className="w-full flex justify-center">
          <div className="bg-white rounded-lg p-4 shadow-inner flex items-center justify-center" style={{ width: 340, height: 340 }}>
            <img
              src={process.env.NEXT_PUBLIC_RAZORPAY_QR_URL || '/razorpay-qr.svg'}
              alt="Razorpay QR"
              className="max-w-full max-h-full object-contain"
              onClick={() => setQrOpen(true)}
            />
          </div>
        </div>

        <div className="text-center text-sm text-gray-700 mt-3">
          {orderLoading && <span>Loading amount…</span>}
          {orderError && (
            <div className="flex items-center gap-3 justify-center">
              <span className="text-red-600">{orderError}</span>
              <button onClick={retryOrder} className="px-3 py-1 rounded bg-gray-100 text-gray-700">Retry</button>
            </div>
          )}
          {razorOrder && !orderLoading && (
            <div className="mt-2 font-semibold">Scan to pay: ₹{(razorOrder.amount / 100).toFixed(2)}</div>
          )}
        </div>

        <div className="flex gap-3 mt-6 w-full">
          <button className="btn btn-primary flex-1" onClick={handleStripe} disabled={loading || !loggedIn}>
            Pay with Card (Stripe)
          </button>
          <button className="btn btn-secondary flex-1" onClick={handleRazor} disabled={loading || !loggedIn || orderLoading || !razorOrder}>
            {orderLoading ? 'Preparing...' : 'Razorpay (Test)'}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <a href={process.env.NEXT_PUBLIC_RAZORPAY_QR_URL || '/razorpay-qr.png'} download className="text-sm text-[var(--app-muted)] underline">Download QR</a>
          <button className="px-4 py-2 rounded bg-gray-100 text-gray-700" onClick={onClose}>Close</button>
        </div>
      </div>

      {qrOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70" onClick={() => setQrOpen(false)} />
          <div className="relative z-60 p-4">
            <img src={process.env.NEXT_PUBLIC_RAZORPAY_QR_URL || '/razorpay-qr.svg'} alt="QR large" className="max-w-[420px] w-auto h-auto rounded-md shadow-lg" />
            <div className="text-right mt-2">
              <button onClick={() => setQrOpen(false)} className="px-3 py-1 rounded bg-white/90">Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
