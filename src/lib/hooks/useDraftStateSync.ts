import { useCallback, useEffect } from 'react';

import type { FetchAllFn } from '@/lib/draftStore';
import { getSocket } from '@/lib/socketClient';
import type { ServerToClientEvents } from '@/lib/socketTypes';

type DraftSocketEvent = keyof ServerToClientEvents;

export function useDraftStateSync({
  fetchAll,
  events,
  initialFetchOptions,
  refreshFetchOptions,
}: {
  fetchAll: FetchAllFn;
  events?: DraftSocketEvent[];
  initialFetchOptions?: { silent?: boolean; force?: boolean };
  refreshFetchOptions?: { silent?: boolean; force?: boolean };
}) {
  const socket = getSocket();
  const syncEventsKey =
    events && events.length > 0
      ? Array.from(new Set(events)).join('|')
      : 'state_changed';

  const refresh = useCallback(() => {
    void fetchAll(refreshFetchOptions ?? { silent: true });
  }, [fetchAll, refreshFetchOptions]);

  useEffect(() => {
    const syncEvents = syncEventsKey
      .split('|')
      .filter(Boolean) as DraftSocketEvent[];

    void fetchAll(initialFetchOptions);

    for (const eventName of syncEvents) {
      socket.on(eventName, refresh);
    }

    return () => {
      for (const eventName of syncEvents) {
        socket.off(eventName, refresh);
      }
    };
  }, [fetchAll, initialFetchOptions, refresh, socket, syncEventsKey]);
}
