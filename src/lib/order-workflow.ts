export const ORDER_STATUS = {
  created: "created",
  paid: "paid",
  pendingSellerAction: "pending_seller_action",
  readyToFulfill: "ready_to_fulfill",
  fulfilledBySeller: "fulfilled_by_seller",
  readyForPayment: "ready_for_payment",
  payoutCompleted: "payout_completed",
  cancelled: "cancelled",
  pending: "pending",
  confirmed: "confirmed",
  fulfilled: "fulfilled",
} as const;

export const PAYMENT_STATUS = {
  created: "created",
  paid: "paid",
  failed: "failed",
  refunded: "refunded",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const BUYER_VISIBLE_ACTIVE_STATUSES: OrderStatus[] = [
  ORDER_STATUS.pendingSellerAction,
  ORDER_STATUS.readyToFulfill,
  ORDER_STATUS.fulfilledBySeller,
  ORDER_STATUS.readyForPayment,
  ORDER_STATUS.payoutCompleted,
  ORDER_STATUS.pending,
  ORDER_STATUS.confirmed,
  ORDER_STATUS.fulfilled,
  ORDER_STATUS.paid,
];

export const SELLER_COMPLETED_STATUSES: OrderStatus[] = [
  ORDER_STATUS.readyForPayment,
  ORDER_STATUS.payoutCompleted,
  ORDER_STATUS.fulfilled,
];

export function normalizeLegacyOrderStatus(status?: string): OrderStatus {
  switch (status) {
    case ORDER_STATUS.created:
      return ORDER_STATUS.created;
    case ORDER_STATUS.paid:
      return ORDER_STATUS.pendingSellerAction;
    case ORDER_STATUS.pendingSellerAction:
      return ORDER_STATUS.pendingSellerAction;
    case ORDER_STATUS.readyToFulfill:
      return ORDER_STATUS.readyToFulfill;
    case ORDER_STATUS.fulfilledBySeller:
      return ORDER_STATUS.fulfilledBySeller;
    case ORDER_STATUS.readyForPayment:
      return ORDER_STATUS.readyForPayment;
    case ORDER_STATUS.payoutCompleted:
      return ORDER_STATUS.payoutCompleted;
    case ORDER_STATUS.cancelled:
      return ORDER_STATUS.cancelled;
    case ORDER_STATUS.pending:
      return ORDER_STATUS.pendingSellerAction;
    case ORDER_STATUS.confirmed:
      return ORDER_STATUS.readyToFulfill;
    case ORDER_STATUS.fulfilled:
      return ORDER_STATUS.readyForPayment;
    default:
      return ORDER_STATUS.pendingSellerAction;
  }
}

export function canSellerAccept(status: string) {
  const normalized = normalizeLegacyOrderStatus(status);
  return normalized === ORDER_STATUS.pendingSellerAction;
}

export function canSellerFulfill(status: string) {
  const normalized = normalizeLegacyOrderStatus(status);
  return normalized === ORDER_STATUS.readyToFulfill;
}

export function canCustomerConfirmFulfillment(status: string) {
  const normalized = normalizeLegacyOrderStatus(status);
  return normalized === ORDER_STATUS.fulfilledBySeller;
}

export function canCancelByCustomer(status: string) {
  const normalized = normalizeLegacyOrderStatus(status);
  return (
    normalized === ORDER_STATUS.pendingSellerAction ||
    normalized === ORDER_STATUS.readyToFulfill ||
    normalized === ORDER_STATUS.fulfilledBySeller
  );
}

export function canCancelBySeller(status: string) {
  const normalized = normalizeLegacyOrderStatus(status);
  return (
    normalized === ORDER_STATUS.pendingSellerAction ||
    normalized === ORDER_STATUS.readyToFulfill ||
    normalized === ORDER_STATUS.fulfilledBySeller
  );
}

export function canMarkPayoutCompleted(status: string) {
  const normalized = normalizeLegacyOrderStatus(status);
  return normalized === ORDER_STATUS.readyForPayment;
}
