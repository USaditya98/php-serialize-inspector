# PHP Serialize Inspector

A powerful, native Visual Studio Code extension to instantly decode, inspect, and safely format raw PHP serialized strings right inside your editor!

Stop using shady online un-serializers or writing one-off PHP scripts just to view database payloads, Laravel queue jobs, or cached sessions. 

## Features

- **Blazing Fast Decoding**: Instantly highlight any PHP serialized string (like `a:2:{...}`) and run the `PHP: Unserialize` command.
- **10+ Live Formatting Modes**: Choose exactly how you want to view the data:
  - 🌟 **Pretty Tree**: An intuitive ASCII visual tree for deep objects.
  - 🐘 **PHP Array & var_export()**: Instantly generate copy-pasteable PHP code.
  - 📜 **JSON (Formatted/Minified)**: Standard strict JSON representation.
  - 🟨 **JavaScript/TypeScript**: Perfect objects ready for frontend use.
  - 📋 **YAML & XML**: Highly readable markup conversions.
- **Live Preview**: Arrow through the format selector and watch the editor update instantly in real-time.
- **Auto-Language Switching**: Automatically applies the correct syntax highlighting (JSON, PHP, TS, YAML) upon generation.
- **Zero Remote Execution**: Everything is parsed securely in-memory right inside VS Code. No data is ever sent to external servers.
- **Bulletproof Architecture**: Flawlessly handles circular references, nested objects, Custom Serializable payloads (`C:`), and multibyte Unicode strings.

## Usage

1. Open any file in VS Code containing a PHP serialized string.
2. Select/Highlight the string.
3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and select **`PHP: Unserialize`**.
4. Choose your desired output format from the live preview dropdown.
5. Press `Enter` to instantly apply it and copy it to your clipboard!

*(Pro-Tip: Assign a custom Keyboard Shortcut to `PHP: Unserialize` in the Keyboard Shortcuts menu for instant access!)*

## Installation

Search for **PHP Serialize Inspector** in the VS Code Extensions panel, or grab the latest `.vsix` release from GitHub.

---
*Created by [USaditya98](https://github.com/USaditya98)*
