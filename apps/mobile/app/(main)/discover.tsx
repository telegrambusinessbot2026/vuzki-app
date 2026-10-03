import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { fetchApi } from '../../src/lib/api';
import { useRouter } from 'expo-router';

export default function DiscoverScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchApi('/discovery/feed')
      .then((data: any) => setUsers(data.users || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#FF4DBD" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Discover</Text>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/profile/${item.id}`)}
          >
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholder]} />
            )}
            <Text style={styles.name}>{item.displayName || item.username}</Text>
            <Text style={styles.details}>{item.age ? `${item.age} • ` : ''}{item.gender}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f14' },
  container: { flex: 1, backgroundColor: '#0f0f14', paddingTop: 50 },
  header: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginLeft: 20, marginBottom: 20 },
  list: { paddingHorizontal: 10 },
  card: { flex: 1, margin: 10, backgroundColor: '#1a1a24', borderRadius: 12, overflow: 'hidden', alignItems: 'center', paddingBottom: 15 },
  avatar: { width: '100%', aspectRatio: 1, marginBottom: 10 },
  placeholder: { backgroundColor: '#333' },
  name: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  details: { color: '#aaa', fontSize: 14 }
});
