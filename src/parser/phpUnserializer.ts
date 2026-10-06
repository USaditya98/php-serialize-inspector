export class UnserializeError extends Error {}

export function unserialize(data: string): any {
    // We use a Buffer to correctly handle byte-lengths for UTF-8 strings.
    const buf = Buffer.from(data, 'utf-8');
    let cursor = 0;
    
    function parse(): any {
        if (cursor >= buf.length) throw new UnserializeError("Unexpected end of input");
        
        const type = buf.toString('utf-8', cursor, cursor + 1);
        
        if (type === 'N') {
            if (buf.toString('utf-8', cursor, cursor + 2) !== 'N;') throw new UnserializeError("Invalid null");
            cursor += 2;
            return null;
        }
        
        if (type === 'b') {
            const str = buf.toString('utf-8', cursor, cursor + 4);
            const match = str.match(/^b:([01]);/);
            if (!match) throw new UnserializeError("Invalid boolean");
            cursor += Buffer.byteLength(match[0]);
            return match[1] === '1';
        }
        
        if (type === 'i') {
            const semicolonIdx = buf.indexOf(';', cursor);
            if (semicolonIdx === -1) throw new UnserializeError("Invalid integer");
            const str = buf.toString('utf-8', cursor, semicolonIdx + 1);
            const match = str.match(/^i:(-?\d+);/);
            if (!match) throw new UnserializeError("Invalid integer");
            cursor = semicolonIdx + 1;
            return parseInt(match[1], 10);
        }
        
        if (type === 'd') {
            const semicolonIdx = buf.indexOf(';', cursor);
            if (semicolonIdx === -1) throw new UnserializeError("Invalid float");
            const str = buf.toString('utf-8', cursor, semicolonIdx + 1);
            const match = str.match(/^d:(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|NAN|INF|-INF);/i);
            if (!match) throw new UnserializeError("Invalid float");
            cursor = semicolonIdx + 1;
            
            const floatStr = match[1].toUpperCase();
            if (floatStr === 'INF') return Infinity;
            if (floatStr === '-INF') return -Infinity;
            if (floatStr === 'NAN') return NaN;
            return parseFloat(match[1]);
        }
        
        if (type === 's') {
            const colonIdx1 = buf.indexOf(':', cursor + 2);
            if (colonIdx1 === -1) throw new UnserializeError("Invalid string");
            
            const lenStr = buf.toString('utf-8', cursor + 2, colonIdx1);
            const length = parseInt(lenStr, 10);
            
            const start = colonIdx1 + 2; // skip :\"
            if (start + length > buf.length) throw new UnserializeError("String length out of bounds");
            
            const str = buf.toString('utf-8', start, start + length);
            
            const endQuote = buf.toString('utf-8', start + length, start + length + 2);
            if (endQuote !== '";') throw new UnserializeError("Invalid string termination");
            
            cursor = start + length + 2;
            return str;
        }
        
        if (type === 'a') {
            const bracketIdx = buf.indexOf('{', cursor);
            if (bracketIdx === -1) throw new UnserializeError("Invalid array");
            
            const lenStr = buf.toString('utf-8', cursor + 2, bracketIdx - 1);
            const length = parseInt(lenStr, 10);
            
            cursor = bracketIdx + 1;
            
            const result: Record<string | number, any> = {};
            let isList = true;
            let expectedIndex = 0;
            
            for (let i = 0; i < length; i++) {
                const key = parse();
                const value = parse();
                
                if (typeof key !== 'string' && typeof key !== 'number') {
                    throw new UnserializeError("Invalid array key");
                }
                
                result[key] = value;
                if (key !== expectedIndex) {
                    isList = false;
                } else {
                    expectedIndex++;
                }
            }
            
            if (cursor >= buf.length || buf.toString('utf-8', cursor, cursor + 1) !== '}') {
                throw new UnserializeError("Invalid array termination");
            }
            cursor++;
            
            if (isList && length > 0) {
                const arr = [];
                for (let i = 0; i < length; i++) arr.push(result[i]);
                return arr;
            } else if (length === 0) {
                return []; // Return empty array instead of empty object
            }
            
            return result;
        }
        
        if (type === 'O') {
            const colonIdx1 = buf.indexOf(':', cursor + 2);
            if (colonIdx1 === -1) throw new UnserializeError("Invalid object");
            
            const nameLenStr = buf.toString('utf-8', cursor + 2, colonIdx1);
            const nameLen = parseInt(nameLenStr, 10);
            
            const startName = colonIdx1 + 2; // skip :\"
            const className = buf.toString('utf-8', startName, startName + nameLen);
            
            const endNameQuote = buf.toString('utf-8', startName + nameLen, startName + nameLen + 2);
            if (endNameQuote !== '":') throw new UnserializeError("Invalid object class name termination");
            
            const colonIdx2 = startName + nameLen + 2;
            const bracketIdx = buf.indexOf('{', colonIdx2);
            if (bracketIdx === -1) throw new UnserializeError("Invalid object");
            
            const propLenStr = buf.toString('utf-8', colonIdx2, bracketIdx - 1);
            const propLen = parseInt(propLenStr, 10);
            
            cursor = bracketIdx + 1;
            
            const result: Record<string, any> = {};
            // Omit __className for generic stdClass to keep the JSON perfectly clean and match standard json_encode()
            if (className !== 'stdClass') {
                result['__className'] = className; 
            }
            
            for (let i = 0; i < propLen; i++) {
                const key = parse();
                const value = parse();
                
                if (typeof key !== 'string' && typeof key !== 'number') {
                    throw new UnserializeError("Invalid object property key");
                }
                
                const cleanKey = String(key).replace(/\0/g, '_');
                result[cleanKey] = value;
            }
            
            if (cursor >= buf.length || buf.toString('utf-8', cursor, cursor + 1) !== '}') {
                throw new UnserializeError("Invalid object termination");
            }
            cursor++;
            
            return result;
        }

        if (type === 'C') {
            const colonIdx1 = buf.indexOf(':', cursor + 2);
            if (colonIdx1 === -1) throw new UnserializeError("Invalid custom object");
            
            const nameLen = parseInt(buf.toString('utf-8', cursor + 2, colonIdx1), 10);
            const startName = colonIdx1 + 2; 
            const className = buf.toString('utf-8', startName, startName + nameLen);
            
            if (buf.toString('utf-8', startName + nameLen, startName + nameLen + 2) !== '":') {
                throw new UnserializeError("Invalid custom object class name termination");
            }
            
            const colonIdx2 = startName + nameLen + 2;
            const bracketIdx = buf.indexOf('{', colonIdx2);
            if (bracketIdx === -1) throw new UnserializeError("Invalid custom object");
            
            const dataLen = parseInt(buf.toString('utf-8', colonIdx2, bracketIdx - 1), 10);
            
            const startData = bracketIdx + 1;
            if (startData + dataLen > buf.length) throw new UnserializeError("Custom object data length out of bounds");
            
            const customData = buf.toString('utf-8', startData, startData + dataLen);
            
            if (buf.toString('utf-8', startData + dataLen, startData + dataLen + 1) !== '}') {
                throw new UnserializeError("Invalid custom object termination");
            }
            
            cursor = startData + dataLen + 1;
            
            return {
                __className: className,
                __customData: customData
            };
        }

        if (type === 'R' || type === 'r') {
            const semicolonIdx = buf.indexOf(';', cursor);
            if (semicolonIdx === -1) throw new UnserializeError("Invalid reference");
            const str = buf.toString('utf-8', cursor, semicolonIdx + 1);
            const match = str.match(/^[Rr]:(\d+);/);
            if (!match) throw new UnserializeError("Invalid reference format");
            cursor = semicolonIdx + 1;
            return { __php_reference: parseInt(match[1], 10) };
        }

        throw new UnserializeError(`Unknown type or invalid data at position ${cursor}`);
    }

    const result = parse();
    
    if (cursor < buf.length) {
        throw new UnserializeError(`Invalid trailing data at position ${cursor}`);
    }
    
    return result;
}
