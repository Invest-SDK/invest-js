import { test, describe } from 'node:test';
import assert from 'node:assert';
import { TechAnalysisSmoothing } from '../index';

describe('marketdata runtime exports', () => {
  test('exports TechAnalysisSmoothing message helpers at runtime', () => {
    assert.ok(TechAnalysisSmoothing);
    assert.strictEqual(typeof TechAnalysisSmoothing.fromPartial, 'function');
  });
});
