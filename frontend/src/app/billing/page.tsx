"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useSearchParams } from "next/navigation";
import { startCheckout } from "@/lib/stripeCheckout";
import PaymentModal from "@/components/PaymentModal";
import { useEffect } from "react";

export default function BillingPage() {
  const { user, setPlan, setPlanTier } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const searchParams = useSearchParams();
  const success = searchParams?.get("success");
  const canceled = searchParams?.get("canceled");

  const plans = [
    {
      key: "student",
      title: "Student Plan",
      price: "₹0",
      subtitle: "Free with college ID verification",
      description: "Perfect for students! Verify your college ID to unlock paid plan features. Limited to 5 project generations.",
      features: [
        "Paid plan features after college ID verification",
        "Up to 5 projects/prompt generations",
        "Full access to all tools and advanced features",
        "Student support and documentation",
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
      // If Stripe set a pending tier, apply it locally (best-effort) so user can use paid features immediately.
      const pending = localStorage.getItem("my-prompt-pending-tier");
      if (pending && (pending === "pro" || pending === "elite")) {
        try {
          setPlan("paid");
          setPlanTier(pending === "elite" ? "elite" : "pro");
        } catch {}
        localStorage.removeItem("my-prompt-pending-tier");
        return;
      }

      // For Razorpay flow the backend verification may have updated localStorage auth; read and sync.
      const authRaw = localStorage.getItem("my-prompt-auth-user");
      if (authRaw) {
        try {
          const parsed = JSON.parse(authRaw) as { plan?: string; planTier?: string };
          if (parsed?.plan === "paid") {
            setPlan("paid");
            setPlanTier(parsed.planTier === "elite" ? "elite" : "pro");
          }
        } catch {}
      }
      // Clear any leftover pending marker as a cleanup.
      localStorage.removeItem("my-prompt-pending-tier");
    } catch {
      // ignore localStorage issues
    }
  }, [success]);

  const planPricesNumeric: Record<string, number> = { student: 0, pro: 700, elite: 1999 };

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
  const [studentVerificationModal, setStudentVerificationModal] = useState(false);
  const [studentCollegeId, setStudentCollegeId] = useState("");
  const [studentVerificationLoading, setStudentVerificationLoading] = useState(false);

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

  const handleSelectStudentPlan = async () => {
    if (!user) {
      alert("Please log in to select the Student Plan.");
      return;
    }
    // Open verification modal instead of directly activating
    setStudentVerificationModal(true);
  };

  const handleVerifyAndActivateStudentPlan = async () => {
    if (!studentCollegeId.trim()) {
      alert("Please enter your college ID");
      return;
    }

    if (!user?.id) {
      alert("Error: User ID not found. Please log in again.");
      return;
    }

    setStudentVerificationLoading(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const endpoint = `${base}/api/student/request-verification`;
      
      console.log("[StudentVerification] Request:", {
        user_id: user.id,
        college_email: studentCollegeId.trim(),
        endpoint: endpoint
      });
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: parseInt(user.id),
          college_email: studentCollegeId.trim(),
        }),
      });

      console.log("[StudentVerification] Response status:", res.status);
      const data = await res.json();
      console.log("[StudentVerification] Response data:", data);

      if (res.ok) {
        console.log("[StudentVerification] ✅ OTP sent successfully");
        alert("✅ OTP sent! Check your email for the 6-digit code.");
        setStudentVerificationModal(false);
        setStudentCollegeId("");
      } else {
        // Extract error message properly
        const errorDetail = data?.detail || data?.message || "Verification failed";
        const errorMsg = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
        console.error("[StudentVerification] ❌ Error:", errorMsg);
        alert(`❌ ${errorMsg}`);
      }
    } catch (error) {
      // Extract actual error message from error object
      let errorMsg = "Failed to request verification. Check your connection.";
      if (error instanceof Error) {
        errorMsg = error.message;
      } else if (error && typeof error === 'object') {
        errorMsg = JSON.stringify(error);
      }
      console.error("[StudentVerification] ❌ Catch error:", error, "Message:", errorMsg);
      alert(`❌ ${errorMsg}`);
    } finally {
      setStudentVerificationLoading(false);
    }
  };

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
      // If details contains a `plan` field it's likely coming from the Razorpay onSuccess
      // callback — apply the plan locally and avoid redirecting to Stripe.
      if (details && details.plan) {
        try {
          // Update local auth user record as a best-effort so SPA state reflects paid tier immediately.
          const raw = localStorage.getItem('my-prompt-auth-user');
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.plan = 'paid';
            parsed.planTier = modalPlan === 'elite' ? 'elite' : 'pro';
            localStorage.setItem('my-prompt-auth-user', JSON.stringify(parsed));
          }
        } catch {}
        setPlan('paid');
        setPlanTier(modalPlan === 'elite' ? 'elite' : 'pro');
        return;
      }

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
              disabled={isProcessing || Boolean(
                (plan.key === "student" && Boolean(user?.student_id_verified || (user as any)?.plan === "FREE_STUDENT")) ||
                (plan.key === "pro" && user?.plan === "paid" && user?.planTier === "pro") ||
                (plan.key === "elite" && user?.plan === "paid" && user?.planTier === "elite")
              )}
              onClick={() => {
                if (plan.key === "student") {
                  handleSelectStudentPlan();
                } else {
                  openModalForPlan(plan.key);
                }
              }}
            >
              {plan.key === "student"
                ? Boolean(user?.student_id_verified || (user as any)?.plan === "FREE_STUDENT")
                  ? "Current Plan"
                  : "Select Student Plan"
                : (plan.key === "pro" && user?.plan === "paid" && user?.planTier === "pro") ||
                  (plan.key === "elite" && user?.plan === "paid" && user?.planTier === "elite")
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
                <th className="p-3 text-[var(--foreground)]">Student</th>
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

      {/* Student Plan Verification Modal */}
      {studentVerificationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--app-surface)] rounded-lg p-6 max-w-md w-full mx-4 border border-[var(--app-border)]">
            <h3 className="text-xl font-semibold mb-4 text-[var(--app-text)]">Verify Your College ID</h3>
            <p className="text-sm text-[var(--app-muted)] mb-4">
              Enter your college ID to activate the Student Plan and unlock paid features for free.
            </p>
            <input
              type="text"
              placeholder="Enter your college ID (e.g., 12345678, ABC123)"
              value={studentCollegeId}
              onChange={(e) => setStudentCollegeId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--app-input)] border border-[var(--app-border)] rounded text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 px-4 py-2 bg-[var(--app-border)] text-[var(--app-text)] rounded hover:bg-[var(--app-border)]/50 transition"
                onClick={() => {
                  setStudentVerificationModal(false);
                  setStudentCollegeId("");
                }}
                disabled={studentVerificationLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent)]/90 transition disabled:opacity-60"
                onClick={handleVerifyAndActivateStudentPlan}
                disabled={studentVerificationLoading || !studentCollegeId.trim()}
              >
                {studentVerificationLoading ? "Verifying..." : "Verify & Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      <PaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onPay={handleModalPay}
        plan={{ name: modalPlan || "Pro", price: modalPlan === "pro" ? 700 : modalPlan === "elite" ? 1999 : 0, key: modalPlan || "student" }}
        loading={isProcessing}
        loggedIn={!!user}
        userEmail={user?.email || ""}
      />
    </div>
  );
}
