// CampusCart — Home.jsx (Premium Overhaul)
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CategoryBar from '../components/CategoryBar';
import SectionHeading from '../components/SectionHeading';
import ProductGrid from '../components/ProductGrid';
import ProductCard from '../components/ProductCard';
import api from '../services/api';
import styles from './Home.module.css';
import { motion, AnimatePresence } from 'framer-motion';

const Home = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(categoryName || 'All');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    const itemsWithImages = listings.filter(item => item.image);
    if (itemsWithImages.length <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentHeroIndex((prevIndex) => (prevIndex + 1) % itemsWithImages.length);
    }, 4000); // Rotate every 4 seconds

    return () => clearInterval(intervalId);
  }, [listings]);
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        let url = '/listings';
        const params = new URLSearchParams();
        if (activeCategory && activeCategory !== 'All') {
          params.append('category', activeCategory);
        }
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await api.get(url);
        const fetched = res.data.listings || [];
        const mapped = fetched.map((item) => ({
          ...item,
          id: item._id,
          image: item.thumbnail?.url || item.images?.[0]?.url || item.imageUrl || null,
          sellerName: item.sellerId?.name || 'Student',
        }));
        setListings(mapped);
      } catch (err) {
        setError('Failed to load marketplace listings.');
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [activeCategory]);

  useEffect(() => {
    if (categoryName) {
      setActiveCategory(categoryName);
    } else {
      setActiveCategory('All');
    }
  }, [categoryName]);

  const filteredItems = useMemo(() => {
    return listings.filter((item) => {
      const matchesSearch =
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [listings, searchTerm, activeCategory]);

  const affordableItems = useMemo(() => listings.filter((item) => item.price <= 500), [listings]);

  const isFiltering = searchTerm || activeCategory !== 'All';

  return (
    <div className={styles.page}>
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>
      <Navbar onSearch={setSearchTerm} />

      {/* Hero Section */}
      {!isFiltering && !loading && listings.length > 0 && (
        (() => {
          const itemsWithImages = listings.filter(item => item.image);
          const heroItem = itemsWithImages.length > 0 ? itemsWithImages[currentHeroIndex] : listings[0];
          if (!heroItem) return null;
          return (
            <section className={styles.hero}>
              <div className={styles.heroBackground}></div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={heroItem.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className={styles.heroInner}
                >
                  <div className={styles.heroCard}>
                    <span className={styles.hotDealBadge}>
                      <span className="material-symbols-outlined" style={{fontSize: '18px'}}>local_fire_department</span>
                      Featured
                    </span>
                    <h1 className={styles.heroTitle} style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>{heroItem.title}</h1>
                    <p className={styles.heroDesc} style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {heroItem.description || 'Check out this latest listing on CampusCart!'}
                    </p>
                    <div className={styles.priceRow}>
                      <span className={styles.priceNew}>₹{heroItem.price?.toLocaleString()}</span>
                    </div>
                    <Link to={`/listings/${heroItem.id}`} className={styles.buyNowBtn}>
                      View Details
                      <span className="material-symbols-outlined" style={{fontSize: '20px'}}>arrow_forward</span>
                    </Link>
                  </div>

                </motion.div>
              </AnimatePresence>
            </section>
          );
        })()
      )}

      <CategoryBar
        activeCategory={activeCategory}
        onSelect={(cat) => {
          const target = cat === activeCategory ? 'All' : cat;
          if (target === 'All') {
            navigate('/');
          } else {
            navigate(`/category/${target}`);
          }
        }}
      />

      {/* Main Content */}
      <main className={styles.main} id="listings">
        {loading ? (
          <div className={styles.stateBox}>
            <div className={styles.spinner} />
            <h3 style={{ color: '#fff' }}>Loading fresh deals...</h3>
            <p style={{ color: '#6b7280' }}>Preparing the student marketplace for you.</p>
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span style={{ fontSize: '2.5rem' }}>⚠️</span>
            <h3 style={{ color: '#ef4444' }}>{error}</h3>
          </div>
        ) : (
          <>
            {isFiltering ? (
              <section className={styles.section}>
                <SectionHeading
                  title={searchTerm ? `Results for "${searchTerm}"` : `Category: ${activeCategory}`}
                  subtitle={`${filteredItems.length} items found`}
                />
                {filteredItems.length > 0 ? (
                  <ProductGrid layout="grid">
                    {filteredItems.map((item) => (
                      <ProductCard key={item.id} product={item} />
                    ))}
                  </ProductGrid>
                ) : (
                  <div className={styles.emptyState}>
                    <span style={{ fontSize: '3rem' }}>🔍</span>
                    <h3 style={{ color: '#fff', margin: '1.5rem 0 0.5rem' }}>No results found</h3>
                    <p style={{ color: '#6b7280', margin: '0 0 2rem' }}>We couldn't find anything matching your request.</p>
                    <button
                      className={styles.clearBtn}
                      onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </section>
            ) : (
              <>
                {affordableItems.length > 0 && (
                  <section className={styles.section}>
                    <SectionHeading
                      title="🔥 Deals Under ₹500"
                      subtitle="High-value items at low campus prices."
                    />
                    <ProductGrid layout="row">
                      {affordableItems.map((item) => (
                        <ProductCard key={item.id} product={item} />
                      ))}
                    </ProductGrid>
                  </section>
                )}

                <section className={styles.section}>
                  <SectionHeading
                    title="Latest Listings"
                    actionLabel="View All"
                    actionLink="/"
                  />
                  {listings.length > 0 ? (
                    <ProductGrid layout="grid">
                      {listings.map((item) => (
                        <ProductCard key={item.id} product={item} />
                      ))}
                    </ProductGrid>
                  ) : (
                    <div className={styles.emptyState}>
                      <span style={{ fontSize: '3.5rem' }}>📦</span>
                      <h3 className={styles.emptyTitle}>Be the pioneer!</h3>
                      <p className={styles.emptyText}>No items here yet. Be the first to list and start the market.</p>
                      <Link to="/add-item" className={styles.heroPrimary}>
                        + Post a Listing
                      </Link>
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerText}>© 2026 CampusCart. Designed for student freedom.</p>
          <div className={styles.footerLinks}>
            <a href="#" className={styles.footerLink}>Safety First</a>
            <a href="#" className={styles.footerLink}>Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
