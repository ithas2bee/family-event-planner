const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = (relativePath) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const detailsSource = source('app/group/[groupId].tsx');
const eventDetailsSource = source('app/event/[eventId].tsx');
const rolesScreen = source('app/group-roles.tsx');
const rolesService = source('services/groupDetailsService.ts');
const membersService = source('services/groupMemberService.ts');

test('Community role choices load and save against the current community membership', () => {
  assert.match(rolesScreen, /getCommunityRoles\(groupId\)/);
  assert.match(rolesScreen, /updateGroupMemberRole\(groupId, memberId, roleId\)/);
  assert.match(rolesScreen, /selectedRoleId === role\.id/);
  assert.match(membersService, /roleName\?: string \| null/);
  assert.match(detailsSource, /member\.roleName/);
  assert.match(eventDetailsSource, /member\.roleName/);
  assert.match(eventDetailsSource, /memberRoles\.get\(assignment\.memberId\)/);
  assert.match(rolesService, /Authorization: \['Bearer', session\.authToken\]\.join\(' '\)/);
});

test('Only server-authorized community administrators see role customization controls', () => {
  assert.match(rolesScreen, /details\.isAdmin \? \(/);
  assert.match(rolesScreen, /createCommunityRole\(groupId, name\)/);
  assert.match(rolesScreen, /updateCommunityRole\(groupId, editingRoleId, name\)/);
  assert.match(rolesScreen, /deactivateCommunityRole\(groupId, role\.id\)/);
  assert.match(rolesScreen, /restoreCommunityRoleDefaults\(groupId\)/);
  assert.match(rolesService, /\/roles\/defaults/);
});

test('Profile editing no longer offers a universal family role list', () => {
  assert.doesNotMatch(source('services/profileService.ts'), /PROFILE_ROLES|Mom|Grandparent/);
  assert.doesNotMatch(source('app/edit-profile.tsx'), /PROFILE_ROLES|Roles/);
  assert.doesNotMatch(source('app/profile.tsx'), /profile\.roles/);
});
