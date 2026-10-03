import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Push Notifications</Text>
          <Switch value={true} trackColor={{ true: '#FF4DBD', false: '#333' }} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowText}>Email Alerts</Text>
          <Switch value={false} trackColor={{ true: '#FF4DBD', false: '#333' }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Show Online Status</Text>
          <Switch value={true} trackColor={{ true: '#FF4DBD', false: '#333' }} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowText}>Allow Discovery</Text>
          <Switch value={true} trackColor={{ true: '#FF4DBD', false: '#333' }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14', padding: 20, paddingTop: 50 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  section: { backgroundColor: '#1a1a24', borderRadius: 12, padding: 15, marginBottom: 20 },
  sectionTitle: { color: '#aaa', fontSize: 14, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  rowText: { color: '#fff', fontSize: 16 }
});
