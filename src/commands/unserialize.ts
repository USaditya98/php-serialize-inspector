import * as vscode from 'vscode';
import { unserialize } from '../parser/phpUnserializer';
import { formatPhpArray, formatPhpVarExport, formatJs, formatYaml, formatXml, formatPrettyTree } from '../formatters/index';
import { treeProvider } from '../extension';

export async function unserializeCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }

    let selection = editor.selection;
    let text = editor.document.getText(selection).trim();

    // If no text is selected, fallback to the entire document (useful for CodeLens)
    if (!text) {
        text = editor.document.getText().trim();
        selection = new vscode.Selection(
            editor.document.positionAt(0),
            editor.document.positionAt(editor.document.getText().length)
        );
    }

    if (!text) {
        vscode.window.showErrorMessage('Please select data first.');
        return;
    }

    let parsed: any;
    let textToParse = text;
    let isBase64 = false;

    // Base64 Auto-Detection (Very common in Laravel/WP)
    if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length > 10) {
        try {
            const decoded = Buffer.from(text, 'base64').toString('utf8');
            if (decoded.startsWith('a:') || decoded.startsWith('O:') || decoded.startsWith('s:') || decoded.startsWith('i:') || decoded.startsWith('b:') || decoded.startsWith('N;')) {
                textToParse = decoded;
                isBase64 = true;
            }
        } catch (e) {}
    }

    try {
        if ((textToParse.startsWith('{') && textToParse.endsWith('}')) || (textToParse.startsWith('[') && textToParse.endsWith(']'))) {
            try {
                parsed = JSON.parse(textToParse);
            } catch (e) {
                parsed = unserialize(textToParse);
            }
        } else {
            parsed = unserialize(textToParse);
        }
    } catch (error: any) {
        const errorMessage = error.message ? error.message : String(error);
        vscode.window.showErrorMessage(`Parse Error: ${errorMessage}`);
        return;
    }

    // Populate Sidebar TreeView!
    treeProvider.setData(parsed);
    if (isBase64) {
        vscode.window.showInformationMessage('Base64 string auto-decoded and parsed successfully!');
    }

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

    let currentStart = selection.start;
    let currentEnd = selection.end;
    let isUpdating = false;

    function generateOutput(formatLabel: string): { outputStr: string, lang: string } {
        let outputStr = '';
        let lang = 'plaintext';
        
        switch (formatLabel) {
            case 'JSON (Formatted)':
                outputStr = JSON.stringify(parsed, null, config.get<number>('indentSize', 4));
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

    if (defaultFormat !== 'Ask (Dropdown)') {
        const { outputStr, lang } = generateOutput(defaultFormat);
        await applyText(outputStr, lang);
        return;
    }

    const quickPick = vscode.window.createQuickPick();
    quickPick.items = formatOptions;
    quickPick.placeholder = 'Select format. (Arrow keys to preview, Enter to apply & copy, Esc to cancel)';
    
    let isAccepted = false;

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
            await applyText(text, 'plaintext');
        }
        quickPick.dispose();
    });

    quickPick.show();
}
