import * as vscode from 'vscode';
import { unserializeCommand } from './commands/unserialize';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('php-serialize-inspector.unserialize', unserializeCommand);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
