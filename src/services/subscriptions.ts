import api from '@/lib/axios';

// ─────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export type ChoosePlanSubscription = {
  subscriptionId: number;
  planId: number;
  planName: string;
  status: string; // 'Active' | 'Pending' | 'Expired' | etc.
  startDate?: string;
  endDate?: string;
};

export type RazorpayOrderDetails = {
  orderId: string;
  keyId: string;
  amountInPaise: number;
  currency: string;
  planName: string;
};

export type ChoosePlanResponseData = {
  subscription: ChoosePlanSubscription;
  razorpayOrder: RazorpayOrderDetails | null;
};

export type ChoosePlanResponse = {
  success: boolean;
  message?: string;
  data: ChoosePlanResponseData;
};

export type VerifyPaymentPayload = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type PaymentVerifyData = {
  paymentId: number;
  amount: number;
  status: string;
  commissionAmount?: number;
  netAmount?: number;
};

export type PaymentVerifyResponse = {
  success: boolean;
  message?: string;
  data?: PaymentVerifyData;
};

export type CurrentSubscription = {
  subscriptionId: number;
  planId: number;
  planName: string;
  status: 'Active' | 'Pending' | 'Expired' | 'Cancelled' | string;
  price?: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  businessId?: number;
  plan?: {
    planId: number;
    planName: string;
    price: number;
    durationInDays: number;
    description?: string;
  };
};

export type MySubscriptionResponse = {
  success: boolean;
  message?: string;
  data?: CurrentSubscription | null;
};

export type MySubscriptionHistoryResponse = {
  success: boolean;
  message?: string;
  data?: CurrentSubscription[];
};

export type MyPaymentItem = {
  paymentId: number;
  subscriptionId?: number;
  amount: number;
  status: string; // 'Success' | 'Failed' | 'Pending'
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt?: string;
  planName?: string;
};

export type MyPaymentsResponse = {
  success: boolean;
  message?: string;
  data?: MyPaymentItem[];
};

// ─────────────────────────────────────────────────────────────
// ERROR PARSER HELPER
// ─────────────────────────────────────────────────────────────

export function extractSubscriptionErrorMessage(
  error: any,
  defaultMsg = 'An unexpected error occurred.',
): string {
  if (!error) return defaultMsg;

  const status = error?.response?.status;
  if (status === 403) {
    return 'Your business must be approved first before selecting or upgrading a subscription plan.';
  }
  if (status === 404) {
    return 'No registered business found for your account. Please register your business first.';
  }
  if (status === 502) {
    return 'Payment gateway is currently unreachable. Please retry in a few moments.';
  }

  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;

  if (data?.errors && typeof data.errors === 'object') {
    const msgs: string[] = [];
    for (const key in data.errors) {
      if (Array.isArray(data.errors[key])) msgs.push(...data.errors[key]);
      else if (typeof data.errors[key] === 'string') msgs.push(data.errors[key]);
    }
    if (msgs.length > 0) return msgs.join('\n');
  }

  if (data?.message) return data.message;
  if (error.message) return error.message;

  return defaultMsg;
}

// ─────────────────────────────────────────────────────────────
// SUBSCRIPTION & PAYMENT API ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * 1. Choose a plan
 * POST /api/subscriptions/choose
 * Returns razorpayOrder if paid, or null if free
 */
export async function chooseSubscriptionPlan(planId: number): Promise<ChoosePlanResponse> {
  const res = await api.post<ChoosePlanResponse>('/subscriptions/choose', { planId });
  return res.data;
}

/**
 * 2. Verify payment
 * POST /api/payments/verify
 * Confirms payment with Razorpay order, payment ID, and signature
 */
export async function verifyPayment(payload: VerifyPaymentPayload): Promise<PaymentVerifyResponse> {
  const res = await api.post<PaymentVerifyResponse>('/payments/verify', payload);
  return res.data;
}

/**
 * 3. Get current active subscription
 * GET /api/subscriptions/my
 * Returns 404 when no active subscription exists
 */
export async function getMySubscription(): Promise<CurrentSubscription | null> {
  try {
    const res = await api.get<MySubscriptionResponse>('/subscriptions/my');
    return res.data?.data ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * 4. Get subscription history
 * GET /api/subscriptions/my/history
 */
export async function getMySubscriptionHistory(): Promise<CurrentSubscription[]> {
  const res = await api.get<MySubscriptionHistoryResponse>('/subscriptions/my/history');
  return res.data?.data ?? [];
}

/**
 * 5. Get payment history
 * GET /api/payments/my
 */
export async function getMyPayments(): Promise<MyPaymentItem[]> {
  const res = await api.get<MyPaymentsResponse>('/payments/my');
  return res.data?.data ?? [];
}
