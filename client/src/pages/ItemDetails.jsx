// CampusCart — ItemDetails.jsx (Premium Overhall)
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { BuyModal, OfferModal } from '../components/ActionModals';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import styles from './ItemDetails.module.css';

const ItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [isBuyOpen, setIsBuyOpen] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/listings/${id}`);
        setItem(res.data);
      } catch (error) {
        setItem(null);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  useEffect(() => {
     window.scrollTo(0, 0);
  }, []);

  const handleContactSeller = async () => {
    if (!item) return;
    try {
      const sellerId = item.sellerId?._id || item.sellerId;
      const res = await api.post('/chat/conversations', {
        listingId: item._id,
        otherUserId: sellerId,
      });
      if (res.data.success) {
        navigate(`/chat?conversationId=${res.data.data._id}`);
      }
    } catch (err) {
      navigate('/chat');
    }
  };

  const images = item?.images?.length > 0
    ? item.images.map((img) => img.url || img)
    : item?.imageUrl
    ? [item.imageUrl]
    : [];

  const isSeller = user?._id === (item?.sellerId?._id || item?.sellerId);

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.stateBox}>
          <div className={styles.spinner} />
          <h3 style={{ color: '#111827' }}>Uncovering details...</h3>
          <p style={{ color: '#6b7280' }}>Fetching everything about this item.</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.stateBox}>
          <span style={{ fontSize: '4rem' }}>📭</span>
          <h2 style={{ color: '#111827', margin: '1rem 0' }}>Item not found</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>The listing may have been moved or removed.</p>
          <Link to="/" className={styles.backLink}>← Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.wrapper}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link to="/" className={styles.breadcrumbLink}>Marketplace</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{item.title}</span>
        </div>

        <div className={styles.grid}>
          {/* ── Left: Image Gallery ── */}
          <div className={styles.imageSection}>
            <div className={styles.mainImageBox}>
              {images.length > 0 ? (
                <img src={images[activeImg]} alt={item.title} className={styles.mainImage} />
              ) : (
                <div className={styles.noImage}>
                  <span style={{ fontSize: '4rem' }}>📷</span>
                  <p style={{ color: '#64748b', fontWeight: '600' }}>Waiting for snapshots</p>
                </div>
              )}
              {item.status === 'sold' && (
                <div className={styles.soldBanner}>SOLD</div>
              )}
              {item.condition && (
                <span className={styles.conditionTag}>{item.condition}</span>
              )}
            </div>
            {images.length > 1 && (
              <div className={styles.thumbRow}>
                {images.map((img, i) => (
                  <button
                    key={i}
                    className={`${styles.thumb} ${i === activeImg ? styles.thumbActive : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={img} alt="" className={styles.thumbImg} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Details ── */}
          <div className={styles.details}>
            <div className={styles.headerInfo}>
               <span className={styles.categoryBadge}>{item.category}</span>
               <h1 className={styles.title}>{item.title}</h1>
               <p className={styles.price}>₹{item.price?.toLocaleString()}</p>
            </div>

            {/* Description */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Details & Description</h3>
              <p className={styles.desc}>{item.description || 'No description provided.'}</p>
            </div>

            {/* Seller Card */}
            <div className={styles.sellerCard}>
              <div className={styles.sellerAvatar}>
                {item.sellerId?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className={styles.sellerInfo}>
                <span className={styles.sellerLabel}>Trusted Seller</span>
                <span className={styles.sellerName}>{item.sellerId?.name || 'Student'}</span>
                {item.sellerId?.email && (
                  <span className={styles.sellerEmail}>{item.sellerId.email}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isSeller && item.status !== 'sold' && (
              <div className={styles.actionGroup}>
                <button className={styles.buyBtn} onClick={() => setIsBuyOpen(true)}>
                  Secure Now
                  <span className="material-symbols-outlined" style={{fontSize: '20px'}}>arrow_forward</span>
                </button>
                <div className={styles.secondaryActions}>
                  <button className={styles.offerBtn} onClick={() => setIsOfferOpen(true)}>
                    Make Offer
                  </button>
                  <button className={styles.chatBtn} onClick={handleContactSeller}>
                    Start Chat
                  </button>
                </div>
              </div>
            )}

            {!isSeller && item.status === 'sold' && (
              <button className={styles.chatBtn} onClick={handleContactSeller}>
                Start Chat
              </button>
            )}

            {isSeller && (
              <div className={styles.ownerBadge}>
                This is your listing
              </div>
            )}

            <Link to="/" className={styles.backLink}>
               Explore More Items →
            </Link>
          </div>
        </div>
      </div>

      <BuyModal isOpen={isBuyOpen} onClose={() => setIsBuyOpen(false)} contact={item.sellerId?.email} />
      <OfferModal
        isOpen={isOfferOpen}
        onClose={() => setIsOfferOpen(false)}
        currentPrice={item.price}
        listingId={item._id}
        sellerId={item.sellerId?._id || item.sellerId}
      />
    </div>
  );
};

export default ItemDetails;
