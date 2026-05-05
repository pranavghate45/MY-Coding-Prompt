"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useSearchParams } from "next/navigation";
import { startCheckout } from "@/lib/stripeCheckout";
import PaymentModal from "@/components/PaymentModal";
import { useEffect } from "react";

export default function BillingPage() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const searchParams = useSearchParams();
  const success = searchParams?.get("success");
  const canceled = searchParams?.get("canceled");

  const plans = [
    {
      key: "genz",
      title: "Gen-Z",
      price: "₹0",
      subtitle: "Free forever",
      description: "Good for trying the app, but limited to the basic experience without advanced tools or priority support.",
      features: [
        "Unlimited lightweight chats (subject to fair use)",
        "Upload files and share links in chat",
        "Basic image generation (limited quota)",
        "Community support and docs",
      ],
    },
    {
      key: "pro",
      title: "Pro",
      price: "₹700",
      subtitle: "/ month (3-day free trial)",
      description: "Better than Free because it unlocks advanced tools, priority access, and faster responses for daily work.",
      highlight: true,
      yearly: { price: "₹7,000", subtitle: "/ year (save 20%)" },
      features: [
        "Advanced tools and analytics",
        "Priority model access and faster responses",
        "Cancel anytime, no hidden charges",
        "Email support and monthly usage reports",
      ],
    },
    {
      key: "elite",
      title: "Elite",
      price: "₹1,999",
      subtitle: "/ month (billed monthly)",
      description: "Best for power users and teams that need the fastest routing, collaboration features, and priority support.",
      features: [
        "All Pro features, plus:",
        "Highest throughput and priority routing",
        "Team seats, SSO and account management",
        "Dedicated onboarding and priority support",
      ],
    },
  ];

  // promo config from localStorage
  const [promoConfig, setPromoConfig] = useState<{ planKey?: string; discountPercent?: number; offerText?: string } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("my-prompt-promo-config");
      if (raw) setPromoConfig(JSON.parse(raw));
    } catch {
      setPromoConfig(null);
    }
  }, []);

  useEffect(() => {
    if (!success) return;
    try {
      // Clear pending tier marker; real plan updates must come from backend verification.
      localStorage.removeItem("my-prompt-pending-tier");
    } catch {
      // ignore localStorage issues
    }
  }, [success]);

  const planPricesNumeric: Record<string, number> = { genz: 0, pro: 700, elite: 1999 };

  async function handleSubscribe(planKey: string) {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem("token");
      if (!token && !user) {
        alert("Please log in to upgrade your plan.");
        return;
      }
      await startCheckout(planKey);
    } catch (err: unknown) {
      console.error(err);
      if (err && typeof err === "object" && "message" in err) {
        alert((err as { message?: string }).message || "Payment error");
      } else {
        alert("Payment error");
      }
    } finally {
      setIsProcessing(false);
    }
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState<string | null>(null);

  // Defensive: if the global promo modal portal is present it can overlay and block
  // clicks on this page. Disable pointer-events for that portal while on Billing.
  useEffect(() => {
    try {
      const el = typeof document !== 'undefined' ? document.getElementById('promo-modal-root') : null;
      if (el) {
        el.style.pointerEvents = 'none';
      }
      return () => {
        if (el) {
          el.style.pointerEvents = '';
        }
      };
    } catch {
      // ignore
    }
  }, []);

  const openModalForPlan = (planKey: string) => {
    if (!user) {
      alert("Please log in to upgrade your plan.");
      return;
    }
    setModalPlan(planKey);
    setModalOpen(true);
  };

  const handleModalPay = async (details?: any) => {
    if (!modalPlan) return;
    setIsProcessing(true);
    try {
      console.log('[Billing] handleModalPay', { modalPlan, details });
      await startCheckout(modalPlan, details);
    } catch (err) {
      console.error(err);
      alert("Payment error");
    } finally {
      setIsProcessing(false);
      setModalOpen(false);
    }
  };

  async function handleManageBilling() {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/create-billing-portal`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data);
        alert(data.error || "Failed to open billing portal");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-8 text-center text-[var(--foreground)]">Billing & Plans</h1>
      <div className="text-center billing-hero">
        <p className="text-[var(--app-muted)] max-w-2xl mx-auto">Choose the plan that fits you — try Pro free for 3 days. Our premium plans include priority access and advanced tools for power users.</p>
      </div>

      {success && <p className="text-green-600">Payment successful!</p>}
      {canceled && <p className="text-red-600">Payment canceled.</p>}

      {/* billing comparison table moved below the plan cards for visual flow */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`plan-card flex flex-col items-center h-full ${plan.highlight ? "plan-card--highlight" : "border-[var(--app-border)]"}`}
          >
            {plan.highlight && (
              <span className="text-xs font-bold text-[var(--accent)] mb-2">MOST POPULAR</span>
            )}
            <h2 className="text-xl font-semibold mb-2">{plan.title}</h2>
            <div className="text-2xl font-bold mb-1">{plan.price}</div>
            <div className="text-sm text-gray-500 mb-2">{plan.subtitle}</div>
            <div className="text-sm text-[var(--app-muted)] text-center mb-3 px-2">{plan.description}</div>
            {plan.yearly && (
              <div className="text-xs text-green-700 mb-2">{plan.yearly.price} {plan.yearly.subtitle}</div>
            )}
            <ul className="mb-4 space-y-1 text-sm text-center">
              {plan.features.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
            <button
              className="cta-btn w-full disabled:opacity-60"
              disabled={isProcessing || Boolean((user?.planTier || user?.plan) === plan.key) || plan.key === "genz"}
              onClick={() => {
                if (plan.key === "genz") return;
                openModalForPlan(plan.key);
              }}
            >
              {plan.key === "genz"
                ? "Free Plan"
                : user && (user.planTier || user.plan) === plan.key
                  ? "Current Plan"
                  : isProcessing
                    ? "Processing..."
                    : "Upgrade"}
            </button>
          </div>
        ))}
      </div>
      <div className="my-8">
        <div className="app-card table-accent">
          <table className="min-w-full border-collapse text-sm w-full">
            <thead>
              <tr>
                <th className="p-3 text-left text-[var(--foreground)]">Feature</th>
                <th className="p-3 text-[var(--foreground)]">Free</th>
                <th className="p-3 text-[var(--foreground)]">Pro</th>
                <th className="p-3 text-[var(--foreground)]">Elite</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[var(--app-border)]">
                <td className="p-3 text-[var(--foreground)]">Basic Access</td>
                <td className="p-3 text-[var(--foreground)]">✅</td>
                <td className="p-3 text-[var(--foreground)]">✅</td>
                <td className="p-3 text-[var(--foreground)]">✅</td>
              </tr>
              <tr className="border-t border-[var(--app-border)]">
                <td className="p-3 text-[var(--foreground)]">Advanced Tools</td>
                <td className="p-3 text-[var(--foreground)]">❌</td>
                <td className="p-3 text-[var(--foreground)]">✅</td>
                <td className="p-3 text-[var(--foreground)]">✅</td>
              </tr>
              <tr className="border-t border-[var(--app-border)]">
                <td className="p-3 text-[var(--foreground)]">Priority</td>
                <td className="p-3 text-[var(--foreground)]">❌</td>
                <td className="p-3 text-[var(--foreground)]">❌</td>
                <td className="p-3 text-[var(--foreground)]">✅</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-700">
        <span className="font-semibold">3-day free trial</span> • Cancel anytime • No hidden charges
      </div>

      <div className="mt-10 text-center">
        <button
          className="underline text-blue-600"
          onClick={handleManageBilling}
          disabled={isProcessing}
        >
          Manage Billing
        </button>
      </div>
      {/* Payment modal */}
      <PaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onPay={handleModalPay}
        plan={{ name: modalPlan || "Pro", price: modalPlan === "pro" ? 700 : modalPlan === "elite" ? 1999 : 0, key: modalPlan || "genz" }}
        loading={isProcessing}
        loggedIn={!!user}
        userEmail={user?.email || ""}
      />
    </div>
  );
}
