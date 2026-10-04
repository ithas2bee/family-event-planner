import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type HomeLoadingSkeletonProps = {
  topInset: number;
};

function SkeletonBar({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View accessible={false} style={[styles.bar, style]} />;
}

function DashboardCardSkeleton() {
  return (
    <View accessible={false} style={styles.card}>
      <SkeletonBar style={styles.cardTitle} />
      <SkeletonBar style={styles.cardSubtitle} />
      <SkeletonBar style={styles.cardImage} />
      <View style={styles.cardFooter}>
        <SkeletonBar style={styles.footerAvatar} />
        <SkeletonBar style={styles.footerText} />
      </View>
    </View>
  );
}

export function HomeLoadingSkeleton({ topInset }: HomeLoadingSkeletonProps) {
  return (
    <ScrollView
      accessibilityLabel="Loading home"
      accessibilityRole="progressbar"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topInset }]}>
        <SkeletonBar style={styles.menuButton} />
        <View style={styles.headerCopy}>
          <SkeletonBar style={styles.headerTitle} />
          <SkeletonBar style={styles.headerSubtitle} />
          <SkeletonBar style={styles.headerMessage} />
        </View>
        <View style={styles.headerActions}>
          <SkeletonBar style={styles.notificationButton} />
          <SkeletonBar style={styles.profileButton} />
        </View>
      </View>

      <View style={styles.memberSection}>
        <View style={styles.sectionHeader}>
          <SkeletonBar style={styles.memberHeading} />
          <SkeletonBar style={styles.viewAll} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.members}
        >
          {[0, 1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.member}>
              <SkeletonBar style={styles.memberAvatar} />
              <SkeletonBar style={styles.memberName} />
              <SkeletonBar style={styles.memberRole} />
            </View>
          ))}
        </ScrollView>
      </View>

      {[0, 1, 2, 3, 4].map((section) => (
        <View key={section} style={styles.dashboardSection}>
          <View style={styles.sectionHeader}>
            <SkeletonBar style={styles.dashboardHeading} />
            <SkeletonBar style={styles.viewAll} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    padding: 20,
    paddingBottom: 28,
  },
  bar: {
    height: 14,
    borderRadius: 8,
    backgroundColor: '#DCE3EB',
  },
  header: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
    paddingTop: 2,
  },
  headerTitle: {
    width: '82%',
    height: 24,
    borderRadius: 12,
  },
  headerSubtitle: {
    width: '67%',
  },
  headerMessage: {
    width: '92%',
    height: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  notificationButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberHeading: {
    width: 130,
    height: 19,
  },
  viewAll: {
    width: 54,
    height: 13,
  },
  members: {
    flexDirection: 'row',
    gap: 20,
    paddingRight: 12,
  },
  member: {
    alignItems: 'center',
    width: 72,
    gap: 6,
  },
  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  memberName: {
    width: '80%',
    height: 11,
  },
  memberRole: {
    width: '55%',
    height: 9,
  },
  dashboardSection: {
    gap: 10,
  },
  dashboardHeading: {
    width: 145,
    height: 20,
  },
  cards: {
    gap: 10,
    paddingRight: 12,
  },
  card: {
    width: 220,
    minHeight: 164,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: {
    width: '76%',
    height: 15,
  },
  cardSubtitle: {
    width: '52%',
    height: 12,
  },
  cardImage: {
    flex: 1,
    minHeight: 68,
    borderRadius: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  footerText: {
    width: 72,
    height: 10,
  },
});
