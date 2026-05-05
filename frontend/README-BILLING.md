Billing integration notes
=========================

This project includes a simple Stripe Checkout integration for subscription plans (1 month, 3 months, 6 months, 1 year).

Setup (required):
- Add the Stripe secret key: `STRIPE_SECRET_KEY` (server-side).
- Configure price IDs in your environment:
  - `STRIPE_PRICE_MONTH` — Stripe Price ID for 1-month plan
  - `STRIPE_PRICE_3MONTH` — Stripe Price ID for 3-month plan
  - `STRIPE_PRICE_6MONTH` — Stripe Price ID for 6-month plan
  - `STRIPE_PRICE_YEAR` — Stripe Price ID for 1-year plan
- Optionally set `NEXT_PUBLIC_BASE_URL` to your site origin (default `http://localhost:3000`).

How it works:
- Frontend: `src/app/billing/page.tsx` shows plan cards and calls `POST /api/checkout` with `{plan}`.
- Server: `src/app/api/checkout/route.ts` maps plan to a Price ID and creates a Stripe Checkout session, returning the `session.url` to redirect the user.

Development notes:
- If no Stripe keys are configured, the frontend falls back to a simulated payment flow for development.
- You must create recurring Prices in your Stripe dashboard and use their IDs in the env variables.

Testing locally:
1. Install new dependency: `npm install` or `yarn`.
2. Create a `.env.local` with the variables above.
3. Run the app: `npm run dev`.
4. Visit `/billing`, choose a plan, and click Subscribe to go to Stripe Checkout.
