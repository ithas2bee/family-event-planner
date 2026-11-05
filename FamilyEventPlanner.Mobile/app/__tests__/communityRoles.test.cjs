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
const profileScreen = source('app/profile.tsx');
const editProfileScreen = source('app/edit-profile.tsx');
const profileService = source('services/profileService.ts');
const membersScreen = source('components/members-screen.tsx');

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
  assert.match(rolesScreen, /customRoleCount} of 4/);
  assert.match(rolesScreen, /!role\.isDefault/);
});

test('Profile editing loads, groups, toggles, and persists each community role selection', () => {
  assert.match(editProfileScreen, /profile\.communities\.map/);
  assert.match(editProfileScreen, /community\.availableRoles/);
  assert.match(editProfileScreen, /accessibilityState=\{\{ selected \}\}/);
  assert.match(editProfileScreen, /communityRoles: profile\.communities\.map/);
  assert.match(profileService, /selectedRoleIds\?: string\[\]/);
  assert.match(profileService, /communityRoles: \{ groupId: string; roleIds: string\[\] \}\[\]/);
});

test('Community members can open read-only profiles with roles grouped by community', () => {
  assert.match(membersScreen, /pathname: '\/profile'/);
  assert.match(profileService, /getCommunityMemberProfile/);
  assert.match(profileScreen, /getCommunityMemberProfile\(groupId, memberId\)/);
  assert.match(profileScreen, /profile\.communities\.map/);
  assert.match(profileScreen, /\{canEdit && \(/);
});
