import * as vscode from 'vscode';
import { unserialize } from '../parser/phpUnserializer';

export class DiffContentProvider implements vscode.TextDocumentContentProvider {
    static scheme = 'phpserialize-diff';
    private contents = new Map<string, string>();
    
    provideTextDocumentContent(uri: vscode.Uri): string {
        return this.contents.get(uri.path) || '';
    }
    
    setContent(path: string, content: string) {
        this.contents.set(path, content);
    }
}

export const diffProvider = new DiffContentProvider();

export async function compareCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;
    if (selections.length !== 2) {
        vscode.window.showErrorMessage('Please use multi-cursor (Alt+Click) to select exactly TWO serialized strings to compare.');
        return;
    }

    let text1 = editor.document.getText(selections[0]).trim();
    let text2 = editor.document.getText(selections[1]).trim();

    try {
        const parsed1 = unserialize(text1);
        const parsed2 = unserialize(text2);
        
        const formatted1 = JSON.stringify(parsed1, null, 4);
        const formatted2 = JSON.stringify(parsed2, null, 4);
        
        const uri1 = vscode.Uri.parse(`${DiffContentProvider.scheme}:left.json`);
        const uri2 = vscode.Uri.parse(`${DiffContentProvider.scheme}:right.json`);
        
        diffProvider.setContent('left.json', formatted1);
        diffProvider.setContent('right.json', formatted2);
        
        await vscode.commands.executeCommand('vscode.diff', uri1, uri2, 'Serialized Payload Diff');
    } catch(e: any) {
        vscode.window.showErrorMessage(`Compare Error: ${e.message}`);
    }
}
