import React from 'react';
import { motion } from 'framer-motion';
import styles from './ProductGrid.module.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const ProductGrid = ({ children, layout = 'grid' }) => {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={layout === 'row' ? styles.row : styles.grid}
    >
      {layout === 'row'
        ? React.Children.map(children, (child) => (
            <div style={{ minWidth: '280px', maxWidth: '300px', flexShrink: 0 }}>{child}</div>
          ))
        : children}
    </motion.div>
  );
};

export default ProductGrid;
