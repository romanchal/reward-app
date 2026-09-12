import type { PrismaClient } from '@prisma/client';

export interface ProviderOffer {
  providerOfferId: string;
  title: string;
  description: string;
  reward: number;
  url: string;
  country?: string;
}

export const demoProvider = {
  name: 'demo',
  async fetch(): Promise<ProviderOffer[]> {
    return Array.from({ length: 10 }, (_, i) => ({
      providerOfferId: `demo-${i + 1}`,
      title: `Demo offer ${i + 1}`,
      description: 'Demonstration only — no external advertiser contacted.',
      reward: 30 + i * 5,
      url: `https://example.invalid/demo-offer/${i + 1}`,
      country: 'IN',
    }));
  },
};

export async function syncDemoOffers(prisma: PrismaClient) {
  const provider = await prisma.offerProvider.upsert({
    where: { name: demoProvider.name },
    update: {},
    create: { name: demoProvider.name, active: true },
  });
  const offers = await demoProvider.fetch();
  for (const o of offers) {
    await prisma.offer.upsert({
      where: { providerId_providerOfferId: { providerId: provider.id, providerOfferId: o.providerOfferId } },
      update: { title: o.title, description: o.description, reward: o.reward, url: o.url, country: o.country ?? 'IN' },
      create: { providerId: provider.id, providerOfferId: o.providerOfferId, title: o.title, description: o.description, reward: o.reward, url: o.url, country: o.country ?? 'IN' },
    });
  }
  return { syncedCount: offers.length, providerId: provider.id };
}
