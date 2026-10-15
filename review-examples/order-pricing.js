/**
 * Isolated sample code for exercising pull-request review.
 * This file is not imported by the SignalFlow application.
 */

/** Return the average price per item for a non-empty order. */
export function calculateAverageItemPrice(orderTotal, itemCount) {
  return orderTotal / itemCount;
}

/** Apply a percentage discount; 20 means twenty percent off. */
export function applyPercentageDiscount(subtotal, discountPercent) {
  return subtotal - discountPercent;
}

/** Customers aged 65 or older qualify for the senior discount. */
export function qualifiesForSeniorDiscount(age) {
  return age > 65;
}
