import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { fetchApi } from '../../src/lib/api';

export default function ReferralsScreen() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/referrals')
      .then((data: any) => setReferrals(data.referrals || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF4DBD" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Referrals</Text>
      {referrals.length === 0 ? (
        <Text style={styles.emptyText}>You haven't referred anyone yet.</Text>
      ) : (
        <FlatList
          data={referrals}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>User: {item.referredId}</Text>
              <Text style={[styles.status, item.status === 'ELIGIBLE' ? styles.statusEligible : {}]}>
                {item.status}
              </Text>
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
  emptyText: { color: '#aaa', fontSize: 16, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#1a1a24', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontSize: 16 },
  status: { color: '#aaa', fontSize: 14, fontWeight: 'bold' },
  statusEligible: { color: '#4CAF50' }
});
