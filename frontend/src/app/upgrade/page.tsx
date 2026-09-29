"use client";

import { useState } from "react";
import startRazorpay from "@/lib/razorpayCheckout";
import { Check, Zap, Crown, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

type Plan = {
  id: string;
  label: string;
  price: number;
  period: string;
  badge?: string;
  popular?: boolean;
  features: string[];
};

const plans: Plan[] = [
  {
    id: "pro",
    label: "Pro Developer",
    price: 999,
    period: "/month",
    features: [
      "Unlimited Prompt Generation",
      "Full Prompt Doctor & RedTeaming",
      "Access to Live Code Sandbox",
      "Prompt Version Control & History",
      "Priority API Rate Limits",
    ],
  },
  {
    id: "elite",
    label: "Elite Enterprise",
    price: 1999,
    period: "/month",
    badge: "Best Value",
    popular: true,
    features: [
      "Everything in Pro",
      "Custom Workflow Automation Runner",
      "Prompt Arena Model Comparisons",
      "Community Marketplace Publishing",
      "Encrypted Vault API Key Storage",
      "24/7 Priority Support",
    ],
  },
];

export default function UpgradePage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePay = async (plan: Plan) => {
    setLoadingPlan(plan.id);
    try {
      await startRazorpay(plan.id);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        alert((err as { message?: string }).message || "Payment error");
      } else {
        alert("Payment error occurred. Please try again.");
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Supercharge Your AI Workflows
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-indigo-300 tracking-tight">
          Choose the Perfect Plan for You
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
          Unlock advanced AI prompt engineering tools, live sandboxes, automated red-teaming, and model comparisons.
        </p>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 border ${
              plan.popular
                ? "bg-slate-900/90 border-indigo-500/50 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold shadow-lg">
                {plan.badge}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  {plan.id === "elite" ? (
                    <Crown className="w-6 h-6 text-amber-400" />
                  ) : (
                    <Zap className="w-6 h-6 text-indigo-400" />
                  )}
                  {plan.label}
                </h3>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-black text-white">₹{plan.price}</span>
                <span className="text-slate-400 font-medium">{plan.period}</span>
              </div>

              <ul className="mt-8 space-y-3.5">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <button
                disabled={loadingPlan === plan.id}
                onClick={() => handlePay(plan)}
                className={`w-full py-3.5 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                  plan.popular
                    ? "bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
                    : "bg-slate-800 hover:bg-slate-700 text-white"
                }`}
              >
                {loadingPlan === plan.id ? (
                  <span className="animate-pulse">Opening Checkout...</span>
                ) : (
                  <>
                    <span>Upgrade to {plan.label}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-center gap-6 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Secure Razorpay Payment
        </div>
        <div>•</div>
        <div>Instant Access</div>
        <div>•</div>
        <Link href="/billing" className="hover:underline text-indigo-400">
          Manage Subscription
        </Link>
      </div>
    </div>
  );
}

