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

test('community content deletion screens and services have no TypeScript diagnostics', () => {
  const configPath = path.join(projectRoot, 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(configFile.error, undefined, 'mobile TypeScript configuration should load');

  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectRoot);
  const checkedFiles = [
    'app/announcement/[announcementId].tsx',
    'app/event/[eventId].tsx',
    'app/kickback/[kickbackId].tsx',
    'app/poll/[pollId].tsx',
    'components/community-delete-button.tsx',
    'services/announcementService.ts',
    'services/communityContentDeletion.ts',
    'services/communityContentService.ts',
    'services/eventService.ts',
    'services/groupMemberService.ts',
    'services/kickbackService.ts',
    'services/pollService.ts',
  ].map((file) => path.join(projectRoot, file));
  const checkedFileSet = new Set(checkedFiles);
  const program = ts.createProgram({
    rootNames: checkedFiles,
    options: { ...config.options, noEmit: true },
  });
  const errors = ts.getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.file && checkedFileSet.has(diagnostic.file.fileName))
    .map((diagnostic) => {
      const location = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      return `${path.relative(projectRoot, diagnostic.file.fileName)}:${location.line + 1}: ${message}`;
    });

  assert.deepEqual(errors, []);
});
