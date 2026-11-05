const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (file) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const editProfileSource = read('app/edit-profile.tsx');
const profileSource = read('app/profile.tsx');
const profileServiceSource = read('services/profileService.ts');

test('Edit Profile retains the existing photo display without a photo URL field', () => {
  assert.match(editProfileSource, /profile\.profilePictureUrl\s*\?\s*<Image/);
  assert.doesNotMatch(editProfileSource, /photoUrl|Profile photo URL|https:\/\/\.\.\./i);
});

test('Saving other profile changes retains the loaded profile photo URL', () => {
  assert.match(editProfileSource, /profilePictureUrl:\s*profile\.profilePictureUrl/);
  assert.match(profileServiceSource, /profilePictureUrl:\s*string\s*\|\s*null/);
  assert.match(profileSource, /profile\.profilePictureUrl\s*\?\s*\(/);
});

test('Edit Profile continues saving the remaining profile fields', () => {
  for (const field of ['name', 'age', 'location', 'bio']) {
    assert.match(editProfileSource, new RegExp(`${field}:`));
  }
  assert.doesNotMatch(editProfileSource, /PROFILE_ROLES|setRoles/);
  assert.doesNotMatch(profileServiceSource, /PROFILE_ROLES/);
  assert.match(editProfileSource, /await updateProfile\(\{/);
  assert.match(editProfileSource, /communityRoles: profile\.communities\.map/);
  assert.match(editProfileSource, /selectedRoles\[community\.groupId\]/);
});
