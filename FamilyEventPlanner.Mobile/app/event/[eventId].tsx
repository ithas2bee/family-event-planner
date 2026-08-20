import { EventDetailsCard } from '@/components/events/EventDetailsCard';
import { EventHeroSection } from '@/components/events/EventHeroSection';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography } from '@/components/ui/design-system';
import { FormInput } from '@/components/ui/form-input';
import { GlassCard } from '@/components/ui/glass-card';
import { ImmersiveButton } from '@/components/ui/immersive-button';
import { ModalSheet } from '@/components/ui/modal-sheet';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Event, getEventById, updateEvent } from '@/services/eventService';
import { GroupMember, getGroupMembers } from '@/services/groupMemberService';
import { loadSession } from '@/services/sessionService';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [activeAssignmentIndex, setActiveAssignmentIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!eventId || typeof eventId !== 'string') {
      setError('Invalid event ID.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const validEventId = Array.isArray(eventId) ? eventId[0] : eventId;

        const [eventData, session] = await Promise.all([
          getEventById(validEventId),
          loadSession(),
        ]);

        let members: GroupMember[] = [];
        if (eventData.familyGroupId && session?.memberId) {
          try {
            members = await getGroupMembers(eventData.familyGroupId, session.memberId);
          } catch {
            // Keep editing usable even if member suggestions cannot be loaded.
          }
        }

        if (!cancelled) {
          setEvent(eventData);
          setCurrentMemberId(session?.memberId || '');
          setGroupMembers(members);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load event.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const memberOptions = useMemo(() => {
    const seen = new Set<string>();
    return groupMembers
      .map((member) => ({
        memberId: String(member.memberId ?? '').trim(),
        memberName: String(member.displayName ?? '').trim(),
      }))
      .filter((member) => member.memberId.length > 0 && member.memberName.length > 0)
      .filter((member) => {
        const key = member.memberId.toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }, [groupMembers]);

  const getMemberSuggestions = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) {
      return [];
    }

    return memberOptions
      .filter((member) => member.memberName.toLowerCase().includes(normalized))
      .slice(0, 6);
  };

  const isCreator = Boolean(event?.createdByMemberId && currentMemberId && event.createdByMemberId === currentMemberId);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (error || !event) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ThemedText type="title" style={styles.errorTitle}>
            Event Not Found
          </ThemedText>
          <ThemedText style={styles.errorText}>
            {error || 'No event data available.'}
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  const handleEdit = async (updates: Partial<Event>) => {
    if (!eventId || typeof eventId !== 'string') return;

    setEditLoading(true);
    setEditError(null);

    try {
      const updatedEvent = await updateEvent(eventId, updates);

      setEvent((currentEvent) => {
        if (!currentEvent) {
          return updatedEvent;
        }

        const hasMeaningfulServerPayload =
          updatedEvent.id.trim().length > 0 ||
          updatedEvent.title.trim().length > 0 ||
          updatedEvent.startDate.trim().length > 0;

        if (!hasMeaningfulServerPayload) {
          return currentEvent;
        }

        return {
          ...currentEvent,
          ...updatedEvent,
          id: updatedEvent.id || currentEvent.id,
          familyGroupId: updatedEvent.familyGroupId || currentEvent.familyGroupId,
          title: updatedEvent.title || currentEvent.title,
          startDate: updatedEvent.startDate || currentEvent.startDate,
          createdAt: updatedEvent.createdAt || currentEvent.createdAt,
          assignments: updatedEvent.assignments || currentEvent.assignments, // Ensure assignments persist
        };
      });

      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update event.');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <ScreenContainer withScroll padding={0}>
      <EventHeroSection
        title={event.title}
        height={172}
        glowScale={0.72}
      />

      <View style={styles.contentContainer}>
        <EventDetailsCard
          title={event.title}
          date={event.startDate ? new Date(event.startDate).toLocaleString() : 'TBD'}
          location={event.location || 'TBD'}
          onPressDate={() => {}}
          onPressLocation={() => {}}
          onPressSettings={() => setIsEditing(true)}
          showSettings={isCreator}
        />

        {event.description && (
          <GlassCard style={styles.section} padding={Spacing.lg}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Description
            </ThemedText>
            <ThemedText style={styles.sectionText}>
              {event.description}
            </ThemedText>
          </GlassCard>
        )}

        {event.dressCode && (
          <GlassCard style={styles.section} padding={Spacing.lg}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Dress Code
            </ThemedText>
            <ThemedText style={styles.sectionText}>
              {event.dressCode}
            </ThemedText>
          </GlassCard>
        )}

        {event.notes && (
          <GlassCard style={styles.section} padding={Spacing.lg}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Notes
            </ThemedText>
            <ThemedText style={styles.sectionText}>
              {event.notes}
            </ThemedText>
          </GlassCard>
        )}

        {event.creatorDisplayName && (
          <GlassCard style={styles.section} padding={Spacing.lg}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Created By
            </ThemedText>
            <ThemedText style={styles.sectionText}>
              {event.creatorDisplayName}
            </ThemedText>
          </GlassCard>
        )}

        {(event.assignments && event.assignments.length > 0) && (
          <GlassCard style={styles.section} padding={Spacing.lg}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Assignments
            </ThemedText>
            <View style={styles.assignmentsList}>
              {event.assignments.map((assignment, index) => (
                <ThemedText
                  key={index}
                  style={styles.assignmentLine}
                  numberOfLines={0}
                >
                  {assignment.memberName} <ThemedText style={styles.assignmentDash}>—</ThemedText> {assignment.task}
                </ThemedText>
              ))}
            </View>
          </GlassCard>
        )}
      </View>

      {/* Immersive Editing Form */}
      {isEditing && (
        <ModalSheet
          visible={isEditing}
          title="Edit Event"
          onClose={() => setIsEditing(false)}
        >
          <View>
            <FormInput
              value={event.title}
              onChangeText={(text) => setEvent({ ...event, title: text })}
              placeholder="Event Title"
              autoCapitalize="words"
              maxLength={60}
            />
            <FormInput
              value={event.description || ''}
              onChangeText={(text) => setEvent({ ...event, description: text })}
              placeholder="Description"
              multiline
              maxLength={200}
            />
            <FormInput
              value={event.location || ''}
              onChangeText={(text) => setEvent({ ...event, location: text })}
              placeholder="Location"
            />

            {/* Assignments Editing Section */}
            <View style={styles.advSettingsSection}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Assignments
              </ThemedText>
              {(event.assignments && event.assignments.length > 0) ? (
                event.assignments.map((assignment, idx) => {
                  const suggestions = getMemberSuggestions(assignment.memberName);
                  const showSuggestions =
                    activeAssignmentIndex === idx &&
                    assignment.memberName.trim().length > 0 &&
                    suggestions.length > 0;

                  return (
                    <View key={idx} style={styles.assignmentEditRow}>
                      <FormInput
                        value={assignment.memberName}
                        onFocus={() => setActiveAssignmentIndex(idx)}
                        onChangeText={text => {
                          const updated = event.assignments ? [...event.assignments] : [];
                          updated[idx] = { ...assignment, memberName: text, memberId: undefined };
                          setEvent({ ...event, assignments: updated });
                          setActiveAssignmentIndex(idx);
                        }}
                        placeholder="Name"
                        style={styles.assignmentInput}
                        maxLength={32}
                      />
                      {showSuggestions && (
                        <View style={styles.suggestionsContainer}>
                          {suggestions.map((member) => (
                            <Pressable
                              key={member.memberId}
                              style={styles.suggestionItem}
                              onPress={() => {
                                const updated = event.assignments ? [...event.assignments] : [];
                                updated[idx] = {
                                  ...assignment,
                                  memberName: member.memberName,
                                  memberId: member.memberId,
                                };
                                setEvent({ ...event, assignments: updated });
                                setActiveAssignmentIndex(null);
                              }}
                            >
                              <ThemedText style={styles.suggestionText}>{member.memberName}</ThemedText>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      <FormInput
                        value={assignment.task}
                        onFocus={() => setActiveAssignmentIndex(null)}
                        onChangeText={text => {
                          const updated = event.assignments ? [...event.assignments] : [];
                          updated[idx] = { ...assignment, task: text };
                          setEvent({ ...event, assignments: updated });
                        }}
                        placeholder="Item/Task"
                        style={styles.assignmentInput}
                        maxLength={32}
                      />
                      <ImmersiveButton
                        variant="tertiary"
                        size="small"
                        style={styles.assignmentRemoveBtn}
                        onPress={() => {
                          const updated = (event.assignments || []).filter((_, i) => i !== idx);
                          setEvent({ ...event, assignments: updated });
                          setActiveAssignmentIndex(null);
                        }}
                      >
                        Remove
                      </ImmersiveButton>
                    </View>
                  );
                })
              ) : (
                <ThemedText style={styles.sectionText}>No assignments yet.</ThemedText>
              )}
              <ImmersiveButton
                variant="secondary"
                size="small"
                style={styles.assignmentAddBtn}
                onPress={() => {
                  const updated = event.assignments ? [...event.assignments] : [];
                  updated.push({ memberName: '', task: '', memberId: undefined });
                  setEvent({ ...event, assignments: updated });
                  setActiveAssignmentIndex(updated.length - 1);
                }}
              >
                Add Assignment
              </ImmersiveButton>
            </View>

            <ImmersiveButton
              variant="primary"
              size="large"
              onPress={() => handleEdit(event)}
              loading={editLoading}
            >
              Save Changes
            </ImmersiveButton>
            {editError && (
              <ThemedText style={styles.errorMessage}>{editError}</ThemedText>
            )}
          </View>
        </ModalSheet>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    color: Colors.error,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.text.muted,
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 0,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: 0,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.sm,
  },
  sectionText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  advSettingsSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  assignmentEditRow: {
    width: '100%',
    alignItems: 'stretch',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  assignmentInput: {
    width: '100%',
    marginBottom: 0,
  },
  assignmentRemoveBtn: {
    alignSelf: 'flex-end',
    marginTop: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  assignmentAddBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  suggestionsContainer: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.xs,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(15,15,20,0.95)',
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  suggestionText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
  },
  assignmentsList: {
    gap: Spacing.xs,
  },
  assignmentLine: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  assignmentDash: {
    color: Colors.text.secondary,
    fontWeight: 'bold',
    fontSize: Typography.sizes.sm,
  },
  errorMessage: {
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
