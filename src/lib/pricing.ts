/**
 * Surest Plug - Centralized Pricing Engine
 * 
 * Rules for calculating selling price from supplier cost:
 * - < ₦10,000: supplier price × 2
 * - ₦10,000 - ₦100,000 (inclusive): supplier price + ₦5,000
 * - > ₦100,000 - ₦500,000 (inclusive): supplier price + ₦15,000
 * - > ₦500,000: supplier price + ₦25,000
 */

export function calculateSellingPrice(supplierPrice: number): number {
  const price = Number(supplierPrice);
  if (isNaN(price) || price <= 0) {
    return 0;
  }

  if (price < 10000) {
    return Math.round(price * 2);
  } else if (price <= 100000) {
    return Math.round(price + 5000);
  } else if (price <= 500000) {
    return Math.round(price + 15000);
  } else {
    return Math.round(price + 25000);
  }
}

/**
 * Calculate SMM selling price for a given quantity and supplier rate per 1,000
 */
export function calculateSmmPrice(ratePer1k: number | string, quantity: number): {
  rawSupplierCost: number;
  sellingPrice: number;
  sellingRatePer1k: number;
} {
  const rate = parseFloat(String(ratePer1k)) || 0;
  const qty = Number(quantity) || 0;
  
  if (rate <= 0 || qty <= 0) {
    return { rawSupplierCost: 0, sellingPrice: 0, sellingRatePer1k: 0 };
  }

  const rawSupplierCost = Number(((rate / 1000) * qty).toFixed(2));
  const sellingPrice = calculateSellingPrice(rawSupplierCost);
  const sellingRatePer1k = Number(((sellingPrice / qty) * 1000).toFixed(2));

  return {
    rawSupplierCost,
    sellingPrice,
    sellingRatePer1k
  };
}

export default calculateSellingPrice;
