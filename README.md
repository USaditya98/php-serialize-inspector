# PHP Serialize Inspector

A powerful, native Visual Studio Code extension to instantly decode, inspect, search, and safely format raw PHP serialized strings right inside your editor!

Stop using shady online un-serializers or writing one-off PHP scripts just to view database payloads, Laravel queue jobs, or cached sessions. 

---

## 🚀 Features at a Glance

- **Blazing Fast Decoding**: Instantly parse standard `a:2:{...}` strings or Auto-Detect **Base64 encoded** payloads (`YTo...`) from Laravel/WordPress!
- **Interactive Payload Explorer (Sidebar)**: Explore massive decoded arrays through a native, expandable Visual Tree directly in your VS Code Activity Bar!
- **Deep Extraction Engine**: Query massive database payloads using a mini-syntax (e.g., `index, fieldValue=Yes --dedupe`).
- **Visual Diffing**: Highlight two separate serialized strings and instantly launch a native VS Code Visual Diff to see what changed!
- **Native Syntax Highlighting**: Rename files to `.phpser` (or select "PHP Serialized" in the corner) to get beautiful colors for raw serialized strings.
- **Bi-Directional**: Convert a PHP payload to JSON, edit it, and use the **Re-Serialize** command to turn it back into a valid PHP serialized string!
- **10+ Formatting Modes**: View decoded data as JSON, PHP Array, `var_export()`, JS/TS, YAML, XML, or an ASCII Pretty Tree!

---

## 📖 How to Use the Tools

### 1. The Core: `PHP: Unserialize`
1. Highlight any PHP serialized string (or a JSON block) in your editor.
2. Right-click and choose **PHP: Unserialize** (or use the Command Palette).
3. The extension instantly decodes it.
4. If your default format is set to "Ask", a dropdown will let you choose your output format (JSON, PHP Array, etc.). Press Enter, and a new tab opens with your formatted data!

### 2. The Sidebar: `Payload Explorer`
1. Open your VS Code Activity Bar on the far left. Click the new **PHP Serialize Icon**.
2. Run the `PHP: Unserialize` command on any payload.
3. The Payload Explorer sidebar will instantly populate with an interactive folder tree! You can expand/collapse arrays and objects without leaving your current file.

### 3. Deep Data Mining: `PHP: Extract Key from Payload`
Got a 10MB database dump and only need the email addresses of active users? 
1. Highlight the payload and run **PHP: Extract Key from Payload**.
2. An input box will appear. You can type a simple key (`email`) or use advanced query syntax!
3. **Mini Query Syntax**:
   - **Multiple Keys**: `id, email, phone`
   - **Nested Paths**: `customer.address.city`
   - **Value Filters**: `status=active`, `age>18`, `type!=admin`
   - **Power Flags**: 
     - `--path` (Injects exactly where the object was found in the tree)
     - `--dedupe` (Removes duplicate result blocks)
     - `--limit 100` (Halts the deep scan after 100 matches)
     - `--exact` / `--level` (Constrains search recursion depth)
   
*Example Input:* `id, form.fieldValue=Yes --path --dedupe --limit 500`

### 4. Code Comparison: `PHP: Compare Serialized Strings (Diff)`
Need to figure out what changed in a user's session payload?
1. Hold `Alt` (or `Option`) and highlight the **first** serialized string.
2. Keep holding `Alt` and highlight the **second** serialized string. (You now have two cursors active).
3. Right-click and run **PHP: Compare Serialized Strings (Diff)**.
4. VS Code's native Split-Diff view will open, showing you exactly what changed inside the parsed objects!

### 5. Editing: `PHP: Re-Serialize JSON to PHP`
1. Got a JSON file you want to put into a PHP database?
2. Open the JSON file, right-click, and run **PHP: Serialize JSON to PHP String**.
3. It will generate a perfectly byte-counted `a:X:{...}` string ready for your database!

---

## 🧪 Bulletproof & Tested

PHP Serialize Inspector is built to handle the wildest payloads you can throw at it. It comes packed with a robust automated Jest test suite covering:
- Complex multibyte Unicode string counting
- Circular references
- Custom Serializable payloads (`C:`)
- Deep recursive query engine logic (Value filtering, deduplication, path generation)
- Huge payloads spanning thousands of lines.

---

## 🛠 Installation

Since this extension is heavily updated on GitHub, you can always grab the latest release manually:

1. Navigate to the [Releases page](https://github.com/USaditya98/php-serialize-inspector/releases) on this GitHub repository.
2. Download the latest `php-serialize-inspector-x.x.x.vsix` file from the **Assets** section.
3. Open Visual Studio Code.
4. Go to the **Extensions** tab (`Ctrl+Shift+X` / `Cmd+Shift+X`).
5. Click the `...` (Views and More Actions) menu in the top right of the Extensions panel.
6. Select **Install from VSIX...**
7. Select the downloaded `.vsix` file and you are ready to go!

---
*Created by [USaditya98](https://github.com/USaditya98)*
