const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = process.cwd();
const myGroupsSource = fs.readFileSync(path.join(mobileRoot, 'components/my-groups-screen.tsx'), 'utf8');
const detailsSource = fs.readFileSync(path.join(mobileRoot, 'app/group/[groupId].tsx'), 'utf8');
const detailsService = fs.readFileSync(path.join(mobileRoot, 'services/groupDetailsService.ts'), 'utf8');
const groupController = fs.readFileSync(
  path.resolve(mobileRoot, '../FamilyEventPlanner.Api/Controllers/FamilyGroupsController.cs'),
  'utf8',
);
const memberController = fs.readFileSync(
  path.resolve(mobileRoot, '../FamilyEventPlanner.Api/Controllers/GroupMembersController.cs'),
  'utf8',
);

test('My Groups lists each group and opens its direct details route', () => {
  assert.match(myGroupsSource, /groups\.map\(\(group\)/);
  assert.match(myGroupsSource, /pathname: '\/group\/\[groupId\]'/);
  assert.match(myGroupsSource, /isAdmin: entry\.isAdmin === true/);
});

test('Group Management allows direct switching and identifies the current group', () => {
  assert.match(detailsSource, /accessibilityLabel=\{switchGroupOpen \? 'Hide groups' : 'Switch Group'\}/);
  assert.match(detailsSource, /familygroups\/my\/\$\{session\.userId\}/);
  assert.match(detailsSource, /Current group/);
  assert.match(detailsSource, /group\.groupId === groupId/);
  assert.match(detailsSource, /router\.replace\(\{[\s\S]*pathname: '\/group\/\[groupId\]'/);
  assert.match(detailsSource, /groupName: group\.groupName/);
  assert.match(detailsSource, /memberId,[\s\S]*?\}\);\s*router\.replace/);
});

test('Group details show immutable group identity and gate management controls to admins', () => {
  assert.match(detailsSource, /Community type/);
  assert.match(detailsSource, /Group name/);
  assert.match(detailsSource, /Group Management · Admin/);
  assert.match(detailsSource, /Group Details/);
  assert.match(detailsSource, /details\.isAdmin \? \(/);
  assert.match(detailsSource, /Admin Controls/);
  assert.match(detailsSource, /Manage Admins/);
  assert.match(detailsSource, /Edit description/);
  assert.match(detailsSource, /Invite Only \+ Not Searchable/);
  assert.match(detailsSource, /Invite Only \+ Searchable/);
  assert.match(detailsSource, /Community \+ Searchable \+ Request to Join/);
  assert.match(detailsSource, /Save Group Access/);
  assert.match(detailsSource, /Only admin/);
  assert.match(detailsSource, /Group name and community type are set at creation/);
  assert.doesNotMatch(detailsSource, /Group Access (?:is )?set at creation|Group Access cannot be changed/);
  assert.match(detailsSource, /Make admin/);
  assert.match(detailsSource, /accessibilityLabel="Group description"/);
  assert.doesNotMatch(detailsSource, /accessibilityLabel="Group name"|accessibilityLabel="Community type"/);
});

test('Group management APIs require group membership and enforce admin-only updates', () => {
  assert.match(groupController, /HttpGet\("\{id\}"\)[\s\S]*?Authorize\(AuthenticationSchemes = "MemberId"\)/);
  assert.match(groupController, /if \(!member\.IsAdmin\)\s+return Forbid\(\);/);
  assert.match(groupController, /group\.Description =/);
  assert.match(memberController, /if \(caller == null \|\| !caller\.IsAdmin\)\s+return Forbid\(\);/);
  assert.match(memberController, /isAdmin = m\.IsAdmin/);
  assert.match(detailsService, /\/description/);
  assert.match(detailsService, /\/admin/);
});
