<script setup>
import { onMounted, ref, computed, watch, nextTick } from "vue";
import { UserCircleIcon } from "@heroicons/vue/24/solid";
import DefaultLayout from "../../components/DefaultLayout.vue";
import api, { storageUrl } from "../../axios";
import { useRoute, useRouter } from "vue-router";
import L from "leaflet";
import { useUserStore } from "../../store/user";
import Flatpickr from "vue-flatpickr-component";
import "flatpickr/dist/flatpickr.css";

const startDatePickerRef = ref(null);
const endDatePickerRef = ref(null);

const userStore = useUserStore();
const todayStr = new Date().toISOString().slice(0, 10);
const reservations = ref([]);

const isDataReady = computed(() => {
  return reservations.value.length > 0 || !isLoading.value;
});

const isLoading = ref(true);
const error = ref(null);
const activeImageIndex = ref(0);
const showAllImages = ref(false);
const rentalStart = ref("");
const rentalEnd = ref("");
const totalDays = ref(1);

const mapVisible = ref(true);
const route = useRoute();
const router = useRouter();
const id = route.params.id;
const map = ref();
const mapContainer = ref();

// Reviews
const showAllReviews = ref(false);
const reviews = ref([]);
const totalReviews = ref(0);
const reviewsLoading = ref(true);
const reviewsError = ref(null);
const showReviewsModal = ref(false);

const newReview = ref({
  user_id: userStore.user?.id || "",
  listing_id: id,
  comment: "",
});

const reviewSubmitting = ref(false);
const reviewSuccess = ref(false);
const reviewError = ref(null);

const openReviewsModal = () => {
  showReviewsModal.value = true;
  mapVisible.value = false;
  document.body.style.overflow = "hidden";

  if (map.value) {
    map.value.remove();
    map.value = null;
  }
};

const closeReviewsModal = () => {
  showReviewsModal.value = false;
  mapVisible.value = true;
  document.body.style.overflow = "";

  nextTick(() => {
    if (mapContainer.value && !map.value) {
      initializeMap();
    }
  });
};

const initializeMap = () => {
  if (mapContainer.value && !map.value) {
    const lat = listingData.value.latitude
      ? parseFloat(listingData.value.latitude)
      : 51.505;
    const lng = listingData.value.longitude
      ? parseFloat(listingData.value.longitude)
      : -0.09;

    map.value = L.map(mapContainer.value).setView([lat, lng], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.value);

    if (listingData.value.latitude && listingData.value.longitude) {
      L.marker([lat, lng])
        .addTo(map.value)
        .bindPopup(listingData.value.address || "Listing Location")
        .openPopup();
    }
  }
};

const displayedReviews = computed(() => {
  return showAllReviews.value ? reviews.value : reviews.value.slice(0, 4);
});

const listingData = ref({
  id: "",
  name: "",
  price: 0,
  description: "",
  images: [],
  user_id: "",
  user_name: "Item Owner",
  phone: "",
  joined_since: "",
  avatar: "",
  address: "",
  latitude: "",
  longitude: "",
});

const fetchReviews = async () => {
  try {
    reviewsLoading.value = true;
    const response = await api.get(`/api/reviews?listing_id=${id}`);
    if (!response.data) {
      throw new Error("Failed to fetch reviews");
    }
    reviews.value = response.data.data
      ? response.data.data.map((review) => ({
          id: review.id,
          name: review.user_name,
          review: review.comment,
          showFull: false,
          avatar: "/images/default-avatar.jpg",
          location: "Customer",
          date: "Recent rental",
          stayDuration: "Rental",
        }))
      : [];
    totalReviews.value = reviews.value.length;
  } catch (err) {
    reviewsError.value = err.message;
    console.error("Error fetching reviews:", err);
  } finally {
    reviewsLoading.value = false;
  }
};

const fetchReservations = async () => {
  try {
    const resp = await api.get(`/api/listings/${id}/reservations`);
    console.log(resp.data);
    reservations.value = resp.data.data.map((r) => ({
      from: r.start_date,
      to: r.end_date,
    }));

    nextTick(() => {
      if (startDatePickerRef.value?.fp) {
        startDatePickerRef.value.fp.redraw();
      }
      if (endDatePickerRef.value?.fp) {
        endDatePickerRef.value.fp.redraw();
      }
    });
  } catch (e) {
    console.error("Could not load reservations:", e);
  }
};

const startDateConfig = computed(() => ({
  minDate: todayStr,
  disable: [
    function (date) {
      return reservations.value.some((reservation) => {
        const reservationStart = new Date(reservation.from);
        const reservationEnd = new Date(reservation.to);
        return date >= reservationStart && date <= reservationEnd;
      });
    },
  ],
  onChange: function (selectedDates) {
    if (new Date(rentalEnd.value) <= new Date(rentalStart.value)) {
      const nextDay = new Date(selectedDates[0]);
      nextDay.setDate(nextDay.getDate() + 1);
      rentalEnd.value = nextDay.toISOString().slice(0, 10);
    }
    calculateDays();
  },
  onDayCreate: function (dObj, dStr, fp, dayElem) {
    const date = dayElem.dateObj;
    const isReserved = reservations.value.some((reservation) => {
      const reservationStart = new Date(reservation.from);
      const reservationEnd = new Date(reservation.to);
      return date >= reservationStart && date <= reservationEnd;
    });

    // Apply custom class to reserved dates
    if (isReserved) {
      dayElem.classList.add("reserved-day");
    }
  },
}));

const endDateConfig = computed(() => ({
  minDate: rentalStart.value
    ? (() => {
        const day = new Date(rentalStart.value);
        day.setDate(day.getDate() + 1);
        return day.toISOString().slice(0, 10);
      })()
    : todayStr,
  disable: [
    function (date) {
      if (rentalStart.value && date < new Date(rentalStart.value)) {
        return true;
      }

      return reservations.value.some((reservation) => {
        const reservationStart = new Date(reservation.from);
        const reservationEnd = new Date(reservation.to);
        return date >= reservationStart && date <= reservationEnd;
      });
    },
  ],
  onChange: function () {
    calculateDays();
  },
  onDayCreate: function (dObj, dStr, fp, dayElem) {
    const date = dayElem.dateObj;
    const isReserved = reservations.value.some((reservation) => {
      const reservationStart = new Date(reservation.from);
      const reservationEnd = new Date(reservation.to);
      return date >= reservationStart && date <= reservationEnd;
    });

    if (isReserved) {
      dayElem.classList.add("reserved-day");
    }
  },
}));

const isReviewTruncated = (review) => {
  return review.review && review.review.length > 150 && !review.showFull;
};

onMounted(() => {
  fetchListingData().then(() => {
    // Use nextTick to ensure that listingData is populated before initializing the map.
    nextTick(() => {
      if (mapVisible.value) {
        initializeMap();
      }
    });
  });

  fetchReviews();
  fetchReservations();

  const handleEscKey = (event) => {
    if (event.key === "Escape" && showReviewsModal.value) {
      closeReviewsModal();
    }
  };

  window.addEventListener("keydown", handleEscKey);

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  rentalStart.value = today.toISOString().slice(0, 10);
  rentalEnd.value = tomorrow.toISOString().slice(0, 10);

  calculateDays();

  return () => {
    window.removeEventListener("keydown", handleEscKey);
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
  };
});

const extractImages = (data) => {
  const ImageArrays = ["images"];

  for (const prop of ImageArrays) {
    if (Array.isArray(data[prop]) && data[prop].length > 0) {
      return data[prop].map((img, index) => {
        const rawSrc =
          typeof img === "object" ? img.url || img.src || img.path || img : img;
        return {
          src: storageUrl(rawSrc),
          alt: `${data.Name || data.name || "Product"} image ${index + 1}`,
        };
      });
    }
  }

  const SingleImages = ["images"];

  for (const prop of SingleImages) {
    if (typeof data[prop] === "string" && data[prop]) {
      return [
        {
          src: storageUrl(data[prop]),
          alt: `${data.Name || data.name || "Product"} image`,
        },
      ];
    }
  }

  return [];
};

const galleryLayout = computed(() => {
  const imageCount = listingData.value.images.length;
  if (imageCount === 0) return "none";
  if (imageCount === 1) return "single";
  return "multiple";
});

const formattedPrice = computed(() => {
  return `${listingData.value.price} TND`;
});

const calculateDays = () => {
  if (!rentalStart.value || !rentalEnd.value) {
    totalDays.value = 1;
    return;
  }

  const start = new Date(rentalStart.value);
  const end = new Date(rentalEnd.value);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    totalDays.value = 1;
    return;
  }

  const diffInTime = end.getTime() - start.getTime();
  const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));

  totalDays.value = Math.max(1, diffInDays);
};

watch([rentalStart, rentalEnd], () => {
  calculateDays();
});

const subtotal = computed(() => {
  return listingData.value.price * totalDays.value;
});

const serviceFee = 10;

const total = computed(() => {
  return subtotal.value + serviceFee;
});

const nextImage = () => {
  if (activeImageIndex.value < listingData.value.images.length - 1) {
    activeImageIndex.value++;
  } else {
    activeImageIndex.value = 0;
  }
};

const prevImage = () => {
  if (activeImageIndex.value > 0) {
    activeImageIndex.value--;
  } else {
    activeImageIndex.value = listingData.value.images.length - 1;
  }
};

const toggleGallery = () => {
  showAllImages.value = !showAllImages.value;
  
  // Prevent body scrolling when gallery is open
  if (showAllImages.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

const setActiveImage = (index) => {
  activeImageIndex.value = index;
};

const fetchListingData = async () => {
  try {
    isLoading.value = true;
    const response = await api.get(`/api/public-listings/${id}`);
    console.log("data", response.data);
    if (response?.data?.data) {
      const data = response.data.data;
      const processedImages = extractImages(data);

      if (processedImages.length === 0) {
        processedImages.push({
          src: "/images/fallback-image.jpg",
          alt: "Product image placeholder",
        });
      }

      listingData.value = {
        id: data.id || data.Id || "",
        name: data.Name || data.name || "",
        price: data.Price || data.price || 0,
        description: data.Description || data.description || "",
        images: processedImages,
        user_id: data.User_id || data.user_id || "",
        user_name: data.user_name || "Item Owner",
        phone: data.phone,
        joined_since: data.Joined_since || data.joined_since || "",
        avatar: data.avatar || "",
        address: data.address || "",
        latitude: data.latitude || "",
        longitude: data.longitude || "",
      };
    } else {
      throw new Error("Failed to load product details");
    }
  } catch (err) {
    error.value = `Error loading product details: ${err.message}`;
    console.error("Error fetching listing data:", err);
  } finally {
    isLoading.value = false;
  }
};
console.log("Phone number:", listingData.value.phone);

const submitReview = async () => {
  try {
    reviewSubmitting.value = true;
    reviewError.value = null;
    reviewSuccess.value = false;

    if (!newReview.value.comment.trim()) {
      throw new Error("Please enter a review comment");
    }

    if (!newReview.value.user_id) {
      throw new Error(
        "User is not logged in. Please log in before submitting a review."
      );
    }

    const response = await api.post("/api/reviews", {
      listing_id: id,
      user_id: newReview.value.user_id,
      comment: newReview.value.comment,
    });

    if (!response.data || response.data.error) {
      throw new Error(response.data?.error || "Failed to submit review");
    }

    newReview.value.comment = "";
    reviewSuccess.value = true;

    await fetchReviews();

    setTimeout(() => {
      reviewSuccess.value = false;
    }, 3000);
  } catch (err) {
    reviewError.value = err.message;
    console.error("Error submitting review:", err);
  } finally {
    reviewSubmitting.value = false;
  }
};

const isAuthenticated = computed(() => !!userStore.token);

const handleReserveClick = () => {
  const image0 =
    listingData.value.images[0]?.src || "/images/fallback-image.jpg";

  // If user is not logged in, redirect to login with a return URL to checkout
  if (!isAuthenticated.value) {
    const checkoutPath = router.resolve({
      name: "checkout",
      params: { id: listingData.value.id },
      query: {
        image: image0,
        startDate: rentalStart.value,
        endDate: rentalEnd.value,
        days: totalDays.value,
        price: listingData.value.price,
        totalPrice: total.value,
        service: serviceFee,
      },
    }).fullPath;

    router.push({
      name: "Login",
      query: { redirect: checkoutPath },
    });
    return;
  }

  console.log("Reservation requested for listing:", listingData.value.id);
  console.log("Rental period:", rentalStart.value, "to", rentalEnd.value);
  console.log("Total days:", totalDays.value);
  console.log("Total cost:", total.value, "TND");
  console.log("servce fee:", serviceFee, "TND");
  console.log("Image 0:", image0);

  router.push({
    name: "checkout",
    params: { id: listingData.value.id },
    query: {
      image: image0,
      startDate: rentalStart.value,
      endDate: rentalEnd.value,
      days: totalDays.value,
      price: listingData.value.price,
      totalPrice: total.value,
      service: serviceFee,
    },
  });
};
</script>

<template>
  <DefaultLayout>
    <div class="bg-white">
      <!-- Loading state -->
      <div v-if="isLoading" class="py-12 text-center">
        <div class="animate-pulse flex flex-col items-center">
          <div class="h-8 w-8 bg-indigo-200 rounded-full mb-4"></div>
          <p class="text-gray-500">Loading product details...</p>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-red-500">{{ error }}</p>
        <button
          @click="router.push('/home')"
          class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        >
          Return to listings
        </button>
      </div>

      <!-- Content when loaded successfully -->
      <div v-else class="pt-6">
        <!-- Breadcrumb navigation -->
        <nav aria-label="Breadcrumb">
          <ol
            role="list"
            class="mx-auto flex max-w-2xl items-center space-x-2 px-4 sm:px-6 lg:max-w-7xl lg:px-8"
          >
            <li class="text-sm">
              <router-link
                to="/home"
                class="font-medium text-gray-500 hover:text-gray-600"
              >
                Listings
              </router-link>
            </li>
            <li class="text-sm">
              <span class="mx-2 text-gray-400">/</span>
              <span class="font-medium text-gray-900">{{
                listingData.name
              }}</span>
            </li>
          </ol>
        </nav>

        <!-- Product Title (Airbnb style - title appears before gallery) -->
        <div
          class="mx-auto max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8 pt-4 pb-2"
        >
          <h1
            class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
          >
            {{ listingData.name }}
          </h1>

          <!-- Rating and Host info in the same row (Airbnb style) -->
          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center">
              <div class="flex items-center"></div>

              <div class="flex items-center">
                <span class="text-sm font-medium text-gray-700">
                  {{ listingData.user_name }}
                </span>
              </div>
            </div>
            
            <!-- Show all photos button -->
            <button
              @click="toggleGallery"
              class="bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-900 shadow-md hover:bg-gray-100 transition-colors duration-200 flex items-center"
            >
              <span>Show all photos</span>
            </button>
          </div>
        </div>

        <!--  Image Gallery -->
        <div class="mx-auto max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8 mt-6">
          <!-- Regular gallery view -->
          <div v-if="!showAllImages" class="relative">
            <!-- Gallery Grid Layout - Responsive to number of images -->
            <div 
              class="grid gap-4 rounded-2xl overflow-hidden h-[28rem]"
              :class="{
                'grid-cols-1 md:grid-cols-1': listingData.images.length === 1,
                'grid-cols-1 md:grid-cols-2': listingData.images.length === 2,
                'grid-cols-1 md:grid-cols-5': listingData.images.length === 3,
                'grid-cols-1 md:grid-cols-2 md:grid-rows-2': listingData.images.length === 4,
                'grid-cols-1 md:grid-cols-12': listingData.images.length >= 5
              }"
            >
              <!-- Single image case -->
              <div 
                v-if="listingData.images.length === 1" 
                class="relative h-full overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02] group"
              >
                <img
                  :src="listingData.images[0].src"
                  :alt="listingData.images[0].alt"
                  class="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  loading="eager"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              
              <!-- Two images case - split container into two equal parts -->
              <template v-if="listingData.images.length === 2">
                <div 
                  v-for="(image, index) in listingData.images" 
                  :key="index"
                  class="relative h-full overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02] group"
                >
                  <img
                    :src="image.src"
                    :alt="image.alt"
                    class="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </template>
              
              <!-- Three images case - matches the screenshot layout exactly -->
              <template v-if="listingData.images.length === 3">
                <!-- Main large image - takes up 3/5 of the width -->
                <div class="md:col-span-3 h-full">
                  <div class="relative h-full overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02] group">
                    <img
                      :src="listingData.images[0].src"
                      :alt="listingData.images[0].alt"
                      class="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      loading="eager"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
                
                <!-- Right column with stacked images - takes up 2/5 of the width -->
                <div class="md:col-span-2 grid grid-rows-2 gap-4 h-full">
                  <!-- Top right image -->
                  <div class="relative h-full overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02] group">
                    <img
                      :src="listingData.images[1].src"
                      :alt="listingData.images[1].alt"
                      class="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  
                  <!-- Bottom right image -->
                  <div class="relative h-full overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02] group">
                    <img
                      :src="listingData.images[2].src"
                      :alt="listingData.images[2].alt"
                      class="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              </template>
              
              <!-- Four images case - 2x2 grid -->
              <template v-if="listingData.images.length === 4">
                <div 
                  v-for="(image, index) in listingData.images" 
                  :key="index"
                  class="relative overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02] group"
                >
                  <img
                    :src="image.src"
                    :alt="image.alt"
                    class="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </template>
              
              <!-- Five or more images - feature first image larger with 2x2 grid on right -->
              <template v-if="listingData.images.length >= 5">
                <!-- Main large image -->
                <div class="md:col-span-6 md:row-span-2 relative h-full overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02] group">
                  <img
                    :src="listingData.images[0].src"
                    :alt="listingData.images[0].alt"
                    class="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    loading="eager"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                <!-- Secondary images grid - Show remaining images up to 4 more -->
                <div 
                  v-for="(image, index) in listingData.images.slice(1, 5)" 
                  :key="index"
                  class="hidden md:block md:col-span-3 relative overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02] group"
                >
                  <img
                    :src="image.src"
                    :alt="image.alt"
                    class="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </template>
            </div>
          </div>

          <!-- Fullscreen gallery modal -->
          <div
            v-if="showAllImages"
            class="fixed inset-0 bg-black z-50 flex flex-col"
          >
            <!-- Gallery header -->
            <div class="p-4 flex justify-between items-center">
              <button
                @click="toggleGallery"
                class="text-white font-medium flex items-center hover:text-gray-300 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Close
              </button>
              <div class="text-white">
                {{ activeImageIndex + 1 }} / {{ listingData.images.length }}
              </div>
            </div>

            <!-- Main image slide - restrict height and handle overflow -->
            <div class="flex-grow flex items-center justify-center p-4 relative overflow-hidden">
              <img
                :src="listingData.images[activeImageIndex].src"
                :alt="listingData.images[activeImageIndex].alt"
                class="max-h-[70vh] max-w-full object-contain shadow-2xl"
              />

              <!-- Navigation buttons -->
              <button
                @click="prevImage"
                class="absolute left-6 p-3 rounded-full bg-white/30 hover:bg-white/60 text-black transition-colors duration-200"
                aria-label="Previous image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                @click="nextImage"
                class="absolute right-6 p-3 rounded-full bg-white/30 hover:bg-white/60 text-black transition-colors duration-200"
                aria-label="Next image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <!-- Thumbnail navigation -->
            <div class="p-6 bg-black/40">
              <div class="flex space-x-3 justify-center overflow-x-auto pb-2 hide-scrollbar">
                <button
                  v-for="(image, index) in listingData.images"
                  :key="index"
                  @click="setActiveImage(index)"
                  class="flex-shrink-0 w-20 h-20 overflow-hidden rounded-lg transition-transform duration-200 hover:scale-105"
                  :class="activeImageIndex === index ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'"
                >
                  <img
                    :src="image.src"
                    :alt="image.alt"
                    class="h-full w-full object-cover object-center"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Product info section -->
        <div
          class="mx-auto max-w-2xl px-4 pt-10 pb-16 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-3 lg:gap-x-8 lg:px-8 lg:pt-16 lg:pb-24"
        >
          <!-- Left column: Description and details -->
          <div class="lg:col-span-2 lg:pr-8">
            <!-- Host information -->
            <div
              class="flex items-center justify-between border-b border-gray-200 pb-6"
            >
              <div class="flex items-center">
                <div class="relative flex-shrink-0">
                  <div
                    v-if="listingData.avatar"
                    class="h-14 w-14 rounded-full overflow-hidden"
                  >
                    <img
                      :src="listingData.avatar"
                      alt="Host"
                      class="h-full w-full object-cover"
                    />
                  </div>
                  <UserCircleIcon v-else class="h-14 w-14 text-gray-400" />
                </div>
                <div class="ml-4">
                  <h2 class="text-lg font-medium text-gray-900">
                    Item provided by {{ listingData.user_name }}
                  </h2>
                  <p class="text-sm text-gray-500">
                    Host since
                    {{
                      listingData.joined_since || "Information not available"
                    }}
                  </p>
                </div>
              </div>
              <a
                :href="`https://wa.me/216${listingData.phone}`"
                target="_blank"
                class="flex items-center bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded"
              >
                <!-- WhatsApp Icon -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-6 h-6 mr-2"
                  fill="white"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M20.52 3.48a11.9 11.9 0 0 0-8.48-3.5c-6.63 0-12 5.37-12 12 0 2.11.55 4.16 1.6 5.98L0 24l6.1-1.6a11.94 11.94 0 0 0 5.92 1.6h.03c6.62 0 12-5.37 12-12 0-3.2-1.25-6.2-3.53-8.52zM12 22c-1.88 0-3.68-.5-5.26-1.44l-.38-.22-3.62.95.96-3.52-.24-.37C2.5 15.67 2 13.87 2 12c0-5.52 4.48-10 10-10 2.67 0 5.19 1.05 7.07 2.93A9.93 9.93 0 0 1 22 12c0 5.52-4.48 10-10 10zm4.27-7.73-.03-.02c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.43-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.14-.67-1.6-.92-2.2-.24-.58-.48-.5-.65-.5h-.55c-.2 0-.5.07-.75.37-.25.3-.98.95-.98 2.3 0 1.34.98 2.63 1.12 2.8.13.18 1.92 2.93 4.65 4.1.65.28 1.15.45 1.55.57.65.2 1.25.17 1.72.1.52-.08 1.6-.65 1.82-1.27.23-.63.23-1.17.17-1.27-.08-.1-.28-.17-.58-.3z"
                  />
                </svg>
                Contact lessor
              </a>
            </div>

            <!-- Property highlights -->
            <div class="py-6 border-b border-gray-200">
              <div class="grid grid-cols-2 gap-6">
                <div class="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <span class="ml-3 text-gray-600">Complete item</span>
                </div>
                <div class="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span class="ml-3 text-gray-600"
                    >Instant booking available</span
                  >
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="py-6">
              <h3 class="text-lg font-medium text-gray-900">About this item</h3>
              <div class="mt-4 space-y-6">
                <p class="text-base text-gray-700">
                  {{ listingData.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Right column: Booking panel -->
          <div class="mt-10 lg:mt-0">
            <div
              class="sticky top-6 rounded-xl border border-gray-200 shadow-lg overflow-hidden bg-white p-6"
            >
              <!-- Price display -->
              <div class="flex items-baseline">
                <span class="text-2xl font-bold tracking-tight text-gray-900">{{
                  formattedPrice
                }}</span>
                <span class="ml-1 text-lg text-gray-700">/ day</span>
              </div>

              <!-- Reviews summary -->
              <div class="mt-2 flex items-center">
                <div class="flex items-center"></div>
              </div>

              <!-- Booking form -->
              <form class="mt-6" @submit.prevent="handleReserveClick">
                <!-- Date pickers -->
                <div class="border border-gray-300 rounded-lg overflow-hidden">
                  <div class="grid grid-cols-2 divide-x divide-gray-300">
                    <div class="p-3">
                      <label class="block text-xs text-gray-700 font-medium"
                        >RENTAL START</label
                      >
                      <Flatpickr
                        ref="startDatePickerRef"
                        v-model="rentalStart"
                        :config="startDateConfig"
                        class="w-full text-sm p-0 mt-1"
                      />
                    </div>
                    <div class="p-3">
                      <label class="block text-xs text-gray-700 font-medium"
                        >RENTAL END</label
                      >
                      <Flatpickr
                        ref="endDatePickerRef"
                        v-model="rentalEnd"
                        :config="endDateConfig"
                        class="w-full text-sm p-0 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <!-- Reserve button -->
                <button
                  type="submit"
                  class="mt-6 w-full px-6 py-3 rounded-lg bg-[#002D4A] text-white font-medium hover:bg-[#036F8B] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Reserve
                </button>
              </form>

              <!-- Price breakdown -->
              <div class="mt-6">
                <div class="flex justify-between py-2">
                  <span class="text-gray-600"
                    >{{ formattedPrice }} x {{ totalDays }}
                    {{ totalDays === 1 ? "day" : "days" }}</span
                  >
                  <span>{{ subtotal }} TND</span>
                </div>
                <div class="flex justify-between py-2">
                  <span class="text-gray-600">Service fee</span>
                  <span>{{ serviceFee }} TND</span>
                </div>
                <div
                  class="flex justify-between py-2 font-semibold border-t border-gray-200 mt-2 pt-2"
                >
                  <span>Total</span>
                  <span>{{ total }} TND</span>
                </div>
              </div>
            </div>
          </div>
          <!-- reviews container -->
          <div class="lg:col-span-3 mt-10 border-t border-gray-200 pt-10">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">
              <div class="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 mr-2 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                {{ totalReviews }} reviews
              </div>
            </h2>

            <!-- Loading state -->
            <div v-if="reviewsLoading" class="py-6 text-center">
              <div class="animate-pulse flex flex-col items-center">
                <div class="h-8 w-8 bg-indigo-200 rounded-full mb-4"></div>
                <p class="text-gray-500">Loading reviews...</p>
              </div>
            </div>

            <!-- Error state -->
            <div v-else-if="reviewsError" class="py-6 text-center text-red-500">
              {{ reviewsError }}
            </div>

            <!-- Reviews content -->
            <div v-else>
              <!-- Reviews preview grid (only showing first 6) -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                <div
                  v-for="review in reviews.slice(0, 6)"
                  :key="review.id"
                  class="space-y-2"
                >
                  <div class="flex items-start">
                    <!-- Avatar with fallback -->
                    <div class="flex-shrink-0 mr-4">
                      <div
                        class="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden"
                      >
                        <svg
                          v-if="
                            !review.avatar || review.avatar.includes('default')
                          "
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-8 w-8 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <img
                          v-else
                          :src="review.avatar"
                          :alt="review.name"
                          class="h-full w-full object-cover"
                        />
                      </div>
                    </div>

                    <!-- Review content -->
                    <div class="flex-1 min-w-0">
                      <h3 class="text-base font-medium text-gray-900">
                        {{ review.name }}
                      </h3>
                      <p class="text-sm text-gray-500">
                        {{ review.date || "Recent rental" }}
                      </p>
                    </div>
                  </div>

                  <!-- Review text with show more functionality - in preview grid, always truncate -->
                  <div>
                    <p class="text-base text-gray-700 line-clamp-3">
                      {{ review.review }}
                    </p>
                    <button
                      v-if="review.review.length > 150"
                      @click="review.showFull = !review.showFull"
                      class="mt-1 text-sm font-medium underline text-gray-800"
                    >
                      Show more
                    </button>
                  </div>
                </div>
              </div>

              <!-- Show all reviews button -->
              <div v-if="reviews.length > 6" class="mt-10">
                <button
                  @click="openReviewsModal"
                  class="px-6 py-2.5 bg-white border border-black rounded-lg text-black font-medium hover:bg-gray-50 transition duration-150"
                >
                  Show all {{ totalReviews }} reviews
                </button>
              </div>
            </div>
          </div>
          <!-- Add this section after the Reviews container but before the map container -->
          <div class="lg:col-span-3 mt-10 border-t border-gray-200 pt-10">
            <h2 class="text-xl font-bold text-gray-900 mb-6">
              Add Your Review
            </h2>

            <!-- Comment form -->
            <form @submit.prevent="submitReview" class="space-y-6">
              <!-- Rating input -->

              <!-- Comment input -->
              <div>
                <label
                  for="comment"
                  class="block text-sm font-medium text-gray-700"
                  >Your Review</label
                >
                <div class="mt-1">
                  <textarea
                    id="comment"
                    v-model="newReview.comment"
                    rows="4"
                    class="p-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-200 focus:ring-gray-200 sm:text-sm"
                    placeholder="Share your experience with this product..."
                    required
                  ></textarea>
                </div>
              </div>

              <!-- Submit button -->
              <div>
                <button
                  type="submit"
                  class="inline-flex justify-center rounded-md border border-transparent bg-[#002D4A] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-[#036F8B] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  :disabled="reviewSubmitting"
                >
                  <span v-if="reviewSubmitting">Submitting...</span>
                  <span v-else>Submit Review</span>
                </button>

                <!-- Success message -->
                <div v-if="reviewSuccess" class="mt-3 text-sm text-green-600">
                  Your review has been submitted successfully!
                </div>

                <!-- Error message -->
                <div v-if="reviewError" class="mt-3 text-sm text-red-600">
                  {{ reviewError }}
                </div>
              </div>
            </form>
          </div>

          <!-- Teleport for Reviews Modal -->
          <Teleport to="body">
            <div
              v-if="showReviewsModal"
              class="fixed inset-0 z-50 overflow-y-auto"
              aria-labelledby="modal-title"
              role="dialog"
              aria-modal="true"
            >
              <!-- Background overlay -->
              <div
                class="fixed inset-0 bg-black/50 bg-opacity-75 transition-opacity"
                @click="closeReviewsModal"
              ></div>

              <!-- Modal container -->
              <div
                class="flex min-h-screen items-end justify-center p-4 text-center sm:items-center sm:p-0"
              >
                <div
                  class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl"
                >
                  <!-- Modal header -->
                  <div
                    class="border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10"
                  >
                    <button
                      @click="closeReviewsModal"
                      class="rounded-full p-2 hover:bg-gray-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                    <h2 class="text-lg font-semibold">
                      {{ totalReviews }} reviews
                    </h2>
                    <div class="w-6"></div>
                    <!-- Empty div for flex centering -->
                  </div>

                  <!-- Modal content -->
                  <div class="p-6 max-h-[calc(100vh-120px)] overflow-y-auto">
                    <!-- All reviews list -->
                    <div class="space-y-8">
                      <div
                        v-for="review in reviews"
                        :key="review.id"
                        class="pb-8 border-b border-gray-200 last:border-b-0"
                      >
                        <div class="flex items-start">
                          <!-- Avatar with fallback -->
                          <div class="flex-shrink-0 mr-4">
                            <div
                              class="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden"
                            >
                              <svg
                                v-if="
                                  !review.avatar ||
                                  review.avatar.includes('default')
                                "
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-8 w-8 text-gray-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fill-rule="evenodd"
                                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                  clip-rule="evenodd"
                                />
                              </svg>
                              <img
                                v-else
                                :src="review.avatar"
                                :alt="review.name"
                                class="h-full w-full object-cover"
                              />
                            </div>
                          </div>

                          <!-- Review content -->
                          <div class="flex-1 min-w-0">
                            <h3 class="text-base font-medium text-gray-900">
                              {{ review.name }}
                            </h3>
                            <p class="text-sm text-gray-500">
                              {{ review.date || "Recent stay" }}
                            </p>

                            <!-- Review text -->
                            <div class="mt-3">
                              <p
                                class="text-base text-gray-700"
                                :class="{
                                  'line-clamp-4':
                                    !review.showFull &&
                                    review.review.length > 280,
                                }"
                              >
                                {{ review.review }}
                              </p>
                              <button
                                v-if="review.review.length > 280"
                                @click="review.showFull = !review.showFull"
                                class="mt-1 text-sm font-medium underline text-gray-800"
                              >
                                {{
                                  review.showFull ? "Show less" : "Show more"
                                }}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Teleport>
          <!-- map container -->
          <div
            class="mt-10 text-2xl font-bold border-t text-gray-900 lg:col-span-3 mt-10 border-t border-gray-200 pt-10"
          >
            Item's location
          </div>
          <div
            v-if="mapVisible"
            ref="mapContainer"
            class="border border-gray-300 rounded-lg overflow-hidden h-96 lg:col-span-3 mt-8"
          ></div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<style>
.reserved-day {
  color: white !important;
  background-color: #ff5c5c !important;
  border-color: #ff5c5c !important;
}

.flatpickr-day.disabled.reserved-day {
  color: white !important;
  background-color: #ff5c5c !important;
  border-color: #ff5c5c !important;
  cursor: not-allowed;
}

.hide-scrollbar {
  -ms-overflow-style: none;  /* Internet Explorer 10+ */
  scrollbar-width: none;  /* Firefox */
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;  /* Safari and Chrome */
}
</style>
