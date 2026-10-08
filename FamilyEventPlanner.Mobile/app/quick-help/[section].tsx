import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const faqCategories = [
  {
    title: 'Getting started',
    questions: [
      {
        question: 'What can I do with Huddle Up?',
        answer: 'Use your community space to plan events, share announcements, ask questions with polls, and coordinate spontaneous Kickbacks.',
      },
      {
        question: 'Why do I need to choose a group?',
        answer: 'Events, announcements, polls, and Kickbacks belong to a community. If you are part of more than one, make sure the group you want is active before you post.',
      },
      {
        question: 'Can I join or create a group?',
        answer: 'Yes. Open Groups to find your groups, join an existing group with its invite code, or create a group of your own.',
      },
    ],
  },
  {
    title: 'Planning together',
    questions: [
      {
        question: 'What details can I add to an event?',
        answer: 'An event needs a title and date. You can also add a description, end time, location, dress code, notes, and an image.',
      },
      {
        question: 'How do I vote in a poll?',
        answer: 'Open a poll and tap the option you want. Your vote is recorded and the poll shows the current results.',
      },
      {
        question: 'What is a Kickback?',
        answer: 'A Kickback is a casual, time-limited get-together for your community. Choose a vibe and duration, and add an optional note.',
      },
      {
        question: 'Where can I find community updates?',
        answer: 'Open Announcements from Home to read group updates. The Notifications tab shows recent activity in your community.',
      },
    ],
  },
];

const guides = [
  {
    title: 'Create a community event',
    steps: [
      'Open the Events tab and tap the plus button.',
      'Enter an event title and choose a date and time.',
      'Add any helpful details, such as a location, description, or notes.',
      'Tap Create Event to share it with your active group.',
    ],
  },
  {
    title: 'Share an announcement',
    steps: [
      'From Home, find the Announcements section and choose Create Announcement.',
      'Add your announcement details.',
      'Choose a duration if prompted, then create the announcement for your active group.',
    ],
  },
  {
    title: 'Create a poll and vote',
    steps: [
      'From Home, open Polls and tap Create Poll.',
      'Enter a question and at least two options.',
      'Choose a poll duration if you want one, then create the poll.',
      'To vote, open the poll and tap the option you prefer.',
    ],
  },
  {
    title: 'Start a Kickback',
    steps: [
      'Open the Kickbacks tab and tap Create Kickback.',
      'Choose a vibe and how long it should be available.',
      'Add an optional note and create the Kickback for your active group.',
    ],
  },
];

const tips = [
  {
    icon: 'groups' as const,
    title: 'Check your active group',
    body: 'Before sharing an event, poll, announcement, or Kickback, check that you are in the community you mean to reach.',
  },
  {
    icon: 'event' as const,
    title: 'Make event details useful',
    body: 'A clear title and date are required. Add a location or notes when they will help people make plans.',
  },
  {
    icon: 'poll' as const,
    title: 'Keep poll choices clear',
    body: 'Use a focused question and distinct options so your community can choose easily.',
  },
  {
    icon: 'bolt' as const,
    title: 'Use Kickbacks for the moment',
    body: 'Kickbacks are time-limited. Pick a duration that fits the plan and include an optional note with anything people should know.',
  },
  {
    icon: 'notifications-none' as const,
    title: 'Catch up on updates',
    body: 'Check Announcements on Home for group posts, and open Notifications to review recent community activity.',
  },
];

const pageDetails = {
  faqs: { title: 'FAQs', subtitle: 'Quick answers about using Huddle Up.' },
  'how-to-guides': { title: 'How-To Guides', subtitle: 'Follow the steps to get things done with your community.' },
  'tips-best-practices': { title: 'Tips & Best Practices', subtitle: 'A few simple ways to make planning together easier.' },
} as const;

type HelpSection = keyof typeof pageDetails;

export default function QuickHelpScreen() {
  const insets = useSafeAreaInsets();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const page = section && section in pageDetails ? pageDetails[section as HelpSection] : null;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable
          accessibilityLabel="Go back to Help & Support"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#17345D" />
        </Pressable>
        <View style={styles.headerCopy}>
          <ThemedText style={styles.eyebrow}>QUICK HELP</ThemedText>
          <ThemedText type="title" style={styles.title}>{page?.title ?? 'Help topic not found'}</ThemedText>
          {page ? <ThemedText style={styles.subtitle}>{page.subtitle}</ThemedText> : null}
        </View>
      </View>

      {page ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {section === 'faqs' ? faqCategories.map((category) => (
            <View key={category.title} style={styles.section}>
              <ThemedText style={styles.sectionTitle}>{category.title}</ThemedText>
              <View style={styles.card}>
                {category.questions.map(({ question, answer }, index) => {
                  const expanded = expandedQuestion === question;
                  return (
                    <View key={question} style={index < category.questions.length - 1 ? styles.itemBorder : undefined}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${question}. ${expanded ? 'Collapse answer' : 'Expand answer'}`}
                        accessibilityState={{ expanded }}
                        onPress={() => setExpandedQuestion(expanded ? null : question)}
                        style={styles.question}
                      >
                        <ThemedText style={styles.questionText}>{question}</ThemedText>
                        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={24} color="#58708B" />
                      </Pressable>
                      {expanded ? <ThemedText style={styles.answer}>{answer}</ThemedText> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          )) : null}

          {section === 'how-to-guides' ? guides.map((guide) => (
            <View key={guide.title} style={styles.card}>
              <ThemedText style={styles.articleTitle}>{guide.title}</ThemedText>
              {guide.steps.map((step, index) => (
                <View key={step} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                  </View>
                  <ThemedText style={styles.body}>{step}</ThemedText>
                </View>
              ))}
            </View>
          )) : null}

          {section === 'tips-best-practices' ? tips.map((tip) => (
            <View key={tip.title} style={styles.card}>
              <View style={styles.tipHeader}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name={tip.icon} size={21} color="#0A7EA4" />
                </View>
                <ThemedText style={styles.articleTitle}>{tip.title}</ThemedText>
              </View>
              <ThemedText style={styles.body}>{tip.body}</ThemedText>
            </View>
          )) : null}
        </ScrollView>
      ) : (
        <View style={styles.notFound}>
          <ThemedText style={styles.body}>This help topic is not available.</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFD' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 20, paddingBottom: 18 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF2F6', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: '#0A7EA4', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#10264C', fontSize: 28, lineHeight: 34 },
  subtitle: { color: '#71819A', fontSize: 15, lineHeight: 22 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  section: { gap: 9 },
  sectionTitle: { color: '#58708B', fontSize: 13, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { borderRadius: 18, backgroundColor: '#FFFFFF', padding: 16, gap: 13, shadowColor: '#17345D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3EAF0' },
  question: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  questionText: { flex: 1, color: '#17345D', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  answer: { paddingBottom: 14, color: '#58708B', fontSize: 14, lineHeight: 21 },
  articleTitle: { flex: 1, color: '#17345D', fontSize: 16, lineHeight: 23, fontWeight: '700' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF5F8' },
  stepNumberText: { color: '#0A7EA4', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  body: { flex: 1, color: '#58708B', fontSize: 14, lineHeight: 21 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF5F8' },
  notFound: { padding: 20 },
});
