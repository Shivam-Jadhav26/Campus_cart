// CampusCart — TrustBadgeStrip.jsx
import React from 'react';

const TrustBadgeStrip = () => {
  return (
    <div style={styles.container}>
      <div style={styles.badgeList}>
        <div style={styles.badge}>
          <span style={styles.icon}>🛡️</span>
          <span style={styles.text}>Verified Campus IDs</span>
        </div>
        <div style={styles.divider}></div>
        <div style={styles.badge}>
          <span style={styles.icon}>📍</span>
          <span style={styles.text}>Meet on Campus</span>
        </div>
        <div style={styles.divider}></div>
        <div style={styles.badge}>
          <span style={styles.icon}>💬</span>
          <span style={styles.text}>Secure In-App Chats</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    background: '#FFFFFF',
    borderTop: '1px solid #F1F5F9',
    borderBottom: '1px solid #E2E8F0',
    padding: '0.8rem 0',
  },
  badgeList: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
    padding: '0 1rem',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  icon: {
    fontSize: '1.1rem',
  },
  text: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#475569',
  },
  divider: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: '#CBD5E1',
  }
};

export default TrustBadgeStrip;
