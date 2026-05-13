import { defineStore } from "pinia";
import api from "../axios.js"; 

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || null,
    loading: false,
  }),

  actions: {
    async fetchUser() {
      if (!this.token) {
        console.warn('No token found. User data not fetched.');
        return;
      }

      this.loading = true;
      console.log('Fetching user data...');
      try {
        const { data } = await api.get('/api/user'); 
        console.log('User data fetched:', data);
        this.user = data;
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        this.loading = false;
      }
    },

    setToken(token, rememberMe = true) {
      this.token = token;
      if (rememberMe) {
        localStorage.setItem('auth_token', token);
        sessionStorage.removeItem('auth_token');
      } else {
        sessionStorage.setItem('auth_token', token);
        localStorage.removeItem('auth_token');
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    },

    setUser(user) {
      this.user = user;
    },

    clearToken() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      api.defaults.headers.common['Authorization'] = '';
    },
  },
});
