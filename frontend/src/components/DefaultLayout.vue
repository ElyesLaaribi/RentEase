<script setup>
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  UserIcon,
} from "@heroicons/vue/24/solid";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/vue";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/vue";
import api from "../axios.js";
import router from "../router.js";
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useUserStore } from "../store/user.js";
import { useFirebaseMessaging } from "../composables/useFirebaseMessaging";

const showNotifications = ref(false);
const mobileMenuOpen = ref(false);

const {
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  clearAll,
  requestPermissionAndGetToken,
} = useFirebaseMessaging();

onMounted(async () => {
  // Add event listener for clicking outside notification panel
  document.addEventListener("click", handleOutsideClick);

  if (userStore.token && !userStore.user) {
    await userStore.fetchUser();
  }

  // Request notification permissions when the layout loads
  try {
    await requestPermissionAndGetToken();
    console.log("Notification permissions requested in DefaultLayout");
  } catch (err) {
    console.error("Error setting up notifications in DefaultLayout:", err);
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleOutsideClick);
});

// Handle click outside notification panel
const handleOutsideClick = (event) => {
  const container = document.querySelector(".notification-container");
  if (
    container &&
    !container.contains(event.target) &&
    !event.target.closest(".notification-bell") &&
    showNotifications.value
  ) {
    showNotifications.value = false;
  }
};

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value) {
    console.log(
      "Notification panel opened, notifications:",
      notifications.value
    );
  }
};

const onNotificationClick = (notification) => {
  console.log("Notification clicked:", notification);

  // Mark as read
  markAsRead(notification.id);

  // Navigate based on notification type
  if (notification.type === "rental_reminder" && notification.id) {
    router.push(`/my-rentals`);
    showNotifications.value = false;
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

  if (diffInHours < 24) {
    return diffInHours === 0
      ? "Just now"
      : `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const userStore = useUserStore();
const user = computed(() => userStore.user);
const isAuthenticated = computed(() => !!userStore.token);

const navigation = computed(() => {
  const items = [
    { name: "Home", href: "/" },
    { name: "Browse", href: "/home" },
  ];
  // Only show "My Rentals" for authenticated users
  if (isAuthenticated.value) {
    items.push({ name: "My Rentals", href: "/my-rentals" });
  }
  return items;
});

// Current route path for highlighting active nav items
const currentPath = computed(() => router.currentRoute.value.path);

function logout() {
  api
    .post("/api/logout")
    .then(() => {
      userStore.clearToken();
      router.push({ name: "Login" }).then(() => {
        window.location.reload();
      });
    })
    .catch((error) => {
      console.error("Logout failed:", error);
    });
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white">
    <Disclosure as="nav" class="bg-[#002D4A]" v-slot="{ open }">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="relative flex items-center justify-between h-16">
          <!-- Mobile menu button -->
          <div class="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <DisclosureButton
              class="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span class="sr-only">{{
                open ? "Close main menu" : "Open main menu"
              }}</span>
              <Bars3Icon
                v-if="!open"
                class="block h-6 w-6"
                aria-hidden="true"
              />
              <XMarkIcon v-else class="block h-6 w-6" aria-hidden="true" />
            </DisclosureButton>
          </div>

          <!-- Logo and navigation -->
          <div
            class="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start"
          >
            <div class="flex-shrink-0 flex items-center">
              <router-link to="/home" class="flex items-center">
                <img
                  class="h-15 w-auto"
                  src="../../src/assets/images/logo2.png"
                  alt="Company Logo"
                />
              </router-link>
            </div>

            <!-- Desktop navigation -->
            <div class="items-center hidden sm:ml-7 sm:flex sm:space-x-4">
              <router-link
                v-for="item in navigation"
                :key="item.name"
                :to="item.href"
                :class="[
                  currentPath === item.href
                    ? 'bg-[#036F8B] text-white hover:bg-[#036F8B]'
                    : 'text-gray-300 hover:bg-[#036F8B] hover:text-white',
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                ]"
                :aria-current="currentPath === item.href ? 'page' : undefined"
              >
                {{ item.name }}
              </router-link>
            </div>
          </div>

          <!-- Right side: notifications and profile -->
          <div
            class="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0"
          >
            <!-- Notifications -->
            <div class="relative ml-4">
              <button
                @click="toggleNotifications"
                class="notification-bell relative rounded-full p-1 bg-[#002D4A] text-gray-400 hover:text-white focus:ring-2 focus:ring-white"
                aria-label="View notifications"
              >
                <BellIcon class="h-6 w-6" aria-hidden="true" />
                <span
                  v-if="unreadCount > 0"
                  class="absolute top-0 right-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                >
                  {{ unreadCount }}
                </span>
              </button>

              <transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <div
                  v-if="showNotifications"
                  class="notification-container absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-gray-500 ring-opacity-5 z-10"
                >
                  <!-- Header -->
                  <div
                    class="px-4 py-2 flex justify-between items-center border-b border-gray-500"
                  >
                    <span class="font-medium">Notifications</span>
                    <div class="flex space-x-2">
                      <button
                        v-if="unreadCount > 0"
                        @click="markAllAsRead"
                        class="text-xs text-blue-500 hover:underline"
                      >
                        Mark all read
                      </button>
                      <button
                        v-if="notifications.length > 0"
                        @click="clearAll"
                        class="text-xs text-red-500 hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>

                  <!-- Notification List -->
                  <div class="max-h-60 overflow-y-auto">
                    <div
                      v-if="notifications.length === 0"
                      class="px-4 py-3 text-sm text-gray-500 text-center"
                    >
                      No notifications
                    </div>
                    <div
                      v-for="n in notifications"
                      :key="n.id"
                      @click="onNotificationClick(n)"
                      class="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                      :class="{ 'bg-blue-50': !n.read }"
                    >
                      <div :class="{ 'font-semibold': !n.read }">
                        {{ n.title }}
                      </div>
                      <div class="text-gray-600 text-sm mt-1">{{ n.body }}</div>
                      <div class="text-xs text-gray-400 mt-1">
                        {{ formatTime(n.timestamp) }}
                      </div>
                    </div>
                  </div>
                </div>
              </transition>
            </div>

            <!-- Profile dropdown -->
            <Menu as="div" class="ml-3 relative">
              <div>
                <MenuButton
                  class="flex items-center rounded-full bg-[#002D4A] text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  <span class="sr-only">Open user menu</span>
                  <div v-if="user" class="flex items-center">
                    <img
                      v-if="user.avatar"
                      class="h-8 w-8 rounded-full object-cover"
                      :src="user.avatar"
                      :alt="`${user.name}'s avatar`"
                    />
                    <div
                      v-else
                      class="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center"
                    >
                      <UserIcon class="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <span class="ml-2 text-white text-sm hidden md:block">{{
                      user.name
                    }}</span>
                    <svg
                      class="ml-1 h-4 w-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </div>
                  <div v-else class="flex items-center">
                    <div
                      class="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center"
                    >
                      <UserIcon
                        class="h-5 w-5 text-gray-300"
                        aria-hidden="true"
                      />
                    </div>
                    <span class="ml-2 text-gray-300 text-sm hidden md:block"
                      >Login</span
                    >
                  </div>
                </MenuButton>
              </div>

              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <MenuItems
                  class="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                >
                  <MenuItem v-if="user" v-slot="{ active }">
                    <router-link
                      :to="{ name: 'client-profile' }"
                      :class="[
                        active ? 'bg-gray-100' : '',
                        'flex items-center px-4 py-2 text-sm text-gray-700',
                      ]"
                    >
                      <UserIcon
                        class="mr-3 h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                      Your Profile
                    </router-link>
                  </MenuItem>

                  <MenuItem v-if="user" v-slot="{ active }">
                    <button
                      @click="logout"
                      :class="[
                        active ? 'bg-gray-100' : '',
                        'flex items-center w-full text-left px-4 py-2 text-sm text-gray-700',
                      ]"
                    >
                      <svg
                        class="mr-3 h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign out
                    </button>
                  </MenuItem>

                  <MenuItem v-if="!user" v-slot="{ active }">
                    <router-link
                      :to="{ name: 'Login' }"
                      :class="[
                        active ? 'bg-gray-100' : '',
                        'flex items-center px-4 py-2 text-sm text-gray-700',
                      ]"
                    >
                      <svg
                        class="mr-3 h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                      Login
                    </router-link>
                  </MenuItem>
                </MenuItems>
              </transition>
            </Menu>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <DisclosurePanel class="sm:hidden" id="mobile-menu">
        <div class="px-2 pt-2 pb-3 space-y-1">
          <DisclosureButton
            v-for="item in navigation"
            :key="item.name"
            as="a"
            :href="item.href"
            :class="[
              currentPath === item.href
                ? 'bg-[#036F8B] text-white hover:bg-[#036F8B]'
                : 'text-gray-300 hover:bg-[#036F8B] hover:text-white',
              'block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200',
            ]"
            :aria-current="currentPath === item.href ? 'page' : undefined"
          >
            {{ item.name }}
          </DisclosureButton>
        </div>
      </DisclosurePanel>
    </Disclosure>

    <!-- Page content -->
    <main class="flex-grow">
      <slot></slot>
    </main>

    <!-- Footer -->
    <footer class="bg-[#002D4A] text-white py-6">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="mb-4 md:mb-0">
            <p class="mt-2 text-sm text-gray-400">
              &copy; 2025 RentApp. All rights reserved.
            </p>
          </div>

          <div class="flex space-x-6">
            <a href="#" class="text-gray-400 hover:text-white">
              <span class="sr-only">Terms</span>
              Terms
            </a>
            <a href="#" class="text-gray-400 hover:text-white">
              <span class="sr-only">Privacy</span>
              Privacy
            </a>
            <a
              href="https://wa.me/21624523108"
              class="text-gray-400 hover:text-white"
              target="_blank"
            >
              <span class="sr-only">Contact</span>
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Smooth transitions */
.router-link-active {
  transition: all 0.3s ease;
}

/* Notification panel styling */
.notification-container {
  max-height: 80vh;
  overflow-y: auto;
}

.notification-item {
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
}

.notification-item:last-child {
  border-bottom: none;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .md\:flex-row {
    flex-direction: column;
  }

  .notification-container {
    width: calc(100vw - 2rem);
    right: -0.5rem;
  }
}
</style>
