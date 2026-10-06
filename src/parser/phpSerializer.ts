export function serialize(data: any): string {
    if (data === null) {
        return 'N;';
    }
    if (typeof data === 'boolean') {
        return `b:${data ? 1 : 0};`;
    }
    if (typeof data === 'number') {
        if (Number.isInteger(data)) {
            return `i:${data};`;
        } else {
            return `d:${data};`;
        }
    }
    if (typeof data === 'string') {
        // Calculate byte length for utf-8
        const byteLength = Buffer.byteLength(data, 'utf8');
        return `s:${byteLength}:"${data}";`;
    }
    
    if (Array.isArray(data)) {
        let str = `a:${data.length}:{`;
        for (let i = 0; i < data.length; i++) {
            str += serialize(i) + serialize(data[i]);
        }
        str += '}';
        return str;
    }
    
    if (typeof data === 'object') {
        const keys = Object.keys(data);
        let str = `a:${keys.length}:{`;
        for (const key of keys) {
            str += serialize(key) + serialize(data[key]);
        }
        str += '}';
        return str;
    }
    
    return 'N;';
}
