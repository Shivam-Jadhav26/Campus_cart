import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import styles from './Toast.module.css';

const Toast = () => {
  const { socket, connected } = useSocket();
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleOfferReceived = (data) => {
      addToast(`New offer received on "${data.title}"`, 'info');
    };

    const handleOfferStatus = (data) => {
      const statusStr = data.status === 'accepted' ? 'accepted' : 'rejected';
      const variant = data.status === 'accepted' ? 'success' : 'info';
      addToast(`Your offer was ${statusStr} for "${data.title}"`, variant);
    };

    socket.on('offerReceived', handleOfferReceived);
    socket.on('offerStatusChanged', handleOfferStatus);

    return () => {
      socket.off('offerReceived', handleOfferReceived);
      socket.off('offerStatusChanged', handleOfferStatus);
    };
  }, [socket, connected]);

  const addToast = (message, variant) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, variant }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000); 
  };

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.variant]}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default Toast;
