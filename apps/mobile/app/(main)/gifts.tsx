import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { fetchApi } from '../../src/lib/api';

export default function GiftsScreen() {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/gifts')
      .then((data: any) => setGifts(data.gifts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF4DBD" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gifts Library</Text>
      <FlatList
        data={gifts}
        keyExtractor={(item: any) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.placeholder]} />
            )}
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cost}>{item.costCoins} Coins</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f14' },
  container: { flex: 1, backgroundColor: '#0f0f14', padding: 10, paddingTop: 50 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginLeft: 10, marginBottom: 20 },
  card: { flex: 1, backgroundColor: '#1a1a24', margin: 5, padding: 10, borderRadius: 8, alignItems: 'center' },
  image: { width: 60, height: 60, marginBottom: 10 },
  placeholder: { backgroundColor: '#333', borderRadius: 30 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  cost: { color: '#FF4DBD', fontSize: 12, marginTop: 5 }
});
