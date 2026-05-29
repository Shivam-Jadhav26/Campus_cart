                  // CampusCart — CategoryStrip.jsx
import React from 'react';

const categories = [
  { id: '1', label: 'Electronics', icon: '💻', color: '#E0E7FF' },
  { id: '2', label: 'Books', icon: '📚', color: '#FEF3C7' },
  { id: '3', label: 'Stationery', icon: '✏️', color: '#FCE7F3' },
  { id: '4', label: 'Furniture', icon: '🪑', color: '#D1FAE5' },
  { id: '5', label: 'Lab Kits', icon: '🧪', color: '#E0F2FE' },
  { id: '6', label: 'Notes', icon: '📝', color: '#F3E8FF' }
];

const CategoryStrip = () => {
  return (
    <div style={styles.container}>
      <div style={styles.scrollWrapper}>
        {categories.map((cat) => (
          <div key={cat.id} style={styles.categoryItem}>
            <div style={{...styles.iconWrapper, backgroundColor: cat.color}}>
              <span style={styles.icon}>{cat.icon}</span>
            </div>
            <span style={styles.label}>{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    padding: '1.5rem 0 0 0',
    backgroundColor: '#F8FAFC',
  },
  scrollWrapper: {
    display: 'flex',
    gap: '1.5rem',
    overflowX: 'auto',
    padding: '0 1.5rem 1rem 1.5rem',
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // IE
    WebkitOverflowScrolling: 'touch',
    maxWidth: '1200px',
    margin: '0 auto',
    justifyContent: 'center' // Centers on desktop, adjust for mobile if needed
  },
  categoryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.6rem',
    cursor: 'pointer',
    minWidth: '70px',
    transition: 'transform 0.2s',
  },
  iconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  icon: {
    fontSize: '1.8rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#334155',
  }
};

export default CategoryStrip;
