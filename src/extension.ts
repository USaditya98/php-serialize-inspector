import * as vscode from 'vscode';
import { unserializeCommand } from './commands/unserialize';
import { serializeCommand } from './commands/serialize';
import { PhpSerializeHoverProvider } from './providers/hoverProvider';
import { PhpSerializeCodeLensProvider } from './providers/codeLensProvider';

export function activate(context: vscode.ExtensionContext) {
    // Register Commands
    const unserializeDisposable = vscode.commands.registerCommand('php-serialize-inspector.unserialize', unserializeCommand);
    const serializeDisposable = vscode.commands.registerCommand('php-serialize-inspector.serialize', serializeCommand);
    
    // Register Hover Provider for all files
    const hoverDisposable = vscode.languages.registerHoverProvider('*', new PhpSerializeHoverProvider());
    
    // Register CodeLens Provider for all files
    const codeLensDisposable = vscode.languages.registerCodeLensProvider('*', new PhpSerializeCodeLensProvider());

    context.subscriptions.push(
        unserializeDisposable, 
        serializeDisposable,
        hoverDisposable,
        codeLensDisposable
    );
}

export function deactivate() {}
