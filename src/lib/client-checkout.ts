"use client";

type CreatePaymentOrderResponse = {
  provider: "razorpay" | "fallback";
  orderId: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  amount: number;
};

type VerifyPaymentResponse = {
  success: boolean;
  alreadyProcessed?: boolean;
};

type CheckoutInput = {
  listingId: string;
  quantity?: number;
  itemType?: "product" | "project" | "notes" | "event";
};

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: string, cb: () => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckout;
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

async function createPaymentOrder(input: CheckoutInput) {
  const response = await fetch("/api/payment/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listingId: input.listingId,
      itemId: input.listingId,
      itemType: input.itemType,
      quantity: input.quantity || 1,
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error || "Unable to create payment order");
  }

  return json as CreatePaymentOrderResponse;
}

async function verifyPayment(payload: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const response = await fetch("/api/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error || "Payment verification failed");
  }

  return json as VerifyPaymentResponse;
}

export async function startListingCheckout(input: CheckoutInput) {
  const paymentOrder = await createPaymentOrder(input);

  if (paymentOrder.provider === "fallback" || paymentOrder.amount <= 0) {
    return {
      provider: paymentOrder.provider,
      orderId: paymentOrder.orderId,
      alreadyProcessed: true,
    };
  }

  if (!paymentOrder.razorpayOrderId || !paymentOrder.razorpayKeyId) {
    throw new Error("Payment gateway details are incomplete");
  }

  const razorpayOrderId = paymentOrder.razorpayOrderId;
  const razorpayKeyId = paymentOrder.razorpayKeyId;

  const scriptReady = await loadRazorpayScript();
  if (!scriptReady || !window.Razorpay) {
    throw new Error("Unable to load Razorpay checkout");
  }

  const RazorpayCtor = window.Razorpay;

  return new Promise<{ provider: "razorpay"; orderId: string; alreadyProcessed?: boolean }>((resolve, reject) => {
    let settled = false;

    const checkout = new RazorpayCtor({
      key: razorpayKeyId,
      amount: Math.round(paymentOrder.amount * 100),
      currency: "INR",
      name: "CampusMart",
      description: "CampusMart purchase",
      order_id: razorpayOrderId,
      handler: async (response) => {
        if (settled) return;
        try {
          const verifyResult = await verifyPayment({
            orderId: paymentOrder.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          settled = true;
          resolve({
            provider: "razorpay",
            orderId: paymentOrder.orderId,
            alreadyProcessed: verifyResult.alreadyProcessed,
          });
        } catch (error) {
          settled = true;
          reject(error);
        }
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          reject(new Error("Payment was cancelled"));
        },
      },
    });

    checkout.on("payment.failed", () => {
      if (settled) return;
      settled = true;
      reject(new Error("Payment failed. Please try again."));
    });

    checkout.open();
  });
}
