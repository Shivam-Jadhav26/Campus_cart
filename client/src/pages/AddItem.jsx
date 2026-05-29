// CampusCart — AddItem.jsx (Premium Overhaul)
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './AddItem.module.css';

const AddItem = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '', description: '', price: '', category: 'Other', contact: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Auto-scroll to error
  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  const categories = ['Electronics', 'Stationery', 'Books', 'Lab Equipment', 'Furniture', 'Sports', 'Clothing', 'Other'];

  const handleChange = (e) => {
    if (e.target.name === 'categorySelect') {
      if (e.target.value === 'create_new') {
        setIsCustomCategory(true);
        setFormData({ ...formData, category: '' });
      } else {
        setIsCustomCategory(false);
        setFormData({ ...formData, category: e.target.value });
      }
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
    if (error) setError('');
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, etc)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB for fast loading');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, val]) => data.append(key, val));
    if (imageFile) {
        data.append('images', imageFile);
    }

    try {
      await api.post('/listings', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post item. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>List an Item</h2>
            <p className={styles.cardSub}>Turn your unused items into cash for the campus community.</p>
          </div>

          {error && (
            <div className={styles.alert}>{error}</div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Title */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Item Title</label>
              <input 
                className={styles.input} 
                name="title" 
                placeholder="Item Title" 
                required 
                onChange={handleChange} 
                id="item-title" 
                maxLength={100}
              />
            </div>

            {/* Price + Category */}
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Price (₹)</label>
                <input 
                  className={styles.input} 
                  name="price" 
                  type="number" 
                  placeholder="Price (₹)" 
                  required 
                  onChange={handleChange} 
                  id="item-price" 
                  min="0"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Category</label>
                <select 
                  className={styles.input} 
                  name="categorySelect" 
                  onChange={handleChange} 
                  id="item-category"
                  value={isCustomCategory ? 'create_new' : formData.category}
                >
                  {categories.map((c) => <option key={c} value={c} className={styles.option}>{c}</option>)}
                  <option value="create_new" className={styles.option}>+ Create custom...</option>
                </select>
                {isCustomCategory && (
                  <input
                    className={`${styles.input} ${styles.customInput}`}
                    style={{ marginTop: '0.5rem' }}
                    name="category"
                    placeholder="Enter custom category"
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Image Upload */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                Listing Image
              </label>
              <div
                className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div className={styles.previewBox}>
                    <img src={imagePreview} alt="Preview" className={styles.previewImg} />
                    <button
                      type="button"
                      className={styles.removeImg}
                      title="Remove image"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className={styles.dropContent}>
                    <span className={styles.dropIcon}>⬆️</span>
                    <p className={styles.dropText}>
                      Drag & drop an image here, or <span className={styles.browseText}>browse files</span>
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
              </div>
            </div>

            {/* Description */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                name="description"
                placeholder="Add description..."
                required
                onChange={handleChange}
                id="item-description"
              />
            </div>

            {/* Contact */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Contact Detail</label>
              <input 
                className={styles.input} 
                name="contact" 
                placeholder="Contact Detail" 
                required 
                onChange={handleChange} 
                id="item-contact" 
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
              id="submit-listing"
            >
              {loading ? (
                <>
                  <span className={styles.btnSpinner} /> Posting...
                </>
              ) : (
                <>
                  Post My Listing
                </>
              )}
            </button>

            <button type="button" onClick={() => navigate('/')} className={styles.cancelBtn}>
              Cancel & Go Back
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddItem;
