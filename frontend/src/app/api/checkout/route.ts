import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(stripeSecret, { apiVersion: "2022-11-15" });

export async function POST(req: Request) {
  try {
    if (!stripeSecret) {
      return new Response(JSON.stringify({ error: "Stripe secret key not configured" }), { status: 500 });
    }

    const body = await req.json();
    const plan = body?.plan;

    const priceMap: Record<string, string> = {
      monthly: process.env.STRIPE_PRICE_MONTH || "",
      three_months: process.env.STRIPE_PRICE_3MONTH || "",
      six_months: process.env.STRIPE_PRICE_6MONTH || "",
      yearly: process.env.STRIPE_PRICE_YEAR || "",
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Price ID not configured for selected plan" }), { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?canceled=true`,
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "unknown" }), { status: 500 });
  }
}
