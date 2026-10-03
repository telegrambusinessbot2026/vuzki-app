import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/lib/auth';
import { useRealtime } from '../../src/lib/realtime';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { initiateCall } = useRealtime();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to VUZKI</Text>
      <Text style={styles.subtitle}>Logged in as {user?.email || user?.phone}</Text>
      
      <TouchableOpacity style={styles.callButton} onPress={() => initiateCall('u2', true)}>
        <Text style={styles.buttonText}>Call u2</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f14',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 30,
  },
  callButton: {
    backgroundColor: '#FF4DBD',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
