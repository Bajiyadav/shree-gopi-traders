import { vi, describe, it, expect } from 'vitest';
import { generateOrderNumber, ORDER_NUMBER_PREFIX } from '@/lib/order-number';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => {
  let count = 0;
  return {
    prisma: {
      order: {
        count: vi.fn().mockImplementation(() => Promise.resolve(count)),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null)
      }
    }
  };
});

describe('generateOrderNumber', () => {
  it('starts with the correct prefix', async () => {
    const num = await generateOrderNumber();
    expect(num.startsWith(ORDER_NUMBER_PREFIX + '-')).toBe(true);
  });

  it('contains the current date YYYYMMDD', async () => {
    const num = await generateOrderNumber();
    const now = new Date();
    const datePart = now.getFullYear().toString() + 
                     String(now.getMonth() + 1).padStart(2, '0') + 
                     String(now.getDate()).padStart(2, '0');
    expect(num).toContain('-' + datePart + '-');
  });

  it('ends with a 4-digit sequence number', async () => {
    const num = await generateOrderNumber();
    const parts = num.split('-');
    const seqPart = parts[2];
    expect(seqPart).toHaveLength(4);
    expect(Number(seqPart)).toBeGreaterThanOrEqual(1);
  });
});
