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

test('Create hub gives card titles enough room on compact screens', () => {
  assert.match(createHubSource, /const \{ width \} = useWindowDimensions\(\);/);
  assert.match(createHubSource, /const isCompact = width < 380;/);
  assert.match(createHubSource, /isCompact && styles\.compactCard/);
  assert.match(createHubSource, /isCompact && styles\.compactIconContainer/);
  assert.match(createHubSource, /isCompact && styles\.compactCardTitle/);
  assert.match(createHubSource, /isCompact && styles\.compactArrowContainer/);
  assert.match(createHubSource, /compactCardTitle: \{\s*fontSize: 18,\s*lineHeight: 23,\s*\}/);
  assert.match(createHubSource, /compactCard: \{\s*padding: 14,\s*gap: 10,\s*\}/);
  assert.match(createHubSource, /compactIconContainer: \{\s*width: 64,\s*height: 64,/);
  assert.match(createHubSource, /compactArrowContainer: \{\s*width: 36,\s*height: 36,/);
});
