const CONFIGURED_PRICE_ID = String(
  process.env.PTE_CORE_PREMIUM_PRICE_ID
    || process.env.CELPIP_READING_PRICE_ID
    || '',
).trim();

export function getConfiguredPteCorePriceId() {
  return CONFIGURED_PRICE_ID;
}

export async function resolvePteCorePriceId() {
  if (!CONFIGURED_PRICE_ID) {
    throw new Error('Missing PTE Core premium price. Set PTE_CORE_PREMIUM_PRICE_ID.');
  }

  return CONFIGURED_PRICE_ID;
}

export async function subscriptionHasPteCorePrice(_stripe, subscription) {
  if (!subscription?.items?.data?.length) return false;

  const targetPriceId = await resolvePteCorePriceId();
  return subscription.items.data.some((item) => item.price?.id === targetPriceId);
}
