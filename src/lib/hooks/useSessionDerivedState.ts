import { selectSessionDerived, useDraftStore } from '@/lib/draftStore';

export function useSessionDerivedState() {
  return useDraftStore(selectSessionDerived);
}
