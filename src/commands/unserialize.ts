import * as vscode from 'vscode';
import { unserialize } from '../parser/phpUnserializer';
import { formatPhpArray, formatPhpVarExport, formatJs, formatYaml, formatXml, formatPrettyTree } from '../formatters/index';

export async function unserializeCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection).trim();

    if (!text) {
        vscode.window.showErrorMessage('Please select data first.');
        return;
    }

    let parsed: any;
    try {
        // Auto Format Detection: JSON or PHP Serialize
        if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                parsed = unserialize(text);
            }
        } else {
            parsed = unserialize(text);
        }
    } catch (error: any) {
        const errorMessage = error.message ? error.message : String(error);
        vscode.window.showErrorMessage(`Parse Error: ${errorMessage}`);
        return;
    }

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

    const quickPick = vscode.window.createQuickPick();
    quickPick.items = formatOptions;
    quickPick.placeholder = 'Select format. (Arrow keys to preview, Enter to apply & copy, Esc to cancel)';
    
    let currentStart = selection.start;
    let currentEnd = selection.end;
    let isAccepted = false;
    let isUpdating = false;

    function generateOutput(formatLabel: string): { outputStr: string, lang: string } {
        let outputStr = '';
        let lang = 'plaintext';
        
        switch (formatLabel) {
            case 'JSON (Formatted)':
                outputStr = JSON.stringify(parsed, null, 4);
                lang = 'json';
                break;
            case 'JSON (Minified)':
                outputStr = JSON.stringify(parsed);
                lang = 'json';
                break;
            case 'PHP Array':
                outputStr = formatPhpArray(parsed);
                lang = 'php';
                break;
            case 'PHP var_export()':
                outputStr = formatPhpVarExport(parsed);
                lang = 'php';
                break;
            case 'JavaScript Object':
                outputStr = formatJs(parsed, 0, false);
                lang = 'javascript';
                break;
            case 'TypeScript':
                outputStr = formatJs(parsed, 0, true);
                lang = 'typescript';
                break;
            case 'YAML':
                outputStr = formatYaml(parsed);
                lang = 'yaml';
                break;
            case 'XML':
                outputStr = formatXml(parsed);
                lang = 'xml';
                break;
            case 'Pretty Tree':
                outputStr = formatPrettyTree(parsed);
                lang = 'plaintext';
                break;
            case 'Raw Value':
                outputStr = typeof parsed === 'object' && parsed !== null ? JSON.stringify(parsed) : String(parsed);
                lang = 'plaintext';
                break;
        }
        return { outputStr, lang };
    }

    async function applyText(outputStr: string, lang: string) {
        if (isUpdating) return;
        isUpdating = true;
        
        const edit = new vscode.WorkspaceEdit();
        edit.replace(editor!.document.uri, new vscode.Range(currentStart, currentEnd), outputStr);
        await vscode.workspace.applyEdit(edit);
        
        const lines = outputStr.split(/\r?\n/);
        const endLine = currentStart.line + lines.length - 1;
        const endChar = lines.length === 1 ? currentStart.character + lines[0].length : lines[lines.length - 1].length;
        
        currentEnd = new vscode.Position(endLine, endChar);
        editor!.selection = new vscode.Selection(currentStart, currentEnd);
        vscode.languages.setTextDocumentLanguage(editor!.document, lang);
        
        isUpdating = false;
    }

    quickPick.onDidChangeActive(async (activeItems) => {
        if (activeItems.length > 0) {
            const { outputStr, lang } = generateOutput(activeItems[0].label);
            await applyText(outputStr, lang);
        }
    });

    quickPick.onDidAccept(async () => {
        isAccepted = true;
        const activeItem = quickPick.activeItems[0];
        if (activeItem) {
            const { outputStr, lang } = generateOutput(activeItem.label);
            await applyText(outputStr, lang);
            
            await vscode.env.clipboard.writeText(outputStr);
            vscode.window.showInformationMessage(`Copied ${activeItem.label} to clipboard!`);
        }
        quickPick.hide();
    });

    quickPick.onDidHide(async () => {
        if (!isAccepted) {
            // Revert back to original text if user hits Escape
            await applyText(text, 'plaintext');
        }
        quickPick.dispose();
    });

    quickPick.show();
}
