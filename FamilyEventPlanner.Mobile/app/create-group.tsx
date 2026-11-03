import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/config/api';
import { ThemedText } from '@/components/themed-text';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { loadSession, saveSession } from '@/services/sessionService';

const communityTypes = [
  { label: 'Family', icon: 'family-restroom' },
  { label: 'Friends', icon: 'people' },
  { label: 'Couples', icon: 'favorite' },
  { label: 'Parents & Kids', icon: 'child-care' },
  { label: 'Sports & Fitness', icon: 'sports-soccer' },
  { label: 'School & Education', icon: 'school' },
  { label: 'Work & Professional', icon: 'work' },
  { label: 'Neighborhood & Local', icon: 'location-city' },
  { label: 'Hobbies & Interests', icon: 'interests' },
  { label: 'Faith & Spiritual', icon: 'church' },
  { label: 'Clubs & Organizations', icon: 'groups' },
  { label: 'Travel', icon: 'flight' },
  { label: 'Alumni', icon: 'history-edu' },
  { label: 'Support & Care', icon: 'volunteer-activism' },
  { label: 'Events & Social', icon: 'celebration' },
  { label: 'Other', icon: 'more-horiz' },
] as const;

type CommunityType = (typeof communityTypes)[number]['label'];

export default function CreateGroupScreen() {
  const { setActiveGroup } = useActiveGroupContext();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<CommunityType | null>(null);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = step === 1 ? selectedType !== null : groupName.trim().length > 0;

  async function handleCreateGroup() {
    setError(null);
    setLoading(true);

    try {
      const session = await loadSession();
      if (!session) {
        router.replace('/auth');
        return;
      }

      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/api/familygroups`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            name: groupName.trim(),
            groupType: selectedType,
            description: description.trim() || null,
            userId: session.userId,
          }),
        });
      } catch {
        throw new Error('Could not reach the server. Check your network connection.');
      }

      const rawBody = await response.text();

      let parsed: {
        groupId?: string;
        groupName?: string;
        inviteCode?: string;
        memberId?: string;
        isAdmin?: boolean;
      } = {};

      try {
        parsed = JSON.parse(rawBody);
      } catch {
        throw new Error('The server returned an unexpected response.');
      }

      if (!response.ok) {
        const msg =
          (parsed as { message?: string }).message ??
          (parsed as { title?: string }).title ??
          `Failed to create group (error ${response.status}).`;
        throw new Error(msg);
      }

      const groupId = String(parsed.groupId ?? '');
      const resolvedGroupName = String(parsed.groupName ?? groupName.trim());
      const memberId = String(parsed.memberId ?? '');

      await saveSession({
        ...session,
        groupId,
        groupName: resolvedGroupName,
        memberId,
        isAdmin: parsed.isAdmin ?? true,
      });

      await setActiveGroup({
        groupId,
        groupName: resolvedGroupName,
        memberId,
        memberName: session.displayName,
      });

      router.replace({
        pathname: '/(tabs)/family-home',
        params: { groupId, groupName: resolvedGroupName, memberId, memberName: session.displayName },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    setError(null);
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    void handleCreateGroup();
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={step === 1 ? 'Go back' : 'Previous step'}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="#17234B" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Create a Group</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.progress} accessibilityLabel={`Step ${step} of 3`}>
            {[1, 2, 3].map((item) => (
              <View
                key={item}
                style={[styles.progressSegment, item <= step && styles.progressSegmentActive]}
              />
            ))}
          </View>
          <ThemedText style={styles.stepLabel}>Step {step} of 3</ThemedText>

          {step === 1 ? (
            <>
              <ThemedText style={styles.pageTitle}>What kind of community is this?</ThemedText>
              <ThemedText style={styles.subtitle}>
                Choose the type that best describes your group.
              </ThemedText>
              <View style={styles.typeGrid}>
                {communityTypes.map(({ label, icon }) => {
                  const selected = selectedType === label;
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={label}
                      onPress={() => setSelectedType(label)}
                      style={[styles.typeCard, selected && styles.typeCardSelected]}
                    >
                      <View style={[styles.typeIcon, selected && styles.typeIconSelected]}>
                        <MaterialIcons
                          name={icon}
                          size={22}
                          color={selected ? '#6047EE' : '#536982'}
                        />
                      </View>
                      <ThemedText
                        style={[styles.typeName, selected && styles.typeNameSelected]}
                      >
                        {label}
                      </ThemedText>
                      {selected ? (
                        <MaterialIcons
                          name="check-circle"
                          size={18}
                          color="#6047EE"
                          style={styles.typeCheck}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <ThemedText style={styles.pageTitle}>Tell us about your group</ThemedText>
              <ThemedText style={styles.subtitle}>
                Add a name and a little about what brings everyone together.
              </ThemedText>
              <View style={styles.formCard}>
                <ThemedText style={styles.label}>
                  Group Name <ThemedText style={styles.required}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={styles.input}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="e.g. Saturday Trail Crew"
                  placeholderTextColor="#8995AA"
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={200}
                  accessibilityLabel="Group Name"
                  returnKeyType="next"
                />
                <ThemedText style={styles.label}>
                  Description <ThemedText style={styles.optional}>(optional)</ThemedText>
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.descriptionInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What is this group all about?"
                  placeholderTextColor="#8995AA"
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  accessibilityLabel="Description (optional)"
                />
                <ThemedText style={styles.selectedTypeHint}>
                  Group type: {selectedType}
                </ThemedText>
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <ThemedText style={styles.pageTitle}>Set your group privacy</ThemedText>
              <ThemedText style={styles.subtitle}>
                Your group starts private. You can change access settings later.
              </ThemedText>
              <View style={styles.reviewCard}>
                <View style={styles.reviewIcon}>
                  <MaterialIcons name="groups" size={23} color="#6047EE" />
                </View>
                <View style={styles.reviewDetails}>
                  <ThemedText style={styles.reviewName}>{groupName.trim()}</ThemedText>
                  <ThemedText style={styles.reviewType}>{selectedType}</ThemedText>
                  {description.trim() ? (
                    <ThemedText style={styles.reviewDescription}>{description.trim()}</ThemedText>
                  ) : null}
                </View>
              </View>
              <View style={styles.privacyCard}>
                <View style={styles.privacyIcon}>
                  <MaterialIcons name="lock" size={27} color="#476B95" />
                </View>
                <View style={styles.privacyDetails}>
                  <ThemedText style={styles.privacyTitle}>
                    Invite Only (Not Searchable)
                  </ThemedText>
                  <ThemedText style={styles.privacyDescription}>
                    Your group won&apos;t appear in group search results. People can only join with an
                    invitation.
                  </ThemedText>
                  <View style={styles.defaultBadge}>
                    <ThemedText style={styles.defaultBadgeText}>Default</ThemedText>
                  </View>
                </View>
                <MaterialIcons name="radio-button-checked" size={22} color="#6047EE" />
              </View>
              <ThemedText style={styles.settingsNote}>
                An Admin can change discoverability and join settings later in Group Settings.
              </ThemedText>
            </>
          ) : null}

          {error !== null ? <ThemedText style={styles.feedbackError}>{error}</ThemedText> : null}

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.primaryButton,
                (!canContinue || loading) && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!canContinue || loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <ThemedText style={styles.primaryButtonText}>
                    {step === 3 ? 'Create Group' : 'Continue'}
                  </ThemedText>
                  {step < 3 ? (
                    <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                  ) : null}
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FF' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#17234B', fontSize: 16, fontWeight: '600' },
  headerSpacer: { width: 40 },
  progress: { flexDirection: 'row', gap: 8, marginBottom: 7 },
  progressSegment: { height: 5, flex: 1, borderRadius: 3, backgroundColor: '#DDE0EC' },
  progressSegmentActive: { backgroundColor: '#6047EE' },
  stepLabel: {
    color: '#6A7596',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 23,
  },
  pageTitle: { color: '#17234B', fontSize: 25, lineHeight: 32, fontWeight: '700' },
  subtitle: { color: '#526383', fontSize: 15, lineHeight: 22, marginTop: 4, marginBottom: 22 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 11 },
  typeCard: {
    width: '48.5%',
    minHeight: 92,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E5F0',
    backgroundColor: '#FFFFFF',
    padding: 11,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  typeCardSelected: { borderColor: '#7863F6', backgroundColor: '#F0EDFF' },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F3F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  typeIconSelected: { backgroundColor: '#E1DBFF' },
  typeName: { color: '#34435F', fontSize: 13, lineHeight: 17, fontWeight: '600', paddingRight: 13 },
  typeNameSelected: { color: '#39259F' },
  typeCheck: { position: 'absolute', right: 9, top: 9 },
  formCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF2',
    padding: 17,
    gap: 10,
  },
  label: { color: '#17234B', fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 4 },
  required: { color: '#6047EE', fontSize: 15, lineHeight: 22 },
  optional: { color: '#77839A', fontSize: 13, lineHeight: 20, fontWeight: '400' },
  input: {
    minHeight: 49,
    borderWidth: 1,
    borderColor: '#DDE1EB',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 16,
    color: '#17234B',
    backgroundColor: '#FFFFFF',
  },
  descriptionInput: { minHeight: 120, paddingTop: 12 },
  selectedTypeHint: { color: '#697795', fontSize: 13, lineHeight: 19, marginTop: 4 },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8F2',
    padding: 15,
    marginBottom: 14,
  },
  reviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0EDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewDetails: { flex: 1, gap: 2 },
  reviewName: { color: '#17234B', fontSize: 17, lineHeight: 23, fontWeight: '700' },
  reviewType: { color: '#6047EE', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  reviewDescription: { color: '#586783', fontSize: 13, lineHeight: 19, marginTop: 3 },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#8B78FF',
    backgroundColor: '#F1EEFF',
    padding: 15,
  },
  privacyIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyDetails: { flex: 1 },
  privacyTitle: { color: '#17234B', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  privacyDescription: { color: '#465777', fontSize: 13, lineHeight: 20, marginTop: 3 },
  defaultBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: '#DDD6FF',
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 7,
  },
  defaultBadgeText: { color: '#5136D1', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  settingsNote: { color: '#596885', fontSize: 14, lineHeight: 21, marginTop: 13 },
  footer: { marginTop: 25 },
  primaryButton: {
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6047EE',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 23, fontWeight: '700' },
  buttonDisabled: { opacity: 0.48 },
  feedbackError: { color: '#B13E4B', fontSize: 14, lineHeight: 20, marginTop: 14 },
});
