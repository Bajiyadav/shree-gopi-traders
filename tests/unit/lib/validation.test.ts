import { describe, it, expect } from 'vitest';
import { productSchema, wholesaleTierSchema, couponSchema } from '@/lib/validation';

describe('productSchema', () => {
  it('accepts valid input', () => {
    const valid = {
      name: 'Valid Product',
      slug: 'valid-product',
      sku: 'VP-001',
      categoryId: 'cat1',
      basePrice: 100,
      isActive: true,
      allowBackorder: false,
    };
    expect(productSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects negative base price', () => {
    const invalid = {
      name: 'Valid Product',
      slug: 'valid-product',
      sku: 'VP-001',
      categoryId: 'cat1',
      basePrice: -10,
    };
    expect(productSchema.safeParse(invalid).success).toBe(false);
  });
  
  it('rejects missing category', () => {
    const invalid = {
      name: 'Valid Product',
      slug: 'valid-product',
      sku: 'VP-001',
      categoryId: '',
      basePrice: 100,
    };
    expect(productSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('wholesaleTierSchema', () => {
  it('accepts valid tier with maxQty >= minQty', () => {
    const valid = { productVariantId: 'v1', minQty: 10, maxQty: 20, pricePerUnit: 90 };
    expect(wholesaleTierSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts valid tier with no maxQty', () => {
    const valid = { productVariantId: 'v1', minQty: 10, maxQty: null, pricePerUnit: 90 };
    expect(wholesaleTierSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects if maxQty < minQty', () => {
    const invalid = { productVariantId: 'v1', minQty: 20, maxQty: 10, pricePerUnit: 90 };
    const res = wholesaleTierSchema.safeParse(invalid);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('Maximum quantity must be greater than or equal to minimum quantity');
    }
  });
});

describe('couponSchema', () => {
  it('accepts valid coupon', () => {
    const valid = {
      code: 'SUMMER20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
      isActive: true,
    };
    expect(couponSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects percentage discount > 100', () => {
    const invalid = {
      code: 'SUMMER150',
      discountType: 'PERCENTAGE',
      discountValue: 150,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    };
    const res = couponSchema.safeParse(invalid);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('Percentage discount cannot exceed 100%');
    }
  });

  it('rejects endDate before startDate', () => {
    const invalid = {
      code: 'INVALID',
      discountType: 'FIXED',
      discountValue: 100,
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date().toISOString(),
    };
    const res = couponSchema.safeParse(invalid);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('End date must be after the start date');
    }
  });
});
