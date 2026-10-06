import * as vscode from 'vscode';
import { unserialize } from '../parser/phpUnserializer';

export class PhpSerializeHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        // We need to figure out if we are hovering over a serialized string.
        // It's hard to parse perfectly from an arbitrary position. Let's look for a regex match in the current line,
        // or a regex match across the whole document (but that can be slow).
        // Since serialized strings might span multiple lines, let's just grab the whole text
        // and see if the cursor position is inside a valid string.
        // For performance, we can just grab a chunk around the cursor.
        const range = new vscode.Range(
            new vscode.Position(Math.max(0, position.line - 10), 0),
            new vscode.Position(position.line + 10, 1000)
        );
        const textChunk = document.getText(range);
        
        // Simple heuristic: Does it contain "a:X:{" or "O:X:"?
        if (!textChunk.match(/([aOdCsbiNR]):\d*:?/)) {
            return null;
        }

        // Try to parse the word/selection or the line
        // A better approach is to use a regex to find all serialized strings in the chunk,
        // and see if `position` is inside their range.
        const serializedPattern = /([aOc]:\d+:[^{]*\{.*\}|[sid]:[^;]+;|b:[01];|N;)/g;
        // The regex above is extremely naive. Since parsing PHP serialization via regex is impossible for nested structures,
        // we might just attempt to parse the string starting from common prefixes.
        
        // As a simpler fallback, let's grab the entire document text.
        const fullText = document.getText();
        
        // If the entire document is one string (e.g. pasted into a new file)
        try {
            const parsed = unserialize(fullText.trim());
            const jsonPreview = JSON.stringify(parsed, null, 2);
            
            // Truncate if too huge
            const maxLen = 1000;
            const preview = jsonPreview.length > maxLen ? jsonPreview.slice(0, maxLen) + '\n... (truncated)' : jsonPreview;
            
            const markdown = new vscode.MarkdownString();
            markdown.appendCodeblock(preview, 'json');
            return new vscode.Hover(markdown);
        } catch (e) {
            // Not a single document serialized string.
            // In the future, we could implement a sophisticated scanner here.
        }

        return null;
    }
}
