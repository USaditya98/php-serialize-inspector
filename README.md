# PHP Serialize Inspector

A lightweight, secure, and fast VS Code extension that safely parses and formats PHP serialized strings directly in your editor into beautifully formatted JSON. 

## Features

- Safely parses strings without `eval()` or native PHP bindings.
- Handles nested arrays, floats, multibyte strings, booleans, and nulls.
- 100% locally executed inside VS Code.

## Usage
1. Select a PHP serialized string anywhere in your editor.
2. Open the Command Palette (`Ctrl+Shift+P`).
3. Run `PHP: Unserialize`.
