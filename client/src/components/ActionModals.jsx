import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const modalBase = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 2000, padding: '1.5rem',
  },
  modal: {
    background: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: '24px', padding: '2.5rem', maxWidth: '440px', width: '100%',
    position: 'relative', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)',
    textAlign: 'center', animation: 'slideUp 0.25s ease',
  },
  closeBtn: {
    position: 'absolute', top: '1rem', right: '1rem', fontSize: '1.25rem',
    background: '#f1f5f9', border: 'none', color: '#64748b',
    cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  iconCircle: {
    width: '64px', height: '64px', borderRadius: '50%',
    background: '#fef3c7', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.25rem',
  },
  title: {
    fontSize: '1.35rem', fontWeight: '800', color: '#1e293b',
    marginBottom: '0.6rem', letterSpacing: '-0.02em',
  },
  text: { color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem', fontSize: '0.92rem' },
  primaryBtn: {
    width: '100%', padding: '0.9rem',
    background: '#fcd34d',
    color: '#1e293b', border: 'none', borderRadius: '12px', fontWeight: '700',
    fontSize: '0.95rem', cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(251, 191, 36, 0.3)', transition: 'all 0.15s ease',
  },
  input: {
    width: '100%', padding: '1rem 1rem 1rem 2.75rem', fontSize: '1.15rem',
    fontWeight: '700', borderRadius: '12px', border: '1px solid #e2e8f0',
    outline: 'none', background: '#f8fafc', color: '#334155',
    transition: 'border-color 0.2s',
  },
  errorText: { color: '#ef4444', fontSize: '0.85rem', fontWeight: '500', margin: '-0.25rem 0 0.5rem' },
};

export const BuyModal = ({ isOpen, onClose, contact }) => {
  if (!isOpen) return null;
  return (
    <div style={modalBase.overlay} onClick={onClose}>
      <div style={modalBase.modal} onClick={(e) => e.stopPropagation()}>
        <button style={modalBase.closeBtn} onClick={onClose}>✕</button>
        <div style={modalBase.iconCircle}>🛍️</div>
        <h2 style={modalBase.title}>Complete Your Purchase</h2>
        <p style={modalBase.text}>Contact the seller directly to finalize the deal and arrange a meeting on campus.</p>
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
          padding: '1.1rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem',
        }}>
          <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            Seller Contact
          </span>
          <a href={`mailto:${contact}`} style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f3f4f6', textDecoration: 'none' }}>
            📧 {contact || 'N/A'}
          </a>
        </div>
        <button style={modalBase.primaryBtn} onClick={onClose}>Got it</button>
      </div>
    </div>
  );
};

export const OfferModal = ({ isOpen, onClose, currentPrice, listingId, sellerId }) => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Please enter a valid price');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const offerRes = await api.post(`/offers/${listingId}`, {
        amount: Number(amount),
        message: `I'd like to offer ₹${amount} for this item.`,
      });

      if (offerRes.data.success) {
        const convoRes = await api.post('/chat/conversations', {
          listingId,
          otherUserId: sellerId,
        });
        if (convoRes.data.success) {
          setConversationId(convoRes.data.data._id);
          setIsSuccess(true);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send offer.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setAmount('');
    setError('');
    setLoading(false);
    setConversationId(null);
    onClose();
  };

  return (
    <div style={modalBase.overlay} onClick={handleClose}>
      <div style={modalBase.modal} onClick={(e) => e.stopPropagation()}>
        <button style={modalBase.closeBtn} onClick={handleClose}>✕</button>

        {!isSuccess ? (
          <>
            <div style={modalBase.iconCircle}>💰</div>
            <h2 style={modalBase.title}>Make an Offer</h2>
            <p style={modalBase.text}>
              Current Price: <span style={{ fontWeight: '700', color: '#22c55e' }}>₹{currentPrice}</span>
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '1.15rem', fontWeight: '700', color: '#f3f4f6',
                }}>₹</span>
                <input
                  type="number"
                  placeholder="Your offer"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={modalBase.input}
                  autoFocus
                  disabled={loading}
                />
              </div>
              {error && <p style={modalBase.errorText}>{error}</p>}
              <button type="submit" style={{ ...modalBase.primaryBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Offer'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ padding: '0.5rem 0' }}>
            <div style={{ ...modalBase.iconCircle, background: 'rgba(34,197,94,0.12)' }}>✅</div>
            <h2 style={modalBase.title}>Offer Sent!</h2>
            <p style={modalBase.text}>
              Your offer of <span style={{ fontWeight: '700', color: '#22c55e' }}>₹{amount}</span> has been submitted.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                style={{
                  ...modalBase.primaryBtn, flex: 1,
                  background: 'rgba(255,255,255,0.06)', color: '#9ca3af',
                  boxShadow: 'none', border: '1px solid rgba(255,255,255,0.08)',
                }}
                onClick={handleClose}
              >
                Close
              </button>
              <button
                style={{ ...modalBase.primaryBtn, flex: 1 }}
                onClick={() => { handleClose(); navigate(`/chat?conversationId=${conversationId}`); }}
              >
                Go to Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
