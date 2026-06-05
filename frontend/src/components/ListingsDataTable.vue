<script setup>
import { defineProps, computed, ref, defineEmits, onMounted } from "vue";
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/vue";
import { ChevronUpDownIcon } from "@heroicons/vue/16/solid";
import { CheckIcon, XMarkIcon, MapPinIcon } from "@heroicons/vue/20/solid";
import SearchForm from "./SearchForm.vue";
import api, { storagePathFromUrl, storageUrl } from "../axios";
import { useToast } from "vue-toast-notification";
import "vue-toast-notification/dist/theme-sugar.css";

const lat = ref(0);
const lng = ref(0);
const address = ref("");
const isLoadingLocation = ref(false);
const locationError = ref("");

function getLocation() {
  if (navigator.geolocation) {
    isLoadingLocation.value = true;
    locationError.value = "";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        lat.value = position.coords.latitude;
        lng.value = position.coords.longitude;
        isLoadingLocation.value = false;

        reverseGeocode(lat.value, lng.value);
      },
      (error) => {
        isLoadingLocation.value = false;
        locationError.value = `Error getting location: ${error.message}`;
        console.error("Geolocation error:", error);
      }
    );
  } else {
    locationError.value = "Geolocation is not supported by your browser";
  }
}

async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    const data = await response.json();

    if (data && data.display_name) {
      address.value = data.display_name;

      if (data.value) {
        data.value.address = address.value;
        data.value.latitude = latitude;
        data.value.longitude = longitude;
      }
    }
  } catch (error) {
    locationError.value = "Error fetching address from coordinates";
    console.error("Reverse geocoding error:", error);
  }
}

async function geocodeAddress() {
  if (!address.value.trim()) {
    locationError.value = "Please enter an address";
    return;
  }

  try {
    isLoadingLocation.value = true;
    locationError.value = "";

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address.value
      )}`
    );
    const result = await response.json();

    if (result && result.length > 0) {
      lat.value = parseFloat(result[0].lat);
      lng.value = parseFloat(result[0].lon);

      if (data.value) {
        data.value.address = address.value;
        data.value.latitude = lat.value;
        data.value.longitude = lng.value;
      }
    } else {
      locationError.value =
        "Address not found. Please try a different address.";
    }
  } catch (error) {
    locationError.value = "Error converting address to coordinates";
    console.error("Geocoding error:", error);
  } finally {
    isLoadingLocation.value = false;
  }
}

const $toast = useToast();

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["listingDeleted", "listingEdited"]);

const isOpen = ref(false);
const isEditMode = ref(false);
const searchFilter = ref("");
const isDeleting = ref(false);
const loading = ref(false);
const errors = ref({});

const imagePreview = ref([]);
const imageFiles = ref([]);
const existingImages = ref([]);
const imagesToRemove = ref([]);
const initialExistingCount = ref(0);

const categories = ref([]);

const data = ref({
  id: "",
  name: "",
  price: "",
  images: [],
  description: "",
  category_id: "",
  address: "",
  latitude: "",
  longitude: "",
});

const handleImageChange = (event) => {
  const files = Array.from(event.target.files);

  const uniqueFileNames = new Set(imageFiles.value.map((f) => f.name));

  files.forEach((file) => {
    if (file && !uniqueFileNames.has(file.name)) {
      imageFiles.value.push(file);

      uniqueFileNames.add(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        if (!imagePreview.value.includes(e.target.result)) {
          imagePreview.value.push(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  });
};

const removeImage = (index) => {
  if (index < 0 || index >= imagePreview.value.length) return;

  if (index < initialExistingCount.value) {
    imagesToRemove.value.push(existingImages.value[index]);
    existingImages.value.splice(index, 1);
    imagePreview.value.splice(index, 1);
    initialExistingCount.value--;
  } else {
    const newIndex = index - initialExistingCount.value;

    imageFiles.value.splice(newIndex, 1);

    imagePreview.value.splice(index, 1);
  }
  initialExistingCount.value = Math.min(
    initialExistingCount.value,
    existingImages.value.length
  );
};

const fetchCategories = async () => {
  try {
    const response = await api.get("/api/categories");
    categories.value = response.data.data || [];
    if (categories.value.length > 0) {
      data.value.category_id = categories.value[0].id;
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    $toast.error("Failed to fetch categories. Please try again.");
  }
};

onMounted(fetchCategories);

const filteredItems = computed(() => {
  return props.items.filter(
    (item) =>
      String(item.id)
        .toLowerCase()
        .includes(searchFilter.value.toLowerCase()) ||
      item.name.toLowerCase().includes(searchFilter.value.toLowerCase())
  );
});

const handleSearch = (search) => {
  searchFilter.value = search;
};

const deleteListing = async (id) => {
  if (!confirm("Are you sure you want to delete this listing?")) return;

  try {
    isDeleting.value = true;
    await api.delete(`/api/listings/${id}`);
    emit("listingDeleted", id);
    $toast.success("Listing deleted successfully!");
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error("Error deleting listing:", error);
    $toast.error("Failed to delete listing. Please try again.");
  } finally {
    isDeleting.value = false;
  }
};

const editListing = (item) => {
  imagePreview.value = [];
  existingImages.value = [];
  imageFiles.value = [];
  imagesToRemove.value = [];

  data.value = { ...item };

  if (item.address) address.value = item.address;
  if (item.latitude) lat.value = item.latitude;
  if (item.longitude) lng.value = item.longitude;

  if (item.image_paths && item.image_paths.length > 0) {
    existingImages.value = item.image_paths.map((path) => storageUrl(path));

    imagePreview.value = [...existingImages.value];

    initialExistingCount.value = existingImages.value.length;
  }

  isEditMode.value = true;
  isOpen.value = true;
};

const submit = async () => {
  loading.value = true;
  errors.value = {};
  try {
    const formData = new FormData();
    formData.append("name", data.value.name);
    formData.append("price", data.value.price);
    formData.append("category_id", data.value.category_id);
    formData.append("description", data.value.description);

    // Always add location data when available
    if (address.value) {
      formData.append("address", address.value);
      formData.append("latitude", lat.value);
      formData.append("longitude", lng.value);
    } else if (data.value.address) {
      formData.append("address", data.value.address);
      formData.append("latitude", data.value.latitude);
      formData.append("longitude", data.value.longitude);
    }

    imageFiles.value.forEach((file) => {
      formData.append("images[]", file);
    });

    imagesToRemove.value.forEach((img) => {
      const relativePath = storagePathFromUrl(img);
      formData.append("deleted_images[]", relativePath);
    });

    if (isEditMode.value) {
      formData.append("_method", "PUT");
      await api.post(`/api/listings/${data.value.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } else {
      await api.post("/api/listings", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    // Show appropriate success message based on whether we're creating or updating
    if (isEditMode.value) {
      $toast.success("Listing updated successfully!");
    } else {
      $toast.success("Listing created successfully!");
    }

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    if (error.response?.status === 422) {
      errors.value = error.response.data.errors;
    }
    console.error("Submit error:", error);
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  data.value = {
    id: "",
    name: "",
    price: "",
    images: [],
    category_id: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
  };
  address.value = "";
  lat.value = 0;
  lng.value = 0;
  imageFiles.value = [];
  imagePreview.value = [];
  existingImages.value = [];
  imagesToRemove.value = [];
  isEditMode.value = false;
  isOpen.value = false;
};

const openNewListingForm = () => {
  resetForm();
  isOpen.value = true;
};
</script>

<template>
  <div
    class="bg-white relative rounded-lg shadow-sm overflow-hidden border border-gray-300"
  >
    <div
      class="flex flex-col sm:flex-row items-center justify-between p-4 space-y-2 sm:space-y-0"
    >
      <SearchForm @search="handleSearch" class="w-full sm:w-auto" />
      <button
        @click="openNewListingForm"
        class="w-full sm:w-auto rounded-md bg-[#002D4A] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#036F8B] transition"
      >
        Add Listing
      </button>
    </div>

    <teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <div
          class="bg-white rounded-lg shadow-lg w-full max-w-3xl mx-auto p-4 sm:p-6"
        >
          <form @submit.prevent="submit">
            <div class="space-y-6">
              <div>
                <h2 class="text-base sm:text-lg font-semibold text-gray-900">
                  {{ isEditMode ? "Edit Listing" : "Add New Listing" }}
                </h2>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">
                <div>
                  <label
                    for="name"
                    class="block text-xs sm:text-sm font-medium text-gray-900"
                    >Name</label
                  >
                  <input
                    v-model="data.name"
                    id="name"
                    class="bg-white mt-1 block w-full border border-gray-300 rounded-md px-2 py-1.5 sm:px-3 sm:py-2 placeholder-gray-400 focus:border-indigo-600 focus:ring-indigo-600 text-xs sm:text-sm"
                  />
                  <p v-if="errors.name" class="text-red-500 text-xs mt-1">
                    {{ errors.name[0] }}
                  </p>
                </div>

                <div>
                  <label
                    for="price"
                    class="block text-xs sm:text-sm font-medium text-gray-900"
                    >Price</label
                  >
                  <input
                    v-model="data.price"
                    type="number"
                    id="price"
                    class="bg-white mt-1 block w-full border border-gray-300 rounded-md px-2 py-1.5 sm:px-3 sm:py-2 placeholder-gray-400 focus:border-indigo-600 focus:ring-indigo-600 text-xs sm:text-sm"
                  />
                  <p v-if="errors.price" class="text-red-500 text-xs mt-1">
                    {{ errors.price[0] }}
                  </p>
                </div>

                <!-- Location input section -->
                <div class="sm:col-span-2">
                  <label
                    for="address"
                    class="block text-xs sm:text-sm font-medium text-gray-900"
                    >Location Address</label
                  >
                  <div class="mt-1 flex space-x-2">
                    <input
                      v-model="address"
                      id="address"
                      placeholder="Enter full address"
                      class="bg-white flex-grow border border-gray-300 rounded-md px-2 py-1.5 sm:px-3 sm:py-2 placeholder-gray-400 focus:border-indigo-600 focus:ring-indigo-600 text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      @click="geocodeAddress"
                      class="rounded-md bg-[#036F8B] px-3 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold text-white shadow hover:bg-[#002D4A]"
                    >
                      Find
                    </button>
                    <button
                      type="button"
                      @click="getLocation"
                      class="rounded-md bg-[#002D4A] px-3 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold text-white shadow hover:bg-[#036F8B] flex items-center gap-1"
                    >
                      <MapPinIcon class="h-4 w-4" />
                      Use My Location
                    </button>
                  </div>

                  <div class="mt-2 flex items-center text-sm">
                    <p v-if="isLoadingLocation" class="text-gray-600">
                      Getting location...
                    </p>
                    <p v-else-if="locationError" class="text-red-500 text-xs">
                      {{ locationError }}
                    </p>
                    <p v-else-if="lat && lng" class="text-gray-600 text-xs">
                      Coordinates: {{ lat.toFixed(6) }}, {{ lng.toFixed(6) }}
                    </p>
                  </div>

                  <p v-if="errors.address" class="text-red-500 text-xs mt-1">
                    {{ errors.address[0] }}
                  </p>
                </div>

                <div class="sm:col-span-2">
                  <label
                    class="block text-xs sm:text-sm font-medium text-gray-900"
                    >Images</label
                  >
                  <div class="mt-1 flex flex-wrap gap-2">
                    <!-- Existing Images -->
                    <div
                      v-for="(image, index) in existingImages"
                      :key="`existing-${index}`"
                      class="relative"
                    >
                      <img
                        :src="image"
                        class="h-20 w-20 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        @click="removeImage(index)"
                        class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <XMarkIcon class="h-3 w-3" />
                      </button>
                    </div>

                    <!-- New Images -->
                    <div
                      v-for="(preview, index) in imagePreview.slice(
                        initialExistingCount
                      )"
                      :key="initialExistingCount + index"
                      class="relative"
                    >
                      <img
                        :src="preview"
                        class="h-20 w-20 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        @click="removeImage(initialExistingCount + index)"
                        class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <XMarkIcon class="h-3 w-3" />
                      </button>
                    </div>
                    <!-- Upload Button -->
                    <label
                      class="h-20 w-20 flex items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:border-[#036F8B]"
                    >
                      <input
                        type="file"
                        class="hidden"
                        @change="handleImageChange"
                        accept="image/*"
                        multiple
                      />
                      <span class="text-gray-500 text-3xl">+</span>
                    </label>
                  </div>
                  <p v-if="errors.images" class="text-red-500 text-xs mt-1">
                    {{ errors.images[0] }}
                  </p>
                  <p
                    v-if="errors.deleted_images"
                    class="text-red-500 text-xs mt-1"
                  >
                    {{ errors.deleted_images[0] }}
                  </p>
                </div>

                <div class="sm:col-span-2">
                  <Listbox v-model="data.category_id" as="div">
                    <ListboxLabel
                      class="block text-xs sm:text-sm font-medium text-gray-900 mb-1"
                    >
                      Category
                    </ListboxLabel>
                    <div class="relative mt-2">
                      <ListboxButton
                        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-2 pr-8 sm:pl-3 sm:pr-10 text-left text-gray-900 shadow-md ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-xs sm:text-sm"
                      >
                        <span class="block truncate">
                          {{
                            categories.find(
                              (cat) => cat.id === data.category_id
                            )?.cat_title || "Select a category"
                          }}
                        </span>
                        <span
                          class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1 sm:pr-2"
                        >
                          <ChevronUpDownIcon
                            class="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"
                          />
                        </span>
                      </ListboxButton>

                      <ListboxOptions
                        class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-xs sm:text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                      >
                        <ListboxOption
                          v-for="category in categories"
                          :key="category.id"
                          :value="category.id"
                          v-slot="{ active, selected }"
                          as="template"
                        >
                          <li
                            :class="[
                              active
                                ? 'bg-[#002D4A] text-white'
                                : 'text-gray-900',
                              'relative cursor-default select-none py-1.5 sm:py-2 pl-2 sm:pl-3 pr-7 sm:pr-9',
                            ]"
                          >
                            <span
                              :class="[
                                selected ? 'font-semibold' : 'font-normal',
                                'block truncate',
                              ]"
                            >
                              {{ category.cat_title }}
                            </span>
                            <span
                              v-if="selected"
                              :class="[
                                active ? 'text-white' : 'text-indigo-600',
                                'absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-4',
                              ]"
                            >
                              <CheckIcon class="h-4 w-4 sm:h-5 sm:w-5" />
                            </span>
                          </li>
                        </ListboxOption>
                      </ListboxOptions>
                    </div>
                  </Listbox>
                  <p
                    v-if="errors.category_id"
                    class="text-red-500 text-xs mt-1"
                  >
                    {{ errors.category_id[0] }}
                  </p>
                </div>

                <div class="sm:col-span-2">
                  <label
                    for="description"
                    class="block text-xs sm:text-sm font-medium text-gray-900"
                  >
                    Description
                  </label>
                  <textarea
                    v-model="data.description"
                    id="description"
                    rows="3"
                    class="bg-white mt-1 block w-full border border-gray-300 rounded-md px-2 py-1.5 sm:px-3 sm:py-2 placeholder-gray-400 focus:border-indigo-600 focus:ring-indigo-600 text-xs sm:text-sm"
                  ></textarea>
                  <p
                    v-if="errors.description"
                    class="text-red-500 text-xs mt-1"
                  >
                    {{ errors.description[0] }}
                  </p>
                </div>
              </div>

              <div
                class="mt-4 sm:mt-6 flex items-center justify-end gap-x-2 sm:gap-x-4"
              >
                <button
                  type="button"
                  @click="resetForm"
                  class="text-xs sm:text-sm font-semibold text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="rounded-md bg-[#002D4A] px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow hover:bg-[#036F8B]"
                  :disabled="loading"
                >
                  {{
                    loading ? "Processing..." : isEditMode ? "Update" : "Create"
                  }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </teleport>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-300">
        <!-- Table Head -->
        <thead class="bg-white">
          <tr>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
            >
              ID
            </th>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
            >
              Image
            </th>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
            >
              Price
            </th>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
            >
              Category
            </th>

            <th
              scope="col"
              class="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody class="bg-white divide-y divide-gray-300">
          <tr
            v-for="item in filteredItems"
            :key="item.id"
            class="hover:bg-gray-50"
          >
            <!-- Table Cells -->
            <td
              class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900"
            >
              #{{ item.id }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
              <img
                v-if="item.images?.length"
                :src="item.images[0]"
                class="h-16 w-16 object-cover rounded-md"
              />
              <div
                v-else
                class="h-16 w-16 bg-white rounded-md flex items-center justify-center text-gray-500 text-xs"
              >
                No Image
              </div>
            </td>
            <td
              class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
            >
              {{ item.name }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ item.price }} TND
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ item.cat_title }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-center">
              <div class="flex justify-center space-x-2">
                <button
                  @click="editListing(item)"
                  class="text-[#002D4A] hover:text-[#036F8B]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                      transform="scale(0.8) translate(3,3)"
                    ></path>
                    <path
                      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                      transform="scale(0.8) translate(3,3)"
                    ></path>
                  </svg>
                </button>
                <button
                  @click="deleteListing(item.id)"
                  class="text-red-600 hover:text-red-900"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline
                      points="3 6 5 6 21 6"
                      transform="scale(0.8) translate(3,3)"
                    ></polyline>
                    <path
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      transform="scale(0.8) translate(3,3)"
                    ></path>
                    <line
                      x1="10"
                      y1="11"
                      x2="10"
                      y2="17"
                      transform="scale(0.8) translate(3,3)"
                    ></line>
                    <line
                      x1="14"
                      y1="11"
                      x2="14"
                      y2="17"
                      transform="scale(0.8) translate(3,3)"
                    ></line>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style>
.p-1 > div {
  background-color: white !important;
}
</style>
