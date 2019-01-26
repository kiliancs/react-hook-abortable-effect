import React, { FunctionComponent, useState } from 'react'
import { render, fireEvent, cleanup } from 'react-testing-library'

import { useAbortableEffect, Effect } from '../src';

afterEach(cleanup)

test('starts', () => {
    let started = false;
    const startedTestEffect: Effect<undefined> = async () => new Promise<undefined>((resolve) => {
        started = true;
        resolve();
    });;
    const EffectStarter: FunctionComponent<{ effect: Effect<undefined> }> = ({ effect }) => {
        const abortableEffect = useAbortableEffect(effect);
        return <button onClick={() => abortableEffect.start()}>Start</button>
    };

    const { getByText } = render(<EffectStarter effect={startedTestEffect} />);

    fireEvent.click(getByText('Start'));

    expect(started).toBe(true);
});

test('aborts on unmount', () => {
    let aborted = false;
    const unmountefTestEffect: Effect<undefined> = async (signal) => new Promise<undefined>(() => {
        const abort = () => {
            aborted = true;
            throw new DOMException('Success abort', 'DOMError');
        };
        signal.addEventListener('abort', abort);
    });;
    const EffectAborter: FunctionComponent<{ effect: Effect<undefined> }> = ({ effect }) => {
        const abortableEffect = useAbortableEffect(effect);
        return <button onClick={() => abortableEffect.start()}>Start</button>
    };

    const { getByText } = render(<EffectAborter effect={unmountefTestEffect} />);

    fireEvent.click(getByText('Start'));
    cleanup();

    expect(aborted).toBe(true);
});

test('swallows abort errors on unmount', () => {
    let isCapturedError = false;
    const unmountefTestEffect: Effect<undefined> = async (signal) => new Promise<undefined>(() => {
        const abort = () => {
            throw new DOMException('Success abort', 'DOMError');
        };
        signal.addEventListener('abort', abort);
    });;
    const EffectAborter: FunctionComponent<{ effect: Effect<undefined> }> = ({ effect }) => {
        const abortableEffect = useAbortableEffect(effect);
        const start = async () => {
            try {
                abortableEffect.start();
            } catch (error) {
                isCapturedError = true;
            }
        }
        return <button onClick={start}>Start</button>
    };

    const { getByText } = render(<EffectAborter effect={unmountefTestEffect} />);

    fireEvent.click(getByText('Start'));
    cleanup();

    expect(isCapturedError).toBe(false);
});
