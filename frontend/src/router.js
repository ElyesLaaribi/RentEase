import { createRouter, createWebHistory } from "vue-router";
import Home from "./pages/Client/Home.vue";
import Login from "./pages/Guest/Login.vue";
import Signup from "./pages/Guest/Signup.vue";
import NotFound from "./pages/Guest/NotFound.vue";
import Landing from "./pages/Guest/Landing.vue";
import LessorSign from "./pages/Guest/LessorSign.vue";
import LessorHome from "./pages/Lessor/LessorHome.vue";
import { useUserStore } from "./store/user";
import useLessorStore from "./store/lessor";
import ForgetPassword from "./pages/Guest/ForgetPassword.vue";
import ResetPassword from "./pages/Guest/ResetPassword.vue";
import Listings from "./pages/Lessor/Listings.vue";
import { useAdminStore } from "./store/admin"; 
import Messages from "./pages/Lessor/Messages.vue";
import Profile from "./pages/Lessor/Profile.vue";
import Reservations from "./pages/Lessor/Reservations.vue";
import ClientProfile from "./pages/Client/ClientProfile.vue";
import AdminLogin from "./pages/Admin/AdminLogin.vue";
import Admin from "./pages/Admin/Admin.vue";
import Users from "./pages/Admin/Users.vue";
import AdminsList from "./pages/Admin/AdminsList.vue";
import Category from "./pages/Admin/Category.vue";
import ProductOverview from "./pages/Client/ProductOverview.vue";
import Checkout from "./pages/Client/Checkout.vue";
import MyRentals from "./pages/Client/MyRentals.vue";





const clientGuard = async (to, from, next) => {
    const userStore = useUserStore();

    if (!userStore.user) {
        await userStore.fetchUser();
    }

    if (userStore.user?.role === "client") {
        next();
    } else {
        next("/notFound"); 
    }
};

// Guard that requires authentication — redirects guests to login with a return URL
const authRequiredGuard = async (to, from, next) => {
    const userStore = useUserStore();

    if (!userStore.token) {
        next({ name: 'Login', query: { redirect: to.fullPath } });
        return;
    }

    if (!userStore.user) {
        await userStore.fetchUser();
    }

    if (userStore.user?.role === "client") {
        next();
    } else {
        next("/notFound");
    }
};


const lessorGuard = async (to, from, next) => {
    const lessorStore = useLessorStore();

    if (!lessorStore.lessor) {
        await lessorStore.fetchLessor();
    }

    if (lessorStore.lessor?.role === "lessor") {
        next();
    } else {
        next("/notFound");
    }
};


const adminGuard = async (to, from, next) => {
    const adminStore = useAdminStore(); 

    if (!adminStore.token) {
        next("/admin"); 
    } else {
        await adminStore.fetchUser(); 

        if (adminStore.admin?.role === "admin") {
            next(); 
        } else {
            next("/notFound"); 
        }
    }
};

const routes = [
    { path: "/", name: "Landing", component: Landing },
    { path: "/login", name: "Login", component: Login },
    { path: "/signup", name: "Signup", component: Signup },
    { path: "/signuplessor", name: "Signuplessor", component: LessorSign },
    { path: "/forget-password", name: "ForgetPassword", component: ForgetPassword },
    { path: "/reset-password", name: "ResetPassword", component: ResetPassword },

    // client
    { path: "/home", name: "Home", component: Home },
    { path: "/client-profile", name: "client-profile", component: ClientProfile , beforeEnter: clientGuard },
    { path: "/product-overview/:id", name: "product", component: ProductOverview },
    { path: "/checkout/:id", name: "checkout", component: Checkout , beforeEnter: authRequiredGuard },
    { path: "/my-rentals", name: "my-reservatgions", component: MyRentals , beforeEnter: clientGuard },

    // lessor
    { path: "/lessorhome", name: "LessorHome", component: LessorHome, beforeEnter: lessorGuard },
    { path: "/listings", name: "Listings", component: Listings, beforeEnter: lessorGuard },
    { path: "/dms", name: "DMs", component: Messages, beforeEnter: lessorGuard },
    { path: "/lessor-profile", name: "Profile", component: Profile, beforeEnter: lessorGuard },
    { path: "/reservations", name: "Reservations" , component: Reservations, beforeEnter: lessorGuard },

    // admin
    { path: "/admin", name: "AdminLogin" , component: AdminLogin},
    { path: "/AdminHome", name: "AdminHome" , component: Admin, beforeEnter: adminGuard},
    { path: "/users", name: "Users" , component: Users, beforeEnter: adminGuard},
    { path: "/admins-list", name: "admins" , component: AdminsList, beforeEnter: adminGuard},
    { path: "/category", name: "category" , component: Category, beforeEnter: adminGuard},
    
    { path: "/:pathMatch(.*)*", name: "NotFound", component: NotFound }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
