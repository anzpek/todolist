const fs = require('fs');
const content = fs.readFileSync('src/contexts/TodoContext.tsx', 'utf8');

// Regex to find potential object literals
// We look for patterns where the same key appears multiple times in what looks like the same object context.
// This is very hard with regex. 

// However, often duplicate keys are copy-paste errors like:
// const foo = {
//   bar: 1,
//   bar: 2
// }

// We can scan line by line and track indentation to guess objects.
const lines = content.split('\n');
const keyStack = []; // Stack of sets of keys for each indentation level

lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) return;

    // Detect indentation
    const indent = line.search(/\S/);
    if (indent === -1) return;

    // simplistic: if line ends with {, push new set
    // if line starts with }, pop

    // Look for "key:" or "key," or "key" (shorthand)
    // Matches:  key: value,
    //           key,

    const match = trimmed.match(/^([\w]+)\s*[:(]/);
    if (match) {
        // It looks like a property definition
        const key = match[1];
        // We need to know which object we are in.
        // This is too complex for regex.
    }
});

console.log("Starting simple scan for obvious duplicates...");

// Let's try to parse with a relaxed JSON parser or just find text occurrences.
// Actually, let's search for specific keys that commonly cause this:
// "completedAt", "updatedAt", "id", "completed"

const commonKeys = ['completed', 'completedAt', 'updatedAt', 'date', 'id', 'order', 'title'];

// We can just try to run babel parser?
// We need to install it.
// Let's trying installing @babel/parser and run a real check.

console.log("To find duplicates reliably, installing @babel/parser...");
