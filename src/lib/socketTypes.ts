import type { PickMadePayload } from '@/types/domain';

export interface ClientToServerEvents {
  state_changed: () => void;
  pick_made: (data: PickMadePayload) => void;
}

export interface ServerToClientEvents {
  state_changed: () => void;
  pick_made: (data: PickMadePayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId?: string;
}
