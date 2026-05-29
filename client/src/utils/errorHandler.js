/**
 * CampusCart - errorHandler.js
 * Maps complex Axios & Network Errors to human-readable format.
 * 
 * @param {import('axios').AxiosError | Error} error The caught error
 * @returns {{ code: string, message: string, isRetryable: boolean }} Error representation
 */
export const handleNetworkError = (error) => {
  // 1. CORS, DNS, or Physical connection loss (Axios translates it to "Network Error" or has no response)
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK' || !error.response) {
    return {
      code: 'NETWORK_FAILURE',
      message: 'Unable to reach the server. Please check your internet connection or try again later.',
      isRetryable: true,
    };
  }

  // 2. Timeout (Axios throws ECONNABORTED)
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return {
      code: 'TIMEOUT',
      message: 'The server took too long to respond. Please try again.',
      isRetryable: true,
    };
  }

  // 3. Rate Limiting (429)
  if (error.response.status === 429) {
    return {
      code: 'RATE_LIMIT',
      message: 'You are making too many requests. Please wait a moment and try again.',
      isRetryable: true, // Usually dictates delay, but standard user retry handles it practically 
    };
  }

  // 4. Server Crashes (5xx)
  if (error.response.status >= 500) {
    return {
      code: 'SERVER_ERROR',
      message: 'Something went wrong on our end. Please try again later.',
      isRetryable: true,
    };
  }

  // 5. Auth / Permissions (401, 403)
  if (error.response.status === 401 || error.response.status === 403) {
    return {
      code: 'UNAUTHORIZED',
      message: error.response.data?.message || 'Your session has expired or you do not have permission. Please sign in again.',
      isRetryable: false,
    };
  }

  // 6. Standard Client Violations (400, 404, 409)
  return {
    code: 'CLIENT_ERROR',
    message: error.response.data?.message || 'An unexpected application error occurred. Please verify your input.',
    isRetryable: false,
  };
};
