import axios from "axios";
import router from "./router.js";

axios.defaults.withCredentials = true;

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  ""
);

export const storageUrl = (path) => {
  if (!path) return "";
  let url = path;
  if (!/^https?:\/\//i.test(path)) {
    url = `${apiBaseUrl}/storage/${String(path).replace(/^\/+/, "")}`;
  }
  // Force HTTPS if the frontend is loaded securely to avoid Mixed Content errors
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    url = url.replace(/^http:/i, "https:");
  }
  return url;
};

export const storagePathFromUrl = (url) => {
  if (!url || !apiBaseUrl) return url;

  const storageBaseUrl = `${apiBaseUrl}/storage/`;
  return url.startsWith(storageBaseUrl) ? url.slice(storageBaseUrl.length) : url;
};

const getStoredToken = () =>
  localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only redirect to login if the user had a token (expired session)
      // Don't redirect guests who are browsing public pages
      const token = getStoredToken();
      if (token) {
        localStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_token");
        router.push({ name: "Login" });
      }
    }
    return Promise.reject(error);
  }
);

// test

export default api;
