import { useRouter } from 'expo-router';
import { Button, View } from 'react-native';

export default function PlusScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Create Group" onPress={() => router.push('/create-group')} />
      <View style={{ height: 16 }} />
      <Button title="Join Group" onPress={() => router.push('/join-group')} />
    </View>
  );
}
