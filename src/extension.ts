import * as vscode from 'vscode';
import { unserializeCommand } from './commands/unserialize';
import { serializeCommand } from './commands/serialize';
import { compareCommand, diffProvider, DiffContentProvider } from './commands/compare';
import { extractCommand } from './commands/extract';
import { PhpSerializeHoverProvider } from './providers/hoverProvider';
import { PhpSerializeCodeLensProvider } from './providers/codeLensProvider';
import { PhpSerializeTreeProvider } from './providers/sidebarProvider';

export const treeProvider = new PhpSerializeTreeProvider();

export function activate(context: vscode.ExtensionContext) {
    // Register Commands
    const unserializeDisposable = vscode.commands.registerCommand('php-serialize-inspector.unserialize', unserializeCommand);
    const serializeDisposable = vscode.commands.registerCommand('php-serialize-inspector.serialize', serializeCommand);
    const compareDisposable = vscode.commands.registerCommand('php-serialize-inspector.compare', compareCommand);
    const extractDisposable = vscode.commands.registerCommand('php-serialize-inspector.extract', extractCommand);
    
    // Register Providers
    const hoverDisposable = vscode.languages.registerHoverProvider('*', new PhpSerializeHoverProvider());
    const codeLensDisposable = vscode.languages.registerCodeLensProvider('*', new PhpSerializeCodeLensProvider());
    
    // Register Diff Provider
    const diffWorkspaceDisposable = vscode.workspace.registerTextDocumentContentProvider(DiffContentProvider.scheme, diffProvider);

    // Register Sidebar TreeView
    const treeViewDisposable = vscode.window.registerTreeDataProvider('php-serialize-explorer', treeProvider);

    context.subscriptions.push(
        unserializeDisposable, 
        serializeDisposable,
        compareDisposable,
        extractDisposable,
        hoverDisposable,
        codeLensDisposable,
        diffWorkspaceDisposable,
        treeViewDisposable
    );
}

export function deactivate() {}
