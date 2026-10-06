import { unserialize, UnserializeError } from '../parser/phpUnserializer';

describe('PHP Unserializer', () => {
    test('unserializes null', () => {
        expect(unserialize('N;')).toBeNull();
    });

    test('unserializes booleans', () => {
        expect(unserialize('b:1;')).toBe(true);
        expect(unserialize('b:0;')).toBe(false);
    });

    test('unserializes integers', () => {
        expect(unserialize('i:123;')).toBe(123);
        expect(unserialize('i:-456;')).toBe(-456);
    });

    test('unserializes floats', () => {
        expect(unserialize('d:1.23;')).toBe(1.23);
        expect(unserialize('d:-4.56;')).toBe(-4.56);
    });

    test('unserializes strings', () => {
        expect(unserialize('s:4:"test";')).toBe("test");
        expect(unserialize('s:0:"";')).toBe("");
        expect(unserialize('s:5:"tést";')).toBe("tést"); // Multi-byte UTF-8 character length test
    });

    test('unserializes empty array', () => {
        expect(unserialize('a:0:{}')).toEqual([]);
    });

    test('unserializes list array', () => {
        expect(unserialize('a:2:{i:0;s:5:"hello";i:1;s:5:"world";}')).toEqual(["hello", "world"]);
    });

    test('unserializes associative array (object)', () => {
        expect(unserialize('a:2:{s:3:"foo";s:3:"bar";s:3:"baz";i:123;}')).toEqual({ foo: "bar", baz: 123 });
    });

    test('unserializes nested arrays', () => {
        const input = 'a:2:{s:4:"user";a:2:{s:4:"name";s:4:"John";s:3:"age";i:30;}s:6:"active";b:1;}';
        expect(unserialize(input)).toEqual({
            user: {
                name: "John",
                age: 30
            },
            active: true
        });
    });

    test('unserializes edge-case floats (INF, NAN)', () => {
        expect(unserialize('d:INF;')).toBe(Infinity);
        expect(unserialize('d:-INF;')).toBe(-Infinity);
        expect(unserialize('d:NAN;')).toBeNaN();
    });

    test('unserializes objects (O)', () => {
        const input = 'O:8:"stdClass":2:{s:5:"index";i:1;s:10:"fieldValue";s:4:"abcd";}';
        expect(unserialize(input)).toEqual({
            index: 1,
            fieldValue: "abcd"
        });

        const input2 = 'O:14:"My\\CustomClass":1:{s:3:"foo";s:3:"bar";}';
        expect(unserialize(input2)).toEqual({
            __className: "My\\CustomClass",
            foo: "bar"
        });
    });

    test('unserializes private/protected object properties properly', () => {
        // PHP protected properties start with \0*\0
        const input = 'O:11:"TestClass_A":1:{s:6:"\0*\0foo";s:3:"bar";}';
        expect(unserialize(input)).toEqual({
            __className: "TestClass_A",
            "_*_foo": "bar"
        });
    });

    test('unserializes custom objects (C)', () => {
        const input = 'C:11:"ArrayObject":21:{x:i:0;a:0:{};m:a:0:{}}';
        expect(unserialize(input)).toEqual({
            __className: "ArrayObject",
            __customData: "x:i:0;a:0:{};m:a:0:{}"
        });
    });

    test('unserializes references (R and r)', () => {
        expect(unserialize('r:2;')).toEqual({ __php_reference: 2 });
        expect(unserialize('R:5;')).toEqual({ __php_reference: 5 });
    });

    test('throws on invalid data or trailing data', () => {
        expect(() => unserialize('invalid')).toThrow(UnserializeError);
        expect(() => unserialize('s:3:"ab";')).toThrow(UnserializeError); // wrong string length
        expect(() => unserialize('a:1:{i:0;}')).toThrow(UnserializeError); // missing value for array key
        expect(() => unserialize('d:abc;')).toThrow(UnserializeError); // invalid float
        expect(() => unserialize('i:1; trailing_garbage')).toThrow(/trailing data/); // trailing data
    });
});
