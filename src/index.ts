import { useRef, useEffect } from 'react';

export type Effect<P> = (signal: AbortSignal) => Promise<P>;

export const useVariableAbortableEffect = (): VariableAbortableEffect => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const isUnmountingRef = useRef<boolean>(false);

  useEffect(
    () => () => {
      const { current } = abortControllerRef;
      if (!current) return;
      isUnmountingRef.current = true;
      current.abort();
    },
    []
  );

  const start = <P>(effect: Effect<P>): Promise<P> => {
    // Abort previous intent
    const previousController = abortControllerRef.current;
    if (previousController && !previousController.signal.aborted) {
      previousController.abort();
    }

    abortControllerRef.current = new AbortController();

    return new Promise<P>((resolve, reject) => {
      if (!abortControllerRef.current) {
        throw new Error(
          'The abort controller must be initialized for a signal to be available for the effect.'
        );
      }
      effect(abortControllerRef.current.signal)
        .then(resolve)
        .catch(e => {
          // Prevent any further work
          if (isUnmountingRef.current && e.name === 'AbortError') return;
          reject(e);
        });
    });
  };

  const abort = () => {
    if (!abortControllerRef.current) {
      throw new Error('Cannot abort when the effect is uninitialized.');
    }
    abortControllerRef.current.abort();
  };

  return { start, abort };
};

interface VariableAbortableEffect {
  start: <P>(callback: Effect<P>) => Promise<P>;
  abort: () => void;
}
interface AbortableEffect<P> {
  start: () => Promise<P>;
  abort: () => void;
}

export function useAbortableEffect(): VariableAbortableEffect;
export function useAbortableEffect<P>(callback: Effect<P>): AbortableEffect<P>;
export function useAbortableEffect<P>(
  callback?: Effect<P>
): AbortableEffect<P> | VariableAbortableEffect {
  const effect = useVariableAbortableEffect();
  if (callback === undefined) return effect;
  const start = () => effect.start(callback);
  return { start, abort: effect.abort };
}

export default useAbortableEffect;
