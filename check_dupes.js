const fs = require('fs');
const path = require('path');

function findDuplicateKeys(jsonContent) {
    const stack = [];
    let lineNum = 1;
    const lines = jsonContent.split('\n');
    const duplicates = [];

    // Simple regex-based check (not perfect but good for catching simple duplicates in same object)
    // This is a heuristic. For a proper check we'd need a parser that reports key positions.

    // Alternative: use a parser that accepts a reviver and tracks keys seen at each level.
    // But standard JSON.parse reviver is called *after* parsing, so duplicates are already merged.

    // We'll walk through the text manually or use a strict parser library if available.
    // Since we don't have libraries, I'll use a regex to find all keys and see if any repeat within the same nesting level.
    // Actually, that's hard to track nesting with regex.

    // Let's use a simple approach: if a key appears more than once in the whole file, it's suspicious, 
    // but keys like "title" appear many times.
    // We need context.

    // Let's use `json-parse-even-better-errors` approach or similar logic:
    // We will tokenize the string and track object depth.

    let depth = 0;
    const keysAtDepth = {}; // { depth: Set(keys) }

    // This is too complex to write from scratch reliably in one go.
    // Let's rely on the PowerShell error: "(59): {"
    // Line 59 in ko.json is inside "theme".
    // Let's look at lines around 59 in ko.json again.

    return [];
}

// Let's use a simpler check:
// Read the file, and for each object, check if keys are unique.
// We can modify JSON.parse behavior by using a custom parser or just regexing for specific patterns.

// Actually, let's just use the fact that I can read the file and I have the content.
// I will write a script that looks for "key": ... "key": in the same block.

const content = fs.readFileSync('src/locales/ko.json', 'utf8');
const lines = content.split('\n');

console.log('--- Checking ko.json ---');
// Look for lines 44-62 (settings)
// "theme" is at 56.
// "light" 58, "dark" 59, "system" 60.

// Is it possible "theme" appears twice in "settings"?
// Or "settings" appears twice?

// Let's do a basic scan for all keys that appear and print their line numbers.
// Not perfect but helps.

const keyRegex = /"([^"]+)":/g;
let match;
const allKeys = [];
while ((match = keyRegex.exec(content)) !== null) {
    const { index } = match;
    const line = content.substring(0, index).split('\n').length;
    allKeys.push({ key: match[1], line });
}

// We can't easily detect structure, but we can look for specific keys mentioned in the error or around line 59.
// PowerShell error mentioned line 59.
// But it also said "DuplicateKeysInJsonString".

// Let's try to parse with a strict regex parser for just that section.
