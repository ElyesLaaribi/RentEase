<script setup>
import { onMounted, ref, computed, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../axios";
import Flatpickr from "vue-flatpickr-component";
import "flatpickr/dist/flatpickr.css";
import { useToast } from "vue-toast-notification";
import "vue-toast-notification/dist/theme-sugar.css";

const $toast = useToast();

const startDatePickerRef = ref(null);
const endDatePickerRef = ref(null);
const rentalStart = ref("");
const rentalEnd = ref("");
const todayStr = new Date().toISOString().slice(0, 10);
const reservations = ref([]);
const totalDays = ref(1);

const route = useRoute();
const router = useRouter();

const listingId = route.params.id;

const image = ref(route.query.image || "/images/fallback-image.jpg");
const startDate = ref(route.query.startDate || "");
const endDate = ref(route.query.endDate || "");
const days = ref(parseInt(route.query.days) || 1);
const price = ref(parseFloat(route.query.price) || 0);
const totalPrice = ref(parseFloat(route.query.totalPrice) || 0);
const serviceFee = parseFloat(route.query.service || 10);

const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const showDateEditor = ref(false);
const tempStartDate = ref("");
const tempEndDate = ref("");

const today = new Date();
const formattedToday = today.toISOString().split("T")[0];

const openDateEditor = () => {
  rentalStart.value = startDate.value;
  rentalEnd.value = endDate.value;
  showDateEditor.value = true;
};

const closeDateEditor = () => {
  showDateEditor.value = false;
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

const updateDates = () => {
  if (!rentalStart.value || !rentalEnd.value) {
    alert("Please select both start and end dates");
    return;
  }

  const start = new Date(rentalStart.value);
  const end = new Date(rentalEnd.value);

  if (start >= end) {
    alert("End date must be after start date");
    return;
  }

  // Update all relevant date variables
  startDate.value = rentalStart.value;
  endDate.value = rentalEnd.value;

  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  days.value = diffDays || 1;

  updateTotalPrice();
  closeDateEditor();
};

const calculateDiscount = (subtotal) => {
  // Apply 10% discount if subtotal is equal to or exceeds 500 TND
  if (subtotal >= 500) {
    return subtotal * 0.1; // 10% discount
  }
  return 0;
};

const updateTotalPrice = () => {
  if (listing.value && listing.value.price) {
    const subtotal = listing.value.price * days.value;
    const discount = calculateDiscount(subtotal);
    totalPrice.value = subtotal + serviceFee - discount;
  }
};

const listing = ref({});
const isLoading = ref(true);
const error = ref(null);

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return "TND 0";
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(numericAmount)) return "TND 0";
  return `TND ${numericAmount.toFixed(2)}`;
};

const selectedPaymentMethod = ref("card");
const paymentMethods = ref([
  { id: "paypal", name: "Paypal" },
  { id: "Visa", name: "Visa" },
]);

const paymentForm = ref({
  cardNumber: "",
  expirationDate: "",
  cvv: "",
  zipCode: "",
});

const nights = computed(() => {
  return days.value || 1;
});

const fetchListingData = async () => {
  try {
    isLoading.value = true;
    const response = await api.get(`/api/public-listings/${listingId}`);
    if (response?.data?.data) {
      listing.value = response.data.data;
      if (!route.query.price) {
        price.value = listing.value.price || 0;
      }
      updateTotalPrice();
    } else {
      throw new Error("Failed to load listing details");
    }
  } catch (err) {
    error.value = `Error loading listing details: ${err.message}`;
    console.error("Error fetching listing data:", err);
  } finally {
    isLoading.value = false;
  }
};

const fetchReservations = async () => {
  try {
    const resp = await api.get(`/api/listings/${listingId}/reservations`);
    console.log("Reservations data:", resp.data);
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
const paymentErrors = ref({
  cardNumber: "",
  expirationDate: "",
  cvv: "",
  zipCode: "",
});

const submitReservation = async () => {
  try {
    isSubmitting.value = true;
    errorMessage.value = "";

    if (!startDate.value || !endDate.value) {
      errorMessage.value = "Please select start and end dates";
      return;
    }

    const startDateObj = new Date(startDate.value);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (startDateObj < todayDate) {
      errorMessage.value = "Start date cannot be in the past";
      return;
    }

    if (selectedPaymentMethod.value === "Visa") {
      paymentErrors.value = {
        cardNumber: "",
        expirationDate: "",
        cvv: "",
        zipCode: "",
      };

      const { cardNumber, expirationDate, cvv, zipCode } = paymentForm.value;

      let valid = true;

      if (!/^\d{12}$/.test(cardNumber)) {
        paymentErrors.value.cardNumber =
          "Card number must be exactly 12 digits.";
        valid = false;
      }

      if (!/^\d{2}\/\d{2}$/.test(expirationDate)) {
        paymentErrors.value.expirationDate =
          "Expiration date must be in MM/YY format.";
        valid = false;
      }

      if (!/^\d{3}$/.test(cvv)) {
        paymentErrors.value.cvv = "CVV must be 3 digits.";
        valid = false;
      }

      if (!/^\d{4}$/.test(zipCode)) {
        paymentErrors.value.zipCode = "ZIP code must be 4 digits.";
        valid = false;
      }

      if (!valid) {
        isSubmitting.value = false;
        return;
      }
    }

    // Calculate discount for the reservation
    const subtotal = listing.value.price * days.value;
    const hasDiscount = subtotal >= 500;
    const discountAmount = hasDiscount ? subtotal * 0.1 : 0;
    
    const response = await api.post("/api/reservations", {
      listing_id: listingId,
      start_date: startDate.value,
      end_date: endDate.value,
      discount: hasDiscount ? 10 : 0,
      discount_amount: discountAmount
    });
    $toast.success("Reservation made successfully!");

    setTimeout(() => {
      router.push("/home");
    }, 1500);
  } catch (err) {
    console.error("Error creating reservation:", err);
    errorMessage.value =
      err.response?.data?.message ||
      "Failed to create reservation. Please try again.";
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  fetchListingData();
  fetchReservations();

  if (!startDate.value) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    startDate.value = tomorrow.toISOString().split("T")[0];
  }

  if (!endDate.value && startDate.value) {
    const endDateObj = new Date(startDate.value);
    endDateObj.setDate(endDateObj.getDate() + 1);
    endDate.value = endDateObj.toISOString().split("T")[0];
  }

  rentalStart.value = startDate.value;
  rentalEnd.value = endDate.value;

  calculateDays();
});
</script>

<template>
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="px-4 h-24 flex items-center">
      <router-link to="/home" class="flex items-center">
        <img
          class="h-15 w-auto"
          src="../../assets/images/logo.png"
          alt="Company Logo"
        />
      </router-link>
    </div>
  </header>

  <div class="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-5xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Confirm and pay</h1>

      <div
        v-if="errorMessage"
        class="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="successMessage"
        class="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg"
      >
        {{ successMessage }}
      </div>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Payment Form Section -->
        <div class="w-full lg:w-7/12 bg-white rounded-lg shadow p-6">
          <div class="mb-8">
            <h2 class="text-xl font-semibold mb-4">Your details</h2>
            <div class="flex justify-between mb-4">
              <div>
                <h3 class="font-medium">Dates</h3>
                <p class="text-gray-600">
                  {{ formatDate(startDate) }} - {{ formatDate(endDate) }}
                </p>
              </div>
              <button
                class="text-black underline font-medium"
                @click="openDateEditor"
              >
                Edit
              </button>
            </div>
          </div>

          <div class="border-t border-gray-200 pt-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">Pay with</h2>
            <div class="flex space-x-2 mb-4">
              <button
                v-for="method in paymentMethods"
                :key="method.id"
                :class="[
                  'px-4 py-2 border rounded-full text-sm',
                  selectedPaymentMethod === method.id
                    ? 'border-black bg-gray-100'
                    : 'border-gray-300 hover:border-gray-500',
                ]"
                @click="selectedPaymentMethod = method.id"
              >
                {{ method.name }}
              </button>
            </div>

            <div v-if="selectedPaymentMethod === 'Visa'" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Card number</label
                  >
                  <input
                    type="text"
                    v-model="paymentForm.cardNumber"
                    maxlength="12"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
                    placeholder="123456789012"
                  />
                  <p
                    v-if="paymentErrors.cardNumber"
                    class="text-red-500 text-sm mt-1"
                  >
                    {{ paymentErrors.cardNumber }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Expiration date</label
                  >
                  <input
                    type="text"
                    v-model="paymentForm.expirationDate"
                    placeholder="MM/YY"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
                  />
                  <p
                    v-if="paymentErrors.cardNumber"
                    class="text-red-500 text-sm mt-1"
                  >
                    {{ paymentErrors.expirationDate }}
                  </p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >CVV</label
                  >
                  <input
                    type="text"
                    v-model="paymentForm.cvv"
                    maxlength="3"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
                    placeholder="123"
                  />
                  <p
                    v-if="paymentErrors.cardNumber"
                    class="text-red-500 text-sm mt-1"
                  >
                    {{ paymentErrors.cvv }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >ZIP Code</label
                  >
                  <input
                    type="text"
                    v-model="paymentForm.zipCode"
                    maxlength="4"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
                    placeholder="1234"
                  />
                  <p
                    v-if="paymentErrors.cardNumber"
                    class="text-red-500 text-sm mt-1"
                  >
                    {{ paymentErrors.zipCode }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="border-t border-gray-200 pt-4">
            <h2 class="text-xl font-semibold mb-4">Cancellation policy</h2>
            <p class="text-gray-800 mb-4">
              This reservation is non-refundable.
            </p>
          </div>
          <div class="border-t border-gray-200 pt-4">
            <h2 class="text-xl font-semibold mb-4">Ground rules</h2>
            <p class="text-gray-800 mb-4">
              We ask every client to remember a few simple things about what
              makes a great client.
            </p>
            <ul class="list-disc pl-5 text-gray-800 text-base space-y-1 mb-8">
              <li>Stick to the rules set by the lessor</li>
              <li>Treat rented items like they're your own</li>
            </ul>
          </div>

          <div class="border-t border-gray-200 pt-6">
            <button
              class="w-full bg-[#002D4A] hover:bg-[#036F8B] text-white font-medium py-3 px-4 rounded-lg transition duration-150"
              @click="submitReservation"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? "Processing..." : "Confirm and pay" }}
            </button>
            <button
              class="mt-4 w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-3 px-4 rounded-lg transition duration-150"
              @click="$router.push('/home')"
              :disabled="isSubmitting"
            >
              Cancel
            </button>
            <p class="mt-4 text-sm text-gray-500 text-center">
              You won't be charged yet
            </p>
          </div>
        </div>

        <!-- Price Details Section -->
        <div class="w-full lg:w-5/12">
          <div class="bg-white rounded-lg shadow p-6 sticky top-8">
            <div class="flex items-start gap-4 pb-6 border-b border-gray-200">
              <div class="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  :src="image"
                  alt="Property"
                  class="w-full h-full object-cover"
                />
              </div>
              <div>
                <p class="text-sm text-gray-500">{{ listing.type }}</p>
                <h3 class="font-medium">{{ listing.name }}</h3>
              </div>
            </div>

            <div class="py-6 border-b border-gray-200">
              <h3 class="text-lg font-semibold mb-4">Price details</h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <div>
                    {{ formatCurrency(listing.price) }} x {{ nights }} days
                  </div>
                  <div>{{ formatCurrency(listing.price * nights) }}</div>
                </div>

                <div class="flex justify-between">
                  <div>Service fee</div>
                  <div>{{ formatCurrency(serviceFee) }}</div>
                </div>
                
                <template v-if="listing.price * nights >= 500">
                  <div class="flex justify-between text-green-600 font-medium">
                    <div>Discount (10%)</div>
                    <div>-{{ formatCurrency(listing.price * nights * 0.1) }}</div>
                  </div>
                </template>
              </div>
            </div>

            <div class="pt-6">
              <div class="flex justify-between font-bold">
                <div>Total</div>
                <div>{{ formatCurrency(totalPrice) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showDateEditor"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-auto"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h3 class="text-xl font-semibold mb-4">Edit dates</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Start date</label
            >
            <Flatpickr
              placeholder="click to choose a date"
              ref="startDatePickerRef"
              v-model="rentalStart"
              :config="startDateConfig"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >End date</label
            >
            <Flatpickr
              placeholder="click to choose a date"
              ref="startDatePickerRef"
              v-model="rentalEnd"
              :config="endDateConfig"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            @click="closeDateEditor"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-[#002D4A] text-white rounded-md hover:bg-[#036F8B]"
            @click="updateDates"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
