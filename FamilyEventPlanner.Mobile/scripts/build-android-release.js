const { spawnSync } = require('node:child_process');
const path = require('node:path');

const mobileDirectory = path.dirname(require.resolve('../package.json'));
const androidDirectory = path.join(mobileDirectory, 'android');
const gradleWrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

const result = spawnSync(gradleWrapper, ['assembleRelease'], {
  cwd: androidDirectory,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
