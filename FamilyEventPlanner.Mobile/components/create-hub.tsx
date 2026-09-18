import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const creationOptions = [
  {
    title: 'Create Group',
    description: 'Start a new family group to keep everyone connected.',
    icon: 'groups',
    iconColor: '#1687D9',
    backgroundColor: '#EAF5FF',
    iconBackgroundColor: '#D5ECFF',
    route: '/create-group',
  },
  {
    title: 'Create Event',
    description: 'Plan a special event with all the details.',
    icon: 'calendar-month',
    iconColor: '#0D9F7A',
    backgroundColor: '#EAFBF7',
    iconBackgroundColor: '#D4F5ED',
    route: '/create-event',
  },
  {
    title: 'Create Kickback',
    description: 'Set up a quick, spontaneous hangout in just a few taps.',
    icon: 'bolt',
    iconColor: '#ED7B12',
    backgroundColor: '#FFF5E9',
    iconBackgroundColor: '#FFE9CF',
    route: '/create-kickback',
  },
  {
    title: 'Create Poll',
    description: 'Get quick opinions from your family.',
    icon: 'poll',
    iconColor: '#6841D8',
    backgroundColor: '#F5EEFF',
    iconBackgroundColor: '#E9DCFF',
    route: '/create-poll',
  },
  {
    title: 'Create Announcement',
    description: 'Share important news with your family.',
    icon: 'campaign',
    iconColor: '#D9364D',
    backgroundColor: '#FFF0F2',
    iconBackgroundColor: '#FFDDE2',
    route: '/create-announcement',
  },
] as const;

export function CreateHub() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headingRow}>
            <View>
              <Text style={styles.heading}>Create</Text>
              <Text style={styles.subtitle}>
                Bring your family closer. Create{'\n'}something special. ✨
              </Text>
            </View>
            <MaterialIcons name="celebration" size={52} color="#F5B82E" />
          </View>
        </View>

        <View style={styles.options}>
          {creationOptions.map((option) => (
            <Pressable
              key={option.title}
              accessibilityRole="button"
              accessibilityLabel={option.title}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: option.backgroundColor },
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push(option.route)}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.iconBackgroundColor }]}>
                <MaterialIcons name={option.icon} size={34} color={option.iconColor} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </View>
              <View style={styles.arrowContainer}>
                <MaterialIcons name="chevron-right" size={30} color="#17345D" />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7FAFF',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 28,
  },
  header: {
    paddingHorizontal: 6,
    paddingBottom: 26,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    color: '#10264C',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    color: '#5A6D8D',
    fontSize: 18,
    lineHeight: 28,
    marginTop: 8,
  },
  options: {
    gap: 16,
  },
  card: {
    minHeight: 148,
    borderRadius: 26,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#7B91B2',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: '#10264C',
    fontSize: 22,
    fontWeight: '700',
  },
  cardDescription: {
    color: '#586B89',
    fontSize: 16,
    lineHeight: 23,
  },
  arrowContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
