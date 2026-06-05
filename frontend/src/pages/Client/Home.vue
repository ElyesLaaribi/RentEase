<script setup>
import { onMounted, ref, computed, watch, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import DefaultLayout from "../../components/DefaultLayout.vue";
import api, { storageUrl } from "../../axios";
import CategoryBar from "../../components/CategoryBar.vue";
import SearchForm from "../../components/SearchForm.vue";
import PaginationComponent from "../../components/pagination.vue";

const router = useRouter();

const searchInput = ref("");

const categories = ref([]);
const products = ref([]);
const selectedCategory = ref(null);
const isLoading = ref(true);
const error = ref(null);
const searchQuery = ref("");
const priceRange = ref({
  min: 0,
  max: 1000,
  current: [0, 1000],
  temp: [0, 1000], 
});

const currentPage = ref(1);
const itemsPerPage = ref(12);
const totalItems = ref(0);
const statusMessage = ref("");

const showFilters = ref(false);
const windowWidth = ref(window.innerWidth);

// Function to update window width
const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
  if (windowWidth.value >= 1024) {
    showFilters.value = true;
  }
};

// Add resize event listener
onMounted(() => {
  window.addEventListener('resize', updateWindowWidth);
  updateWindowWidth(); // Initialize on mount
  fetchCategories();
  selectedCategory.value = null;
  fetchProducts({}, { skipPriceRangeUpdate: false });
});

// Remove event listener on component unmount
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateWindowWidth);
});

const navigateToProduct = (productId) => {
  router.push(`/product-overview/${productId}`);
};

const fetchCategories = async () => {
  try {
    const response = await api.get("/api/categories");
    const categoryData = response.data.data || response.data;
    categories.value = categoryData.map(category => category.cat_title);
  } catch (err) {
    console.error("Failed to fetch categories:", err);
  }
};

const fetchProducts = async (filters = {}, options = { skipPriceRangeUpdate: true }) => {
  try {
    isLoading.value = true;
    error.value = null;
    
    const endpoint = "/api/public-listings";

    const params = {
      page: currentPage.value,
      per_page: itemsPerPage.value,
      search: searchQuery.value,
      min_price: priceRange.value.current[0],
      max_price: priceRange.value.current[1],
      category: selectedCategory.value,
      ...filters
    };

    const response = await api.get(endpoint, { params });

    const allProducts = response.data.data.map((product) => ({
      ...product,
      imageSrc:
        product.images && product.images.length
          ? storageUrl(product.images[0])
          : "/images/fallback-image.jpg",
    }));

    
    if (response.data.price_range && !options.skipPriceRangeUpdate) {
      if (response.data.price_range.min !== null && !isNaN(response.data.price_range.min)) {
        priceRange.value.min = response.data.price_range.min;
      }
      if (response.data.price_range.max !== null && !isNaN(response.data.price_range.max)) {
        priceRange.value.max = response.data.price_range.max;
      }
      
      if (priceRange.value.current[0] < priceRange.value.min || 
          priceRange.value.current[1] > priceRange.value.max) {
        priceRange.value.current = [priceRange.value.min, priceRange.value.max];
        priceRange.value.temp = [priceRange.value.min, priceRange.value.max];
      } else {
        priceRange.value.temp = [...priceRange.value.current];
      }
    }

    products.value = allProducts;
    totalItems.value = response.data.total;
  } catch (err) {
    error.value = "Failed to load products. Please try again later.";
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const handleSearchFilter = () => {
  currentPage.value = 1;
  fetchProducts();
};

const handleCategorySelect = (category) => {
  selectedCategory.value = category;
  currentPage.value = 1;
  fetchProducts();
};

const handleSearch = (query) => {
  searchQuery.value = query;
  handleSearchFilter();
};

const triggerSearch = () => {
  searchQuery.value = searchInput.value;
  handleSearchFilter();
};

const handlePriceChange = (values) => {
  priceRange.value.temp = values;
};

const applyPriceFilter = () => {
  const minVal = Math.max(priceRange.value.min, priceRange.value.temp[0]);
  const maxVal = Math.min(priceRange.value.max, priceRange.value.temp[1]);
  
  if (minVal !== priceRange.value.current[0] || maxVal !== priceRange.value.current[1]) {
    priceRange.value.current = [minVal, maxVal];
    priceRange.value.temp = [minVal, maxVal]; 
    currentPage.value = 1;
    fetchProducts();
  }
};

const resetFilters = () => {
  // Reset all filter values
  selectedCategory.value = null;
  searchQuery.value = "";
  searchInput.value = "";
  currentPage.value = 1;
  
  // First reset price range to current min/max
  priceRange.value.current = [priceRange.value.min, priceRange.value.max];
  priceRange.value.temp = [priceRange.value.min, priceRange.value.max];
  
  // Then explicitly fetch products with skipPriceRangeUpdate: false
  // This ensures products are fetched immediately after filters are reset
  fetchProducts({}, { skipPriceRangeUpdate: false });
};

const priceMinValue = computed(() => priceRange.value.current[0]);
const priceMaxValue = computed(() => priceRange.value.current[1]);

const updatePriceMin = (event) => {
  const value = parseInt(event.target.value || priceRange.value.min);
  const validValue = Math.max(
    priceRange.value.min,
    Math.min(value, priceRange.value.temp[1] - 1)
  );
  priceRange.value.temp = [validValue, priceRange.value.temp[1]];
};

const updatePriceMax = (event) => {
  const value = parseInt(event.target.value || priceRange.value.max);

  const validValue = Math.min(
    priceRange.value.max,
    Math.max(value, priceRange.value.temp[0] + 1)
  );
  priceRange.value.temp = [priceRange.value.temp[0], validValue];
};

const handleMinChange = (event) => {
  updatePriceMin(event);
};

const handleMaxChange = (event) => {
  updatePriceMax(event);
};

const getSliderPercentage = (value, min, max) => {
  return ((value - min) / (max - min)) * 100;
};

const minThumbPosition = computed(() => {
  return getSliderPercentage(
    priceRange.value.temp[0],
    priceRange.value.min,
    priceRange.value.max
  );
});

const maxThumbPosition = computed(() => {
  return getSliderPercentage(
    priceRange.value.temp[1],
    priceRange.value.min,
    priceRange.value.max
  );
});

const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

const handlePageChange = (page) => {
  currentPage.value = page;
  fetchProducts();
};

const handlePerPageChange = (perPage) => {
  itemsPerPage.value = perPage;
  currentPage.value = 1;
  fetchProducts();
};

const resetCategoryFilter = () => {
  selectedCategory.value = null;
  currentPage.value = 1;
  fetchProducts();
};

const resetSearchFilter = () => {
  searchQuery.value = "";
  searchInput.value = "";
  
  currentPage.value = 1;
  
  fetchProducts();
};

const resetPriceFilter = () => {
  priceRange.value.current = [priceRange.value.min, priceRange.value.max];
  priceRange.value.temp = [priceRange.value.min, priceRange.value.max];
  currentPage.value = 1;
  fetchProducts();
};
</script>

<template>
  <DefaultLayout>
    <!-- Hero section with parallax effect -->
    <header class="relative z-5 overflow-hidden bg-[#002D4A] text-white">
      <!-- Background image with parallax effect -->
      <div
        class="absolute inset-0 bg-cover bg-center opacity-20"
        style="
          background-image: url('/images/hero-bg.jpg');
          transform: translateZ(-1px) scale(1.5);
        "
      ></div>

      <div
        class="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:py-24 text-center z-10"
      >
        <h1
          class="text-3xl font-bold mb-4 sm:text-4xl lg:text-6xl tracking-tight"
        >
          Find What You Need
          <span
            class="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
            >Today</span
          >
        </h1>
        <p class="text-lg sm:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto opacity-90">
          Rent quality items at affordable daily rates
        </p>

        <!-- Search box with modern styling -->
        <div
          class="flex items-center max-w-xl mx-auto bg-white/10 backdrop-blur-md p-1 rounded-full border border-white/20 shadow-lg"
        >
          <input
            v-model="searchInput"
            @keyup.enter="triggerSearch"
            type="text"
            placeholder="Search products..."
            class="bg-transparent flex-grow px-3 sm:px-5 py-3 text-white placeholder-white/70 focus:outline-none w-full"
          />
          <button
            @click="triggerSearch"
            class="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-3 rounded-full hover:shadow-lg transition duration-300 flex items-center justify-center"
            aria-label="Search"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
              />
            </svg>
          </button>
        </div>

        <!-- Scroll indicator -->
        <div
          class="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-bounce"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </div>
      </div>
    </header>

    <!-- Main content area -->
    <main class="bg-white">
      <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <!-- Filter sidebar and product grid container -->
        <div class="flex flex-col lg:flex-row gap-8">
          <!-- Filter sidebar - Collapsible on mobile -->
          <div class="lg:w-1/4 relative">
            <!-- Mobile filter toggle button -->
            <button 
              @click="showFilters = !showFilters" 
              class="lg:hidden w-full flex items-center justify-between bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-300"
            >
              <span class="font-medium flex items-center">
                <svg
                  class="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  ></path>
                </svg>
                Filters
              </span>
              <svg 
                class="w-5 h-5 transition-transform" 
                :class="{ 'rotate-180': showFilters }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            <!-- Filter content -->
            <div 
              :class="{ 'hidden': !showFilters && windowWidth < 1024 }"
              class="lg:block bg-white rounded-2xl shadow-sm p-6 h-fit lg:sticky lg:top-24 border border-gray-300 sm-shadow"
            >
              <h2 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <svg
                  class="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  ></path>
                </svg>
                Filters
              </h2>

              <!-- Active filters display -->
              <div
                v-if="
                  selectedCategory ||
                  searchQuery ||
                  priceRange.current[0] > priceRange.min ||
                  priceRange.current[1] < priceRange.max
                "
                class="mb-8"
              >
                <h3 class="text-md font-medium text-gray-700 mb-3">
                  Active Filters
                </h3>
                <div class="flex flex-wrap gap-2">
                  <div
                    v-if="selectedCategory"
                    class="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1 flex items-center"
                  >
                    <span class="text-white text-sm">{{ selectedCategory }}</span>
                    <button
                      @click="resetCategoryFilter"
                      class="ml-2 text-white hover:bg-white/20 rounded-full h-5 w-5 flex items-center justify-center"
                      title="Clear category filter"
                    >
                      &times;
                    </button>
                  </div>

                  <div
                    v-if="searchQuery"
                    class="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1 flex items-center"
                  >
                    <span class="text-white text-sm">"{{ searchQuery }}"</span>
                    <button
                      @click="resetSearchFilter"
                      class="ml-2 text-white hover:bg-white/20 rounded-full h-5 w-5 flex items-center justify-center"
                      title="Clear search filter"
                    >
                      &times;
                    </button>
                  </div>

                  <div
                    v-if="
                      priceRange.current[0] > priceRange.min ||
                      priceRange.current[1] < priceRange.max
                    "
                    class="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1 flex items-center"
                  >
                    <span class="text-white text-sm"
                      >{{ priceRange.current[0] }} -
                      {{ priceRange.current[1] }} TND</span
                    >
                    <button
                      @click="resetPriceFilter"
                      class="ml-2 text-white hover:bg-white/20 rounded-full h-5 w-5 flex items-center justify-center"
                      title="Clear price filter"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                <button
                  @click="resetFilters"
                  class="mt-4 flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                >
                  <svg
                    class="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    ></path>
                  </svg>
                  Clear all filters
                </button>
              </div>

              <!-- Categories section -->
              <div class="mb-8">
                <h3 class="text-md font-medium text-gray-700 mb-3">Categories</h3>
                <select
                  v-model="selectedCategory"
                  @change="handleCategorySelect(selectedCategory)"
                  class="border border-gray-300 rounded px-3 py-2 w-full"
                >
                  <option value="" selected>All</option>
                  <option
                    v-for="category in categories"
                    :key="category"
                    :value="category"
                  >
                    {{ category }}
                  </option>
                </select>
              </div>

              <!-- Price range filter with modern slider -->
              <div class="mb-8">
                <h3 class="text-md font-medium text-gray-700 mb-2">
                  Price Range (TND)
                </h3>

                <!-- Modern range slider -->
                <div class="px-2 mb-3">
                  <div class="relative h-10">
                    <!-- Track background -->
                    <div
                      class="absolute top-1/2 w-full h-1 bg-gray-200 rounded-full transform -translate-y-1/2"
                    ></div>

                    <!-- Selected range fill -->
                    <div
                      class="absolute top-1/2 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transform -translate-y-1/2"
                      :style="{
                        left: minThumbPosition + '%',
                        width: maxThumbPosition - minThumbPosition + '%',
                      }"
                    ></div>

                    <!-- Min Thumb Input -->
                    <input
                      type="range"
                      :min="priceRange.min"
                      :max="priceRange.max"
                      v-model.number="priceRange.temp[0]"
                      class="range-thumb"
                      :style="{
                        zIndex: priceRange.temp[0] > priceRange.temp[1] - 10 ? 40 : 30,
                      }"
                      @input="handleMinChange"
                    />

                    <!-- Max Thumb Input -->
                    <input
                      type="range"
                      :min="priceRange.min"
                      :max="priceRange.max"
                      v-model.number="priceRange.temp[1]"
                      class="range-thumb"
                      :style="{
                        zIndex: priceRange.temp[1] <= priceRange.temp[0] + 10 ? 30 : 40,
                      }"
                      @input="handleMaxChange"
                    />
                  </div>
                </div>

                <!-- Price inputs -->
                <div class="flex items-center justify-between mb-3">
                  <div class="w-24">
                    <input
                      type="number"
                      :min="priceRange.min"
                      :max="priceRange.max"
                      v-model.number="priceRange.temp[0]"
                      @input="handleMinChange"
                      class="w-full p-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Min"
                    />
                  </div>
                  <div class="text-gray-400">—</div>
                  <div class="w-24">
                    <input
                      type="number"
                      :min="priceRange.min"
                      :max="priceRange.max"
                      v-model.number="priceRange.temp[1]"
                      @input="handleMaxChange"
                      class="w-full p-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Max"
                    />
                  </div>
                </div>

                <!-- Apply Price Filter Button -->
                <button
                  @click="applyPriceFilter"
                  class="mt-3 w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium text-sm transition-all hover:shadow-md flex items-center justify-center gap-2"
                >
                  <span>Apply Price Filter</span>
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Products section -->
          <div class="lg:w-3/4 products-container">
            <div
              class="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-8 border border-gray-300 sm-shadow"
            >
              <div
                class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4"
              >
                <h2 class="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                  <span class="mr-2">
                    {{ selectedCategory ? selectedCategory : "Today's picks" }}
                  </span>
                </h2>
              </div>

              <!-- Loading or error states -->
              <div v-if="isLoading || error || statusMessage" class="py-8 sm:py-12 text-center">
                <div
                  v-if="isLoading"
                  class="animate-pulse flex flex-col items-center"
                >
                  <div class="h-10 w-10 bg-blue-200 rounded-full mb-4"></div>
                  <p class="text-gray-500">Loading products...</p>
                </div>
                <p v-else-if="error" class="text-gray-500">{{ error }}</p>
                <p v-else class="text-gray-500">{{ statusMessage }}</p>
              </div>

              <!-- No products message -->
              <div v-else-if="products.length === 0" class="py-8 sm:py-12 text-center">
                <div class="flex flex-col items-center">
                  <svg 
                    class="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mb-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      stroke-linecap="round" 
                      stroke-linejoin="round" 
                      stroke-width="1.5" 
                      d="M4 7h16M4 11h16M4 15h8"
                    />
                  </svg>
                  <h3 class="text-lg sm:text-xl font-medium text-gray-700 mb-2">No products found</h3>
                  <p class="text-sm sm:text-base text-gray-500 max-w-md px-4">
                    <span v-if="selectedCategory && searchQuery">
                      No products matching "<strong>{{ searchQuery }}</strong>" were found in the "<strong>{{ selectedCategory }}</strong>" category.
                    </span>
                    <span v-else-if="selectedCategory">
                      There are no products available in the "<strong>{{ selectedCategory }}</strong>" category.
                    </span>
                    <span v-else-if="searchQuery">
                      No products matching "<strong>{{ searchQuery }}</strong>" were found.
                    </span>
                    <span v-else>
                      There are no products that match your current filters.
                    </span>
                    <span> Try adjusting your filters or check back later.</span>
                  </p>
                  <div class="mt-6 flex flex-wrap gap-3 justify-center px-4">
                    <button
                      v-if="selectedCategory && searchQuery"
                      @click="resetCategoryFilter"
                      class="px-4 py-2 bg-white border border-blue-500 text-blue-600 rounded-lg font-medium text-sm transition-all hover:bg-blue-50 flex items-center justify-center"
                    >
                      <span>Search all categories</span>
                    </button>
                    <button
                      v-if="searchQuery && selectedCategory"
                      @click="resetSearchFilter"
                      class="px-4 py-2 bg-white border border-blue-500 text-blue-600 rounded-lg font-medium text-sm transition-all hover:bg-blue-50 flex items-center justify-center"
                    >
                      <span>Browse all {{ selectedCategory }}</span>
                    </button>
                    <button
                      @click="resetFilters"
                      class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium text-sm transition-all hover:shadow-md flex items-center justify-center"
                    >
                      <span>Clear all filters</span>
                      <svg
                        class="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Product grid with modern cards -->
              <div
                v-else
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-x-6 sm:gap-y-10"
              >
                <div
                  v-for="product in products"
                  :key="product.id"
                  class="group relative bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg border border-gray-100 hover:border-blue-200 cursor-pointer transform hover:-translate-y-1"
                  @click="navigateToProduct(product.id)"
                >
                  <!-- Badge for new or featured items -->
                  <div class="absolute top-3 left-3 z-10">
                    <span
                      v-if="product.is_featured"
                      class="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full"
                      >Featured</span
                    >
                    <span
                      v-else-if="product.is_new"
                      class="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full"
                      >New</span
                    >
                  </div>

                  <div class="aspect-square bg-gray-50 overflow-hidden">
                    <img
                      :src="product.imageSrc"
                      :alt="product.name"
                      class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>

                  <div class="p-4 sm:p-5">
                    <div class="flex justify-between items-start mb-2">
                      <h3
                        class="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors"
                      >
                        {{ product.name }}
                      </h3>

                      <!-- Wishlist button -->
                      <button
                        class="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg
                          class="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          ></path>
                        </svg>
                      </button>
                    </div>

                    <p
                      v-if="product.category"
                      class="text-sm text-gray-500 mb-3"
                    >
                      {{ product.category }}
                    </p>

                    <div class="flex justify-between items-center">
                      <p class="text-base sm:text-lg font-bold text-[#002D4A]">
                        {{ product.formattedPrice ?? product.price }}
                        <span class="text-xs sm:text-sm font-normal text-gray-500"
                          >TND/day</span
                        >
                      </p>

                      <!-- Rating display -->
                      <div class="flex items-center" v-if="product.rating">
                        <svg
                          class="w-4 h-4 text-yellow-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                          ></path>
                        </svg>
                        <span class="ml-1 text-sm text-gray-600">{{
                          product.rating
                        }}</span>
                      </div>
                    </div>

                    <div class="mt-4 pt-4 border-t border-gray-100">
                      <button
                        class="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium text-sm transition-all hover:shadow-md flex items-center justify-center"
                      >
                        <span>View details</span>
                        <svg
                          class="w-4 h-4 ml-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          ></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination at the bottom -->
            <PaginationComponent
              v-if="totalItems > 0"
              :totalItems="totalItems"
              :currentPage="currentPage"
              :itemsPerPage="itemsPerPage"
              :perPageOptions="[12, 24, 36, 48]"
              @page-change="handlePageChange"
              @per-page-change="handlePerPageChange"
              class="mb-6 sm:mb-12"
            />
          </div>
        </div>
      </div>

      <!-- Features section -->
      <div class="bg-white py-12 sm:py-16">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-8 sm:mb-12">
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900">Why Rent With Us?</h2>
            <p class="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              We make renting easy, affordable, and sustainable
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Feature 1 -->
            <div class="flex flex-col items-center p-4 sm:p-6 text-center">
              <div class="bg-blue-100 p-3 rounded-full mb-4">
                <svg
                  class="w-7 h-7 sm:w-8 sm:h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
              <h3 class="text-lg sm:text-xl font-semibold mb-2">Fast Delivery</h3>
              <p class="text-sm sm:text-base text-gray-600">
                Get your rentals quickly with our same-day delivery service in
                select areas.
              </p>
            </div>

            <!-- Feature 2 -->
            <div class="flex flex-col items-center p-4 sm:p-6 text-center">
              <div class="bg-blue-100 p-3 rounded-full mb-4">
                <svg
                  class="w-7 h-7 sm:w-8 sm:h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  ></path>
                </svg>
              </div>
              <h3 class="text-lg sm:text-xl font-semibold mb-2">Quality Guaranteed</h3>
              <p class="text-sm sm:text-base text-gray-600">
                All our products are thoroughly checked and maintained to ensure
                top quality.
              </p>
            </div>

            <!-- Feature 3 -->
            <div class="flex flex-col items-center p-4 sm:p-6 text-center">
              <div class="bg-blue-100 p-3 rounded-full mb-4">
                <svg
                  class="w-7 h-7 sm:w-8 sm:h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
              <h3 class="text-lg sm:text-xl font-semibold mb-2">Affordable Pricing</h3>
              <p class="text-sm sm:text-base text-gray-600">
                Save money by renting exactly what you need for as long as you
                need it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </DefaultLayout>
</template>

<style scoped>
.range-thumb {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  pointer-events: none; /* Prevent whole input from blocking */
  -webkit-appearance: none;
  appearance: none;
  z-index: 10;
}

/* Allow interaction only on the thumb */
.range-thumb::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  margin-top: 0px;
  background: #fff;
  border: 2px solid #0284c7;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  pointer-events: auto; /* 👈 Key fix: only thumb is clickable */
  position: relative;
  z-index: 50;
}

.range-thumb::-moz-range-thumb {
  height: 16px;
  width: 16px;
  background: #fff;
  border: 2px solid #0284c7;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  pointer-events: auto;
}
</style>

