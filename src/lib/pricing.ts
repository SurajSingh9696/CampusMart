const DEFAULT_MARKUP_PERCENT = 8;

function roundRupees(value: number) {
  return Math.max(0, Math.round(value));
}

export function clampMarkupPercent(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return DEFAULT_MARKUP_PERCENT;
  return Math.min(10, Math.max(5, Math.round(value * 100) / 100));
}

export function computePlatformFee(sellerAmount: number, markupPercent: number) {
  if (sellerAmount <= 0) return 0;
  const rawFee = (sellerAmount * markupPercent) / 100;
  // Keep fee in whole rupees to avoid paisa rounding drift in dashboard totals.
  return Math.max(1, roundRupees(rawFee));
}

export function deriveOrderAmounts(input: {
  sellerUnitPrice: number;
  quantity?: number;
  isFree?: boolean;
  markupPercent?: number;
}) {
  const quantity = Math.max(1, Number(input.quantity || 1));
  const sellerUnitPrice = roundRupees(Math.max(0, Number(input.sellerUnitPrice || 0)));

  if (input.isFree || sellerUnitPrice === 0) {
    return {
      quantity,
      sellerAmount: 0,
      buyerAmount: 0,
      platformFeeAmount: 0,
      markupPercent: 0,
    };
  }

  const sellerAmount = roundRupees(sellerUnitPrice * quantity);
  const markupPercent = clampMarkupPercent(input.markupPercent);
  const platformFeeAmount = computePlatformFee(sellerAmount, markupPercent);
  const buyerAmount = roundRupees(sellerAmount + platformFeeAmount);

  return {
    quantity,
    sellerAmount,
    buyerAmount,
    platformFeeAmount,
    markupPercent,
  };
}

export function deriveListingBuyerPrice(input: {
  sellerPrice: number;
  isFree?: boolean;
  markupPercent?: number;
}) {
  const sellerPrice = roundRupees(Math.max(0, Number(input.sellerPrice || 0)));
  if (input.isFree || sellerPrice === 0) {
    return {
      sellerPrice: 0,
      buyerPrice: 0,
      platformFeeAmount: 0,
      markupPercent: 0,
    };
  }

  const markupPercent = clampMarkupPercent(input.markupPercent);
  const platformFeeAmount = computePlatformFee(sellerPrice, markupPercent);

  return {
    sellerPrice,
    buyerPrice: sellerPrice + platformFeeAmount,
    platformFeeAmount,
    markupPercent,
  };
}
