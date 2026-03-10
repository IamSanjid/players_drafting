import { z } from 'zod';

import { toNullableBigIntInput } from '@/lib/numbers';
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

export const playerCreateSchema = z
  .object({
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
  })
  .superRefine((value, ctx) => {
    if (value.category === 'Local') {
      if (
        value.priceBDT === undefined ||
        value.priceBDT === null ||
        value.priceBDT === ''
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['priceBDT'],
          message: 'Local players require priceBDT.',
        });
      }
    }

    if (value.category === 'Oversea') {
      if (
        value.priceUSD === undefined ||
        value.priceUSD === null ||
        value.priceUSD === ''
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['priceUSD'],
          message: 'Oversea players require priceUSD.',
        });
      }

      if (!value.country || !value.country.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['country'],
          message: 'Oversea players require country.',
        });
      }

      if (!value.availability || !value.availability.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['availability'],
          message: 'Oversea players require availability.',
        });
      }
    }
  });

export const playerPatchSchema = z
  .object({
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
  })
  .superRefine((value, ctx) => {
    if (value.category === 'Local' && value.priceBDT === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceBDT'],
        message: 'Local players cannot clear priceBDT.',
      });
    }

    if (value.category === 'Oversea') {
      if (value.priceUSD === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['priceUSD'],
          message: 'Oversea players cannot clear priceUSD.',
        });
      }

      if (value.country === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['country'],
          message: 'Oversea players cannot clear country.',
        });
      }

      if (value.availability === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['availability'],
          message: 'Oversea players cannot clear availability.',
        });
      }
    }
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
  category: z.enum(['Oversea', 'Local']),
});

export function toNullableBigInt(value: unknown): bigint | null | undefined {
  return toNullableBigIntInput(value);
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
