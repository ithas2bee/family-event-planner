import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { EventHeroSection } from '@/components/events/EventHeroSection';
import { EventDetailsCard } from '@/components/events/EventDetailsCard';
import { ThemedText } from '@/components/themed-text';
import { ScreenContainer } from '@/components/ui/screen-container';
import { GlassCard } from '@/components/ui/glass-card';
import { getEventById, Event } from '@/services/eventService';
import { loadSession } from '@/services/sessionService';
import { Colors, Spacing, Typography } from '@/components/ui/design-system';
import { StyleSheet } from 'react-native';
import { ModalSheet } from '@/components/ui/modal-sheet';
import { updateEvent } from '@/services/eventService';
import { FormInput } from '@/components/ui/form-input';
import { ImmersiveButton } from '@/components/ui/immersive-button';

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || typeof eventId !== 'string') {
      setError('Invalid event ID.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        // Ensure eventId is a string
        const validEventId = Array.isArray(eventId) ? eventId[0] : eventId;

        // Load event and session in parallel
        const [eventData, session] = await Promise.all([
          getEventById(validEventId),
          loadSession(),
        ]);

        if (!cancelled) {
          setEvent(eventData);
          setCurrentMemberId(session?.memberId || '');
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

  // Determine if current user is the event creator
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
      setEvent(updatedEvent);
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
        height={240}
      />

      <View style={styles.contentContainer}>
        <EventDetailsCard
          title={event.title}
          date={event.startDate ? new Date(event.startDate).toLocaleString() : 'TBD'}
          location={event.location || 'TBD'}
          onPressSettings={() => setIsEditing(true)}
          showSettings={isCreator}
        />

        {event.description && (
          <GlassCard style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Description
            </ThemedText>
            <ThemedText style={styles.sectionText}>
              {event.description}
            </ThemedText>
          </GlassCard>
        )}

        {event.dressCode && (
          <GlassCard style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Dress Code
            </ThemedText>
            <ThemedText style={styles.sectionText}>
              {event.dressCode}
            </ThemedText>
          </GlassCard>
        )}

        {event.notes && (
          <GlassCard style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Notes
            </ThemedText>
            <ThemedText style={styles.sectionText}>
              {event.notes}
            </ThemedText>
          </GlassCard>
        )}

        {event.creatorDisplayName && (
          <GlassCard style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Created By
            </ThemedText>
            <ThemedText style={styles.sectionText}>
              {event.creatorDisplayName}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.md,
  },
  sectionText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  errorMessage: {
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
