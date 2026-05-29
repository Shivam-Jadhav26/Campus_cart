import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './ProductCard.module.css';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const ProductCard = ({ product, onDelete }) => {
  const imgSrc = product.thumbnail?.url || product.images?.[0]?.url || product.imageUrl || product.image || null;
  const sellerName = product.sellerId?.name || product.sellerName || 'Student';

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div variants={itemVariants}>
      <Link to={`/listings/${product.id || product._id}`} className={styles.link} id={`product-${product.id || product._id}`}>
      <div className={styles.card}>
        <div className={styles.imageBox}>
          {imgSrc ? (
            <img src={imgSrc} alt={product.title} className={styles.image} loading="lazy" />
          ) : (
            <div className={styles.placeholder}>
              <p>NO IMAGE</p>
            </div>
          )}
          {product.condition && (
            <span className={styles.conditionBadge}>{product.condition}</span>
          )}
          {product.status === 'sold' && (
            <div className={styles.soldOverlay}>SOLD</div>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.topRow}>
            <h3 className={styles.title}>{product.title}</h3>
            <span className={styles.price}>₹{product.price?.toLocaleString()}</span>
          </div>

          {product.category && (
            <span className={styles.category}>{product.category}</span>
          )}

          <div className={styles.footer}>
            <div className={styles.seller}>
              <div className={styles.sellerAvatar}>
                {sellerName.charAt(0).toUpperCase()}
              </div>
              <div className={styles.sellerInfo}>
                <span className={styles.sellerName}>{sellerName}</span>
                <span className={styles.timeAgo}>{timeAgo(product.createdAt)}</span>
              </div>
            </div>

            {onDelete && (
              <button
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (window.confirm('Delete this listing?')) onDelete(product.id || product._id);
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
