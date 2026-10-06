import * as vscode from 'vscode';
import { unserialize } from '../parser/phpUnserializer';

export class PhpSerializeCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        const lenses: vscode.CodeLens[] = [];
        
        const fullText = document.getText();
        const trimmed = fullText.trim();
        
        // Very basic CodeLens injection at the top of the file if the file is predominantly a serialized string
        if (trimmed.startsWith('a:') || trimmed.startsWith('O:') || trimmed.startsWith('C:') || trimmed.startsWith('s:')) {
            try {
                // Just to verify it's valid
                unserialize(trimmed);
                
                const range = new vscode.Range(0, 0, 0, 0);
                lenses.push(new vscode.CodeLens(range, {
                    title: '🐘 Decode PHP Serialized String',
                    command: 'php-serialize-inspector.unserialize',
                    arguments: []
                }));
            } catch (e) {
                // ignore
            }
        }
        
        return lenses;
    }
}
