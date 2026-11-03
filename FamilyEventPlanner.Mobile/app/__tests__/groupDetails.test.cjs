const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = process.cwd();
const myGroupsSource = fs.readFileSync(path.join(mobileRoot, 'components/my-groups-screen.tsx'), 'utf8');
const allGroupsSource = fs.readFileSync(path.join(mobileRoot, 'components/all-groups-screen.tsx'), 'utf8');
const detailsSource = fs.readFileSync(path.join(mobileRoot, 'app/group/[groupId].tsx'), 'utf8');
const detailsService = fs.readFileSync(path.join(mobileRoot, 'services/groupDetailsService.ts'), 'utf8');
const membershipRequestController = fs.readFileSync(
  path.resolve(mobileRoot, '../FamilyEventPlanner.Api/Controllers/FamilyGroupsController.cs'),
  'utf8',
);
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
  const openGroupHandler = myGroupsSource.match(/const handleOpenGroup = useCallback\([\s\S]*?\n  \);/)?.[0] ?? '';
  assert.doesNotMatch(openGroupHandler, /setActiveGroup/);
  const allGroupsOpenHandler = allGroupsSource.match(/const openGroup = useCallback\([\s\S]*?\n  \);/)?.[0] ?? '';
  assert.doesNotMatch(allGroupsOpenHandler, /setActiveGroup/);
});

test('Group Management confirms a focused active-to-viewed group transition', () => {
  assert.match(detailsSource, /accessibilityLabel=\{switchGroupOpen \? 'Cancel group switch' : 'Switch Group'\}/);
  assert.match(detailsSource, /Current Active Group/);
  assert.match(detailsSource, /Switching to/);
  assert.match(detailsSource, /Confirm Switch to \$\{details\.groupName\}/);
  assert.doesNotMatch(detailsSource, /familygroups\/my\/\$\{session\.userId\}/);
  const detailsLoader = detailsSource.match(/const loadDetails = useCallback\([\s\S]*?\n  \}, \[[^\]]*\]\);/)?.[0] ?? '';
  assert.doesNotMatch(detailsLoader, /setActiveGroup/);
  const switchHandler = detailsSource.match(/async function confirmGroupSwitch\([\s\S]*?\n  \}/)?.[0] ?? '';
  assert.match(switchHandler, /setActiveGroup/);
  assert.match(switchHandler, /setSwitchGroupOpen\(false\)/);
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
  assert.match(detailsSource, /Alert\.alert\(/);
  assert.match(detailsSource, /text: 'Cancel'/);
  assert.match(detailsSource, /member\.memberId !== currentMemberId/);
  assert.match(detailsSource, /accessibilityRole="status" style={styles\.success}/);
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

test('Join requests are available only to community admins and support reviewed decisions', () => {
  assert.match(detailsSource, /details\.isAdmin && details\.accessMode === 'CommunitySearchableRequestToJoin'/);
  assert.match(detailsSource, /Join Requests · \{joinRequests\.length\}/);
  assert.match(detailsSource, /No pending requests\./);
  assert.match(detailsSource, /Requesting to join/);
  assert.match(detailsSource, /confirmMembershipRequest/);
  assert.match(detailsSource, /Approve/);
  assert.match(detailsSource, /Reject/);
  assert.match(detailsService, /getPendingMembershipRequests/);
  assert.match(detailsService, /processMembershipRequest/);
  assert.match(membershipRequestController, /Authorize\(AuthenticationSchemes = "MemberId"\)[\s\S]*?HttpGet\("\{id\}\/membership-requests"\)/);
  assert.match(membershipRequestController, /request\.Status = "Approved"[\s\S]*?IsAdmin = false/);
  assert.match(membershipRequestController, /request\.Status = "Rejected"/);
  assert.match(membershipRequestController, /request\.Status != "Pending"/);
});
