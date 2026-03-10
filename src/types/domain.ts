export type PlayerCategory = "Oversea" | "Local";
export type AllowedCategories = "Both" | PlayerCategory;
export type DraftStatus = "idle" | "active" | "paused" | "ended";

export interface BigIntJsonReplacer {
  (this: unknown, key: string, value: unknown): unknown;
}

export interface PickMadePayload {
  id?: string;
  teamId?: string;
  playerId?: string;
  draftAutoEnded?: boolean;
  player: ApiPlayer;
  team: ApiTeamBase;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

export interface ApiPlayer {
  id: string;
  name: string;
  category: PlayerCategory;
  subCategory: string;
  position: string;
  priceBDT: string | null;
  priceUSD: string | null;
  country: string | null;
  availability: string | null;
  imageUrl: string | null;
  isPreBought: boolean;
  teamId: string | null;
  team?: ApiTeamBase | null;
}

export interface ApiPick {
  id: string;
  teamId: string;
  playerId: string;
  createdAt: string;
  player?: ApiPlayer;
}

export interface ApiTeamBase {
  id: string;
  name: string;
  serialNumber: number;
  budgetBDT: string;
  budgetUSD: string;
  logoUrl: string | null;
  bannerUrl: string | null;
}

export interface ApiTeam extends ApiTeamBase {
  players: ApiPlayer[];
  picks: ApiPick[];
}

export interface ApiDraftSession {
  id: string;
  isActive: boolean;
  draftStatus: DraftStatus;
  allowedCategories: AllowedCategories;
  activeCategory: PlayerCategory;
  currentTurnTeamId: string | null;
  draftOrder: string | null;
  draftRound: number;
  draftStartedAt: string | null;
}
