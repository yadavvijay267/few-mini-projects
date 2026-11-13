const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync(__dirname + '/../src/app.js', 'utf8');
const fnSrc = src.slice(src.indexOf('function buildDocument'), src.indexOf('function run()'));
eval(fnSrc); // defines buildDocument
const doc = buildDocument('<h1>Hi</h1>', 'h1{color:red}', 'console.log("x")');
assert.ok(doc.includes('<h1>Hi</h1>'), 'HTML included');
assert.ok(doc.includes('h1{color:red}'), 'CSS included');
assert.ok(doc.includes('console.log("x")'), 'JS included');
assert.ok(doc.includes('postMessage'), 'console capture shim included');
assert.ok(doc.includes('addEventListener(\'error\''), 'error capture included');
const html = fs.readFileSync(__dirname + '/../src/index.html', 'utf8');
assert.ok(html.includes('sandbox="allow-scripts"'), 'iframe is sandboxed (no allow-same-origin)');
assert.ok(html.includes('localStorage') || src.includes('localStorage'), 'snippets saved to localStorage');
assert.ok(src.includes('#snippet='), 'share-via-URL-hash implemented');
console.log('code-playground validation tests: 8 assertions passed');
