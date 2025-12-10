const fs = require('fs');

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let index = 0;
    let line = 1;
    let col = 1;

    function error(msg) {
        console.error(`Error in ${filePath} at line ${line}:${col} - ${msg}`);
        // process.exit(1); 
        // Don't exit, try to find more
    }

    function next() {
        const ch = content[index];
        if (ch === '\n') {
            line++;
            col = 1;
        } else {
            col++;
        }
        index++;
        return ch;
    }

    function skipWhitespace() {
        while (index < content.length) {
            const ch = content[index];
            if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
                next();
            } else {
                break;
            }
        }
    }

    function parseString() {
        skipWhitespace();
        if (content[index] !== '"') return null;
        next(); // skip "
        let str = '';
        while (index < content.length) {
            const ch = content[index];
            if (ch === '"') {
                next(); // skip closing "
                return str;
            }
            if (ch === '\\') {
                next();
                if (index < content.length) {
                    const esc = next();
                    // handle basic escapes if needed, for key matching we just need unique string
                    str += '\\' + esc;
                }
            } else {
                str += next();
            }
        }
        return null;
    }

    function parseObject() {
        skipWhitespace();
        if (content[index] !== '{') return;
        next(); // skip {

        const keys = new Set();

        while (index < content.length) {
            skipWhitespace();
            if (content[index] === '}') {
                next(); // skip }
                return;
            }

            const key = parseString();
            if (!key) {
                // strict check failed or empty object
                if (content[index] === '}') {
                    next(); return;
                }
                next(); // skip char to avoid infinite loop
                continue;
            }

            const lowerKey = key.toLowerCase();
            if (keys.has(lowerKey)) {
                error(`Duplicate key found (case-insensitive): "${key}" (conflicts with existing key)`);
            }
            keys.add(lowerKey);

            skipWhitespace();
            if (content[index] !== ':') {
                // error('Expected :');
            } else {
                next(); // skip :
            }

            parseValue();

            skipWhitespace();
            if (content[index] === ',') {
                next();
            } else if (content[index] !== '}') {
                // error('Expected , or }');
            }
        }
    }

    function parseArray() {
        skipWhitespace();
        if (content[index] !== '[') return;
        next();
        while (index < content.length) {
            skipWhitespace();
            if (content[index] === ']') {
                next();
                return;
            }
            parseValue();
            skipWhitespace();
            if (content[index] === ',') {
                next();
            } else if (content[index] !== ']') {
                // error
            }
        }
    }

    function parseValue() {
        skipWhitespace();
        const ch = content[index];
        if (ch === '{') parseObject();
        else if (ch === '[') parseArray();
        else if (ch === '"') parseString();
        else {
            // number, true, false, null - skip until , or } or ]
            while (index < content.length) {
                const c = content[index];
                if (c === ',' || c === '}' || c === ']' || c === ' ' || c === '\n' || c === '\r') break;
                next();
            }
        }
    }

    parseValue(); // Start parsing root
    console.log(`Finished checking ${filePath}`);
}

checkFile('src/locales/ko.json');
checkFile('src/locales/en.json');
