import { defineStore } from "pinia";
import api from "../axios";

export const useLessorStore = defineStore("lessor", {
  state: () => ({
    lessor: null,
    token:
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      null,
    loading: false,
  }),

  actions: {
    async fetchLessor() {
      if (!this.token) {
        console.warn('No token found. Lessor data not fetched.');
        return;
      }

      this.loading = true;
      console.log("Fetching lessor data...");
      try {
        const { data } = await api.get("/api/user");
        console.log("Data fetched:", data);
        if (data.role === "lessor") {
          this.lessor = data;
        } else {
          this.lessor = null;
          console.warn("Fetched data is not a lessor.");
        }
      } catch (error) {
        console.error("Error fetching lessor data:", error);
      } finally {
        this.loading = false;
      }
    },

    setToken(token, rememberMe = true) {
      this.token = token;
      if (rememberMe) {
        localStorage.setItem("auth_token", token);
        sessionStorage.removeItem("auth_token");
      } else {
        sessionStorage.setItem("auth_token", token);
        localStorage.removeItem("auth_token");
      }
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    },

    setLessor(lessor) {
      this.lessor = lessor;
    },

    clearToken() {
      this.token = null;
      this.lessor = null;
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
      api.defaults.headers.common["Authorization"] = "";
    },
  },
});

export default useLessorStore;
