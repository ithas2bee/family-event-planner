const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(process.cwd());
const ignoredDirectories = new Set(['.expo', 'dist', 'node_modules']);

function collectTypeScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectTypeScriptFiles(entryPath);
    }

    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  });
}

test('all mobile TypeScript and TSX files parse without syntax errors', () => {
  const parseErrors = collectTypeScriptFiles(projectRoot).flatMap((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const file = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
    return file.parseDiagnostics.map((diagnostic) => {
      const location = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      const line = location ? location.line + 1 : 1;
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      return `${path.relative(projectRoot, filePath)}:${line}: ${message}`;
    });
  });

  assert.deepEqual(parseErrors, []);
});
