import { ThemedText } from '@/components/themed-text';
import { EventDateModal } from '@/components/events/EventDateModal';
import { EventSettingsModal } from '@/components/events/EventSettingsModal';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Image, Linking, Pressable, Share, StyleSheet, View } from 'react-native';

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
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
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

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
          const [memberResult, attendanceResult] = await Promise.allSettled([
            getGroupMembers(eventData.familyGroupId, session.memberId),
            getEventAttendance(validEventId),
          ]);
          if (memberResult.status === 'fulfilled') members = memberResult.value;
          if (attendanceResult.status === 'fulfilled') eventAttendance = attendanceResult.value;
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
    .map((item) => ({
      ...item,
      name: memberNames.get(item.memberId) || 'Family member',
      response: item.rsvp === 1 ? 'Going' : item.rsvp === 3 ? 'Maybe' : "Can't Go",
    }));
  const maybeCount = attendance.filter((item) => item.rsvp === 3).length;
  const goingCount = attendance.filter((item) => item.rsvp === 1).length;

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

  const handleAddToCalendar = async () => {
    if (!event) return;
    const date = new Date(event.startDate);
    if (Number.isNaN(date.getTime())) return;
    const endDate = event.endDate ? new Date(event.endDate) : new Date(date.getTime() + 60 * 60 * 1000);
    const calendarDate = `${date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`;
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${calendarDate}&location=${encodeURIComponent(event.location || '')}&details=${encodeURIComponent(event.description || '')}`;
    await Linking.openURL(calendarUrl);
  };

  const handleShare = async () => {
    if (!event) return;
    await Share.share({
      title: event.title,
      message: `${event.title}\n${formatDate(event.startDate).date} at ${formatDate(event.startDate).time}${event.location ? `\n${event.location}` : ''}`,
    });
  };

  const handleSettingsChange = async (dressCode: string, notes: string) => {
    if (!eventId || typeof eventId !== 'string') return;

    setEditError(null);
    try {
      await updateEvent(eventId, { dressCode: dressCode.trim() || undefined, notes: notes.trim() || undefined });
      setEvent((currentEvent) =>
        currentEvent
          ? { ...currentEvent, dressCode: dressCode.trim() || undefined, notes: notes.trim() || undefined }
          : currentEvent,
      );
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update event details.');
    }
  };

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
          <View style={styles.heroOverlay} />
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={22} color="#203B5A" />
          </Pressable>
          {!event.imageUrl ? <MaterialIcons name="celebration" size={48} color="#FFFFFF" /> : null}
          <ThemedText style={styles.heroLabel}>FAMILY EVENT</ThemedText>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.title}>{event.title || 'Untitled Event'}</ThemedText>
            <View style={styles.nextUpBadge}>
              <ThemedText style={styles.nextUpText}>Next Up</ThemedText>
            </View>
          </View>
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
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}><MaterialIcons name="people" size={19} color="#087AC5" /></View>
            <View style={styles.infoCopy}>
              <ThemedText style={styles.infoLabel}>Attendance</ThemedText>
              <ThemedText style={styles.infoValue}>{goingCount} going · {maybeCount} maybe · {attendance.filter((item) => item.rsvp === 2).length} can&apos;t go</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Attendance</ThemedText>
            <ThemedText style={styles.attendanceCount}>{goingCount} going · {maybeCount} maybe · {attendance.filter((item) => item.rsvp === 2).length} can&apos;t go</ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>About this event</ThemedText>
          <ThemedText style={styles.sectionText}>{event.description?.trim() || 'No description has been added yet.'}</ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Attendees</ThemedText>
            <ThemedText style={styles.seeAll}>See All</ThemedText>
          </View>
          {attendance.length > 0 ? (
            <View style={styles.attendeeList}>
              {attendees.slice(0, 8).map((attendee, index) => (
                <View key={attendee.memberId} style={styles.attendee}>
                  <View style={[styles.avatar, { backgroundColor: ['#D9F0F2', '#E9E1FF', '#DDF2E8', '#FFE7D0'][index % 4] }]}>
                    <ThemedText style={styles.avatarText}>{getInitials(attendee.name)}</ThemedText>
                  </View>
                  <ThemedText style={styles.attendeeName} numberOfLines={1}>{attendee.name}</ThemedText>
                  <ThemedText style={[styles.attendeeResponse, attendee.response === 'Going' ? styles.goingText : attendee.response === 'Maybe' ? styles.maybeText : styles.cantGoText]}>{attendee.response}</ThemedText>
                </View>
              ))}
            </View>
          ) : <ThemedText style={styles.sectionText}>No attendee responses yet.</ThemedText>}
        </View>

        <View style={styles.section}>
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

        <View style={styles.actionsSection}>
          <Pressable style={styles.actionRow} onPress={handleAddToCalendar} accessibilityRole="button">
            <View style={styles.actionIcon}><MaterialIcons name="calendar-today" size={18} color="#355070" /></View>
            <ThemedText style={styles.actionText}>Add to Calendar</ThemedText>
            <MaterialIcons name="chevron-right" size={20} color="#8A9AAF" />
          </Pressable>
          <Pressable style={styles.actionRow} onPress={handleShare} accessibilityRole="button">
            <View style={styles.actionIcon}><MaterialIcons name="share" size={18} color="#355070" /></View>
            <ThemedText style={styles.actionText}>Share Event</ThemedText>
            <MaterialIcons name="chevron-right" size={20} color="#8A9AAF" />
          </Pressable>
          {isCreator ? (
            <Pressable style={styles.actionRow} onPress={() => setSettingsModalVisible(true)} accessibilityRole="button">
              <View style={styles.actionIcon}><MaterialIcons name="tune" size={18} color="#355070" /></View>
              <ThemedText style={styles.actionText}>Additional details</ThemedText>
              <MaterialIcons name="chevron-right" size={20} color="#8A9AAF" />
            </Pressable>
          ) : null}
          {isCreator ? (
            <Pressable style={styles.actionRow} onPress={() => setIsEditing(true)} accessibilityRole="button">
              <View style={styles.actionIcon}><MaterialIcons name="edit" size={18} color="#355070" /></View>
              <ThemedText style={styles.actionText}>Edit Event</ThemedText>
              <MaterialIcons name="chevron-right" size={20} color="#8A9AAF" />
            </Pressable>
          ) : null}
        </View>

        {(event.assignments?.length ?? 0) > 0 ? (
          <View style={styles.assignmentsSection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Assignments</ThemedText>
            {event.assignments?.map((assignment, index) => (
              <View key={`${assignment.memberName}-${index}`} style={styles.assignmentRow}>
                <View style={styles.assignmentIcon}>
                  <MaterialIcons name="assignment" size={16} color="#087AC5" />
                </View>
                <View style={styles.assignmentCopy}>
                  <ThemedText style={styles.assignmentName}>{assignment.memberName}</ThemedText>
                  <ThemedText style={styles.assignmentTask}>{assignment.task}</ThemedText>
                </View>
              </View>
            ))}
          </View>
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

      </View>

      {/* Immersive Editing Form */}
      {isEditing && (
        <ModalSheet
          visible={isEditing}
          title="Edit Event"
          onClose={() => setIsEditing(false)}
        >
          <View style={styles.editForm}>
            <View style={styles.editSection}>
              <View style={styles.editSectionHeader}>
                <View style={[styles.editIcon, styles.editIconBlue]}>
                  <MaterialIcons name="event" size={22} color="#1678E8" />
                </View>
                <View>
                  <ThemedText style={styles.editSectionTitle}>Event Details</ThemedText>
                  <ThemedText style={styles.editSectionHint}>Tell your family about this event</ThemedText>
                </View>
              </View>
            <FormInput
              label="Event Title"
              value={event.title}
              onChangeText={(text) => setEvent({ ...event, title: text })}
              placeholder="Family Game Night"
              autoCapitalize="words"
              maxLength={60}
              style={styles.lightInput}
            />
            <FormInput
              label="Description"
              value={event.description || ''}
              onChangeText={(text) => setEvent({ ...event, description: text })}
              placeholder="Add more details about your event..."
              multiline
              maxLength={200}
              style={[styles.lightInput, styles.descriptionInput]}
            />
            </View>

            <View style={styles.editSection}>
              <View style={styles.editSectionHeader}>
                <View style={[styles.editIcon, styles.editIconPurple]}>
                  <MaterialIcons name="place" size={22} color="#635BDB" />
                </View>
                <ThemedText style={styles.editSectionTitle}>Location</ThemedText>
              </View>
            <FormInput
              label="Where is it happening?"
              value={event.location || ''}
              onChangeText={(text) => setEvent({ ...event, location: text })}
              placeholder="Add a location"
              style={styles.lightInput}
            />
            </View>

            <View style={styles.editSection}>
              <View style={styles.editSectionHeader}>
                <View style={[styles.editIcon, styles.editIconGreen]}>
                  <MaterialIcons name="calendar-today" size={22} color="#159B82" />
                </View>
                <View>
                  <ThemedText style={styles.editSectionTitle}>Date &amp; Time</ThemedText>
                  <ThemedText style={styles.editSectionHint}>Choose when your event starts</ThemedText>
                </View>
              </View>
              <Pressable
                style={styles.dateTimeField}
                onPress={() => setDateModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit date and time"
              >
                <View style={styles.dateTimeCopy}>
                  <ThemedText style={styles.dateTimeValue}>
                    {formatDate(event.startDate).date} at {formatDate(event.startDate).time}
                  </ThemedText>
                  <ThemedText style={styles.dateTimeHint}>Tap to change date or time</ThemedText>
                </View>
                <MaterialIcons name="chevron-right" size={26} color="#687A96" />
              </Pressable>
            </View>

            <View style={styles.assignmentEditSection}>
              <View style={styles.assignmentHeader}>
                <View style={[styles.editIcon, styles.editIconPink]}>
                  <MaterialIcons name="group" size={23} color="#C62865" />
                </View>
                <View style={styles.assignmentHeaderCopy}>
                  <ThemedText style={styles.editSectionTitle}>Assignments</ThemedText>
                  <ThemedText style={styles.editSectionHint}>Assign tasks to family members</ThemedText>
                </View>
                <View style={styles.assignmentCount}>
                  <ThemedText style={styles.assignmentCountText}>{event.assignments?.length ?? 0}</ThemedText>
                </View>
              </View>
              {(event.assignments && event.assignments.length > 0) ? (
                event.assignments.map((assignment, idx) => {
                  const suggestions = getMemberSuggestions(assignment.memberName);
                  const showSuggestions =
                    activeAssignmentIndex === idx &&
                    assignment.memberName.trim().length > 0 &&
                    suggestions.length > 0;

                  return (
                    <View key={idx} style={styles.assignmentEditCard}>
                      <View style={styles.assignmentCardHeader}>
                        <View style={styles.assignmentAvatar}>
                          <ThemedText style={styles.assignmentAvatarText}>{getInitials(assignment.memberName || 'Family member')}</ThemedText>
                        </View>
                        <ThemedText style={styles.assignmentNumber}>Assignment {idx + 1}</ThemedText>
                        <Pressable
                          onPress={() => {
                            const updated = (event.assignments || []).filter((_, i) => i !== idx);
                            setEvent({ ...event, assignments: updated });
                            setActiveAssignmentIndex(null);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove assignment ${idx + 1}`}
                          hitSlop={8}
                        >
                          <MaterialIcons name="delete-outline" size={23} color="#E55353" />
                        </Pressable>
                      </View>
                      <FormInput
                        label="Family member"
                        value={assignment.memberName}
                        onFocus={() => setActiveAssignmentIndex(idx)}
                        onChangeText={text => {
                          const updated = event.assignments ? [...event.assignments] : [];
                          updated[idx] = { ...assignment, memberName: text, memberId: undefined };
                          setEvent({ ...event, assignments: updated });
                          setActiveAssignmentIndex(idx);
                        }}
                        placeholder="Select a family member"
                        style={styles.lightInput}
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
                        label="Task"
                        value={assignment.task}
                        onFocus={() => setActiveAssignmentIndex(null)}
                        onChangeText={text => {
                          const updated = event.assignments ? [...event.assignments] : [];
                          updated[idx] = { ...assignment, task: text };
                          setEvent({ ...event, assignments: updated });
                        }}
                        placeholder="What should they bring or do?"
                        style={styles.lightInput}
                        maxLength={100}
                      />
                    </View>
                  );
                })
              ) : (
                <ThemedText style={styles.emptyAssignments}>No assignments yet. Add one below.</ThemedText>
              )}
              <Pressable
                style={styles.addAssignmentButton}
                onPress={() => {
                  const updated = event.assignments ? [...event.assignments] : [];
                  updated.push({ memberName: '', task: '', memberId: undefined });
                  setEvent({ ...event, assignments: updated });
                  setActiveAssignmentIndex(updated.length - 1);
                }}
                accessibilityRole="button"
                accessibilityLabel="Add assignment"
              >
                <MaterialIcons name="add-circle-outline" size={25} color="#1678E8" />
                <ThemedText style={styles.addAssignmentText}>Add Assignment</ThemedText>
              </Pressable>
            </View>

            <ImmersiveButton
              variant="primary"
              size="large"
              style={styles.saveChangesButton}
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
      <EventDateModal
        visible={dateModalVisible}
        date={new Date(event.startDate)}
        endDate={event.endDate ? new Date(event.endDate) : null}
        onChange={(startDate, endDate) => {
          if (startDate) {
            setEvent({
              ...event,
              startDate: startDate.toISOString(),
              endDate: endDate ? endDate.toISOString() : undefined,
            });
          }
        }}
        onClose={() => setDateModalVisible(false)}
      />
      <EventSettingsModal
        key={`${event.dressCode || ''}:${event.notes || ''}`}
        visible={settingsModalVisible}
        dressCode={event.dressCode || ''}
        notes={event.notes || ''}
        onChange={handleSettingsChange}
        onClose={() => setSettingsModalVisible(false)}
      />
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
    minHeight: 190,
    marginHorizontal: 8,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#147D8A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 32, 55, 0.16)',
  },
  backButton: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  heroLabel: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: Spacing.md,
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
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  nextUpBadge: {
    borderRadius: 999,
    backgroundColor: '#1689EE',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 2,
  },
  nextUpText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
    color: '#405673',
    fontSize: Typography.sizes.xs,
    flexShrink: 1,
    textAlign: 'right',
  },
  seeAll: {
    color: '#087AC5',
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
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
    color: '#294B68',
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
    color: '#243750',
    fontSize: 10,
    textAlign: 'center',
  },
  attendeeResponse: {
    fontSize: 9,
    fontWeight: '700',
  },
  goingText: {
    color: '#087A55',
  },
  maybeText: {
    color: '#9A6100',
  },
  cantGoText: {
    color: '#B42318',
  },
  actionsSection: {
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  actionRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F6',
  },
  actionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    color: '#31435F',
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
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
  assignmentsSection: {
    marginHorizontal: Spacing.lg,
    borderRadius: 18,
    padding: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F6',
    paddingTop: Spacing.sm,
  },
  assignmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF5FF',
  },
  assignmentCopy: {
    flex: 1,
    gap: 2,
  },
  assignmentName: {
    color: '#243750',
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
  },
  assignmentTask: {
    color: '#6B7A90',
    fontSize: Typography.sizes.xs,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: 0,
  },
  sectionTitle: {
    color: '#16213A',
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.sm,
  },
  sectionText: {
    color: '#31435F',
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  advSettingsSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  editForm: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  saveChangesButton: {
    backgroundColor: '#1678E8',
    minHeight: 56,
    marginTop: Spacing.sm,
  },
  editSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: Spacing.lg,
    shadowColor: '#54708F',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  editSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  editIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconBlue: { backgroundColor: '#E4F0FF' },
  editIconPurple: { backgroundColor: '#EEE9FF' },
  editIconGreen: { backgroundColor: '#DFF7F0' },
  editIconPink: { backgroundColor: '#FFE4EE' },
  editSectionTitle: {
    color: '#111A30',
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
  },
  editSectionHint: {
    color: '#71829C',
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  lightInput: {
    backgroundColor: '#FFFFFF',
    color: '#17213D',
    borderWidth: 1,
    borderColor: '#D3DEED',
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  descriptionInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  dateTimeField: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: '#D3DEED',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimeCopy: { flex: 1, gap: 3 },
  dateTimeValue: {
    color: '#17213D',
    fontSize: Typography.sizes.base,
    fontWeight: '600',
  },
  dateTimeHint: {
    color: '#71829C',
    fontSize: Typography.sizes.xs,
  },
  assignmentEditSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: Spacing.lg,
    shadowColor: '#54708F',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  assignmentHeaderCopy: { flex: 1 },
  assignmentCount: {
    minWidth: 32,
    height: 30,
    paddingHorizontal: Spacing.sm,
    borderRadius: 15,
    backgroundColor: '#E4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignmentCountText: {
    color: '#1678E8',
    fontWeight: '700',
  },
  assignmentEditCard: {
    borderWidth: 1,
    borderColor: '#DCE6F2',
    borderRadius: 14,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  assignmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  assignmentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DDF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignmentAvatarText: {
    color: '#23618B',
    fontSize: 11,
    fontWeight: '700',
  },
  assignmentNumber: {
    flex: 1,
    color: '#536782',
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  emptyAssignments: {
    color: '#71829C',
    fontSize: Typography.sizes.sm,
    paddingVertical: Spacing.sm,
  },
  addAssignmentButton: {
    minHeight: 52,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9AC7F7',
    borderRadius: 14,
    backgroundColor: '#F1F7FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  addAssignmentText: {
    color: '#1678E8',
    fontSize: Typography.sizes.base,
    fontWeight: '700',
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
