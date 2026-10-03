import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { fetchApi } from '../../src/lib/api';

export default function SafetyScreen() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlocked();
  }, []);

  const loadBlocked = () => {
    setLoading(true);
    fetchApi('/users/blocked')
      .then((data: any) => setBlocked(data.blocked || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleUnblock = async (id: string) => {
    try {
      await fetchApi(`/users/blocked/${id}`, { method: 'DELETE' });
      Alert.alert('Success', 'User unblocked.');
      loadBlocked();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF4DBD" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safety & Blocks</Text>
      <Text style={styles.subtitle}>Blocked Users</Text>
      
      {blocked.length === 0 ? (
        <Text style={styles.emptyText}>You haven't blocked anyone.</Text>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.username || item.id}</Text>
              <TouchableOpacity onPress={() => handleUnblock(item.id)}>
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f14' },
  container: { flex: 1, backgroundColor: '#0f0f14', padding: 20, paddingTop: 50 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#aaa', fontSize: 18, marginBottom: 20 },
  emptyText: { color: '#666', fontSize: 16, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#1a1a24', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontSize: 16 },
  unblockText: { color: '#FF4DBD', fontSize: 14, fontWeight: 'bold' }
});
