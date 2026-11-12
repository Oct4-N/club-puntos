import { DomainError } from './errors.js';

export interface Product {
  id: number;
  name: string;
  earn_points: number;
  active: boolean;
}

export interface Reward {
  id: number;
  name: string;
  type: 'product' | 'discount';
  cost_points: number;
  product_id: number | null;
  discount_percent: number | null;
  sort_order: number;
  active: boolean;
}

export type MovementType = 'earn' | 'redeem_product' | 'redeem_discount' | 'void';
export interface MovementPlan {
  product_id: number | null;
  reward_id: number | null;
  description: string;
  type: MovementType;
  points: number;
  discount_percent: number | null;
  voids_id?: number;
}

export interface Movement extends MovementPlan {
  id: number;
  created_at: string | Date;
  voided?: boolean;
}

export interface RulePlan {
  balance: number;
  movement: MovementPlan;
}

export function isRewardAvailable(reward: Reward, product: Product | null): boolean {
  return reward.active && (reward.product_id === null || product?.active === true);
}

export function applyEarn(balance: number, product: Product): RulePlan {
  if (!product.active) throw new DomainError('PRODUCT_INACTIVE');
  return {
    balance: balance + product.earn_points,
    movement: { product_id: product.id, reward_id: null, description: product.name, type: 'earn', points: product.earn_points, discount_percent: null }
  };
}

export interface RedeemInput {
  balance: number;
  reward: Reward;
  product: Product | null;
}

export function applyRedeem(input: RedeemInput): RulePlan {
  const { balance, reward, product } = input;
  if (!isRewardAvailable(reward, product)) throw new DomainError('REWARD_INACTIVE');
  if (balance < reward.cost_points) throw new DomainError('INSUFFICIENT_POINTS');
  return {
    balance: balance - reward.cost_points,
    movement: {
      product_id: reward.product_id,
      reward_id: reward.id,
      description: reward.name,
      type: reward.type === 'product' ? 'redeem_product' : 'redeem_discount',
      points: -reward.cost_points,
      discount_percent: reward.discount_percent
    }
  };
}

export interface VoidInput {
  balance: number;
  movement: Movement;
  now: Date;
  windowDays: number;
}

export function planVoid(input: VoidInput): RulePlan {
  const { balance, movement, now, windowDays } = input;
  if (movement.type === 'void') throw new DomainError('CANNOT_VOID_VOID');
  if (movement.voided) throw new DomainError('ALREADY_VOIDED');
  const maxAge = windowDays * 24 * 60 * 60 * 1000;
  if (now.getTime() - new Date(movement.created_at).getTime() > maxAge) throw new DomainError('VOID_WINDOW_EXPIRED');
  const nextBalance = balance - movement.points;
  if (nextBalance < 0) throw new DomainError('VOID_NEGATIVE_BALANCE');
  return {
    balance: nextBalance,
    movement: {
      product_id: movement.product_id,
      reward_id: movement.reward_id,
      description: movement.description,
      type: 'void',
      points: -movement.points,
      discount_percent: movement.discount_percent,
      voids_id: movement.id
    }
  };
}

export function nextReward(balance: number, rewards: Reward[]): { reward: Reward; missingPoints: number } | null {
  const reward = rewards
    .filter((item) => item.cost_points > balance)
    .sort((a, b) => a.cost_points - b.cost_points || a.sort_order - b.sort_order)[0];
  return reward ? { reward, missingPoints: reward.cost_points - balance } : null;
}

export function affordableRewards(balance: number, rewards: Reward[]): Reward[] {
  return rewards.filter((item) => item.cost_points <= balance);
}
