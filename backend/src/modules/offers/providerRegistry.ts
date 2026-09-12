import { demoProvider, syncDemoOffers } from './demoOfferProvider';
import type { PrismaClient } from '@prisma/client';

export type ProviderName = 'demo';

export function getActiveProvider(): ProviderName {
  return (process.env.OFFER_MODE as ProviderName) === 'demo' ? 'demo' : 'demo';
}

export async function syncProviderOffers(prisma: PrismaClient) {
  const name = getActiveProvider();
  if (name === 'demo') return syncDemoOffers(prisma);
  return { syncedCount: 0 };
}

export { demoProvider };
