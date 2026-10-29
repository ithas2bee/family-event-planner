const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { getRoutes } = require('expo-router/build/getRoutes');
const { getNavigationConfig } = require('expo-router/build/getLinkingConfig');
const { getStateFromPath } = require('expo-router/build/link/linking');
const COMMUNITY_HOME_ROUTES = require('../../constants/communityHomeRoutes.json');

const appDirectory = path.resolve(process.cwd(), 'app');
const routeKeys = [];

function collectRouteFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectRouteFiles(filePath);
    } else if (/\.[jt]sx?$/.test(entry.name)) {
      routeKeys.push(`./${path.relative(appDirectory, filePath).split(path.sep).join('/')}`);
    }
  }
}

collectRouteFiles(appDirectory);

const routeContext = Object.assign(() => ({ default: () => null }), {
  keys: () => routeKeys,
  resolve: (key) => key,
  id: 'app',
});
const routeTree = getRoutes(routeContext, {
  internal_stripLoadRoute: true,
  ignoreEntryPoints: true,
  platform: 'android',
});
const linkingConfig = getNavigationConfig(routeTree, true, { sitemap: false, notFound: false });

function activeRouteNames(state) {
  const names = [];
  let currentState = state;
  while (currentState?.routes?.length) {
    const route = currentState.routes[currentState.index ?? 0];
    names.push(route.name);
    currentState = route.state;
  }
  return names;
}

function findRouteNode(node, contextKey) {
  if (node.contextKey === contextKey) return node;
  for (const child of node.children ?? []) {
    const match = findRouteNode(child, contextKey);
    if (match) return match;
  }
  return undefined;
}

test('Community Home destinations resolve to root Stack screens, not hidden tabs or Home', () => {
  for (const [screen, href] of Object.entries({
    members: COMMUNITY_HOME_ROUTES.members,
    announcements: COMMUNITY_HOME_ROUTES.announcements,
    polls: COMMUNITY_HOME_ROUTES.polls,
  })) {
    const state = getStateFromPath(href, linkingConfig);
    assert.ok(state, `${href} should resolve in Expo Router`);
    assert.deepEqual(activeRouteNames(state), ['__root', screen]);
    assert.ok(findRouteNode(routeTree, `./${screen}.tsx`), `Missing root route file for ${href}`);
  }
});

test('Announcement and poll details resolve to their registered root routes', () => {
  for (const [href, routeFile, routeName] of [
    ['/announcement/example-id', './announcement/[announcementId].tsx', 'announcement/[announcementId]'],
    ['/poll/example-id', './poll/[pollId].tsx', 'poll/[pollId]'],
  ]) {
    const state = getStateFromPath(href, linkingConfig);
    assert.ok(state, `${href} should resolve in Expo Router`);
    assert.deepEqual(activeRouteNames(state), ['__root', routeName]);
    assert.ok(findRouteNode(routeTree, routeFile), `Missing route file for ${href}`);
  }
});

test('The Home destination remains a registered tab', () => {
  const mainTabs = findRouteNode(routeTree, './(tabs)/(main)/_layout.tsx');
  assert.ok(mainTabs?.children.some((route) => route.route === 'family-home'));
});
