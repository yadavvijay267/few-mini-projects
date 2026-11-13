// Validation tests for the form builder (runs in Node, no DOM needed for logic).
// Extracts validateField from app.js by stubbing the DOM-dependent parts.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../src/app.js', 'utf8');
// validateField is a pure function defined before any DOM use at load time is guarded:
// instead, re-implement the import by evaluating only the function definition.
const fnSrc = src.slice(src.indexOf('function validateField'), src.indexOf('function renderPreview'));
eval(fnSrc); // defines validateField
const assert = require('assert');
assert.strictEqual(validateField({ required: true, validation: {} }, ''), 'This field is required.');
assert.strictEqual(validateField({ required: false, validation: {} }, ''), '');
assert.strictEqual(validateField({ required: false, validation: { minLength: 3 } }, 'ab'), 'Minimum 3 characters.');
assert.strictEqual(validateField({ required: false, validation: { maxLength: 3 } }, 'abcd'), 'Maximum 3 characters.');
assert.strictEqual(validateField({ required: false, validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' } }, 'not-an-email'), 'Value does not match the required format.');
assert.strictEqual(validateField({ required: false, validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' } }, 'a@b.co'), '');
assert.ok(src.includes('dragstart') && src.includes('exportStandaloneHtml'), 'drag-and-drop + standalone export present');
assert.ok(fs.existsSync(__dirname + '/../src/index.html'), 'index.html exists');
console.log('form-builder validation tests: 8 assertions passed');
