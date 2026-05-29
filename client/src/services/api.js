import axios from "axios";

// In development, always use '/api' so Vite proxy handles cross-origin cookies.
// In production (built), use VITE_API_URL directly.
const isDev = import.meta.env.MODE === 'development';
const VITE_API_URL = import.meta.env.VITE_API_URL;
const PRODUCTION_API_URL = "https://campuscart-auwp.onrender.com";

const BASE_URL = isDev
  ? '/api'
  : (VITE_API_URL ? `${VITE_API_URL}/api` : `${PRODUCTION_API_URL}/api`);

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000, 
});

const AUTH_PATHS = [
  "/login",
  "/register",
  "/set-password",
  "/create-password",
  "/auth/callback",
  "/verification-failed"
];


let isRefreshing = false;
let isAuthDeactivated = false; // Prevents infinite loops after definitive refresh failure
let failedQueue = [];

/**
 * 🛠️ Reset Auth Deactivation
 * Call this from AuthContext on login/logout to clear the circuit breaker.
 */
export function resetAuthDeactivation() {
  isAuthDeactivated = false;
  isRefreshing = false;
  failedQueue = [];
}

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

// Cross-tab synchronization
const refreshChannel = new BroadcastChannel("auth_refresh_channel");

refreshChannel.onmessage = (event) => {
  // Safety: If script is half-initialized, ignore early messages
  if (typeof isRefreshing === 'undefined') return;

  if (event.data?.type === "REFRESH_STARTED") {
    isRefreshing = true;
  } else if (event.data?.type === "REFRESH_SUCCESS") {
    isRefreshing = false;
    isAuthDeactivated = false;
    processQueue(null, event.data.token);
  } else if (event.data?.type === "REFRESH_ERROR") {
    isRefreshing = false;
    isAuthDeactivated = true; 
    processQueue(event.data.error, null);
  }
};

api.interceptors.request.use(async (config) => {
  const isPublicAuthRoute = 
    config.url?.includes("/auth/login") || 
    config.url?.includes("/auth/register") || 
    config.url?.includes("/auth/request-verification") || 
    config.url?.includes("/auth/verify") || 
    config.url?.includes("/auth/set-password") || 
    config.url?.includes("/auth/create-password");

  if (isAuthDeactivated && !config.url?.includes("/auth/refresh") && !isPublicAuthRoute) {
    return Promise.reject(new Error("AUTH_DEACTIVATED"));
  }

  if (isDev) {
    console.groupCollapsed(`🚀 [API Request] ${config.method.toUpperCase()} ${config.url}`);
    console.log('Headers:', config.headers);
    if (config.data) console.log('Payload:', config.data);
    console.groupEnd();
  }

  let token = localStorage.getItem("token");

  // Proactive Refresh: If token exists but expires in < 2 mins
  if (token && !config._skipRefresh) {
    const decoded = parseJwt(token);
    if (decoded && decoded.exp && (decoded.exp * 1000) - Date.now() < 120 * 1000) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshChannel.postMessage({ type: "REFRESH_STARTED" });

        try {
          const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
            withCredentials: true
          });
          const newToken = refreshRes.data?.token;
          if (newToken) {
            localStorage.setItem("token", newToken);
            token = newToken;
            isRefreshing = false;
            isAuthDeactivated = false;

            refreshChannel.postMessage({ type: "REFRESH_SUCCESS", token: newToken });
            processQueue(null, newToken);
          }
        } catch (error) {
          isAuthDeactivated = true;
          refreshChannel.postMessage({ type: "REFRESH_ERROR", error });
          processQueue(error, null);
          localStorage.removeItem("token");
          token = null;
        } finally {
          isRefreshing = false;
        }
      } else {
        try {
          token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
        } catch (error) {
          token = null;
        }
      }
    }
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Exponential Backoff helper
const sleep = ms => new Promise(res => setTimeout(res, ms));

api.interceptors.response.use(
  (response) => {
    if (isDev) {
       console.log(`✅ [API Success] ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    
    if (isDev) {
       console.error(`❌ [API Error] ${error.response?.status || 'Network'} ${originalRequest.url || 'Unknown Endpoint'}`, error);
    }

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        // Handle standalone 10s timeout explicitly handled by errorHandler.js downstream
        return Promise.reject(error);
      }

      // Retry mechanism for purely network failures (DNS/CORS/No Connection)
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount++;
        const backoffDelay = Math.pow(2, originalRequest._retryCount) * 1000;
        if (isDev) console.warn(`🔄 Retrying network request in ${backoffDelay}ms (Attempt ${originalRequest._retryCount})...`);
        await sleep(backoffDelay);
        return api(originalRequest);
      }

      return Promise.reject(error);
    }

    const isRefreshPath = originalRequest.url?.includes("/auth/refresh");

    if (originalRequest._skipRefresh || originalRequest._retry || isRefreshPath) {
      if (isRefreshPath) {
        localStorage.removeItem("token");
      }
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response.status === 401) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          originalRequest._retry = true;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      refreshChannel.postMessage({ type: "REFRESH_STARTED" });

      try {
        const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
          withCredentials: true,
          _skipRefresh: true
        });

        const newToken = refreshRes.data?.token;
        if (newToken) {
          localStorage.setItem("token", newToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          isAuthDeactivated = false; 
          refreshChannel.postMessage({ type: "REFRESH_SUCCESS", token: newToken });
        }

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        isAuthDeactivated = true; 
        refreshChannel.postMessage({ type: "REFRESH_ERROR", error: refreshError });
        processQueue(refreshError, null);

        localStorage.removeItem("token");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Retry for 5xx Service Unavailable / Server Errors
    if (error.response.status >= 500 && !originalRequest._retry) {
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount++;
        const backoffDelay = Math.pow(2, originalRequest._retryCount) * 1000;
        if (isDev) console.warn(`🔄 Backend 5xx, retrying in ${backoffDelay}ms (Attempt ${originalRequest._retryCount})...`);
        await sleep(backoffDelay);
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
