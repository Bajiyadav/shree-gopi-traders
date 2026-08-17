import { describe, it, expect } from 'vitest';
import { calculateDeliveryFee, FREE_DELIVERY_THRESHOLD, FLAT_DELIVERY_FEE, selectTier, tiersOverlap } from '@/lib/pricing';
import { Prisma } from '@prisma/client';

describe('calculateDeliveryFee', () => {
  it('returns flat fee when subtotal is below threshold', () => {
    const fee = calculateDeliveryFee(new Prisma.Decimal(FREE_DELIVERY_THRESHOLD - 1));
    expect(fee.toNumber()).toBe(FLAT_DELIVERY_FEE);
  });

  it('returns 0 when subtotal is equal to threshold', () => {
    const fee = calculateDeliveryFee(new Prisma.Decimal(FREE_DELIVERY_THRESHOLD));
    expect(fee.toNumber()).toBe(0);
  });

  it('returns 0 when subtotal is above threshold', () => {
    const fee = calculateDeliveryFee(new Prisma.Decimal(FREE_DELIVERY_THRESHOLD + 100));
    expect(fee.toNumber()).toBe(0);
  });
});

describe('selectTier', () => {
  const tiers = [
    { id: 't1', minQty: 10, maxQty: 19, pricePerUnit: new Prisma.Decimal(100) },
    { id: 't2', minQty: 20, maxQty: null, pricePerUnit: new Prisma.Decimal(90) },
  ];

  it('returns null if quantity is below lowest tier', () => {
    expect(selectTier(tiers, 5)).toBeNull();
  });

  it('returns exact tier if quantity is within bounded tier', () => {
    const t = selectTier(tiers, 15);
    expect(t?.id).toBe('t1');
  });

  it('returns open-ended tier if quantity is above its min', () => {
    const t = selectTier(tiers, 25);
    expect(t?.id).toBe('t2');
  });
});

describe('tiersOverlap', () => {
  const existing = [
    { id: '1', minQty: 10, maxQty: 20 },
    { id: '2', minQty: 30, maxQty: null }
  ];

  it('returns false for disjoint tiers', () => {
    expect(tiersOverlap(existing, { minQty: 5, maxQty: 9 })).toBe(false);
    expect(tiersOverlap(existing, { minQty: 21, maxQty: 29 })).toBe(false);
  });

  it('returns true if new tier overlaps bounded existing tier', () => {
    expect(tiersOverlap(existing, { minQty: 15, maxQty: 25 })).toBe(true);
    expect(tiersOverlap(existing, { minQty: 5, maxQty: 15 })).toBe(true);
    expect(tiersOverlap(existing, { minQty: 10, maxQty: 20 })).toBe(true);
  });

  it('returns true if new tier overlaps unbounded existing tier', () => {
    expect(tiersOverlap(existing, { minQty: 40, maxQty: 50 })).toBe(true);
    expect(tiersOverlap(existing, { minQty: 25, maxQty: 35 })).toBe(true);
    expect(tiersOverlap(existing, { minQty: 35, maxQty: null })).toBe(true);
  });

  it('ignores self when checking for overlaps', () => {
    expect(tiersOverlap(existing, { id: '1', minQty: 5, maxQty: 25 })).toBe(false);
  });
});
