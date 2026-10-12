import { describe, expect, test } from '@rstest/core';
import { NonExistingBranchError } from './branched-wire';
import { branchedWireAsync } from './branched-wire-async';
import { wireClassAsync } from './wire-class-async';

describe('async branched wire', () => {
    test('Picks branch with async selector', async () => {
        const byFlag = branchedWireAsync<'on' | 'off'>(async () => 'on');
        const wire = byFlag({
            on: () => 1,
            off: () => 2
        });
        expect(await wire()).toBe(1);
    });

    test('Picks branch with conditional async selector', async () => {
        const isEnabled = async () => false;
        const byFlag = branchedWireAsync<'on' | 'off'>(async () =>
            (await isEnabled()) ? 'on' : 'off'
        );
        const wire = byFlag({
            on: () => 1,
            off: () => 2
        });
        expect(await wire()).toBe(2);
    });

    test('Resolves async branch', async () => {
        const byFlag = branchedWireAsync<'on' | 'off'>(async () => 'off');
        const wire = byFlag({
            on: () => 1,
            off: async () => 2
        });
        expect(await wire()).toBe(2);
    });

    test('Selects branch on every call', async () => {
        let branch: 'on' | 'off' = 'on';
        const byFlag = branchedWireAsync<'on' | 'off'>(async () => branch);
        const wire = byFlag({
            on: () => 1,
            off: () => 2
        });
        expect(await wire()).toBe(1);
        branch = 'off';
        expect(await wire()).toBe(2);
    });

    test('Does not call selector until wire is called', async () => {
        let calls = 0;
        const byFlag = branchedWireAsync<'on'>(async () => {
            calls++;
            return 'on';
        });
        const wire = byFlag({ on: () => 1 });
        expect(calls).toBe(0);
        await wire();
        expect(calls).toBe(1);
    });

    test('Rejects with NonExistingBranchError on unknown branch', async () => {
        const byFlag = branchedWireAsync<'on'>(
            async () => 'off' as any as 'on'
        );
        const wire = byFlag({ on: () => 1 });
        await expect(wire()).rejects.toThrowError(NonExistingBranchError);
    });

    test('Rejects when selector rejects', async () => {
        const byFlag = branchedWireAsync<'on'>(async () => {
            throw new Error('selector failed');
        });
        const wire = byFlag({ on: () => 1 });
        await expect(wire()).rejects.toThrow('selector failed');
    });

    test('Works as dependency of async class wire', async () => {
        class Service {
            constructor(public readonly value: number) {}
        }
        const byFlag = branchedWireAsync<'on' | 'off'>(async () => 'on');
        const wireValue = byFlag({
            on: async () => 1,
            off: () => 2
        });
        const service = await wireClassAsync(Service, [wireValue])();
        expect(service.value).toBe(1);
    });
});
