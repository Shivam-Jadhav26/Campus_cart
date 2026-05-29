// CampusCart — MessageBubble.jsx
import React from 'react';

const MessageBubble = ({ text, sender, type = 'text' }) => {
  const isUser = sender === 'user';
  const isOffer = type === 'offer';

  return (
    <div style={{
      ...styles.bubbleWrapper,
      justifyContent: isUser ? 'flex-end' : 'flex-start'
    }}>
      <div style={{
        ...styles.bubble,
        background: isOffer ? '#EBF5FF' : (isUser ? '#2563EB' : '#F3F4F6'),
        color: isOffer ? '#0F172A' : (isUser ? '#FFFFFF' : '#1F2937'),
        border: isOffer ? '1px solid #BFDBFE' : 'none',
        borderRadius: isUser ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
        padding: isOffer ? '1rem 1.25rem' : '0.8rem 1.2rem',
      }}>
        {isOffer ? (
          <div style={styles.offerContent}>
            <span style={styles.offerIcon}>💰</span>
            <div>
              <div style={styles.offerLabel}>New Offer</div>
              <div style={styles.offerText}>{text}</div>
            </div>
          </div>
        ) : (
          text
        )}
      </div>
    </div>
  );
};

const styles = {
  bubbleWrapper: {
    display: 'flex',
    marginBottom: '1rem',
    width: '100%',
  },
  bubble: {
    maxWidth: '75%',
    fontSize: '0.95rem',
    lineHeight: '1.4',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  offerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  offerIcon: {
    fontSize: '1.5rem',
  },
  offerLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.1rem',
  },
  offerText: {
    fontSize: '1.05rem',
    fontWeight: '800',
  }
};

export default MessageBubble;
