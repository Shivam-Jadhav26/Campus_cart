import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const useChat = (conversationId) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { socket, connected, onlineUsers } = useSocket();
  const prevConvoRef = useRef(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setTypingUsers(new Set());
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat/conversations/${conversationId}/messages`);
        if (isMounted && res.data.success) {
          // API returns { success: true, data: [messages array] }
          setMessages(Array.isArray(res.data.data) ? res.data.data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to fetch messages');
          setMessages([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();

    // Leave previous conversation room
    if (socket && connected && prevConvoRef.current && prevConvoRef.current !== conversationId) {
      socket.emit('leaveConversation', { conversationId: prevConvoRef.current });
    }
    prevConvoRef.current = conversationId;

    if (socket && connected) {
      socket.emit('joinConversation', { conversationId });

      const handleNewMessage = (msg) => {
        if (!isMounted) return;
        // Only add messages for the active conversation
        if (msg.conversation && msg.conversation !== conversationId) return;

        setMessages((prev) => {
          // Deduplicate: check by _id, also replace optimistic messages
          const existingIdx = prev.findIndex(
            (m) => m._id === msg._id || (m.isOptimistic && m.text === msg.text)
          );
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = msg;
            return updated;
          }
          return [...prev, msg];
        });
      };

      const handleTyping = ({ userId }) => {
        if (isMounted) setTypingUsers((prev) => new Set(prev).add(userId));
      };

      const handleStopTyping = ({ userId }) => {
        if (isMounted) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        }
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('typing', handleTyping);
      socket.on('stopTyping', handleStopTyping);

      return () => {
        isMounted = false;
        socket.off('newMessage', handleNewMessage);
        socket.off('typing', handleTyping);
        socket.off('stopTyping', handleStopTyping);
        socket.emit('leaveConversation', { conversationId });
      };
    }

    return () => {
      isMounted = false;
    };
  }, [conversationId, socket, connected]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || !conversationId) return;

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const optimisticMsg = {
        _id: tempId,
        text: text.trim(),
        // Use the real user ID so isMine() resolves correctly immediately
        sender: { _id: user?.userId || user?._id || '__optimistic__' },
        type: 'text',
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      if (socket && connected) {
        socket.emit('sendMessage', { conversationId, text: text.trim() }, (res) => {
          if (res.error) {
            // Remove optimistic message on error
            setMessages((prev) => prev.filter((m) => m._id !== tempId));
          }
          // The newMessage event from server will replace the optimistic message
        });
      } else {
        // REST fallback
        try {
          const res = await api.post('/chat/messages', {
            conversationId,
            text: text.trim(),
          });
          if (res.data.success) {
            setMessages((prev) =>
              prev.map((m) => (m._id === tempId ? res.data.data : m))
            );
          }
        } catch (err) {
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      }
    },
    [conversationId, socket, connected]
  );

  const emitTyping = useCallback(() => {
    if (socket && connected && conversationId) {
      socket.emit('typing', { conversationId });
    }
  }, [socket, connected, conversationId]);

  const emitStopTyping = useCallback(() => {
    if (socket && connected && conversationId) {
      socket.emit('stopTyping', { conversationId });
    }
  }, [socket, connected, conversationId]);

  return {
    messages,
    sendMessage,
    emitTyping,
    emitStopTyping,
    typingUsers,
    onlineUsers,
    loading,
    error,
  };
};
