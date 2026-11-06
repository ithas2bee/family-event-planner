import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

type Community = { id: string; name: string };

type CommunitySelectorProps = {
  communities: Community[];
  selectedCommunityId: string;
  onSelect: (communityId: string) => void;
};

export function CommunitySelector({ communities, selectedCommunityId, onSelect }: CommunitySelectorProps) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const selectedCommunity = communities.find((community) => community.id === selectedCommunityId);
  const filteredCommunities = communities.filter((community) =>
    community.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const close = () => {
    setVisible(false);
    setSearch('');
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select community. ${selectedCommunity?.name ?? 'No community selected'}`}
        onPress={() => setVisible(true)}
        style={styles.selector}
      >
        <View style={styles.selectorCopy}>
          <ThemedText style={styles.selectedName}>{selectedCommunity?.name ?? 'Select a community'}</ThemedText>
          <ThemedText style={styles.communityCount}>
            {communities.length} {communities.length === 1 ? 'community' : 'communities'}
          </ThemedText>
        </View>
        <Ionicons name="chevron-down" size={22} color="#1769E0" />
      </Pressable>

      <Modal
        visible={visible}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={close}
      >
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Select a community</ThemedText>
              <Pressable accessibilityRole="button" accessibilityLabel="Close community selector" onPress={close} hitSlop={10}>
                <Ionicons name="close" size={26} color="#687A96" />
              </Pressable>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#687A96" />
              <TextInput
                accessibilityLabel="Search communities"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setSearch}
                placeholder="Search communities"
                placeholderTextColor="#8A96AA"
                returnKeyType="search"
                style={styles.searchInput}
                value={search}
              />
            </View>
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {filteredCommunities.map((community) => {
                const selected = community.id === selectedCommunityId;
                return (
                  <Pressable
                    key={community.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onSelect(community.id);
                      close();
                    }}
                    style={[styles.option, selected && styles.selectedOption]}
                  >
                    <ThemedText style={[styles.optionText, selected && styles.selectedOptionText]}>{community.name}</ThemedText>
                    {selected && <Ionicons name="checkmark" size={20} color="#1769E0" />}
                  </Pressable>
                );
              })}
              {filteredCommunities.length === 0 && (
                <ThemedText style={styles.empty}>No communities match your search.</ThemedText>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#CDD5E3', borderRadius: 12, backgroundColor: '#fff' },
  selectorCopy: { flex: 1, gap: 3 },
  selectedName: { color: '#101B41', fontSize: 16, fontWeight: '600' },
  communityCount: { color: '#687A96', fontSize: 13 },
  overlay: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15, 30, 50, 0.52)' },
  modal: { width: '100%', maxHeight: '90%', borderRadius: 18, padding: 18, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { color: '#101B41', fontSize: 19, fontWeight: '700' },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#CDD5E3', borderRadius: 11 },
  searchInput: { flex: 1, minHeight: 46, color: '#101B41', fontSize: 16 },
  list: { flexShrink: 1, maxHeight: 480, marginTop: 10 },
  option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EEF1F7' },
  selectedOption: { backgroundColor: '#EAF2FF' },
  optionText: { flex: 1, color: '#293657', fontSize: 16 },
  selectedOptionText: { color: '#1769E0', fontWeight: '700' },
  empty: { paddingVertical: 20, color: '#687A96', textAlign: 'center' },
});
