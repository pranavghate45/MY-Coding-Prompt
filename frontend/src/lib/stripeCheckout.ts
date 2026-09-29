import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = async (): Promise<Stripe> => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable");
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  const stripe = await stripePromise;
  if (!stripe) throw new Error("Failed to initialize Stripe.js");
  return stripe;
};

type StripeCheckoutDetails = { email?: string; upiId?: string };

export const startCheckout = async (plan: string, details?: StripeCheckoutDetails) => {
  const selectedTier = plan === "elite" ? "elite" : "pro";
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("my-prompt-pending-tier", selectedTier);
    }
  } catch {}

  const token = localStorage.getItem("token");
  const authRaw = localStorage.getItem("my-prompt-auth-user");
  let base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
  // Prefer IPv4 loopback to avoid environments where `localhost` resolves to IPv6 (::1)
  // while the backend is only listening on 127.0.0.1. This prevents "Failed to fetch"
  // network errors in some browsers.
  base = base.replace(/^http:\/\/localhost(:\d+)?/, (m) => m.replace("localhost", "127.0.0.1"));
  const cleaned = base.replace(/\/$/, "");
  const url = cleaned.endsWith("/api") ? `${cleaned}/create-checkout-session` : `${cleaned}/api/create-checkout-session`;
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  const body: StripeCheckoutDetails & { plan: string } = { plan };
  // merge details passed from UI
  if (details && typeof details === 'object') {
    Object.assign(body, details);
  }
  // always prefer email for webhook lookup
  if (!body.email && authRaw) {
    try {
      const parsed = JSON.parse(authRaw);
      if (parsed?.email) body.email = parsed.email;
    } catch {}
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  console.log('[stripeCheckout] POST', url, 'status:', res.status);
  type CreateCheckoutSessionResponse = { id?: string; detail?: string; error?: string; [k: string]: unknown };
  let data: CreateCheckoutSessionResponse = {};
  try {
    data = await res.json();
  } catch {
    throw new Error("Invalid response from server when creating checkout session");
  }
  console.log('[stripeCheckout] response', data);
  if (!res.ok) throw new Error(data.detail || data.error || "Payment error");
  // Never auto-upgrade plan from client-side mock responses.
  // Only a verified backend webhook/verification endpoint should change user plan.
  if (data.id && typeof data.id === 'string' && data.id.startsWith('mock_')) {
    throw new Error("Checkout is not configured. Please set real payment keys on backend.");
  }
  const stripe = await getStripe();
  const redirectToCheckout = (stripe as unknown as { redirectToCheckout: (args: { sessionId: string }) => Promise<{ error?: { message?: string } } | undefined> }).redirectToCheckout;
  const result = await redirectToCheckout({ sessionId: data.id as string });
  if (result && result.error) {
    const message = (result.error && 'message' in result.error ? (result.error as { message?: string }).message : undefined) ?? "Redirect to checkout failed";
    throw new Error(message);
  }
};
