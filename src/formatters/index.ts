import * as vscode from 'vscode';

function getIndentStr(): string {
    const config = vscode.workspace.getConfiguration('phpSerializeInspector');
    const size = config.get<number>('indentSize', 4);
    return ' '.repeat(size);
}

function indent(level: number): string {
    return getIndentStr().repeat(level);
}

function safeString(str: string): string {
    return JSON.stringify(str);
}

export function formatPhpArray(data: any, level = 0): string {
    if (data === null) return 'null';
    if (typeof data === 'boolean') return data ? 'true' : 'false';
    if (typeof data === 'number') return data.toString();
    if (typeof data === 'string') return safeString(data);
    if (data && data.__php_reference) return `/* Reference to ${data.__php_reference} */`;

    if (Array.isArray(data)) {
        if (data.length === 0) return '[]';
        let str = '[\n';
        for (let i = 0; i < data.length; i++) {
            str += indent(level + 1) + formatPhpArray(data[i], level + 1) + ',\n';
        }
        str += indent(level) + ']';
        return str;
    }

    if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 0) return '[]';
        let str = '[\n';
        for (const key of keys) {
            str += indent(level + 1) + `${safeString(key)} => ` + formatPhpArray(data[key], level + 1) + ',\n';
        }
        str += indent(level) + ']';
        return str;
    }
    return String(data);
}

export function formatPhpVarExport(data: any, level = 0): string {
    if (data === null) return 'NULL';
    if (typeof data === 'boolean') return data ? 'true' : 'false';
    if (typeof data === 'number') return data.toString();
    if (typeof data === 'string') return `'${data.replace(/'/g, "\\'")}'`;
    if (data && data.__php_reference) return `/* Reference to ${data.__php_reference} */`;

    if (Array.isArray(data)) {
        if (data.length === 0) return 'array (\n)';
        let str = 'array (\n';
        for (let i = 0; i < data.length; i++) {
            str += indent(level + 1) + `${i} => ` + formatPhpVarExport(data[i], level + 1) + ',\n';
        }
        str += indent(level) + ')';
        return str;
    }

    if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 0) return 'array (\n)';
        let str = 'array (\n';
        for (const key of keys) {
            str += indent(level + 1) + `'${key.replace(/'/g, "\\'")}' => ` + formatPhpVarExport(data[key], level + 1) + ',\n';
        }
        str += indent(level) + ')';
        return str;
    }
    return String(data);
}

export function formatJs(data: any, level = 0, isTypeScript = false): string {
    if (data === null) return 'null';
    if (typeof data === 'boolean') return data ? 'true' : 'false';
    if (typeof data === 'number') return data.toString();
    if (typeof data === 'string') return safeString(data);
    if (data && data.__php_reference) return `/* Reference to ${data.__php_reference} */`;

    if (Array.isArray(data)) {
        if (data.length === 0) return '[]';
        let str = '[\n';
        for (let i = 0; i < data.length; i++) {
            str += indent(level + 1) + formatJs(data[i], level + 1, isTypeScript) + ',\n';
        }
        str += indent(level) + ']';
        return str;
    }

    if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 0) return '{}';
        let str = '{\n';
        for (const key of keys) {
            const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : safeString(key);
            str += indent(level + 1) + `${safeKey}: ` + formatJs(data[key], level + 1, isTypeScript) + ',\n';
        }
        str += indent(level) + '}';
        return str;
    }
    return String(data);
}

export function formatYaml(data: any, level = 0): string {
    if (data === null) return 'null';
    if (typeof data === 'boolean') return data ? 'true' : 'false';
    if (typeof data === 'number') return data.toString();
    if (typeof data === 'string') {
        if (data.includes('\n') || data.includes(':') || data.includes('#') || data.startsWith('- ')) {
            return safeString(data);
        }
        return data;
    }
    if (data && data.__php_reference) return `Reference to ${data.__php_reference}`;

    if (Array.isArray(data)) {
        if (data.length === 0) return '[]';
        let str = level === 0 ? '' : '\n';
        for (let i = 0; i < data.length; i++) {
            const val = formatYaml(data[i], level + 1);
            str += indent(level) + '- ' + val.trimStart() + (val.includes('\n') ? '' : '\n');
        }
        return str.trimEnd();
    }

    if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 0) return '{}';
        let str = level === 0 ? '' : '\n';
        for (const key of keys) {
            const safeKey = /^[a-zA-Z0-9_]+$/.test(key) ? key : safeString(key);
            const val = formatYaml(data[key], level + 1);
            if (val.startsWith('\n')) {
                str += indent(level) + `${safeKey}: ${val}\n`;
            } else {
                str += indent(level) + `${safeKey}: ${val.trimStart()}\n`;
            }
        }
        return str.trimEnd();
    }
    return String(data);
}

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

function formatXmlRecursive(data: any, rootName = 'root', level = 0): string {
    let str = '';
    
    if (data === null) {
        return indent(level) + `<${rootName} xsi:nil="true" />\n`;
    }
    if (typeof data === 'boolean' || typeof data === 'number') {
        return indent(level) + `<${rootName}>${data}</${rootName}>\n`;
    }
    if (typeof data === 'string') {
        return indent(level) + `<${rootName}>${escapeXml(data)}</${rootName}>\n`;
    }

    if (Array.isArray(data)) {
        str += indent(level) + `<${rootName}>\n`;
        for (let i = 0; i < data.length; i++) {
            str += formatXmlRecursive(data[i], 'item', level + 1);
        }
        str += indent(level) + `</${rootName}>\n`;
        return str;
    }

    if (typeof data === 'object') {
        str += indent(level) + `<${rootName}>\n`;
        for (const key of Object.keys(data)) {
            const safeKey = /^[a-zA-Z_][a-zA-Z0-9_\-.]*$/.test(key) ? key : 'element';
            str += formatXmlRecursive(data[key], safeKey, level + 1);
        }
        str += indent(level) + `</${rootName}>\n`;
        return str;
    }

    return indent(level) + `<${rootName}>${escapeXml(String(data))}</${rootName}>\n`;
}

export function formatXml(data: any): string {
    return `<?xml version="1.0" encoding="UTF-8"?>\n` + formatXmlRecursive(data, 'root', 0).trimEnd();
}

export function formatPrettyTree(data: any, level = 0, isLast = true): string {
    if (data === null) return 'null';
    if (typeof data === 'boolean') return data ? 'true' : 'false';
    if (typeof data === 'number') return data.toString();
    if (typeof data === 'string') return safeString(data);
    if (data && data.__php_reference) return `(Reference -> ${data.__php_reference})`;

    if (Array.isArray(data)) {
        if (data.length === 0) return '(empty array)';
        let str = '\n';
        for (let i = 0; i < data.length; i++) {
            const prefix = i === data.length - 1 ? '└──' : '├──';
            const childTree = formatPrettyTree(data[i], level + 1, i === data.length - 1);
            str += indent(level) + `${prefix} [${i}]: ${childTree.trimStart()}\n`;
        }
        return str.trimEnd();
    }

    if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 0) return '(empty object)';
        let str = '\n';
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const prefix = i === keys.length - 1 ? '└──' : '├──';
            const childTree = formatPrettyTree(data[key], level + 1, i === keys.length - 1);
            str += indent(level) + `${prefix} ${key}: ${childTree.trimStart()}\n`;
        }
        return str.trimEnd();
    }

    return String(data);
}
