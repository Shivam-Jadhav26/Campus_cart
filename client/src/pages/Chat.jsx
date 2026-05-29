import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';
import api from '../services/api';
import styles from './Chat.module.css';

// ─── Gmail-style Avatar Helpers ───
const GMAIL_COLORS = [
  '#1da1f2', '#784ba0', '#2b1055', '#ed1c24', '#00aeef',
  '#22c55e', '#f59e0b', '#ec4899', '#6366f1', '#8b5cf6'
];

const getAvatarColor = (id) => {
  if (!id) return GMAIL_COLORS[0];
  const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return GMAIL_COLORS[hash % GMAIL_COLORS.length];
};

const getInitials = (name, email) => {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
};

const Chat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const [convoLoading, setConvoLoading] = useState(true);
  const [convoError, setConvoError] = useState(null);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const {
    messages,
    sendMessage,
    emitTyping,
    emitStopTyping,
    typingUsers,
    onlineUsers,
    loading: msgLoading,
    error: msgError,
  } = useChat(activeConvoId);

  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Deep-link from query param
  useEffect(() => {
    const convoId = searchParams.get('conversationId');
    if (convoId) {
      setActiveConvoId(convoId);
      setIsMobileChatOpen(true);
    }
  }, [searchParams]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setConvoLoading(true);
      setConvoError(null);
      const res = await api.get('/chat/conversations');
      if (res.data.success) {
        setConversations(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      setConvoError('Failed to load conversations');
    } finally {
      setConvoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Refresh conversation list when messages change (for last message preview)
  useEffect(() => {
    if (messages.length > 0) {
      fetchConversations();
    }
  }, [messages.length]);

  // Auto-scroll to bottom
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, typingUsers]);

  // Focus input when conversation changes
  useEffect(() => {
    if (activeConvoId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeConvoId]);

  const handleSelectConvo = useCallback((id) => {
    setActiveConvoId(id);
    setIsMobileChatOpen(true);
    setInput('');
  }, []);

  const handleInput = useCallback(
    (e) => {
      setInput(e.target.value);
      emitTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping();
      }, 1500);
    },
    [emitTyping, emitStopTyping]
  );

  const handleSend = useCallback(
    (e) => {
      e.preventDefault();
      if (!input.trim()) return;
      sendMessage(input);
      setInput('');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitStopTyping();
    },
    [input, sendMessage, emitStopTyping]
  );

  const handleBack = useCallback(() => {
    setIsMobileChatOpen(false);
    setActiveConvoId(null);
  }, []);

  const handleAcceptOffer = async (offerId) => {
    if (!offerId) return;
    if (!window.confirm("Are you sure you want to accept this offer? This will mark the item as sold.")) return;
    try {
      await api.patch(`/offers/${offerId}/accept`);
      // Socket will handle UI update via newMessage
    } catch (err) {
      alert(err.response?.data?.message || "Failed to accept offer");
    }
  };

  const handleDeclineOffer = async (offerId) => {
    if (!offerId) return;
    if (!window.confirm("Reject this offer?")) return;
    try {
      await api.patch(`/offers/${offerId}/reject`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject offer");
    }
  };

  const handleCounterOffer = () => {
    setInput("How about ₹");
    if (inputRef.current) {
       setTimeout(() => inputRef.current.focus(), 100);
    }
  };

  const activeConvo = useMemo(
    () => conversations.find((c) => c._id === activeConvoId),
    [conversations, activeConvoId]
  );

  const getOtherParticipant = useCallback(
    (participants) => {
      if (!participants || !Array.isArray(participants)) return null;
      const myId = String(user?.userId || user?._id || '');
      return participants.find((p) => String(p?._id) !== myId) || participants[0] || null;
    },
    [user]
  );

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((convo) => {
      const other = getOtherParticipant(convo.participants);
      return (
        other?.name?.toLowerCase().includes(q) ||
        convo.listing?.title?.toLowerCase().includes(q) ||
        convo.lastMessage?.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery, getOtherParticipant]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = '';
    messages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toLocaleDateString([], {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', date: msgDate, id: `date_${msgDate}` });
      }
      groups.push({ type: 'message', ...msg });
    });
    return groups;
  }, [messages]);

  const otherUser = activeConvo ? getOtherParticipant(activeConvo.participants) : null;
  const isOtherOnline = otherUser ? onlineUsers.has(otherUser._id) : false;
  const isOtherTyping = otherUser ? typingUsers.has(otherUser._id) : false;

  return (
    <>
      <Navbar />
      <div className={`${styles.chatApp} ${isMobileChatOpen ? styles.showChat : ''}`}>
        {/* ─── LEFT: Conversations Panel ─── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarAccent}></div>
            <h2 className={styles.sidebarTitle}>
              Conversations
            </h2>
          </div>

          {/* Search */}
          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Conversation list */}
          <div className={styles.convoList}>
            {convoLoading ? (
              <div className={styles.stateContainer}>
                <div className={styles.spinner} />
                <p>Loading conversations...</p>
              </div>
            ) : convoError ? (
              <div className={styles.stateContainer}>
                <span className={styles.errorIcon}>⚠️</span>
                <p>{convoError}</p>
                <button className={styles.retryBtn} onClick={fetchConversations}>
                  Retry
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className={styles.stateContainer}>
                <span className={styles.emptyIcon}>📭</span>
                <p className={styles.emptyText}>
                  {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
                </p>
                {!searchQuery && (
                  <p className={styles.emptySubtext}>
                    Start chatting by making an offer on a listing!
                  </p>
                )}
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const other = getOtherParticipant(convo.participants);
                const isOnline = other ? onlineUsers.has(other._id) : false;
                const isActive = activeConvoId === convo._id;

                return (
                  <div
                    key={convo._id}
                    className={`${styles.convoItem} ${isActive ? styles.convoActive : ''}`}
                    onClick={() => handleSelectConvo(convo._id)}
                    role="button"
                    tabIndex={0}
                    id={`conversation-${convo._id}`}
                  >
                    <div className={styles.avatarWrapper}>
                      <div className={styles.avatar}>
                        {other?.avatar ? (
                          <img src={other.avatar} alt={other.name} className={styles.avatarImg} />
                        ) : (
                          <span>{getInitials(other?.name, other?.email)}</span>
                        )}
                      </div>
                      {isOnline && <span className={styles.onlineDot} />}
                    </div>
                    <div className={styles.convoInfo}>
                      <div className={styles.convoTopRow}>
                        <span className={styles.convoName}>{other?.name || other?.email || 'User'}</span>
                        <span className={styles.convoTime}>{formatTime(convo.lastMessageAt)}</span>
                      </div>
                      <div className={styles.convoBottomRow}>
                        <span className={styles.convoPreview}>
                          {convo.lastMessage || 'No messages yet'}
                        </span>
                        {convo.unreadCount > 0 && (
                          <span className={styles.unreadBadge}>{convo.unreadCount}</span>
                        )}
                      </div>
                      {convo.listing && (
                        <div className={styles.convoListing}>
                          📦 {convo.listing.title}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className={styles.fabBtnWrap}>
            <button className={styles.fabBtn} aria-label="New Chat" onClick={() => navigate('/')}>
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </aside>

        {/* ─── RIGHT: Chat Panel ─── */}
        <main className={styles.chatMain}>
          {!activeConvo ? (
            <div className={styles.noChatState}>
              <div className={styles.noChatGraphic}>
                <svg viewBox="0 0 120 120" fill="none" className={styles.noChatSvg}>
                  <circle cx="60" cy="60" r="55" fill="url(#grad1)" opacity="0.1" />
                  <path
                    d="M40 45h40a5 5 0 015 5v20a5 5 0 01-5 5H55l-10 8v-8h-5a5 5 0 01-5-5V50a5 5 0 015-5z"
                    fill="url(#grad1)"
                    opacity="0.6"
                  />
                  <circle cx="52" cy="60" r="3" fill="#fff" />
                  <circle cx="60" cy="60" r="3" fill="#fff" />
                  <circle cx="68" cy="60" r="3" fill="#fff" />
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="120" y2="120">
                      <stop offset="0%" stopColor="#6C63FF" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 className={styles.noChatTitle}>Select a conversation</h3>
              <p className={styles.noChatSubtitle}>
                Choose a conversation from the sidebar to start chatting
              </p>
              <button className={styles.browseBtn} onClick={() => navigate('/')}>
                Browse Listings
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className={styles.chatHeader}>
                <button
                  className={styles.backBtn}
                  onClick={handleBack}
                  aria-label="Back to conversations"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className={styles.headerAvatarWrap}>
                  <div className={styles.headerAvatar}>
                    {otherUser?.avatar ? (
                      <img src={otherUser.avatar} alt={otherUser.name} className={styles.avatarImg} />
                    ) : (
                      <span>{getInitials(otherUser?.name, otherUser?.email)}</span>
                    )}
                  </div>
                  {isOtherOnline && <span className={styles.headerOnlineDot} />}
                </div>
                <div className={styles.headerInfo}>
                  <h3 className={styles.headerName}>{otherUser?.name || otherUser?.email || 'User'}</h3>
                  <span className={`${styles.headerStatus} ${isOtherOnline ? styles.online : styles.offline}`}>
                    {isOtherTyping ? (
                      <span className={styles.typingStatus}>typing...</span>
                    ) : isOtherOnline ? (
                      'Online'
                    ) : (
                      'Offline'
                    )}
                  </span>
                </div>
                {activeConvo.listing && (
                  <div className={styles.headerListing}>
                    <span className={styles.headerListingTitle}>
                      📦 {activeConvo.listing.title}
                    </span>
                    {activeConvo.listing.price && (
                      <span className={styles.headerListingPrice}>
                        ₹{activeConvo.listing.price}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className={styles.messagesArea} ref={scrollRef}>
                {msgLoading && messages.length === 0 ? (
                  <div className={styles.stateContainer}>
                    <div className={styles.spinner} />
                    <p>Loading messages...</p>
                  </div>
                ) : msgError ? (
                  <div className={styles.stateContainer}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <p>{msgError}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className={styles.stateContainer}>
                    <span className={styles.emptyIcon}>👋</span>
                    <p className={styles.emptyText}>No messages yet</p>
                    <p className={styles.emptySubtext}>Say hello to start the conversation!</p>
                  </div>
                ) : (
                  groupedMessages.map((item, index) => {
                    if (item.type === 'date') {
                      return (
                        <div key={item.id} className={styles.dateDivider}>
                          <span>{item.date}</span>
                        </div>
                      );
                    }

                    const msg = item;

                    /**
                     * Resolve the sender to a plain string ID.
                     * msg.sender can be:
                     *   (a) a populated object  → { _id: "abc" }
                     *   (b) a raw ObjectId ref  → "abc"
                     * We must handle both to avoid all messages appearing on
                     * the wrong side when the API returns un-populated refs.
                     */
                    const resolveSenderId = (sender) => {
                      if (!sender) return null;
                      if (typeof sender === 'object') return String(sender._id ?? '');
                      return String(sender); // raw string / ObjectId
                    };

                    const senderId = resolveSenderId(msg.sender);
                    const myId    = String(user?.userId || user?._id || '');
                    const isMine  = !!myId && senderId === myId;

                    // Support for populated sender info (for initials/colors)
                    const senderInfo = typeof msg.sender === 'object' ? msg.sender : (isMine ? user : otherUser);

                    const isOffer = msg.type === 'offer';
                    const prevItem = groupedMessages[index - 1];
                    const isSameSender =
                      prevItem &&
                      prevItem.type === 'message' &&
                      resolveSenderId(prevItem.sender) === senderId;

                    return (
                      <div
                        key={msg._id}
                        className={`${styles.msgRow} ${isMine ? styles.msgMine : styles.msgTheirs} ${isSameSender ? styles.msgGrouped : ''}`}
                      >
                        {!isMine && (
                          <div 
                            className={`${styles.msgTinyAvatar} ${isSameSender ? styles.hiddenAvatar : ''}`}
                            style={{ backgroundColor: getAvatarColor(senderId) }}
                            title={senderInfo?.name || senderInfo?.email}
                          >
                            {senderInfo?.avatar ? (
                              <img src={senderInfo.avatar} alt="" />
                            ) : (
                              getInitials(senderInfo?.name, senderInfo?.email)
                            )}
                          </div>
                        )}
                        <div
                          className={`${styles.msgBubble} ${
                            isMine ? styles.bubbleMine : styles.bubbleTheirs
                          } ${isOffer ? styles.bubbleOffer : ''} ${
                            msg.isOptimistic ? styles.bubbleOptimistic : ''
                          }`}
                        >
                          {isOffer ? (
                            <div className={styles.offerContent}>
                              <div className={styles.offerBadge}>
                                <span className={styles.offerIcon}>💰</span>
                                <span>Offer</span>
                              </div>
                              <h2 className={styles.offerText}>Made an offer</h2>
                              <p className={styles.offerSubtext}>"{msg.text}"</p>
                              
                              {activeConvo.listing && (
                                <div 
                                  className={styles.offerListingPreview}
                                  onClick={() => navigate(`/listing/${activeConvo.listing._id}`)}
                                >
                                  {activeConvo.listing.images?.[0]?.url && (
                                    <img 
                                      src={activeConvo.listing.images[0].url} 
                                      alt="Product" 
                                      className={styles.offerListingImg}
                                    />
                                  )}
                                  <div className={styles.offerListingDetails}>
                                    <span className={styles.offerListingTitle}>
                                      {activeConvo.listing.title}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {!isMine && (
                                <div className={styles.offerActions}>
                                  {msg.offer?.status === 'pending' ? (
                                    <>
                                      <div className={styles.offerActionsRow}>
                                        <button 
                                          className={styles.btnAccept}
                                          onClick={() => handleAcceptOffer(msg.offer?._id || msg.offer)}
                                        >
                                          Accept Offer
                                        </button>
                                        <button 
                                          className={styles.btnCounter}
                                          onClick={handleCounterOffer}
                                        >
                                          Counter
                                        </button>
                                      </div>
                                      <button 
                                        className={styles.btnDecline}
                                        onClick={() => handleDeclineOffer(msg.offer?._id || msg.offer)}
                                      >
                                        Decline Offer
                                      </button>
                                    </>
                                  ) : (
                                    <div className={`${styles.statusBadge} ${styles[msg.offer?.status]}`}>
                                      Offer {msg.offer?.status?.toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              )}
                              {isMine && msg.offer?.status !== 'pending' && (
                                <div className={`${styles.statusBadge} ${styles[msg.offer?.status]}`}>
                                  Offer {msg.offer?.status?.toUpperCase()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className={styles.msgText}>{msg.text}</p>
                          )}
                          <span className={styles.msgTime}>
                            {formatMessageTime(msg.createdAt)}
                            {isMine && !msg.isOptimistic && (
                              <span className={styles.readStatus}>
                                {msg.read ? "✔✔" : "✔"}
                              </span>
                            )}
                            {msg.isOptimistic && (
                              <svg className={`${styles.checkIcon} ${styles.sending}`} viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm0 2.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" opacity="0.3" />
                              </svg>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator */}
                {isOtherTyping && (
                  <div className={`${styles.msgRow} ${styles.msgTheirs}`}>
                    <div className={styles.msgTinyAvatar}>
                      {getInitials(otherUser?.name, otherUser?.email)}
                    </div>
                    <div className={`${styles.msgBubble} ${styles.bubbleTheirs} ${styles.typingBubble}`}>
                      <div className={styles.typingDots}>
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}></div>
              </div>

              {/* Input Area */}
              <div className={styles.inputArea}>
                <form onSubmit={handleSend} className={styles.inputForm}>
                  <input
                    ref={inputRef}
                    type="text"
                    className={styles.msgInput}
                    placeholder="Type a message..."
                    value={input}
                    onChange={handleInput}
                    maxLength={1000}
                    id="chat-message-input"
                  />
                  <button
                    type="submit"
                    className={styles.sendBtn}
                    disabled={!input.trim()}
                    aria-label="Send message"
                    id="chat-send-button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default Chat;
