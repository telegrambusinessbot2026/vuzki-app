import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RTCView } from 'react-native-webrtc';
import { useRealtime } from '../../../src/lib/realtime';

export default function CallScreen() {
  const { id } = useLocalSearchParams();
  const { localStream, remoteStream, callState, endCall, toggleMute, toggleCamera, isMuted, isCameraOff } = useRealtime();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Call ID: {id}</Text>
      <Text style={styles.subtitle}>State: {callState}</Text>
      
      <View style={styles.videoContainer}>
        {remoteStream && remoteStream.toURL ? (
          <RTCView 
            streamURL={remoteStream.toURL()} 
            style={styles.remoteVideo} 
            objectFit="cover" 
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.text}>Waiting for remote video...</Text>
          </View>
        )}

        {localStream && localStream.toURL && !isCameraOff && (
          <View style={styles.localVideoContainer}>
            <RTCView 
              streamURL={localStream.toURL()} 
              style={styles.localVideo} 
              objectFit="cover" 
              zOrder={1}
            />
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlButton, isMuted && styles.controlButtonOff]} onPress={toggleMute}>
          <Text style={styles.buttonText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.controlButton, isCameraOff && styles.controlButtonOff]} onPress={toggleCamera}>
          <Text style={styles.buttonText}>{isCameraOff ? 'Cam On' : 'Cam Off'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endButton} onPress={() => endCall(id as string)}>
          <Text style={styles.endButtonText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    marginTop: 60,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 10,
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#111',
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#666',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 100,
    height: 150,
    backgroundColor: '#333',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#444',
  },
  localVideo: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    padding: 30,
    paddingBottom: 50,
    backgroundColor: '#0f0f14',
  },
  controlButton: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 30,
    width: 80,
    alignItems: 'center',
  },
  controlButtonOff: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
  },
  endButton: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 30,
    width: 120,
    alignItems: 'center',
  },
  endButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
