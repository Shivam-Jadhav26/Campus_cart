import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useChatContext } from '../context/ChatContext';
import styles from './MyOffers.module.css';

const MyOffers = () => {
  const [activeTab, setActiveTab] = useState('made'); // 'made' or 'received'
  const [sentOffers, setSentOffers] = useState([]);
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshUnreadOffersCount } = useChatContext();
  const navigate = useNavigate();

  // Clear unread notifications when page is visited
  useEffect(() => {
    const markAsRead = async () => {
      try {
        await api.patch('/offers/mark-read');
        refreshUnreadOffersCount();
      } catch (err) {
        // silent error
      }
    };
    markAsRead();
  }, [refreshUnreadOffersCount]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'made') {
        const res = await api.get('/offers/my');
        if (res.data.success) {
          setSentOffers(res.data.data);
        }
      } else {
        const listingsRes = await api.get('/listings/my');
        const myListings = listingsRes.data;

        const allOffers = await Promise.all(
          myListings.map(l => api.get(`/offers/listing/${l._id}`))
        );

        const flattened = allOffers
          .map(res => res.data.data)
          .flat()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setReceivedOffers(flattened);
      }
    } catch (err) {
      console.error("Error fetching offers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (offerId, status) => {
    setReceivedOffers(prev => prev.map(o => 
      o._id === offerId ? { ...o, status } : o
    ));

    try {
      await api.patch(`/offers/${offerId}/${status}`);
      if (status === 'accept') {
        fetchData();
      }
    } catch (err) {
      console.error(`Failed to ${status} offer:`, err);
      fetchData();
    }
  };

  const handleGoToChat = async (listingId, otherUserId) => {
    if (!listingId || !otherUserId) return;
    try {
      const res = await api.post('/chat/conversations', {
        listingId,
        otherUserId
      });
      if (res.data.success) {
        navigate(`/chat?conversationId=${res.data.data._id}`);
      }
    } catch (err) {
      console.error("Failed to open chat:", err);
      navigate('/chat');
    }
  };

  return (
    <>
      <Navbar />
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Manage Offers</h1>
          
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'made' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('made')}
            >
              Offers I Made
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'received' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('received')}
            >
              Offers I Received
            </button>
          </div>

          {loading ? (
            <div className={styles.stateBox}>
              <div className={styles.spinner} />
              <h3>Fetching your offers...</h3>
            </div>
          ) : (
            <div className={styles.offerList}>
              {activeTab === 'made' ? (
                sentOffers.length === 0 ? (
                  <div className={styles.empty}>
                    <span style={{ fontSize: '3rem' }}>🏷️</span>
                    <h3>No offers sent yet</h3>
                    <p>Browse the marketplace and find something you like.</p>
                    <Link to="/">Explore items</Link>
                  </div>
                ) : (
                  sentOffers.map(offer => (
                    <div key={offer._id} className={styles.offerCard}>
                      <img 
                        src={offer.listing?.images?.[0]?.url || offer.listing?.imageUrl || 'https://via.placeholder.com/100'} 
                        className={styles.itemImage} 
                        alt=""
                        onClick={() => handleGoToChat(offer.listing?._id, offer.seller?._id || offer.seller)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div className={styles.offerInfo}>
                        <Link to={`/listings/${offer.listing?._id}`} className={styles.listingTitle}>
                          {offer.listing?.title}
                        </Link>
                        <div className={styles.amountWrap}>
                          <div className={styles.amountLabel}>Offered amount</div>
                          <div className={styles.amountValue}>₹{offer.amount}</div>
                        </div>
                        <div className={`${styles.statusBadge} ${styles[offer.status]}`}>
                          {offer.status}
                        </div>
                      </div>
                      {offer.status === 'accepted' && (
                        <div className={styles.actions}>
                          <button onClick={() => handleGoToChat(offer.listing?._id, offer.seller?._id || offer.seller)} className={styles.chatBtn}>
                            Go to Chat
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : (
                receivedOffers.length === 0 ? (
                  <div className={styles.empty}>
                    <span style={{ fontSize: '3rem' }}>📥</span>
                    <h3>No offers received</h3>
                    <p>You don't have any offers on your listings yet.</p>
                  </div>
                ) : (
                  receivedOffers.map(offer => (
                    <div key={offer._id} className={styles.offerCard}>
                      <img 
                        src={offer.listing?.images?.[0]?.url || offer.listing?.imageUrl || 'https://via.placeholder.com/100'} 
                        className={styles.itemImage} 
                        alt=""
                        onClick={() => handleGoToChat(offer.listing?._id, offer.buyer?._id || offer.buyer)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div className={styles.offerInfo}>
                        <Link to={`/listings/${offer.listing?._id}`} className={styles.listingTitle}>
                          {offer.listing?.title}
                        </Link>
                        <div className={styles.buyerInfo}>
                          <div className={styles.avatar}>{offer.buyer?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
                          <span className={styles.buyerName}>{offer.buyer?.name || 'Someone'}</span>
                        </div>
                        <div className={styles.amountWrap}>
                          <div className={styles.amountLabel}>Offered amount</div>
                          <div className={styles.amountValue}>₹{offer.amount}</div>
                        </div>
                        <div className={`${styles.statusBadge} ${styles[offer.status]}`}>
                          {offer.status}
                        </div>
                      </div>
                      {offer.status === 'pending' ? (
                        <div className={styles.actions}>
                          <button onClick={() => handleUpdateStatus(offer._id, 'accept')} className={styles.acceptBtn}>
                            Accept
                          </button>
                          <button onClick={() => handleUpdateStatus(offer._id, 'reject')} className={styles.rejectBtn}>
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className={styles.actions}>
                           <button onClick={() => handleGoToChat(offer.listing?._id, offer.buyer?._id || offer.buyer)} className={styles.chatBtn}>View Chat</button>
                        </div>
                      )}
                    </div>
                  ))
                )
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MyOffers;
