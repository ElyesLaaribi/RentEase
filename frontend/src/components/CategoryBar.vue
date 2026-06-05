<script setup>
import { ref, onMounted } from "vue";
import api from "../axios";

const emit = defineEmits(["category-selected"]);

const categories = ref([]);
const activeCategory = ref(null);
const isLoading = ref(false);
const error = ref(null);

const fetchCategories = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await api.get("/api/categories", {
      headers: {
        Accept: "application/json",
      },
    });

    let categoryData = response.data;
    if (categoryData.data) {
      categoryData = categoryData.data;
    }

    if (!Array.isArray(categoryData)) {
      throw new Error("Response is not an array");
    }

    categories.value = categoryData.map((category) => {
      return {
        title: category.cat_title,
      };
    });
  } catch (err) {
    console.error("Categories fetch error:", err);
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

const selectCategory = (category) => {
  activeCategory.value = category;
  emit("category-selected", category);
};

onMounted(fetchCategories);
</script>

<template>
  <div>
    <div
      v-if="isLoading"
      class="flex items-center justify-center py-4 text-gray-500"
    >
      Loading categories...
    </div>

    <div
      v-else-if="error"
      class="flex items-center justify-center py-4 text-red-500"
    >
      {{ error }}
      <button
        @click="fetchCategories"
        class="ml-4 px-3 py-1 bg-gray-100 text-black rounded-md"
      >
        Retry
      </button>
    </div>

    <div
      v-else-if="categories.length"
      class="flex items-center overflow-x-auto px-4 py-3 space-x-8 scrollbar-hide"
    >
      <div
        v-for="category in categories"
        :key="category.title"
        @click="selectCategory(category.title)"
        class="flex flex-col items-center justify-center cursor-pointer group transition-all duration-300 pb-2 border-b-2 border-transparent hover:border-black mx-4"
        :class="{
          'border-black': activeCategory === category.title,
        }"
      >
        <span
          class="text-sm text-gray-600 group-hover:text-black transition-colors duration-300"
          :class="{
            'text-black font-semibold': activeCategory === category.title,
          }"
        >
          {{ category.title }}
        </span>
      </div>

      <div
        v-if="categories.length > 8"
        class="pl-2 text-gray-500 cursor-pointer flex-shrink-0"
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
      </div>
    </div>

    <div v-else class="flex items-center justify-center py-4 text-gray-500">
      No categories found
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.scrollbar-hide {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>
