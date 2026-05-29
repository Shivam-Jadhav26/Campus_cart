import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import styles from './AISearchAssistant.module.css';

// SVG Icons
const SparklesIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
);

const SUGGESTIONS = [
  "Books under ₹1000",
  "Electronics under ₹5000",
  "Hostel essentials",
  "Scientific calculator"
];

const AISearchAssistant = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [position, setPosition] = useState('right');
  const inputRef = useRef(null);
  const popupRef = useRef(null);
  const fabRef = useRef(null);

  // Hidden routes
  const hiddenRoutes = ['/set-password', '/create-password', '/login', '/register', '/auth/callback', '/chat'];

  // Load history and position on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai_search_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        // failed to parse
      }
    }
    
    const savedPos = localStorage.getItem('ai_position');
    if (savedPos) {
      setPosition(savedPos);
    }
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300); // Wait for transition animation
    }
  }, [isOpen]);

  // Handle click outside & ESC key
  useEffect(() => {
    const handleEvents = (e) => {
      if (e.type === 'keydown' && e.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      
      if (
        e.type === 'mousedown' && 
        popupRef.current && 
        !popupRef.current.contains(e.target) &&
        (!fabRef.current || !fabRef.current.contains(e.target))
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleEvents);
      document.addEventListener('keydown', handleEvents);
    }

    return () => {
      document.removeEventListener('mousedown', handleEvents);
      document.removeEventListener('keydown', handleEvents);
    };
  }, [isOpen]);

  const handleSearch = async (searchQuery) => {
    const q = (searchQuery || query || '').trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setQuery(q);

    // Update history
    setHistory(prev => {
      const newHist = [q, ...prev.filter(item => item !== q)].slice(0, 5);
      localStorage.setItem('ai_search_history', JSON.stringify(newHist));
      return newHist;
    });
    
    try {
      const response = await api.post('/search/assistant-search', { query: q });
      
      const data = response.data;
      
      if (data.success) {
          setResults(data.items || []);
      } else {
          setResults([]);
          setError(data.message || 'Something went wrong');
      }
    } catch (err) {
      console.error("AI Search Error:", err);
      if (err.message === "AUTH_DEACTIVATED") {
        setError('Your session has expired. Please log in again to use the AI Assistant.');
      } else if (err.code === 'ECONNABORTED') {
        setError('The request timed out. Please check your connection and try again.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch results. Please try again.');
      }
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setError(null);
    if (inputRef.current) inputRef.current.focus();
  };

  if (hiddenRoutes.includes(location.pathname)) {
    return null;
  }

  const handleDragEnd = (event, info) => {
    if (position === 'right' && info.offset.x < -50) {
      setPosition('left');
      localStorage.setItem('ai_position', 'left');
    } else if (position === 'left' && info.offset.x > 50) {
      setPosition('right');
      localStorage.setItem('ai_position', 'right');
    }
  };

  return (
    <div className={`${styles.floatingContainer} ${styles[position]}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            ref={popupRef}
            className={styles.popup}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <h3>
                <SparklesIcon /> AI Assistant
              </h3>
              <button 
                className={styles.closeButton} 
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content Body */}
            <div className={styles.content}>
              
              {/* Input Section */}
              <div className={styles.inputSection}>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.inputField}
                  placeholder="Ask anything (e.g. books under ₹1000)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
                <button 
                  className={styles.sendButton}
                  onClick={() => handleSearch()}
                  disabled={loading || !query.trim()}
                  aria-label="Search"
                >
                  <SendIcon />
                </button>
              </div>

              {/* Default State: Suggestions */}
              {!results && !loading && !error && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                >
                  {history.length > 0 && (
                    <div>
                      <div className={styles.suggestionsTitle}>Recent Searches</div>
                      <div className={styles.suggestions}>
                        {history.map((item, idx) => (
                          <button 
                            key={`hist-${idx}`}
                            className={styles.chip}
                            onClick={() => handleSearch(item)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}>
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span style={{ verticalAlign: 'middle' }}>{item}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className={styles.suggestionsTitle}>Suggested Searches</div>
                    <div className={styles.suggestions}>
                      {SUGGESTIONS.map((suggestion, idx) => (
                        <button 
                          key={idx}
                          className={styles.chip}
                          onClick={() => handleSearch(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error State */}
              {error && (
                <motion.div 
                  className={styles.errorMessage}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  {error}
                </motion.div>
              )}

              {/* Loading State */}
              {loading && (
                <motion.div 
                  className={styles.loadingContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className={styles.spinner}></div>
                  <span>Searching the campus market...</span>
                </motion.div>
              )}

              {/* Results State */}
              {results && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className={styles.resultsHeader}>
                    <h4>Results ({results.length})</h4>
                    <button className={styles.clearButton} onClick={clearSearch}>
                      Clear
                    </button>
                  </div>
                  
                  {results.length > 0 ? (
                    <motion.div 
                      className={styles.resultsGrid}
                      variants={{
                        hidden: { opacity: 0 },
                        show: {
                          opacity: 1,
                          transition: { staggerChildren: 0.1 }
                        }
                      }}
                      initial="hidden"
                      animate="show"
                    >
                      {results.map((item, idx) => (
                        <motion.div 
                          key={item._id || idx}
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            show: { opacity: 1, y: 0 }
                          }}
                        >
                          <Link to={`/listings/${item._id || item.id}`} className={styles.resultCard}>
                            <div className={styles.cardImageWrapper}>
                              <img 
                                src={item.images?.[0]?.url || item.imageUrl || '/placeholder-image.jpg'} 
                                alt={item.title} 
                                className={styles.cardImage}
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                                }}
                              />
                            </div>
                            <div className={styles.cardInfo}>
                              <span className={styles.cardTitle}>{item.title}</span>
                              <span className={styles.cardPrice}>₹{item.price?.toLocaleString()}</span>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>
                        <SearchIcon />
                      </div>
                      <p>No results found for "{query}"</p>
                      <button className={styles.chip} onClick={() => clearSearch()}>
                        Try a different query
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        ref={fabRef}
        className={styles.fab}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        title="Drag left or right to move"
      >
        <span className={styles.fabIcon}>
          {isOpen ? <CloseIcon /> : <SparklesIcon />}
        </span>
      </motion.button>
    </div>
  );
};

export default AISearchAssistant;
