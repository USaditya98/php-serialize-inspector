jest.mock('vscode', () => ({
    window: { showInformationMessage: jest.fn(), showErrorMessage: jest.fn(), showInputBox: jest.fn(), createQuickPick: jest.fn() },
    workspace: { getConfiguration: jest.fn() }
}), { virtual: true });

import * as assert from 'assert';
import { extractFromPayload } from '../commands/extract';

describe('Extraction Tests', () => {
    const payload = {
        name: "Test",
        metadata: { id: 1, type: "user" },
        items: [
            { id: 10, name: "item1", active: true },
            { id: 11, name: "item2", active: false },
            { id: 12, name: "item3", active: true }
        ],
        nested: {
            deep: {
                target: "found"
            }
        },
        forms: [
            { fields: [{ index: 20, fieldValue: "Yes" }, { index: 21, fieldValue: "No" }] }
        ]
    };

    it('Basic Key Extraction', () => {
        const { results } = extractFromPayload(
            payload,
            [{ key: 'name', operator: '', expected: '', hasFilter: false }],
            {}
        );
        assert.strictEqual(results.length, 4); // Root name + 3 items
        assert.strictEqual(results[0].name, 'Test');
        assert.strictEqual(results[1].name, 'item1');
    });

    it('Multiple Keys Grouping', () => {
        const { results } = extractFromPayload(
            payload,
            [
                { key: 'id', operator: '', expected: '', hasFilter: false },
                { key: 'active', operator: '', expected: '', hasFilter: false }
            ],
            {}
        );
        assert.strictEqual(results.length, 4); // metadata + 3 items
        assert.strictEqual(results[0].id, 1);
        assert.strictEqual(results[0].active, undefined); // metadata has no active
        assert.strictEqual(results[1].id, 10);
        assert.strictEqual(results[1].active, true);
    });

    it('Nested Path Searching', () => {
        const { results } = extractFromPayload(
            payload,
            [{ key: 'deep.target', operator: '', expected: '', hasFilter: false }],
            {}
        );
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0]['deep.target'], 'found');
    });

    it('Value Filtering (Exact Match)', () => {
        const { results } = extractFromPayload(
            payload,
            [
                { key: 'active', operator: '=', expected: 'true', hasFilter: true },
                { key: 'id', operator: '', expected: '', hasFilter: false }
            ],
            {}
        );
        assert.strictEqual(results.length, 2); // only item1 and item3
        assert.strictEqual(results[0].id, 10);
        assert.strictEqual(results[1].id, 12);
    });

    it('Value Filtering (Greater Than)', () => {
        const { results } = extractFromPayload(
            payload,
            [
                { key: 'id', operator: '>', expected: '10', hasFilter: true }
            ],
            {}
        );
        assert.strictEqual(results.length, 2); // item2 (11) and item3 (12)
        assert.strictEqual(results[0].id, 11);
    });

    it('Include Path', () => {
        const { results } = extractFromPayload(
            payload,
            [{ key: 'fieldValue', operator: '', expected: '', hasFilter: false }],
            { includePath: true }
        );
        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0]._path, 'forms[0].fields[0]');
        assert.strictEqual(results[0].fieldValue, 'Yes');
        assert.strictEqual(results[1]._path, 'forms[0].fields[1]');
        assert.strictEqual(results[1].fieldValue, 'No');
    });

    it('Remove Duplicates', () => {
        const dupePayload = [
            { status: 'active' },
            { status: 'inactive' },
            { status: 'active' } // Duplicate
        ];

        const { results } = extractFromPayload(
            dupePayload,
            [{ key: 'status', operator: '', expected: '', hasFilter: false }],
            { dedupe: true }
        );
        
        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].status, 'active');
        assert.strictEqual(results[1].status, 'inactive');
    });

    it('Limits (First Match)', () => {
        const { results } = extractFromPayload(
            payload,
            [{ key: 'active', operator: '', expected: '', hasFilter: false }],
            { limit: 1 }
        );
        
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].active, true);
    });

    it('Search Scope (Exact)', () => {
        const { results } = extractFromPayload(
            payload,
            [{ key: 'name', operator: '', expected: '', hasFilter: false }],
            { exactMatch: true }
        );
        
        assert.strictEqual(results.length, 1); // Only root
        assert.strictEqual(results[0].name, 'Test');
    });

    it('Search Scope (Level)', () => {
        const { results } = extractFromPayload(
            payload,
            [{ key: 'id', operator: '', expected: '', hasFilter: false }],
            { levelMatch: true }
        );
        
        assert.strictEqual(results.length, 1); // Only metadata
        assert.strictEqual(results[0].id, 1);
    });
});
