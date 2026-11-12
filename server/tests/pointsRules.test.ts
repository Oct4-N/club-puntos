import { describe, expect, it } from 'vitest';
import { affordableRewards, applyEarn, applyRedeem, isRewardAvailable, nextReward, planVoid, type Movement, type Product, type Reward } from '../src/domain/pointsRules.js';

const product: Product = { id: 1, name: 'Cucurucho', earn_points: 5, active: true };
const inactiveProduct = { ...product, active: false };
const productReward: Reward = { id: 1, name: 'Cucurucho gratis', type: 'product', cost_points: 50, product_id: 1, discount_percent: null, sort_order: 0, active: true };
const discountReward: Reward = { id: 2, name: '50% en 1 kg', type: 'discount', cost_points: 250, product_id: null, discount_percent: 50, sort_order: 1, active: true };
const rule = (fn: () => unknown, code: string) => expect(fn).toThrowError(expect.objectContaining({ code }));

describe('points rules', () => {
  it('earns with active products and rejects inactive ones', () => {
    expect(applyEarn(10, product)).toMatchObject({ balance: 15, movement: { points: 5, type: 'earn', description: 'Cucurucho' } });
    rule(() => applyEarn(10, inactiveProduct), 'PRODUCT_INACTIVE');
  });

  it('checks reward availability with and without an associated product', () => {
    expect(isRewardAvailable(productReward, product)).toBe(true);
    expect(isRewardAvailable(productReward, inactiveProduct)).toBe(false);
    expect(isRewardAvailable({ ...productReward, active: false }, product)).toBe(false);
    expect(isRewardAvailable({ ...productReward, active: false }, inactiveProduct)).toBe(false);
    expect(isRewardAvailable(discountReward, null)).toBe(true);
    expect(isRewardAvailable({ ...discountReward, active: false }, null)).toBe(false);
  });

  it('redeems product and discount rewards with sufficient or exact balance', () => {
    expect(applyRedeem({ balance: 60, reward: productReward, product })).toMatchObject({ balance: 10, movement: { description: 'Cucurucho gratis', type: 'redeem_product', points: -50, product_id: 1, reward_id: 1 } });
    expect(applyRedeem({ balance: 50, reward: productReward, product }).balance).toBe(0);
    expect(applyRedeem({ balance: 300, reward: discountReward, product: null })).toMatchObject({ balance: 50, movement: { description: '50% en 1 kg', type: 'redeem_discount', points: -250, discount_percent: 50, product_id: null } });
    expect(applyRedeem({ balance: 250, reward: discountReward, product: null }).balance).toBe(0);
    rule(() => applyRedeem({ balance: 49, reward: productReward, product }), 'INSUFFICIENT_POINTS');
    rule(() => applyRedeem({ balance: 249, reward: discountReward, product: null }), 'INSUFFICIENT_POINTS');
  });

  it('rejects inactive rewards and rewards whose product is inactive', () => {
    rule(() => applyRedeem({ balance: 100, reward: { ...productReward, active: false }, product }), 'REWARD_INACTIVE');
    rule(() => applyRedeem({ balance: 100, reward: productReward, product: inactiveProduct }), 'REWARD_INACTIVE');
  });

  const movement = (overrides: Partial<Movement> = {}): Movement => ({ id: 10, product_id: 1, reward_id: null, description: 'Cucurucho', type: 'earn', points: 5, discount_percent: null, created_at: '2026-11-10T12:00:00', ...overrides });

  it('voids a purchase or redemption and rejects invalid voids', () => {
    const original = movement();
    expect(planVoid({ balance: 5, movement: original, now: new Date('2026-11-17T12:00:00'), windowDays: 7 })).toMatchObject({ balance: 0, movement: { type: 'void', points: -5, voids_id: 10 } });
    expect(planVoid({ balance: 0, movement: movement({ type: 'redeem_product', points: -50, reward_id: 1, description: 'Cucurucho gratis' }), now: new Date('2026-11-10T12:00:00'), windowDays: 7 }).balance).toBe(50);
    rule(() => planVoid({ balance: 5, movement: movement({ voided: true }), now: new Date('2026-11-10T12:00:00'), windowDays: 7 }), 'ALREADY_VOIDED');
    rule(() => planVoid({ balance: 5, movement: movement({ type: 'void' }), now: new Date(), windowDays: 7 }), 'CANNOT_VOID_VOID');
    rule(() => planVoid({ balance: 5, movement: movement({ created_at: '2026-11-02T12:00:00' }), now: new Date('2026-11-10T12:00:00'), windowDays: 7 }), 'VOID_WINDOW_EXPIRED');
    rule(() => planVoid({ balance: 0, movement: original, now: new Date('2026-11-10T12:00:00'), windowDays: 7 }), 'VOID_NEGATIVE_BALANCE');
  });

  it('finds the next affordable and upcoming rewards, breaking ties by sort order', () => {
    const tied = { ...discountReward, id: 3, name: 'Otro descuento', cost_points: 250, sort_order: 0 };
    expect(nextReward(60, [productReward, discountReward])).toEqual({ reward: discountReward, missingPoints: 190 });
    expect(nextReward(300, [productReward, discountReward])).toBeNull();
    expect(nextReward(0, [])).toBeNull();
    expect(nextReward(0, [discountReward, tied])?.reward).toBe(tied);
    expect(affordableRewards(250, [productReward, discountReward])).toEqual([productReward, discountReward]);
  });
});
