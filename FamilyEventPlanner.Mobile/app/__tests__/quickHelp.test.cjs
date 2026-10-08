const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (file) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const helpSource = read('app/help-support.tsx');
const quickHelpSource = read('app/quick-help/[section].tsx');
const feedbackSource = read('app/feedback.tsx');
const supportServiceSource = read('services/supportService.ts');
const layoutSource = read('app/_layout.tsx');
const homeSource = read('app/family-home.tsx');

test('Help & Support opens each registered Quick Help section', () => {
  for (const section of ['faqs', 'how-to-guides', 'tips-best-practices']) {
    assert.ok(helpSource.includes(`section: '${section}'`), `Missing Help & Support link for ${section}`);
    assert.match(helpSource, /pathname: '\/quick-help\/\[section\]'/);
  }
  assert.match(layoutSource, /Stack\.Screen name="quick-help\/\[section\]" options=\{\{ headerShown: false \}\}/);
  assert.match(homeSource, /router\.push\('\/help-support'\)/);
  assert.match(quickHelpSource, /router\.back\(\)/);
});

test('Contact Support opens email support and feedback flows', () => {
  assert.match(helpSource, /createSupportEmailUrl\('Huddle Up Support'/);
  assert.match(helpSource, /router\.push\('\/feedback'\)/);
  assert.match(layoutSource, /Stack\.Screen name="feedback" options=\{\{ headerShown: false \}\}/);
  assert.match(supportServiceSource, /EXPO_PUBLIC_SUPPORT_EMAIL/);
  assert.match(supportServiceSource, /session\.email/);
});

test('Feedback form validates and communicates email draft submission states', () => {
  assert.match(feedbackSource, /FEEDBACK_CATEGORIES\.map/);
  assert.match(feedbackSource, /maxLength=\{FEEDBACK_MAX_LENGTH\}/);
  assert.match(feedbackSource, /validateFeedbackMessage\(message\)/);
  assert.match(feedbackSource, /Unable to open your email app/);
  assert.match(feedbackSource, /Review it and tap Send to submit/);
  assert.match(supportServiceSource, /FEEDBACK_MAX_LENGTH = 2000/);
  assert.match(supportServiceSource, /if \(!trimmedMessage\)/);
  assert.match(supportServiceSource, /trimmedMessage\.length > FEEDBACK_MAX_LENGTH/);
  assert.match(supportServiceSource, /Category: \$\{category\}/);
});

test('FAQs are organized by topic and answers can be expanded and collapsed', () => {
  assert.match(quickHelpSource, /title: 'Getting started'/);
  assert.match(quickHelpSource, /title: 'Planning together'/);
  assert.match(quickHelpSource, /accessibilityState=\{\{ expanded \}\}/);
  assert.match(quickHelpSource, /setExpandedQuestion\(expanded \? null : question\)/);
  assert.match(quickHelpSource, /What can I do with Huddle Up\?/);
  assert.match(quickHelpSource, /How do I vote in a poll\?/);
});

test('How-to guides and practical tips cover existing MVP workflows in a scrollable view', () => {
  for (const workflow of ['Create a community event', 'Share an announcement', 'Create a poll and vote', 'Start a Kickback']) {
    assert.ok(quickHelpSource.includes(workflow), `Missing guide: ${workflow}`);
  }
  for (const tip of ['Check your active group', 'Make event details useful', 'Keep poll choices clear']) {
    assert.ok(quickHelpSource.includes(tip), `Missing tip: ${tip}`);
  }
  assert.match(quickHelpSource, /<ScrollView contentContainerStyle=\{styles\.content\}/);
  assert.match(quickHelpSource, /Help topic not found/);
});
