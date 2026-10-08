const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appPath = path.resolve(process.cwd(), 'app');
const readAppFile = (file) => fs.readFileSync(path.join(appPath, file), 'utf8');

test('community content deletion requires an explicit destructive confirmation', () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), 'services/communityContentDeletion.ts'),
    'utf8',
  );

  assert.match(source, /text: 'Cancel', style: 'cancel'/);
  assert.match(source, /text: 'Delete',\s+style: 'destructive'/);
  assert.match(source, /onPress: async \(\) => \{\s+onDeleting\(true\);\s+try \{\s+await onDelete\(\);/);
  assert.match(source, /cannot be undone/i);
});

test('all four mobile delete services use the shared DELETE request', () => {
  const requestSource = fs.readFileSync(
    path.resolve(process.cwd(), 'services/communityContentService.ts'),
    'utf8',
  );
  assert.match(requestSource, /method: 'DELETE'/);
  assert.match(requestSource, /\/api\/\$\{contentType\}\/\$\{contentId\}/);

  for (const [service, method, contentType] of [
    ['eventService.ts', 'deleteEvent', 'events'],
    ['kickbackService.ts', 'deleteKickback', 'kickbacks'],
    ['pollService.ts', 'deletePoll', 'polls'],
    ['announcementService.ts', 'deleteAnnouncement', 'announcements'],
  ]) {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'services', service), 'utf8');
    assert.match(source, new RegExp(`export async function ${method}`));
    assert.match(source, new RegExp(`deleteCommunityContent\\('${contentType}'`));
  }
});

test('all content detail screens gate deletion actions on group admin status', () => {
  const screens = [
    ['event/[eventId].tsx', 'Event'],
    ['kickback/[kickbackId].tsx', 'Kickback'],
    ['poll/[pollId].tsx', 'Poll'],
    ['announcement/[announcementId].tsx', 'Announcement'],
  ];

  for (const [screen, contentName] of screens) {
    const source = readAppFile(screen);
    assert.match(source, /isAdmin \?/);
    assert.match(source, new RegExp(`CommunityDeleteButton contentName="${contentName}"`));
    assert.match(source, /confirmCommunityContentDeletion/);
  }
});

test('announcement details are reloaded by ID so deleted announcements return not found', () => {
  const service = fs.readFileSync(
    path.resolve(process.cwd(), 'services/announcementService.ts'),
    'utf8',
  );
  const screen = readAppFile('announcement/[announcementId].tsx');

  assert.match(service, /getAnnouncementById/);
  assert.match(service, /Announcement not found\./);
  assert.match(screen, /getAnnouncementById\(String\(announcementId\)\)/);
});

test('kickback, poll, and announcement lists reload when they regain focus', () => {
  for (const screen of ['kickbacks.tsx', 'polls.tsx', '../components/announcements-screen.tsx']) {
    const basePath = screen.startsWith('../') ? path.resolve(appPath, screen) : path.join(appPath, screen);
    assert.match(fs.readFileSync(basePath, 'utf8'), /useFocusEffect\(useCallback/);
  }
});
