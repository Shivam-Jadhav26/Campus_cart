// CampusCart — ChatContext.jsx
// Lightweight context for cross-component chat state (e.g. unread badge on Navbar)
import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, isInitialized } = useAuth();
  const { socket, connected } = useSocket();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadOffersTotal, setUnreadOffersTotal] = useState(0);

  // Stable user ID — only changes on actual login/logout
  const userId = user?.userId || user?._id || null;
  const lastFetchedUserId = useRef(null);
  const isFetching = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadTotal(0);
      return;
    }
    try {
      const res = await api.get('/chat/unread-count');
      if (res.data?.success) {
        setUnreadTotal(res.data.count || 0);
      }
    } catch {
      // ignore — don't retry on failure
    }
  }, [userId]);

  const refreshUnreadOffersCount = useCallback(async () => {
    if (!userId) {
      setUnreadOffersTotal(0);
      return;
    }
    try {
      const res = await api.get('/offers/unread-count');
      if (res.data?.success) {
        setUnreadOffersTotal(res.data.count || 0);
      }
    } catch {
      // ignore
    }
  }, [userId]);

  // Fetch ONCE when (a) auth is ready AND (b) we have a user AND (c) we haven't already fetched for this user
  useEffect(() => {
    if (!isInitialized) return; // Wait until AuthContext has finished its first check

    if (userId && userId !== lastFetchedUserId.current && !isFetching.current) {
      isFetching.current = true;
      lastFetchedUserId.current = userId;
      Promise.all([refreshUnreadCount(), refreshUnreadOffersCount()]).finally(() => {
        isFetching.current = false;
      });
    } else if (!userId) {
      setUnreadTotal(0);
      setUnreadOffersTotal(0);
      lastFetchedUserId.current = null;
    }
  }, [isInitialized, userId, refreshUnreadCount, refreshUnreadOffersCount]);

  // Global Sync via Sockets — only attach listeners once socket is connected and user is valid
  useEffect(() => {
    if (!socket || !connected || !userId) return;

    const handleNewMessage = (msg) => {
      const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
      if (String(senderId) !== String(userId)) {
        setUnreadTotal((prev) => prev + 1);
      }
    };

    const handleReadSync = ({ readBy }) => {
      if (String(readBy) === String(userId)) {
        refreshUnreadCount();
      }
    };

    const handleOfferReceived = () => {
      setUnreadOffersTotal((prev) => prev + 1);
    };

    const handleOfferStatusChanged = () => {
      setUnreadOffersTotal((prev) => prev + 1);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messagesRead', handleReadSync);
    socket.on('offerReceived', handleOfferReceived);
    socket.on('offerStatusChanged', handleOfferStatusChanged);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messagesRead', handleReadSync);
      socket.off('offerReceived', handleOfferReceived);
      socket.off('offerStatusChanged', handleOfferStatusChanged);
    };
  }, [socket, connected, userId, refreshUnreadCount, refreshUnreadOffersCount]);

  const updateUnreadTotal = useCallback((count) => {
    setUnreadTotal(typeof count === 'number' ? count : 0);
  }, []);

  return (
    <ChatContext.Provider value={{
      unreadTotal,
      updateUnreadTotal,
      refreshUnreadCount,
      unreadOffersTotal,
      refreshUnreadOffersCount
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
