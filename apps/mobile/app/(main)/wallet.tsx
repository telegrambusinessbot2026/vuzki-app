import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchApi } from '../../src/lib/api';

export default function WalletScreen() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/wallet')
      .then((data: any) => setBalance(data.coins || 0))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTopup = async () => {
    // In a real app this would trigger the PhonePe native intent via linking or webview
    // We mock the API call intent for UI parity.
    try {
      const res = await fetchApi('/payments/init-phonepe', {
        method: 'POST',
        body: JSON.stringify({ packageId: 'PKG_100_COINS' })
      });
      alert('PhonePe flow initiated. Redirecting to: ' + res.redirectUrl);
    } catch (e: any) {
      alert('Payment initialization failed: ' + e.message);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF4DBD" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      
      <View style={styles.card}>
        <Text style={styles.balanceTitle}>Coin Balance</Text>
        <Text style={styles.balance}>{balance}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleTopup}>
        <Text style={styles.buttonText}>Buy Coins (PhonePe)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f14' },
  container: { flex: 1, backgroundColor: '#0f0f14', padding: 20, paddingTop: 50 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#1a1a24', padding: 30, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  balanceTitle: { color: '#aaa', fontSize: 16, marginBottom: 10 },
  balance: { color: '#FF4DBD', fontSize: 48, fontWeight: 'bold' },
  button: { backgroundColor: '#FF4DBD', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
