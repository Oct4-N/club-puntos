import { z } from 'zod';

const trimmedName = z.string().trim().min(1);
const positiveInteger = z.number().int().positive();

export const dniSchema = z.string().regex(/^\d{7,8}$/u);
export const customerSchema = z.object({
  first_name: trimmedName,
  last_name: trimmedName,
  dni: dniSchema,
  phone: z.string().regex(/^\d*$/u).nullable().optional(),
  birth_date: z.string().date().nullable().optional()
});
export const productSchema = z.object({
  name: trimmedName,
  earn_points: positiveInteger
}).strict();
const rewardBaseSchema = z.object({
  name: trimmedName,
  costPoints: positiveInteger,
  productId: positiveInteger.optional()
});
export const rewardSchema = z.discriminatedUnion('type', [
  rewardBaseSchema.extend({ type: z.literal('product'), productId: positiveInteger, discountPercent: z.undefined().optional() }).strict(),
  rewardBaseSchema.extend({ type: z.literal('discount'), discountPercent: z.number().int().min(1).max(100) }).strict()
]);
export const earnSchema = z.object({ productId: positiveInteger });
export const setupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^\S+$/u),
  password: z.string().min(6)
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type RewardInput = z.infer<typeof rewardSchema>;
