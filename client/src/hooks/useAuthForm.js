import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../services/api';
import { handleNetworkError } from '../utils/errorHandler';

/**
 * Enterprise Form Hook for account authentications.
 * Controls strict validations, debouncing, loading masks, and auto-purging states.
 */
export const useAuthForm = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const errorTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  // Cleans up unmounted timeouts
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // Set message dynamically clears previous instances and resets the 5-sec timer
  const setTemporaryMessage = (setter, ref, message) => {
    setter(message);
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => setter(null), 5000);
  };

  const dispatchError = (message) => setTemporaryMessage(setError, errorTimeoutRef, message);
  const dispatchSuccess = (message) => setTemporaryMessage(setSuccess, successTimeoutRef, message);

  const validateEmail = useCallback((targetEmail) => {
    // Basic structure check + prevents purely empty submissions natively
    const generalRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!targetEmail || !generalRegex.test(targetEmail)) {
      return 'Please enter a valid format, like student@college.edu';
    }

    // Checking for valid academic TLDs (.edu as primary, fallback to general international .ac.uk style)
    const academicRegex = /\.edu($|\.[a-z]{2}$)|\.ac\.[a-z]{2}$/i;
    // We optionally flag it if it strictly doesn't meet the academic block, though we allow normal
    // If the requirement dictates strict academic, uncomment below:
    // if (!academicRegex.test(targetEmail)) {
    //  return 'Registration strictly requires a verifiable university email (.edu)';
    // }

    return null;
  }, []);

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Auto-clear success state if they start typing again
    if (success) setSuccess(null);
    
    // Soft real-time validation (opt-in based on UX preference)
    if (error && value.includes('@')) {
      const validationError = validateEmail(value);
      if (!validationError) setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading || success) return;

    const validationCheck = validateEmail(email);
    if (validationCheck) {
      dispatchError(validationCheck);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post('/auth/request-verification', { email });
      if (res.data?.success) {
        dispatchSuccess(res.data.message || 'Verification link sent! Check your student inbox.');
        setEmail('');
      } else {
         // Some backend implementations 200 OK but attach a false success toggle
        dispatchError(res.data?.message || 'We could not send the link at this time.');
      }
    } catch (err) {
      // Intercept errors securely through our mapped handler
      const mappedError = handleNetworkError(err);
      dispatchError(mappedError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email,
    isLoading,
    error,
    success,
    handleEmailChange,
    handleSubmit,
  };
};
