import { z } from 'zod';
import type {
  AllowedCategories,
  DraftStatus,
  PlayerCategory,
} from '@/types/domain';

const idSchema = z.string().min(1);
const categorySchema = z.enum(['Oversea', 'Local'] satisfies [
  PlayerCategory,
  PlayerCategory,
]);
const allowedCategoriesSchema = z.enum(['Both', 'Oversea', 'Local'] satisfies [
  AllowedCategories,
  AllowedCategories,
  AllowedCategories,
]);
const draftStatusSchema = z.enum([
  'idle',
  'active',
  'paused',
  'ended',
] satisfies [DraftStatus, DraftStatus, DraftStatus, DraftStatus]);

const bigintInputSchema = z.union([z.string(), z.number(), z.bigint()]);
const nullableTextSchema = z.union([z.string(), z.null()]);

export const idParamSchema = z.object({ id: idSchema });

export const playerCreateSchema = z.object({
  name: z.string().min(1),
  category: categorySchema,
  subCategory: z.string().min(1),
  position: z.string().min(1),
  priceBDT: z.union([bigintInputSchema, z.null()]).optional(),
  priceUSD: z.union([bigintInputSchema, z.null()]).optional(),
  country: nullableTextSchema.optional(),
  availability: nullableTextSchema.optional(),
  imageUrl: nullableTextSchema.optional(),
  isPreBought: z.boolean().optional(),
  teamId: z.union([idSchema, z.null()]).optional(),
});

export const playerPatchSchema = z.object({
  name: z.string().min(1).optional(),
  category: categorySchema.optional(),
  subCategory: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  priceBDT: z.union([bigintInputSchema, z.null()]).optional(),
  priceUSD: z.union([bigintInputSchema, z.null()]).optional(),
  country: nullableTextSchema.optional(),
  availability: nullableTextSchema.optional(),
  imageUrl: nullableTextSchema.optional(),
  isPreBought: z.boolean().optional(),
  teamId: z.union([idSchema, z.null()]).optional(),
});

export const bulkPlayersSchema = z.array(playerCreateSchema).min(1);

export const draftPickSchema = z.object({
  teamId: idSchema,
  playerId: idSchema,
});

export const assignTeamSchema = z.object({
  teamId: idSchema,
});

export const sessionPatchSchema = z.object({
  isActive: z.boolean().optional(),
  draftStatus: draftStatusSchema.optional(),
  allowedCategories: allowedCategoriesSchema.optional(),
  activeCategory: categorySchema.optional(),
  currentTurnTeamId: z.union([idSchema, z.null()]).optional(),
  draftOrder: z.union([z.string(), z.null()]).optional(),
  draftRound: z.number().int().nonnegative().optional(),
  draftStartedAt: z.union([z.string(), z.null()]).optional(),
});

export const teamCreateSchema = z.object({
  name: z.string().min(1),
  serialNumber: z.union([z.string(), z.number()]),
  budgetBDT: z.union([bigintInputSchema, z.null()]).optional(),
  budgetUSD: z.union([bigintInputSchema, z.null()]).optional(),
  password: z.string().min(1),
  logoUrl: nullableTextSchema.optional(),
  bannerUrl: nullableTextSchema.optional(),
});

export const teamPatchSchema = z.object({
  name: z.string().min(1).optional(),
  serialNumber: z.union([z.string(), z.number()]).optional(),
  budgetBDT: bigintInputSchema.optional(),
  budgetUSD: bigintInputSchema.optional(),
  password: z.string().min(1).optional(),
  logoUrl: nullableTextSchema.optional(),
  bannerUrl: nullableTextSchema.optional(),
});

export const categoryQuerySchema = z.object({
  category: z.string().min(1),
});

export function toNullableBigInt(value: unknown): bigint | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return BigInt(value as string | number | bigint);
}

export function parseInteger(value: string | number): number {
  return typeof value === 'number' ? value : Number.parseInt(value, 10);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}
