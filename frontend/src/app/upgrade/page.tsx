"use client";

import { useState } from "react";
import { startCheckout } from "@/lib/stripeCheckout";

type Plan = {
  id: string;
  label: string;
  price: number;
};

const plans: Plan[] = [
  { id: "pro", label: "Paid Pro", price: 16864 },
  { id: "elite", label: "Elite", price: 1999 },
];

export default function UpgradePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(plans[0]);
  const [loading, setLoading] = useState(false);

  const handleUpgradeClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      await startCheckout(selectedPlan.id);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        alert((err as { message?: string }).message || "Payment error");
      } else {
        alert("Payment error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="border rounded-xl p-6 flex-1">
            <h3 className="text-lg font-bold">{plan.label}</h3>
            <div className="text-2xl font-semibold mt-2">₹{plan.price}</div>
            <button
              className="mt-4 px-4 py-2 rounded bg-black text-white"
              onClick={() => handleUpgradeClick(plan)}
            >
              {plan.id === "pro" ? "Upgrade to Pro" : "Upgrade to Elite"}
            </button>
          </div>
        ))}
      </div>
      {/* Modal removed, Stripe Checkout is always used */}
    </>
  );
}
