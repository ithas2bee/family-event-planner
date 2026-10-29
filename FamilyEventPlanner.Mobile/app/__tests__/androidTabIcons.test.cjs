const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const iconSymbolSource = fs.readFileSync(
  path.resolve(process.cwd(), 'components/ui/icon-symbol.tsx'),
  'utf8',
);
const tabLayoutSource = fs.readFileSync(
  path.resolve(process.cwd(), 'app/(tabs)/(main)/_layout.tsx'),
  'utf8',
);

test('every visible bottom tab symbol has an Android MaterialIcons fallback', () => {
  const mapping = iconSymbolSource.match(/const MAPPING = \{([\s\S]*?)\} as IconMapping/)?.[1];
  assert.ok(mapping, 'Android icon mapping should be defined');

  const mappedSymbols = new Set(
    [...mapping.matchAll(/['"]?([\w.]+)['"]?\s*:\s*'[^']+'/g)].map(([, symbol]) => symbol),
  );
  const tabSymbols = [...tabLayoutSource.matchAll(/<IconSymbol[^>]*name="([^"]+)"/g)].map(
    ([, symbol]) => symbol,
  );

  assert.ok(tabSymbols.length > 0, 'bottom tab icons should be configured');
  for (const symbol of tabSymbols) {
    assert.ok(mappedSymbols.has(symbol), `${symbol} should have an Android fallback`);
  }
});
