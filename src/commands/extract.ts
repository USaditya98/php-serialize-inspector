import * as vscode from 'vscode';
import { unserialize } from '../parser/phpUnserializer';
import { formatPhpArray, formatPhpVarExport, formatJs, formatYaml, formatXml, formatPrettyTree } from '../formatters/index';

// Helper to evaluate nested object paths
function getNestedValue(obj: any, path: string): { exists: boolean; value: any } {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || typeof current !== 'object' || !(part in current)) {
            return { exists: false, value: undefined };
        }
        current = current[part];
    }
    return { exists: true, value: current };
}

// Helper to parse expected value to primitive
function parseExpectedValue(val: string): any {
    if (val.toLowerCase() === 'null') return null;
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
    const num = Number(val);
    if (!isNaN(num) && val.trim() !== '') return num;
    return val;
}

// Helper for comparison
function compareValues(actual: any, operator: string, expectedStr: string): boolean {
    const expected = parseExpectedValue(expectedStr);
    
    // Fallback for strings
    const actualStr = String(actual);
    
    switch (operator) {
        case '=': return actual === expected || actualStr === expectedStr;
        case '!=': return actual !== expected && actualStr !== expectedStr;
        case '>': return actual > expected;
        case '<': return actual < expected;
        case '>=': return actual >= expected;
        case '<=': return actual <= expected;
        default: return false;
    }
}

export function extractFromPayload(
    parsed: any, 
    conditions: { key: string, operator: string, expected: string, hasFilter: boolean }[],
    options: { includePath?: boolean, dedupe?: boolean, limit?: number, exactMatch?: boolean, levelMatch?: boolean }
): { results: any[], scannedObjects: number } {
    
    const results: any[] = [];
    const seenSignatures = new Set<string>();
    let scannedObjects = 0;

    function buildPathString(parentPath: string, key: string | number): string {
        if (!parentPath) return typeof key === 'number' ? `[${key}]` : String(key);
        return typeof key === 'number' ? `${parentPath}[${key}]` : `${parentPath}.${key}`;
    }

    function search(obj: any, currentPath: string, depth: number) {
        if (results.length >= (options.limit || Infinity)) return;
        if (options.exactMatch && depth > 0) return;
        if (options.levelMatch && depth > 1) return;

        if (typeof obj === 'object' && obj !== null) {
            scannedObjects++;

            let matchesAny = false;
            let passesFilters = true;
            
            const extracted: any = {};

            for (const cond of conditions) {
                const res = getNestedValue(obj, cond.key);
                
                if (cond.hasFilter) {
                    if (!res.exists || !compareValues(res.value, cond.operator, cond.expected)) {
                        passesFilters = false;
                        break;
                    }
                }

                if (res.exists) {
                    matchesAny = true;
                    extracted[cond.key] = res.value;
                }
            }

            if (matchesAny && passesFilters) {
                if (options.includePath) {
                    extracted['_path'] = currentPath || 'root';
                }

                if (options.dedupe) {
                    const sigObj = { ...extracted };
                    delete sigObj['_path'];
                    const sig = JSON.stringify(sigObj);
                    if (!seenSignatures.has(sig)) {
                        seenSignatures.add(sig);
                        results.push(extracted);
                    }
                } else {
                    results.push(extracted);
                }
            }

            if (!options.exactMatch) {
                if (Array.isArray(obj)) {
                    for (let i = 0; i < obj.length; i++) {
                        search(obj[i], buildPathString(currentPath, i), depth + 1);
                    }
                } else {
                    for (const key of Object.keys(obj)) {
                        search(obj[key], buildPathString(currentPath, key), depth + 1);
                    }
                }
            }
        }
    }
    
    search(parsed, '', 0);
    return { results, scannedObjects };
}

export async function extractCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    let text = editor.document.getText(editor.selection).trim();
    if (!text) text = editor.document.getText().trim();
    
    if (!text) {
        vscode.window.showErrorMessage('Please select data first.');
        return;
    }

    try {
        const payloadSizeMb = (Buffer.byteLength(text, 'utf8') / (1024 * 1024)).toFixed(2);
        
        let parsed: any;
        let textToParse = text;

        if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length > 10) {
            try {
                const decoded = Buffer.from(text, 'base64').toString('utf8');
                if (decoded.startsWith('a:') || decoded.startsWith('O:') || decoded.startsWith('s:') || decoded.startsWith('i:') || decoded.startsWith('b:') || decoded.startsWith('N;')) {
                    textToParse = decoded;
                }
            } catch (e) {}
        }

        if ((textToParse.startsWith('{') && textToParse.endsWith('}')) || (textToParse.startsWith('[') && textToParse.endsWith(']'))) {
            try {
                parsed = JSON.parse(textToParse);
            } catch (e) {
                parsed = unserialize(textToParse);
            }
        } else {
            parsed = unserialize(textToParse);
        }

        const keysInput = await vscode.window.showInputBox({ 
            prompt: 'Enter keys (e.g., "customer.name, age>18"). Optional flags: --path, --dedupe, --limit 10, --exact, --level',
            placeHolder: 'index, fieldValue=Yes --path --limit 500'
        });
        
        if (!keysInput) return;
        
        const startTime = Date.now();

        // Parse query
        let queryPart = keysInput;
        let flagsPart = '';
        const flagsMatch = keysInput.match(/--(path|dedupe|limit|exact|level)/);
        if (flagsMatch && flagsMatch.index !== undefined) {
            queryPart = keysInput.substring(0, flagsMatch.index);
            flagsPart = keysInput.substring(flagsMatch.index);
        }

        const rawTokens = queryPart.split(',').map(k => k.trim()).filter(k => k.length > 0);
        if (rawTokens.length === 0) return;

        // Parse conditions
        const conditions = rawTokens.map(token => {
            const match = token.match(/^(.*?)(!=|>=|<=|>|<|=)(.*)$/);
            if (match) {
                return { key: match[1].trim(), operator: match[2], expected: match[3].trim(), hasFilter: true };
            }
            return { key: token, operator: '', expected: '', hasFilter: false };
        });

        // Parse flags
        const includePath = flagsPart.includes('--path');
        const dedupe = flagsPart.includes('--dedupe');
        const exactMatch = flagsPart.includes('--exact');
        const levelMatch = flagsPart.includes('--level');
        
        let limit = Infinity;
        const limitMatch = flagsPart.match(/--limit\s+(\d+)/);
        if (limitMatch) {
            limit = parseInt(limitMatch[1], 10);
        }

        const { results, scannedObjects } = extractFromPayload(parsed, conditions, {
            includePath, dedupe, limit, exactMatch, levelMatch
        });
        
        const durationMs = Date.now() - startTime;
        
        vscode.window.showInformationMessage(
            `Extracted ${results.length} result(s) in ${durationMs}ms. (Payload: ${payloadSizeMb}MB, Scanned objects: ${scannedObjects})`
        );

        if (results.length === 0) return;

        // Output formatting
        const config = vscode.workspace.getConfiguration('phpSerializeInspector');
        const defaultFormat = config.get<string>('defaultFormat', 'Ask (Dropdown)');

        const formatOptions = [
            { label: 'JSON (Formatted)', description: 'Standard formatted JSON' },
            { label: 'JSON (Minified)', description: 'Compact JSON' },
            { label: 'PHP Array', description: "['key' => 'value']" },
            { label: 'PHP var_export()', description: "array('key' => 'value')" },
            { label: 'JavaScript Object', description: "Unquoted keys where valid" },
            { label: 'TypeScript', description: "TypeScript compatible" },
            { label: 'YAML', description: "Valid YAML format" },
            { label: 'XML', description: "Valid XML format" },
            { label: 'Pretty Tree', description: "ASCII Visual Tree" },
            { label: 'Raw Value', description: "Direct scalar value" }
        ];

        function generateOutput(formatLabel: string): { outputStr: string, lang: string } {
            let outputStr = '';
            let lang = 'plaintext';
            const indentSize = config.get<number>('indentSize', 4);
            
            switch (formatLabel) {
                case 'JSON (Formatted)': outputStr = JSON.stringify(results, null, indentSize); lang = 'json'; break;
                case 'JSON (Minified)': outputStr = JSON.stringify(results); lang = 'json'; break;
                case 'PHP Array': outputStr = formatPhpArray(results); lang = 'php'; break;
                case 'PHP var_export()': outputStr = formatPhpVarExport(results); lang = 'php'; break;
                case 'JavaScript Object': outputStr = formatJs(results, 0, false); lang = 'javascript'; break;
                case 'TypeScript': outputStr = formatJs(results, 0, true); lang = 'typescript'; break;
                case 'YAML': outputStr = formatYaml(results); lang = 'yaml'; break;
                case 'XML': outputStr = formatXml(results); lang = 'xml'; break;
                case 'Pretty Tree': outputStr = formatPrettyTree(results); lang = 'plaintext'; break;
                case 'Raw Value': outputStr = JSON.stringify(results); lang = 'plaintext'; break;
            }
            return { outputStr, lang };
        }

        async function applyOutput(outputStr: string, lang: string) {
            const doc = await vscode.workspace.openTextDocument({ content: outputStr, language: lang });
            vscode.window.showTextDocument(doc);
        }

        if (defaultFormat !== 'Ask (Dropdown)') {
            const { outputStr, lang } = generateOutput(defaultFormat);
            await applyOutput(outputStr, lang);
            return;
        }

        const quickPick = vscode.window.createQuickPick();
        quickPick.items = formatOptions;
        quickPick.placeholder = 'Select output format for extracted data...';
        
        quickPick.onDidAccept(async () => {
            const activeItem = quickPick.activeItems[0];
            if (activeItem) {
                const { outputStr, lang } = generateOutput(activeItem.label);
                await applyOutput(outputStr, lang);
            }
            quickPick.hide();
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
        });

        quickPick.show();

    } catch(e: any) {
        vscode.window.showErrorMessage(`Extract Error: ${e.message}`);
    }
}
