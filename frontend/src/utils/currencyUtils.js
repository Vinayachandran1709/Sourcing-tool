/**
 * Currency utilities for displaying region-based pricing
 * Default display is USD. Indian users see a toggle to view approximate INR prices.
 * Payment processing always happens via Razorpay (backend converts USD -> INR).
 */

// Detect if user is likely from India based on timezone
export const isIndianUser = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone.includes('Kolkata') || timezone.includes('Calcutta');
  } catch {
    return false;
  }
};

// Price mapping
export const DISPLAY_PRICES = {
  USD: {
    starter_monthly: 39,
    starter_annual: 390,
    growth_monthly: 79,
    growth_annual: 790,
    currency: '$',
    currencyCode: 'USD',
  },
  INR: {
    starter_monthly: 2999,
    starter_annual: 29990,
    growth_monthly: 5999,
    growth_annual: 59990,
    currency: '\u20B9',
    currencyCode: 'INR',
  },
};

// Get display prices — always defaults to USD, caller can pass 'INR' to switch
export const getDisplayPrices = (currencyPreference = 'USD') => {
  return currencyPreference === 'INR' ? DISPLAY_PRICES.INR : DISPLAY_PRICES.USD;
};

// Format price with currency symbol
export const formatPrice = (amount, currency = '$') => {
  if (currency === '\u20B9') {
    return `\u20B9${amount.toLocaleString('en-IN')}`;
  }
  return `$${amount}`;
};
