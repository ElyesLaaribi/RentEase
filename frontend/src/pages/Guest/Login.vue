<script setup>
import { ref, computed } from "vue";
import router from "../../router.js";
import { useRoute } from "vue-router";
import api from "../../axios.js";
import { useUserStore } from "../../store/user";
import { EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/outline";
import { useToast } from "vue-toast-notification";
import "vue-toast-notification/dist/theme-sugar.css";
import { $t } from "@primeuix/themes";
const $toast = useToast();
const route = useRoute();

const data = ref({
  email: "",
  password: "",
  rememberMe: false,
});

const errors = ref({
  email: [],
  password: [],
});

const errorMessage = ref("");
const loading = ref(false);
const showPassword = ref(false);

const passwordInputType = computed(() => {
  return showPassword.value ? "text" : "password";
});

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

async function submit() {
  errors.value = { email: [], password: [] };
  errorMessage.value = "";
  loading.value = true;

  try {
    await api.get("/sanctum/csrf-cookie");
    const response = await api.post("/api/login", data.value);
    const token = response.data.token;
    const userStore = useUserStore();

    userStore.setToken(token, data.value.rememberMe);
    userStore.setUser(response.data.user);

    // Check if there's a redirect URL (e.g. guest tried to reserve before login)
    const redirectPath = route.query.redirect;
    if (redirectPath && response.data.user.role === "client") {
      $toast.success("Login successful!");
      router.push(redirectPath);
    } else {
      const redirectRoute =
        response.data.user.role === "client"
          ? { name: "Home" }
          : { name: "LessorHome" };
      $toast.success("Login successful!");
      router.push(redirectRoute);
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 422) {
        errors.value = {
          email: error.response.data.errors?.email || [],
          password: error.response.data.errors?.password || [],
        };
        $toast.error("Login failed");
      } else if (error.response.status === 401) {
        errors.value = {
          email: error.response.data.errors?.email || [],
          password: error.response.data.errors?.password || [],
        };
        $toast.error("Login failed");
      } else {
        errorMessage.value =
          error.response.data.message || "Login failed. Please try again.";
        $toast.error("Login failed");
      }
    } else if (error.request) {
      errorMessage.value =
        "No response from server. Check your internet connection.";
      $toast.error("Login failed");
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row h-screen w-screen overflow-hidden">
    <!-- Blue left side panel with reversed primary colors -->
    <div
      class="relative w-full md:w-1/2 flex flex-col items-center justify-center text-white overflow-hidden bg-gradient-to-br from-[#135CA5] to-[#28BBDD] py-16 md:py-0"
    >
      <!-- Content: Logo + Headings -->
      <div class="company-logo mb-8 z-10">
        <span
          class="text-xl md:text-2xl font-bold rounded-full bg-white/20 px-4 py-2 flex items-center shadow-glow"
        >
          <svg
            class="w-5 h-5 md:w-6 md:h-6 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 9a2 2 0 100-4 2 2 0 000 4z"
              clip-rule="evenodd"
            />
          </svg>

          RentEase
        </span>
      </div>

      <div class="text-center z-10 max-w-xs px-4 md:px-0">
        <h2 class="text-2xl md:text-3xl font-bold mb-3">
          Nice to see you again
        </h2>
      </div>

      <!-- Background container for grid + waves -->
      <div class="absolute inset-0 z-0">
        <!-- Grid overlay -->
        <div class="grid-background"></div>

        <!-- Circles or subtle decorative dots (optional) -->
        <div class="circle-decor circle-1"></div>
        <div class="circle-decor circle-2"></div>

        <!-- Wave effect at bottom (SVG) -->
        <svg
          class="absolute bottom-0 left-0 w-full h-32"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="rgba(255, 255, 255, 0.08)"
            d="M0,224L60,213.3C120,203,240,181,360,165.3C480,149,600,139,720,154.7C840,171,960,213,1080,208C1200,203,1320,149,1380,122.7L1440,96L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
          ></path>
        </svg>
      </div>
    </div>

    <!-- White right side panel -->
    <div
      class="bg-white w-full md:w-1/2 flex flex-col justify-center overflow-y-auto py-12 md:py-0"
    >
      <div class="max-w-md mx-auto w-full px-6 md:px-8">
        <h2 class="mt-24 text-2xl md:text-3xl font-bold text-[#135CA5] mb-4">
          Login
        </h2>
        <p class="text-gray-500 text-sm mb-8">
          Welcome back! Please login to your account to continue managing your
          rentals.
        </p>

        <div v-if="errorMessage" class="mb-4">
          <div
            class="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-600"
          >
            <div class="flex">
              <div class="flex-shrink-0">
                <svg
                  class="h-5 w-5 text-red-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p>{{ errorMessage }}</p>
              </div>
            </div>
          </div>
        </div>

        <form @submit.prevent="submit" class="space-y-6" novalidate>
          <div>
            <div class="relative">
              <input
                type="text"
                name="email"
                id="email"
                autocomplete="email"
                v-model="data.email"
                placeholder="Email ID"
                class="w-full p-4 border-2 border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:border-[#135CA5]"
                :class="{ 'border-red-300': errors.email.length }"
              />
              <div
                class="absolute left-0 top-0 bottom-0 w-2 bg-[#135CA5] rounded-l-md"
                v-if="data.email"
              ></div>
            </div>
            <p v-if="errors.email.length" class="mt-1 text-sm text-red-600">
              {{ errors.email[0] }}
            </p>
          </div>

          <div>
            <div class="relative">
              <input
                :type="passwordInputType"
                name="password"
                id="password"
                autocomplete="current-password"
                v-model="data.password"
                placeholder="Password"
                class="w-full p-4 border-2 border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:border-[#135CA5]"
                :class="{ 'border-red-300': errors.password.length }"
              />
              <div
                class="absolute left-0 top-0 bottom-0 w-2 bg-[#135CA5] rounded-l-md"
                v-if="data.password"
              ></div>
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <EyeIcon v-if="!showPassword" class="h-5 w-5" />
                <EyeSlashIcon v-else class="h-5 w-5" />
              </button>
            </div>
            <p v-if="errors.password.length" class="mt-1 text-sm text-red-600">
              {{ errors.password[0] }}
            </p>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                v-model="data.rememberMe"
                class="h-5 w-5 text-[#135CA5] focus:ring-[#135CA5] border-gray-300 rounded"
              />
              <label for="remember-me" class="ml-2 block text-sm text-gray-600">
                Keep me signed in
              </label>
            </div>
            <div class="text-sm">
              <router-link
                :to="{ name: 'ForgetPassword' }"
                class="font-medium text-[#135CA5] hover:text-[#28BBDD]"
              >
                Forgot password?
              </router-link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-4 px-4 border border-transparent rounded-md shadow-md text-base font-medium text-white bg-[#135CA5] hover:bg-[#28BBDD] focus:outline-none transition-colors duration-200 uppercase tracking-wide"
              :class="{ 'opacity-70': loading }"
            >
              <svg
                v-if="loading"
                class="animate-spin h-5 w-5 mr-2 text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
              <span v-if="loading">Signing in...</span>
              <span v-else>Sign in</span>
            </button>
          </div>
        </form>

        <p class="mt-6 text-center text-sm text-gray-600">
          Not a member?
          <router-link
            :to="{ name: 'Signup' }"
            class="font-semibold text-[#135CA5] hover:text-[#28BBDD]"
          >
            Create a new account
          </router-link>
        </p>
      </div>
      <!-- Footer -->
    </div>
  </div>
</template>

<style scoped>
/* Enhanced blue panel styling */
.shadow-glow {
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
}

/* Grid background */
.grid-background {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(
      to right,
      rgba(255, 255, 255, 0.08) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.8;
}

/* Optional circle decorations */
.circle-decor {
  position: absolute;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.06);
}

.circle-1 {
  width: 100px;
  height: 100px;
  top: 20%;
  left: 10%;
}

.circle-2 {
  width: 140px;
  height: 140px;
  bottom: 25%;
  right: 10%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .circle-decor {
    display: none;
  }
}
</style>
