import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { fetchApi } from '../../src/lib/api';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/notifications')
      .then((data: any) => setNotifications(data.notifications || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF4DBD" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      {notifications.length === 0 ? (
        <Text style={styles.emptyText}>No recent notifications.</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, !item.read ? styles.unread : {}]}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
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
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  emptyText: { color: '#666', fontSize: 16, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#1a1a24', padding: 15, borderRadius: 8, marginBottom: 10 },
  unread: { borderLeftWidth: 4, borderLeftColor: '#FF4DBD' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  cardBody: { color: '#aaa', fontSize: 14, marginBottom: 10 },
  date: { color: '#555', fontSize: 12, textAlign: 'right' }
});
