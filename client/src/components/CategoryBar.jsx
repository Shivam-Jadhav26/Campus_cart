import React, { useState, useEffect } from 'react';

const categories = [
  { id: 'all', label: 'All', icon: 'grid_view' },
  { id: '1', label: 'Electronics', icon: 'devices' },
  { id: '2', label: 'Books', icon: 'menu_book' },
  { id: '3', label: 'Stationery', icon: 'edit_note' },
  { id: '4', label: 'Furniture', icon: 'chair' },
  { id: '5', label: 'Lab Equipment', icon: 'science' },
  { id: '6', label: 'Sports', icon: 'sports_soccer' },
  { id: '7', label: 'Clothing', icon: 'checkroom' },
  { id: '8', label: 'Other', icon: 'more_horiz' },
];

const CategoryBar = ({ activeCategory = 'All', onSelect }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ 
      ...styles.wrapper, 
      height: isScrolled ? '40px' : '76px',
      boxShadow: isScrolled ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
    }}>
      <div style={styles.scrollContainer}>
        <div style={{ ...styles.inner, paddingTop: isScrolled ? '0' : '0.5rem' }}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.label;
            return (
              <button
                key={cat.id}
                style={{
                  ...styles.chip,
                  height: isScrolled ? '40px' : '76px',
                  ...(isActive ? styles.chipActive : {}),
                }}
                onClick={() => onSelect && onSelect(cat.label)}
              >
                <div style={{
                  ...styles.iconWrapper,
                  ...(isActive ? styles.iconWrapperActive : {}),
                  height: isScrolled ? '0px' : '36px',
                  opacity: isScrolled ? 0 : 1,
                  marginBottom: isScrolled ? '0px' : '0.2rem',
                  transform: isScrolled ? 'scale(0.8) translateY(10px)' : 'scale(1) translateY(0)',
                }}>
                  <span 
                    className="material-symbols-outlined" 
                    style={{
                      ...styles.chipIcon,
                      ...(isActive ? styles.chipIconActive : {})
                    }}
                  >
                    {cat.icon}
                  </span>
                </div>
                
                <span style={{
                  ...styles.chipText,
                  ...(isActive ? styles.chipTextActive : {})
                }}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    position: 'fixed',
    top: '68px', /* Matches navbar height */
    left: 0,
    right: 0,
    zIndex: 1050,
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    transition: 'height 0.25s ease-in-out, box-shadow 0.25s ease',
  },
  scrollContainer: {
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
    height: '100%',
  },
  inner: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: '1.5rem',
    minWidth: 'max-content',
    padding: '0 1.5rem',
    height: '100%',
    alignItems: 'flex-end', /* aligns items to the bottom border */
    transition: 'padding 0.25s ease-in-out',
  },
  chip: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 0.25rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottom: '3px solid transparent',
    transition: 'all 0.25s ease-in-out',
  },
  chipActive: {
    borderBottom: '3px solid #2874f0',
  },
  iconWrapper: {
    width: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transition: 'all 0.25s ease-in-out',
  },
  iconWrapperActive: {
    backgroundColor: '#e5f0ff',
  },
  chipIcon: {
    fontSize: '1.4rem',
    color: '#444444',
  },
  chipIconActive: {
    color: '#2874f0',
  },
  chipText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#444444',
    whiteSpace: 'nowrap',
    paddingBottom: '4px', /* Space between text and the underline */
    transition: 'all 0.25s ease-in-out',
  },
  chipTextActive: {
    fontWeight: 700,
    color: '#2874f0',
  }
};

export default CategoryBar;
