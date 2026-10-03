import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/lib/auth';
import { fetchApi } from '../../src/lib/api';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/users/me')
      .then((data: any) => setProfile(data.user || user))
      .catch(() => setProfile(user))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF4DBD" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={() => router.push('/(main)/settings')}>
          <Text style={styles.link}>Settings</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.card}>
        <View style={styles.avatarPlaceholder} />
        <Text style={styles.name}>{profile?.displayName || profile?.username || 'User'}</Text>
        <Text style={styles.subtitle}>@{profile?.username}</Text>
        <Text style={styles.bio}>{profile?.bio || 'No bio provided'}</Text>
      </View>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(main)/wallet')}>
        <Text style={styles.menuText}>Wallet & Coins</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(main)/referrals')}>
        <Text style={styles.menuText}>Referrals</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(main)/safety')}>
        <Text style={styles.menuText}>Safety & Blocks</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.menuItem, styles.logout]} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f14' },
  container: { flex: 1, backgroundColor: '#0f0f14', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  link: { color: '#FF4DBD', fontSize: 16 },
  card: { backgroundColor: '#1a1a24', margin: 20, padding: 20, borderRadius: 12, alignItems: 'center' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#333', marginBottom: 15 },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#aaa', fontSize: 16, marginBottom: 15 },
  bio: { color: '#ddd', fontSize: 14, textAlign: 'center' },
  menuItem: { backgroundColor: '#1a1a24', padding: 20, marginHorizontal: 20, marginBottom: 10, borderRadius: 8 },
  menuText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  logout: { backgroundColor: '#331115', marginTop: 20 },
  logoutText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }
});
