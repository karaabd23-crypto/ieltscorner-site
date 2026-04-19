import {
  CELPIP_READING_BILLING_INTERVAL,
  CELPIP_READING_PRICE_CAD,
  CELPIP_READING_PRODUCT_NAME,
} from '../../../src/lib/celpipReadingData.mjs';

const CONFIGURED_PRICE_ID = String(process.env.CELPIP_READING_PRICE_ID || '').trim();
const READING_PRICE_CACHE_KEY = 'celpip-reading-price-id';

function expectedUnitAmount() {
  return Math.round(Number(CELPIP_READING_PRICE_CAD) * 100);
}

function matchesReadingPriceShape(price) {
  if (!price || typeof price !== 'object') return false;

  const unitAmount = Number(price.unit_amount || 0);
  const currency = String(price.currency || '').toLowerCase();
  const interval = String(price.recurring?.interval || '').toLowerCase();
  const nickname = String(price.nickname || '').toLowerCase();

  const productName = typeof price.product === 'object'
    ? String(price.product?.name || '').trim()
    : '';
  const productService = typeof price.product === 'object'
    ? String(price.product?.metadata?.service || '').trim().toLowerCase()
    : '';
  const normalizedProductName = productName.toLowerCase();

  return Boolean(
    price.active
      && currency === 'cad'
      && interval === CELPIP_READING_BILLING_INTERVAL
      && unitAmount === expectedUnitAmount()
      && (
        productName === CELPIP_READING_PRODUCT_NAME
        || normalizedProductName.includes('celpip reading')
        || nickname.includes('celpip reading')
        || productService === 'celpip-reading-simulator'
      )
  );
}

export function getConfiguredReadingPriceId() {
  return CONFIGURED_PRICE_ID;
}

export async function resolveReadingPriceId(stripe) {
  if (CONFIGURED_PRICE_ID) {
    return CONFIGURED_PRICE_ID;
  }

  if (!globalThis.__ieltscornerStripeCache) {
    globalThis.__ieltscornerStripeCache = new Map();
  }

  const cache = globalThis.__ieltscornerStripeCache;
  if (cache.has(READING_PRICE_CACHE_KEY)) {
    return cache.get(READING_PRICE_CACHE_KEY);
  }

  const prices = await stripe.prices.list({
    active: true,
    limit: 100,
    type: 'recurring',
    expand: ['data.product'],
  });

  const match = prices.data.find(matchesReadingPriceShape);
  if (!match?.id) {
    throw new Error('Missing CELPIP Reading recurring price. Set CELPIP_READING_PRICE_ID or create an active CA$20/month Stripe price for the CELPIP Reading product.');
  }

  cache.set(READING_PRICE_CACHE_KEY, match.id);
  return match.id;
}

export async function subscriptionHasReadingPrice(stripe, subscription) {
  if (!subscription?.items?.data?.length) return false;

  const targetPriceId = await resolveReadingPriceId(stripe);
  return subscription.items.data.some((item) => item.price?.id === targetPriceId);
}