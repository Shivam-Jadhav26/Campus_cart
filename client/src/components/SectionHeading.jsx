import React from 'react';
import { Link } from 'react-router-dom';

const SectionHeading = ({ title, subtitle, actionLabel, actionLink }) => {
  return (
    <div style={styles.container}>
      <div style={styles.textGroup}>
        <div style={styles.titleRow}>
          <div style={styles.bar}></div>
          <h2 style={styles.title}>{title}</h2>
        </div>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
      {actionLabel && actionLink && (
        <Link to={actionLink} style={styles.actionLink} className="float-shadow-sm">
          {actionLabel}
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
        </Link>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '1.5rem',
  },
  textGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  bar: {
    width: '6px',
    height: '24px',
    backgroundColor: 'var(--primary)',
    borderRadius: '9999px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  title: {
    fontFamily: "'Lexend', sans-serif",
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    margin: 0,
    marginLeft: '1rem',
  },
  actionLink: {
    color: 'var(--primary)',
    fontWeight: '600',
    fontSize: '0.875rem',
    fontFamily: "'Lexend', sans-serif",
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    transition: 'all 0.2s',
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(4px)',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
  },
};

export default SectionHeading;
