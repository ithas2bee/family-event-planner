import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography } from '@/components/ui/design-system';
import { FormInput } from '@/components/ui/form-input';
import { GlassCard } from '@/components/ui/glass-card';
import { ImmersiveButton } from '@/components/ui/immersive-button';
import { ModalSheet } from '@/components/ui/modal-sheet';
import { ScreenContainer } from '@/components/ui/screen-container';
import { getEventAttendance, saveEventAttendance, AttendanceResponse } from '@/services/eventAttendanceService';
import { Event, getEventById, updateEvent } from '@/services/eventService';
import { GroupMember, getGroupMembers } from '@/services/groupMemberService';
import { loadSession } from '@/services/sessionService';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

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
  const [attendance, setAttendance] = useState<AttendanceResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState(0);
  const [responseLoading, setResponseLoading] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
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
        let eventAttendance: AttendanceResponse[] = [];
        if (eventData.familyGroupId && session?.memberId) {
          try {
            [members, eventAttendance] = await Promise.all([
              getGroupMembers(eventData.familyGroupId, session.memberId),
              getEventAttendance(validEventId),
            ]);
          } catch {
            // Keep editing usable even if member suggestions cannot be loaded.
          }
        }

        if (!cancelled) {
          setEvent(eventData);
          setCurrentMemberId(session?.memberId || '');
          setGroupMembers(members);
          setAttendance(eventAttendance);
          setSelectedResponse(eventAttendance.find((item) => item.memberId === session?.memberId)?.rsvp ?? 0);
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
  const memberNames = new Map(
    groupMembers.map((member) => [String(member.memberId ?? ''), member.displayName?.trim() || 'Family member']),
  );
  const attendees = attendance
    .filter((item) => item.rsvp === 1)
    .map((item) => ({ ...item, name: memberNames.get(item.memberId) || 'Family member' }));
  const maybeCount = attendance.filter((item) => item.rsvp === 3).length;
  const goingCount = attendees.length;

  const handleResponse = async (response: number) => {
    if (!event || !event.id || responseLoading) return;
    setResponseLoading(true);
    setResponseError(null);
    try {
      const saved = await saveEventAttendance(event.id, response);
      setSelectedResponse(saved.rsvp);
      setAttendance((current) => [
        ...current.filter((item) => item.memberId !== currentMemberId),
        saved,
      ]);
    } catch (err) {
      setResponseError(err instanceof Error ? err.message : 'Unable to update your response.');
    } finally {
      setResponseLoading(false);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: 'Date to be announced', time: 'Time to be announced' };
    return {
      date: new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date),
      time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date),
    };
  };

  const getInitials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';

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
      <View style={styles.contentContainer}>
        <View style={styles.hero}>
          {event.imageUrl ? <Image source={{ uri: event.imageUrl }} style={styles.heroImage} /> : null}
          <View style={styles.heroOrbLarge} />
          <View style={styles.heroOrbSmall} />
          <MaterialIcons name="celebration" size={48} color="#FFFFFF" />
          <ThemedText type="title" style={styles.heroTitle} numberOfLines={3}>{event.title || 'Family Event'}</ThemedText>
        </View>

        <View style={styles.detailsCard}>
          <ThemedText type="title" style={styles.title}>{event.title || 'Untitled Event'}</ThemedText>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}><MaterialIcons name="event" size={19} color="#087AC5" /></View>
            <View style={styles.infoCopy}>
              <ThemedText style={styles.infoLabel}>Date & time</ThemedText>
              <ThemedText style={styles.infoValue}>{formatDate(event.startDate).date}</ThemedText>
              <ThemedText style={styles.infoValue}>{formatDate(event.startDate).time}</ThemedText>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}><MaterialIcons name="place" size={19} color="#087AC5" /></View>
            <View style={styles.infoCopy}>
              <ThemedText style={styles.infoLabel}>Location</ThemedText>
              <ThemedText style={styles.infoValue} numberOfLines={2}>{event.location?.trim() || 'Location to be announced'}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Attendance</ThemedText>
            <ThemedText style={styles.attendanceCount}>{goingCount} going · {maybeCount} maybe</ThemedText>
          </View>
          <View style={styles.responseRow}>
            {[
              { value: 1, label: 'Going', icon: 'check-circle' as const },
              { value: 3, label: 'Maybe', icon: 'help' as const },
              { value: 2, label: "Can't Go", icon: 'cancel' as const },
            ].map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedResponse === option.value }}
                onPress={() => handleResponse(option.value)}
                style={[styles.responseButton, selectedResponse === option.value && styles.responseButtonSelected]}>
                <MaterialIcons name={option.icon} size={19} color={selectedResponse === option.value ? '#FFFFFF' : '#45617F'} />
                <ThemedText style={[styles.responseText, selectedResponse === option.value && styles.responseTextSelected]}>{option.label}</ThemedText>
              </Pressable>
            ))}
          </View>
          {responseLoading ? <ActivityIndicator size="small" color="#087AC5" /> : null}
          {responseError ? <ThemedText style={styles.errorMessage}>{responseError}</ThemedText> : null}
        </View>

        {event.description?.trim() ? (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>About this event</ThemedText>
            <ThemedText style={styles.sectionText}>{event.description}</ThemedText>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Attendees</ThemedText>
            <ThemedText style={styles.attendanceCount}>{attendance.length} responded</ThemedText>
          </View>
          {attendees.length > 0 ? (
            <View style={styles.attendeeList}>
              {attendees.slice(0, 8).map((attendee, index) => (
                <View key={attendee.memberId} style={styles.attendee}>
                  <View style={[styles.avatar, { backgroundColor: ['#D9F0F2', '#E9E1FF', '#DDF2E8', '#FFE7D0'][index % 4] }]}>
                    <ThemedText style={styles.avatarText}>{getInitials(attendee.name)}</ThemedText>
                  </View>
                  <ThemedText style={styles.attendeeName} numberOfLines={1}>{attendee.name}</ThemedText>
                </View>
              ))}
            </View>
          ) : <ThemedText style={styles.sectionText}>No attendee responses yet.</ThemedText>}
        </View>

        {isCreator ? (
          <Pressable style={styles.settingsButton} onPress={() => setIsEditing(true)}>
            <MaterialIcons name="settings" size={18} color="#087AC5" />
            <ThemedText style={styles.settingsText}>Edit event details</ThemedText>
          </Pressable>
        ) : null}

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
    backgroundColor: '#F5F8FC',
  },
  hero: {
    minHeight: 220,
    marginHorizontal: Spacing.lg,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#147D8A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.75,
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -70,
    bottom: -100,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    left: -35,
    top: -35,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: Typography.sizes.display,
    lineHeight: 38,
    marginTop: Spacing.md,
  },
  detailsCard: {
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    borderRadius: 20,
    padding: Spacing.xl,
    gap: Spacing.lg,
    backgroundColor: '#FFFFFF',
    shadowColor: '#203B5A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  title: {
    color: '#16213A',
    fontSize: 24,
    lineHeight: 30,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF5FF',
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: '#6B7A90',
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  infoValue: {
    color: '#31435F',
    fontSize: Typography.sizes.sm,
    lineHeight: 19,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  attendanceCount: {
    color: '#6B7A90',
    fontSize: Typography.sizes.xs,
  },
  responseRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  responseButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E2EE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  responseButtonSelected: {
    borderColor: '#087AC5',
    backgroundColor: '#087AC5',
  },
  responseText: {
    color: '#45617F',
    fontSize: 11,
    fontWeight: '700',
  },
  responseTextSelected: {
    color: '#FFFFFF',
  },
  attendeeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  attendee: {
    width: 64,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    color: '#294B68',
    fontSize: 13,
    fontWeight: '700',
  },
  attendeeName: {
    width: '100%',
    color: '#45617F',
    fontSize: 10,
    textAlign: 'center',
  },
  settingsButton: {
    marginHorizontal: Spacing.lg,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9DDED',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  settingsText: {
    color: '#087AC5',
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
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
