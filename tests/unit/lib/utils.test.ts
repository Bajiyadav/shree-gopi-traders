import { describe, it, expect, afterEach } from 'vitest';
import { slugify, formatCurrency, formatCompactCurrency, discountPercent, whatsappLink, humanize } from '@/lib/utils';
import { siteConfig } from '@/lib/config';

describe('slugify', () => {
  it('converts to lowercase', () => expect(slugify('HELLO')).toBe('hello'));
  it('replaces spaces with dashes', () => expect(slugify('hello world')).toBe('hello-world'));
  it('removes special characters', () => expect(slugify('hello! @world#')).toBe('hello-world'));
  it('trims leading and trailing dashes', () => expect(slugify('-hello-world-')).toBe('hello-world'));
  it('handles empty strings', () => expect(slugify('')).toBe(''));
});

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => expect(formatCurrency(1234.5)).toBe(siteConfig.currencySymbol + '1,234.50'));
  it('formats zero correctly', () => expect(formatCurrency(0)).toBe(siteConfig.currencySymbol + '0.00'));
  it('handles negative numbers', () => expect(formatCurrency(-1234.5)).toBe(siteConfig.currencySymbol + '-1,234.50'));
  it('handles strings', () => expect(formatCurrency('100')).toBe(siteConfig.currencySymbol + '100.00'));
  it('omits decimals when opts.decimals is false', () => expect(formatCurrency(1234.5, { decimals: false })).toBe(siteConfig.currencySymbol + '1,235'));
});

describe('formatCompactCurrency', () => {
  it('formats normal values without changes', () => expect(formatCompactCurrency(5000)).toBe(siteConfig.currencySymbol + '5,000'));
  it('formats Lakhs (L)', () => expect(formatCompactCurrency(150000)).toBe(siteConfig.currencySymbol + '1.50L'));
  it('formats Crores (Cr)', () => expect(formatCompactCurrency(15000000)).toBe(siteConfig.currencySymbol + '1.50Cr'));
  it('handles negative Lakhs', () => expect(formatCompactCurrency(-250000)).toBe(siteConfig.currencySymbol + '-2.50L'));
  it('handles 0', () => expect(formatCompactCurrency(0)).toBe(siteConfig.currencySymbol + '0'));
});

describe('discountPercent', () => {
  it('calculates correct percentage', () => expect(discountPercent(100, 80)).toBe(20));
  it('returns 0 if sale >= list', () => expect(discountPercent(100, 100)).toBe(0));
  it('returns 0 if list is 0', () => expect(discountPercent(0, 80)).toBe(0));
  it('rounds to nearest integer', () => expect(discountPercent(100, 66.6)).toBe(33));
});

describe('whatsappLink', () => {
  const ogConfig = { ...siteConfig };
  
  afterEach(() => {
    Object.assign(siteConfig, ogConfig);
  });

  it('generates correct link without message', () => {
    siteConfig.whatsappNumber = '919160050697';
    expect(whatsappLink()).toBe('https://wa.me/919160050697');
  });

  it('generates correct link with message', () => {
    siteConfig.whatsappNumber = '+91 9160050697';
    expect(whatsappLink('Hello there')).toBe('https://wa.me/919160050697?text=Hello%20there');
  });

  it('returns null if number is empty after stripping', () => {
    siteConfig.whatsappNumber = 'abc';
    expect(whatsappLink()).toBeNull();
  });
});

describe('humanize', () => {
  it('converts SNAKE_CASE to Title Case', () => expect(humanize('OUT_FOR_DELIVERY')).toBe('Out For Delivery'));
  it('handles lowercase', () => expect(humanize('pending')).toBe('Pending'));
  it('handles empty string', () => expect(humanize('')).toBe(''));
});
