import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import RNCallKeep from 'react-native-callkeep';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3000';

interface RealtimeContextType {
  socket: Socket | null;
  initiateCall: (toUserId: string, hasVideo: boolean) => Promise<string>;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  endCall: (callId: string) => Promise<void>;
  localStream: any;
  remoteStream: any;
  callState: 'idle' | 'calling' | 'ringing' | 'connected';
  currentCallId: string | null;
  toggleMute: () => void;
  toggleCamera: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
}

export const RealtimeContext = createContext<RealtimeContextType>(null as any);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const router = useRouter();

  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const activeCallRef = useRef<string | null>(null);
  
  useEffect(() => {
    let s: Socket;
    async function connect() {
      if (!user) return;
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      s = io(WS_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      s.on('connect', () => console.log('Socket connected'));
      
      s.on('call:incoming', (payload) => {
        // Handled by background push usually, but if foreground:
        setCallState('ringing');
        setCurrentCallId(payload.callId);
        activeCallRef.current = payload.callId;
        RNCallKeep.displayIncomingCall(payload.callId, payload.from, 'Incoming Call', 'generic', payload.hasVideo);
      });

      s.on('call:accepted', async (payload) => {
        if (payload.callId === activeCallRef.current) {
          setCallState('connected');
        }
      });

      s.on('call:rejected', () => cleanupCall());
      s.on('call:ended', () => cleanupCall());
      s.on('call:canceled', () => cleanupCall());
      
      s.on('call:signal', async (payload) => {
        if (!pc.current) return;
        const { event, data } = payload;
        try {
          if (event === 'offer') {
            await pc.current.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
            s.emit('call:signal', { to: payload.from, callId: payload.callId, event: 'answer', data: answer });
          } else if (event === 'answer') {
            await pc.current.setRemoteDescription(new RTCSessionDescription(data));
          } else if (event === 'candidate') {
            await pc.current.addIceCandidate(new RTCIceCandidate(data));
          }
        } catch (e) {
          console.log('Signal error', e);
        }
      });

      setSocket(s);
    }
    
    connect();

    return () => {
      s?.disconnect();
    };
  }, [user]);

  useEffect(() => {
    // CallKeep Listeners
    RNCallKeep.addEventListener('answerCall', async ({ callUUID }) => {
      await acceptCall(callUUID);
      router.push(`/(main)/call/${callUUID}`);
    });
    RNCallKeep.addEventListener('endCall', async ({ callUUID }) => {
      await rejectCall(callUUID); // or endCall
    });

    return () => {
      RNCallKeep.removeEventListener('answerCall');
      RNCallKeep.removeEventListener('endCall');
    };
  }, [socket]);

  async function getIceServers() {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/calls/turn-credentials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) return data.data.iceServers;
    } catch (e) {}
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }

  async function setupPeerConnection(hasVideo: boolean) {
    const iceServers = await getIceServers();
    const peer = new RTCPeerConnection({ iceServers });
    
    peer.onicecandidate = (event) => {
      if (event.candidate && socket && activeCallRef.current) {
        socket.emit('call:signal', {
           callId: activeCallRef.current,
           event: 'candidate',
           data: event.candidate
        });
      }
    };

    peer.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: hasVideo
    });
    setLocalStream(stream);
    stream.getTracks().forEach(t => peer.addTrack(t, stream));

    pc.current = peer;
    return peer;
  }

  const initiateCall = async (toUserId: string, hasVideo: boolean) => {
    return new Promise<string>((resolve, reject) => {
      if (!socket) return reject('No socket');
      socket.emit('call:initiate', { to: toUserId, hasVideo }, async (res: any) => {
        if (res.success) {
          const callId = res.data.callId;
          activeCallRef.current = callId;
          setCurrentCallId(callId);
          setCallState('calling');
          
          const peer = await setupPeerConnection(hasVideo);
          const offer = await peer.createOffer({});
          await peer.setLocalDescription(offer);
          socket.emit('call:signal', { to: toUserId, callId, event: 'offer', data: offer });
          resolve(callId);
        } else {
          reject(res.message);
        }
      });
    });
  };

  const acceptCall = async (callId: string) => {
    if (!socket) return;
    activeCallRef.current = callId;
    setCurrentCallId(callId);
    setCallState('connected');
    await setupPeerConnection(true); // Default to video support for simplicity
    socket.emit('call:accept', { callId }, () => {});
    RNCallKeep.answerIncomingCall(callId);
  };

  const rejectCall = async (callId: string) => {
    if (!socket) return;
    socket.emit('call:reject', { callId }, () => {});
    cleanupCall();
  };

  const endCall = async (callId: string) => {
    if (!socket) return;
    socket.emit('call:end', { callId }, () => {});
    cleanupCall();
  };

  const cleanupCall = () => {
    if (activeCallRef.current) {
      RNCallKeep.endCall(activeCallRef.current);
    }
    pc.current?.close();
    pc.current = null;
    localStream?.getTracks().forEach((t: any) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setCurrentCallId(null);
    activeCallRef.current = null;
    router.back();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <RealtimeContext.Provider value={{ socket, initiateCall, acceptCall, rejectCall, endCall, localStream, remoteStream, callState, currentCallId, toggleMute, toggleCamera, isMuted, isCameraOff }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => useContext(RealtimeContext);
