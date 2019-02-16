import { useRef, useEffect } from 'react';

export type Effect<P> = (signal: AbortSignal) => Promise<P>;

export const useVariableAbortableEffect = (
  inputs?: unknown[]
): VariableAbortableEffect => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const isUnmountingRef = useRef<boolean>(false);

  useEffect(
    () => () => {
      const { current } = abortControllerRef;
      if (!current) return;
      isUnmountingRef.current = true;
      current.abort();
    },
    inputs
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

/**
 * Allows starting arbitrary effects that depend on user input that doesn't
 * need to be stored in the props or the state. A previously started event will
 * be aborted when a new one starts, which can be done manually but will also
 * happen on evey render. The effect will also be aborted when the component
 * unmounts.
 */
export function useAbortableEffect(): VariableAbortableEffect;
/**
 * Allows starting arbitrary effects that depend on user input that doesn't
 * need to be stored in the props or the state. A previously started event will
 * be aborted when a new one starts, which can be done manually but will also
 * happen on every render where the `input` members have changed. The effect
 * will also be aborted when the component unmounts.
 */
export function useAbortableEffect(input: unknown[]): VariableAbortableEffect;
/**
 * Allows starting arbitrary effects that depend on user input that doesn't
 * need to be stored in the props or the state. A previously started event will
 * be aborted when a new one starts, which can be done manually but will also
 * happen when the component mounts and unmounts.
 */
export function useAbortableEffect(input: []): VariableAbortableEffect;
/**
 * Allows starting a predefined effect. A previously started event will be
 * aborted when a new one starts, which can be done manually but will also
 * happen on every render. The effect will also be aborted when the component
 * unmounts.
 */
export function useAbortableEffect<P>(callback: Effect<P>): AbortableEffect<P>;
/**
 * Allows starting a predefined effect. A previously started event will be
 * aborted when a new one starts, which can be done manually but will also
 * happen on every render where the `input` members have changed. The effect
 * will also be aborted when the component unmounts.
 */
export function useAbortableEffect<P>(
  callback: Effect<P>,
  input: unknown[]
): AbortableEffect<P>;
/**
 * Allows starting a predefined effect. A previously started event will be
 * aborted when a new one starts, which can be done manually but will also
 * happen on every render. The effect will also be aborted when the component
 * unmounts.
 */
export function useAbortableEffect<P>(
  callback: Effect<P>,
  input: []
): AbortableEffect<P>;
export function useAbortableEffect<P>(
  ...args: [] | [unknown[]] | [Effect<P>] | [Effect<P>, unknown[]]
): AbortableEffect<P> | VariableAbortableEffect {
  if (args.length === 0) {
    return useVariableAbortableEffect();
  }
  if (args.length === 1 && Array.isArray(args[0])) {
    return useVariableAbortableEffect(args[0]);
  }
  const [callback, input] = args;
  const effect = useVariableAbortableEffect(input);
  const start = () => effect.start(callback as Effect<P>);
  return { start, abort: effect.abort };
}

export default useAbortableEffect;
