<script setup>
import api from "../axios.js";
import router from "../router.js";
import { computed, ref, onMounted } from "vue";
import useLessorStore from "../store/lessor.js";

const lessorStore = useLessorStore();
const lessor = computed(() => lessorStore.lessor);
const isExpanded = ref(false);
const showDropdown = ref(false);

onMounted(() => {
  const savedState = localStorage.getItem("sidebar_expanded");
  isExpanded.value = savedState === null ? true : savedState === "true";

  if (lessorStore.token && !lessorStore.lessor) {
    lessorStore.fetchLessor();
  }

  document.addEventListener("click", (e) => {
    const dropdownElement = document.getElementById("user-dropdown");
    const avatarElement = document.getElementById("user-avatar");
    if (
      dropdownElement &&
      avatarElement &&
      !dropdownElement.contains(e.target) &&
      !avatarElement.contains(e.target)
    ) {
      showDropdown.value = false;
    }
  });
});

const toggleMenu = () => {
  isExpanded.value = !isExpanded.value;
  localStorage.setItem("sidebar_expanded", isExpanded.value);
};

const toggleDropdown = (event) => {
  event.stopPropagation();
  showDropdown.value = !showDropdown.value;
};

async function logout() {
  try {
    await api.post("/api/logout");
    lessorStore.clearToken();
    await router.push({ name: "Login" });
    window.location.reload();
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

const menuItems = [
  {
    name: "Dashboard",
    route: "/lessorhome",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>`,
  },
  {
    name: "Listings",
    route: "/listings",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>`,
  },
  {
    name: "Reservations",
    route: "/reservations",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>`,
  },

  {
    name: "Profile",
    route: "/lessor-profile",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>`,
  },
];

const activeRoute = computed(() => router.currentRoute.value.path);

const currentMenuItem = computed(() => {
  return (
    menuItems.find((item) => item.route === activeRoute.value) || {
      name: "Page",
      route: activeRoute.value,
    }
  );
});
</script>

<template>
  <div class="flex h-screen bg-white dark:bg-gray-900">
    <!-- Sidebar -->
    <aside
      :class="`fixed flex flex-col h-screen overflow-y-auto bg-[#002D4A] border-r rtl:border-r-0 rtl:border-l border-gray-700 z-10 transition-all duration-300 shadow-md ${
        isExpanded ? 'w-64' : 'w-20'
      }`"
    >
      <div
        class="flex items-center justify-center p-4 border-b dark:border-gray-700"
      >
        <span v-if="isExpanded"
          ><img
            src="../../src/assets/images/logo2.png"
            class="h-16 w-auto"
            alt="Logo"
        /></span>
      </div>

      <div class="flex flex-col justify-between flex-1 p-4">
        <nav class="space-y-1">
          <div v-for="item in menuItems" :key="item.name" class="relative">
            <router-link
              :to="item.route"
              :class="`flex items-center px-3 py-3 text-gray-300 transition-colors duration-200 rounded-lg ${
                activeRoute === item.route
                  ? 'bg-[#036F8B]/20 text-white font-medium'
                  : 'hover:bg-[#036F8B] hover:text-white'
              }`"
            >
              <span class="flex-shrink-0" v-html="item.icon"></span>
              <span v-if="isExpanded" class="ml-3 text-sm">{{
                item.name
              }}</span>
            </router-link>
          </div>
        </nav>
      </div>
    </aside>

    <!-- Top navigation bar -->
    <div
      :class="`fixed top-0 right-0 z-20 transition-all duration-300 ${
        isExpanded ? 'left-64' : 'left-20'
      }`"
    >
      <div
        class="flex items-center justify-between h-16 bg-white border-b border-gray-200 px-6"
      >
        <!-- Left side - Breadcrumb navigation -->
        <div class="flex items-center">
          <nav class="flex" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 md:space-x-3">
              <!-- Home icon -->
              <li class="inline-flex items-center">
                <router-link
                  to="/lessorhome"
                  class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                    />
                  </svg>
                </router-link>
              </li>

              <!-- Current page -->
              <li v-if="currentMenuItem.route !== '/lessorhome'">
                <div class="flex items-center">
                  <span class="mx-2 text-gray-400">/</span>
                  <span class="text-sm font-medium text-gray-700">{{
                    currentMenuItem.name
                  }}</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        <!-- Right side - User dropdown -->
        <div class="flex items-center relative">
          <div
            @click="toggleDropdown"
            id="user-avatar"
            class="flex items-center cursor-pointer"
          >
            <div class="mr-3 text-right hidden sm:block">
              <p class="text-sm font-medium text-gray-700">
                {{ lessor?.name || "User" }}
              </p>
              <p class="text-xs text-gray-500">Items owner</p>
            </div>
            <div
              class="h-10 w-10 rounded-full bg-[#002D4A] text-white flex items-center justify-center overflow-hidden"
            >
              <img
                v-if="lessor?.avatar"
                :src="lessor.avatar"
                class="h-full w-full object-cover"
                alt="User avatar"
              />
              <span v-else class="text-sm font-medium">
                {{ lessor?.name ? lessor.name.charAt(0) : "U" }}
              </span>
            </div>
          </div>

          <!-- Dropdown menu -->
          <div
            v-show="showDropdown"
            id="user-dropdown"
            class="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-30 border border-gray-200"
          >
            <div class="px-4 py-3 border-b border-gray-100">
              <p class="text-sm font-medium text-gray-700">
                {{ lessor?.name || "User" }}
              </p>
              <p class="text-xs text-gray-500 truncate">Items owner</p>
            </div>
            <button
              @click="logout"
              class="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <main
      :class="`transition-all duration-300 ${
        isExpanded ? 'ml-64' : 'ml-20'
      } pt-16 w-full overflow-y-auto bg-white min-h-screen`"
    >
      <div class="p-6 bg-white">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<style scoped>
:deep(.bg-gray-100) {
  background-color: white !important;
}
</style>
