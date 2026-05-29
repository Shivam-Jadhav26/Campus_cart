// CampusCart — MyListings.jsx (Premium Overhaul)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import ProductGrid from '../components/ProductGrid';
import api from '../services/api';
import styles from './MyListings.module.css';

const MyListings = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMyListings = async () => {
      try {
        setLoading(true);
        const res = await api.get('/listings/my');
        const fetched = Array.isArray(res.data) ? res.data : (res.data.listings || []);
        const mapped = fetched.map((item) => ({
          ...item,
          id: item._id,
          image: item.thumbnail?.url || item.images?.[0]?.url || item.imageUrl || null,
          sellerName: item.sellerId?.name || 'You',
        }));
        setItems(mapped);
      } catch (err) {
        setError('Failed to load your listings.');
      } finally {
        setLoading(false);
      }
    };
    fetchMyListings();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/listings/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id && item._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete listing.');
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Listings</h1>
          <p className={styles.subtitle}>{items.length} item{items.length !== 1 ? 's' : ''} you've posted</p>
        </div>

        {loading ? (
          <div className={styles.stateBox}>
            <div className={styles.spinner} />
            <h3>Loading your collection...</h3>
            <p>Preparing your marketplace profile.</p>
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span className={styles.emptyIcon}>⚠️</span>
            <h3 style={{ color: '#ef4444' }}>Something went wrong</h3>
            <p>{error}</p>
          </div>
        ) : items.length > 0 ? (
          <ProductGrid layout="grid">
            {items.map((item) => (
              <ProductCard key={item.id} product={item} onDelete={handleDelete} />
            ))}
          </ProductGrid>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📦</span>
            <h3 className={styles.emptyTitle}>Your market is empty</h3>
            <p className={styles.emptyText}>Start selling your items to reach thousands of campus buyers!</p>
            <Link to="/add-item" className={styles.sellBtn}>+ Sell Something</Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyListings;
