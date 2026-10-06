import * as vscode from 'vscode';
import { serialize } from '../parser/phpSerializer';

export async function serializeCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection).trim();

    if (!text) {
        vscode.window.showErrorMessage('Please select JSON data first.');
        return;
    }

    try {
        // Evaluate as JS object or JSON
        // Using Function to safely parse unquoted keys or trailing commas which JSON.parse chokes on
        const parsed = Function(`"use strict"; return (${text});`)();
        
        const serializedStr = serialize(parsed);
        
        await editor.edit(editBuilder => {
            editBuilder.replace(selection, serializedStr);
        });
        
        vscode.languages.setTextDocumentLanguage(editor.document, 'plaintext');
        vscode.window.showInformationMessage('Successfully serialized to PHP!');
        
    } catch (error: any) {
        const errorMessage = error.message ? error.message : String(error);
        vscode.window.showErrorMessage(`Serialize Error: Invalid JSON or JS Object - ${errorMessage}`);
    }
}
