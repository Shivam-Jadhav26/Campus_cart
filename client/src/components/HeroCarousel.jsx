// CampusCart — HeroCarousel.jsx
import React from 'react';

const HeroCarousel = () => {
  return (
    <div style={styles.container}>
      <div style={styles.bannerWrapper}>
        <div style={styles.content}>
          <span style={styles.badge}>Back to College</span>
          <h2 style={styles.title}>Get ready for the new semester</h2>
          <p style={styles.subtitle}>Seniors are selling textbooks and lab gear now.</p>
          <button style={styles.ctaButton}>Shop Essentials</button>
        </div>
        <div style={styles.decorationCircle}></div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'center',
    background: '#F8FAFC',
  },
  bannerWrapper: {
    width: '100%',
    maxWidth: '1160px',
    background: 'linear-gradient(135deg, #2563EB, #6366F1)',
    borderRadius: '24px',
    padding: '3rem 2.5rem',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
    display: 'flex',
    alignItems: 'center', // Fix vertically
  },
  content: {
    position: 'relative',
    zIndex: 10,
    color: '#ffffff',
    maxWidth: '500px',
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(8px)',
    padding: '0.4rem 1rem',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    marginBottom: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    lineHeight: 1.1,
    margin: '0 0 1rem 0',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontSize: '1.05rem',
    opacity: 0.9,
    margin: '0 0 1.5rem 0',
    lineHeight: 1.5,
  },
  ctaButton: {
    background: '#ffffff',
    color: '#2563EB',
    border: 'none',
    padding: '0.85rem 1.8rem',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
  },
  decorationCircle: {
    position: 'absolute',
    right: '-10%',
    top: '-20%',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
    zIndex: 1,
    pointerEvents: 'none',
  }
};

export default HeroCarousel;
