type RazorpayOrder = {
  id: string;
  key_id: string;
  amount: number;
};

type RazorpayCheckoutDetails = {
  email?: string;
  amount?: number;
  preferUpi?: boolean;
  preCreatedOrder?: RazorpayOrder;
  // Optional callback invoked after successful verification. If provided, the helper will
  // call this instead of redirecting the page so callers can handle UI state.
  onSuccess?: () => void;
};

type StoredUser = {
  id?: string;
  email?: string;
  [key: string]: unknown;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => { open: () => void };

const markLocalPlanPaid = (tier: "pro" | "elite") => {
  try {
    const raw = localStorage.getItem("my-prompt-auth-user");
    if (raw) {
      const user = JSON.parse(raw) as StoredUser;
      localStorage.setItem(
        "my-prompt-auth-user",
        JSON.stringify({ ...user, plan: "paid", planTier: tier, approved: true })
      );
    }

    const usersRaw = localStorage.getItem("my-prompt-users");
    if (usersRaw) {
      const current = raw ? (JSON.parse(raw) as StoredUser) : null;
      const users = JSON.parse(usersRaw) as StoredUser[];
      if (Array.isArray(users)) {
        localStorage.setItem(
          "my-prompt-users",
          JSON.stringify(
            users.map((user: StoredUser) =>
              current && (user.id === current.id || user.email === current.email)
                ? { ...user, plan: "paid", planTier: tier, approved: true }
                : user
            )
          )
        );
      }
    }
  } catch {
    // Local auth sync is best-effort; backend verification remains the source of truth.
  }
};

export const startRazorpay = async (plan: string, details?: RazorpayCheckoutDetails) => {
  const selectedTier = plan === "elite" ? "elite" : "pro";
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("my-prompt-pending-tier", selectedTier);
    }
  } catch {}

  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
  const cleaned = base.replace(/^http:\/\/localhost(:\d+)?/, (m) => m.replace("localhost", "127.0.0.1"));
  const url = cleaned.endsWith("/api") ? `${cleaned}/create-razorpay-order` : `${cleaned}/api/create-razorpay-order`;

  // Allow callers to provide a pre-created order (so modal can display exact amount).
  let data: RazorpayOrder | null = details?.preCreatedOrder ?? null;
  if (!data) {
    const body: Record<string, unknown> = { plan };
    if (details && typeof details === 'object') Object.assign(body, details);
    delete body.preCreatedOrder;
    delete body.preferUpi;

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to create Razorpay order');
    }
    data = await res.json() as RazorpayOrder;
  }

  // If backend returned a mock order id (local dev without keys), simulate verification
  // by calling the verify endpoint directly with mock payment ids. The backend will
  // accept mock verification when `RAZORPAY_KEY_SECRET` is not set (see backend).
  if (data.id && typeof data.id === 'string' && data.id.startsWith('mock_')) {
    try {
      const verifyUrl = cleaned.endsWith('/api') ? `${cleaned}/razorpay-verify` : `${cleaned}/api/razorpay-verify`;
      const mockPayload = {
        razorpay_order_id: data.id,
        razorpay_payment_id: `mock_payment_${Math.random().toString(36).slice(2,10)}`,
        razorpay_signature: 'mock_signature',
        email: details?.email,
        plan,
      };
      const verifyRes = await fetch(verifyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mockPayload) });
      if (!verifyRes.ok) {
        const txt = await verifyRes.text();
        throw new Error(txt || 'Mock verify failed');
      }
      // mark local plan and invoke onSuccess so SPA updates without redirect
      markLocalPlanPaid(selectedTier);
      if (details?.onSuccess) {
        try { details.onSuccess(); } catch {}
        return;
      }
      window.location.href = '/billing?success=1';
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  // Load Razorpay script (handle failures gracefully)
  const razorpayWindow = window as Window & { Razorpay?: RazorpayConstructor };

  if (typeof window !== 'undefined' && !razorpayWindow.Razorpay) {
    await new Promise<void>((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      let handled = false;
      s.onload = () => {
        handled = true;
        resolve();
      };
      s.onerror = () => {
        // Don't throw — resolve and let caller handle missing Razorpay
        console.warn('Razorpay script failed to load');
        handled = true;
        resolve();
      };
      // safety timeout: if the script doesn't load, proceed after 6s
      setTimeout(() => {
        if (!handled) {
          console.warn('Razorpay script load timed out');
          resolve();
        }
      }, 6000);
      document.head.appendChild(s);
    });
  }

  const options: Record<string, unknown> = {
    key: data.key_id,
    amount: data.amount,
    currency: 'INR',
    name: 'My Coding Prompt AI',
    description: 'Subscription',
    order_id: data.id,
    handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
      try {
        // Send verification to backend
        const verifyUrl = cleaned.endsWith('/api') ? `${cleaned}/razorpay-verify` : `${cleaned}/api/razorpay-verify`;
        const verifyRes = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
            email: details?.email,
            plan,
          }),
        });
        if (!verifyRes.ok) {
          const text = await verifyRes.text();
          console.error('Razorpay verification failed:', text);
          throw new Error(text || 'Razorpay verification failed');
        }
        markLocalPlanPaid(selectedTier);
        // If caller provided an onSuccess callback, call it and avoid redirecting so
        // the SPA can update state and close modals. Otherwise, redirect to billing.
        if (details?.onSuccess) {
          try { details.onSuccess(); } catch {}
          return;
        }
        window.location.href = '/billing?success=1';
      } catch (e) {
        console.error('Razorpay handler error', e);
        alert(e instanceof Error ? e.message : 'Payment verification failed');
      }
    },
    prefill: { email: details?.email || '' },
    theme: { color: '#3b82f6' },
  };
  // If the caller requested UPI preference, hint Razorpay checkout to show UPI
  if (details?.preferUpi) {
    // Razorpay checkout accepts `method` preference — provide a best-effort hint.
    try {
      options.method = { upi: true };
    } catch {}
  }

  try {
    if (!razorpayWindow.Razorpay) {
      console.warn('Razorpay not available after script load');
      throw new Error('Razorpay checkout is unavailable. Please try again later.');
    }
    const rzp = new razorpayWindow.Razorpay(options);
    rzp.open();
  } catch (e) {
    console.error('Failed to open Razorpay checkout', e);
    throw e instanceof Error ? e : new Error('Failed to open Razorpay checkout');
  }
};

export default startRazorpay;
