'use client';

import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/lib/socketTypes';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

// We don't want any ssr/server-side code to attempt to create any client web-socket instances.
const ssrSocketStub = {
  on: () => ssrSocketStub,
  off: () => ssrSocketStub,
  emit: () => true,
  connect: () => ssrSocketStub,
  disconnect: () => ssrSocketStub,
  active: false,
  connected: false,
} as unknown as Socket<ServerToClientEvents, ClientToServerEvents>;

export const getSocket = (): Socket<
  ServerToClientEvents,
  ClientToServerEvents
> => {
  if (typeof window === 'undefined') {
    return ssrSocketStub;
  }

  if (!socket) {
    socket = io({
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 5000,
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connect_error:', error.message);
    });
  }

  if (typeof window !== 'undefined' && !socket.active) {
    socket.connect();
  }

  return socket;
};
