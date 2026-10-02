const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const createHubSource = fs.readFileSync(
  path.resolve(process.cwd(), 'components/create-hub.tsx'),
  'utf8',
);

test('Create hub content starts below the device top safe area', () => {
  assert.match(createHubSource, /import \{ SafeAreaView \} from 'react-native-safe-area-context'/);
  assert.match(
    createHubSource,
    /<SafeAreaView style=\{styles\.screen\} edges=\{\['top'\]\}>[\s\S]*<ScrollView[\s\S]*<\/ScrollView>\s*<\/SafeAreaView>/,
  );
});

test('Create hub keeps its existing content and card spacing', () => {
  assert.match(createHubSource, /paddingTop: 28/);
  assert.match(createHubSource, /paddingBottom: 26/);
  assert.match(createHubSource, /minHeight: 148/);
  assert.match(createHubSource, /gap: 16/);
});
