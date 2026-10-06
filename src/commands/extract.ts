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
        const keyToFind = await vscode.window.showInputBox({ 
            prompt: 'Enter the key to extract (e.g., "email", "id")',
            placeHolder: 'Key name'
        });
        
        if (!keyToFind) return;
        
        const results: any[] = [];
        
        function search(obj: any) {
            if (typeof obj === 'object' && obj !== null) {
                for (const key of Object.keys(obj)) {
                    if (key === keyToFind) {
                        results.push(obj[key]);
                    }
                    search(obj[key]);
                }
            }
        }
        
        search(parsed);
        
        if (results.length === 0) {
            vscode.window.showInformationMessage(`No matches found for key "${keyToFind}".`);
            return;
        }

        const output = JSON.stringify(results.length === 1 ? results[0] : results, null, 4);
        const doc = await vscode.workspace.openTextDocument({ content: output, language: 'json' });
        vscode.window.showTextDocument(doc);
        
    } catch(e: any) {
        vscode.window.showErrorMessage(`Extract Error: ${e.message}`);
    }
}
