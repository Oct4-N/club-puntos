import { describe, expect, it } from 'vitest';
import { productSchema, rewardSchema } from './schemas.js';

describe('product schema', () => {
  it('requires a name and positive integer earn points without redemption cost', () => {
    expect(productSchema.safeParse({ name: 'Cucurucho', earn_points: 5 }).success).toBe(true);
    expect(productSchema.safeParse({ name: 'Cucurucho', earn_points: 0 }).success).toBe(false);
    expect(productSchema.safeParse({ name: 'Cucurucho', earn_points: 5, oldCost: 50 }).success).toBe(false);
  });
});

describe('reward schema', () => {
  it('requires a product for free product rewards', () => {
    expect(rewardSchema.safeParse({ name: 'Cucurucho gratis', type: 'product', costPoints: 50 }).success).toBe(false);
    expect(rewardSchema.safeParse({ name: 'Cucurucho gratis', type: 'product', costPoints: 50, productId: 1 }).success).toBe(true);
  });

  it('requires a discount percentage from 1 to 100 and allows no product', () => {
    expect(rewardSchema.safeParse({ name: 'Descuento', type: 'discount', costPoints: 20 }).success).toBe(false);
    expect(rewardSchema.safeParse({ name: 'Descuento', type: 'discount', costPoints: 20, discountPercent: 0 }).success).toBe(false);
    expect(rewardSchema.safeParse({ name: 'Descuento', type: 'discount', costPoints: 20, discountPercent: 101 }).success).toBe(false);
    expect(rewardSchema.safeParse({ name: 'Descuento', type: 'discount', costPoints: 20, discountPercent: 50 }).success).toBe(true);
  });
});
