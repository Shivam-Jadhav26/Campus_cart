import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

let socketInstance = null;
let globalOnlineUsers = new Set();
const subscribers = new Set();
let connectionAttempted = false;

const notifySubscribers = () => {
  const newSet = new Set(globalOnlineUsers);
  subscribers.forEach((setFn) => setFn(newSet));
};

export const useSocket = () => {
  const [socket, setSocket] = useState(socketInstance);
  const [connected, setConnected] = useState(socketInstance?.connected || false);
  const [onlineUsers, setOnlineUsers] = useState(new Set(globalOnlineUsers));
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    subscribers.add(setOnlineUsers);

    if (socketInstance && socketInstance.connected) {
      setSocket(socketInstance);
      setConnected(true);
    } else if (!socketInstance && !connectionAttempted) {
      connectionAttempted = true;

      const initSocket = async () => {
        try {
          const localToken = localStorage.getItem('token');
          if (!localToken) {
            connectionAttempted = false;
            return;
          }

          const res = await api.get('/auth/token');
          if (!res.data || !res.data.token) {
            connectionAttempted = false;
            return;
          }

          const isDev = import.meta.env.MODE === 'development';
          let backendUrl = import.meta.env.VITE_API_URL || 
            (isDev ? "http://localhost:10000" : "https://campuscart-auwp.onrender.com");
            
          // Ensure Socket.io points to the root server, not the /api proxy path
          if (backendUrl === '/api') {
            backendUrl = "https://campuscart-auwp.onrender.com";
          } else if (backendUrl.endsWith('/api')) {
            backendUrl = backendUrl.replace(/\/api\/?$/, '');
          }

          socketInstance = io(backendUrl, {
            auth: { token: res.data.token },
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
          });

          socketInstance.on('connect', () => {
            if (mountedRef.current) {
              setConnected(true);
              setSocket(socketInstance);
            }
            // Auto-rejoin all conversations on reconnect
            socketInstance.emit('rejoinConversations', (res) => {
              // silent
            });
          });

          socketInstance.on('disconnect', () => {
            if (mountedRef.current) setConnected(false);
            globalOnlineUsers.clear();
            notifySubscribers();
          });

          socketInstance.on('reconnect', () => {
            if (mountedRef.current) setConnected(true);
            socketInstance.emit('rejoinConversations');
          });

          socketInstance.on('initialOnlineUsers', (users) => {
            globalOnlineUsers = new Set(users);
            notifySubscribers();
          });

          socketInstance.on('userOnline', ({ userId }) => {
            globalOnlineUsers.add(userId);
            notifySubscribers();
          });

          socketInstance.on('userOffline', ({ userId }) => {
            globalOnlineUsers.delete(userId);
            notifySubscribers();
          });

          if (mountedRef.current) {
            setSocket(socketInstance);
          }
        } catch (error) {
          connectionAttempted = false;
        }
      };

      initSocket();
    }

    return () => {
      mountedRef.current = false;
      subscribers.delete(setOnlineUsers);
    };
  }, []);

  return { socket, connected, onlineUsers };
};

// Utility to disconnect socket on logout
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    connectionAttempted = false;
    globalOnlineUsers.clear();
    notifySubscribers();
  }
};
