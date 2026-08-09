import { describe, expect, test } from '@rstest/core';
import { branchedWire, NonExistingBranchError } from './branched-wire';
import { wireValue } from './wire-value';

describe('branched wire', () => {
    const wire1 = wireValue(1 as const);
    const correctBranchedWire = branchedWire<'a'>(() => {
        return 'a';
    });
    const incorrectBranchedWire = branchedWire<'a'>(() => {
        return 'b' as any as 'a';
    });

    test('correct wire', () => {
        const wire = correctBranchedWire({
            a: wire1
        });

        const a = wire();
        expect(a).toBe(1);
    });

    test('incorrect wire', () => {
        const wire = incorrectBranchedWire({
            a: wire1
        });

        expect(wire).toThrowError(NonExistingBranchError);
    });
});
