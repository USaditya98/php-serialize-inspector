import * as vscode from 'vscode';
import { unserialize } from '../parser/phpUnserializer';

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
        const parsed = unserialize(text);
        const keysInput = await vscode.window.showInputBox({ 
            prompt: 'Enter comma-separated keys to extract (e.g., "index, fieldValue")',
            placeHolder: 'index, fieldValue'
        });
        
        if (!keysInput) return;
        
        const targetKeys = keysInput.split(',').map(k => k.trim()).filter(k => k.length > 0);
        if (targetKeys.length === 0) return;

        const results: any[] = [];
        
        function search(obj: any) {
            if (typeof obj === 'object' && obj !== null) {
                
                // Check if this current object contains any of the target keys
                const objKeys = Object.keys(obj);
                const hasMatchingKey = targetKeys.some(tk => objKeys.includes(tk));
                
                if (hasMatchingKey) {
                    // Extract only the requested keys from this object
                    const extracted: any = {};
                    for (const tk of targetKeys) {
                        if (objKeys.includes(tk)) {
                            extracted[tk] = obj[tk];
                        }
                    }
                    results.push(extracted);
                }

                // Recursively search children
                for (const key of objKeys) {
                    search(obj[key]);
                }
            }
        }
        
        search(parsed);
        
        if (results.length === 0) {
            vscode.window.showInformationMessage(`No matches found for keys: ${targetKeys.join(', ')}`);
            return;
        }

        const output = JSON.stringify(results, null, 4);
        const doc = await vscode.workspace.openTextDocument({ content: output, language: 'json' });
        vscode.window.showTextDocument(doc);
        
    } catch(e: any) {
        vscode.window.showErrorMessage(`Extract Error: ${e.message}`);
    }
}
