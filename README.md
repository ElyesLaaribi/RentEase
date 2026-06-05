# Rental Platform - Full Stack Application

A comprehensive rental platform built with Laravel and Vue.js, enabling property/item owners (lessors) to list their items for rent and clients to browse, book, and manage reservations.

## Live Demo
https://rent-ease-git-main-elyes-projects-4282f8dc.vercel.app/
## 🌟 Features

### For Clients
- Browse available rental listings with search and filter capabilities
- Interactive map-based property discovery using Leaflet
- Detailed item/property pages with images and specifications
- Booking system with date selection and availability checking
- Secure checkout process with Stripe payment integration
- Automatic 10% discount for bookings over 500 TND
- Real-time chat with lessors
- Reservation history and management

### For Lessors
- Dashboard with analytics and performance metrics
- Revenue tracking with detailed charts and visualizations
- Listing management (create, edit, delete)
- Calendar-based availability management
- Booking request management
- Chat with potential and current renters
- Revenue reports with detailed breakdown per item

### General Features
- User authentication and profile management
- Real-time notifications
- Responsive design for mobile and desktop
- Firebase integration for real-time features

## 🛠️ Tech Stack

### Backend
- **Framework**: Laravel 10.x
- **PHP**: 8.1+
- **Authentication**: Laravel Sanctum
- **Database**: MySQL
- **Real-time**: Pusher
- **Payment Processing**: Stripe
- **Firebase Integration**: For notifications and real-time features

### Frontend
- **Framework**: Vue.js 3.x
- **Build Tool**: Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **UI Framework**: Tailwind CSS
- **Charts**: Chart.js with Vue-ChartJS
- **Maps**: Leaflet
- **Date Picker**: Flatpickr
- **HTTP Client**: Axios

## 📋 Prerequisites

- PHP 8.1+
- Composer
- Node.js 16+
- npm or yarn
- MySQL
- Stripe account (for payment processing)
- Firebase account (for real-time features)
- Pusher account (for notifications)

## ⚙️ Installation

### Backend Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/rental-platform.git
   cd rental-platform/backend
   ```

2. Install PHP dependencies
   ```bash
   composer install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. Configure your database in the `.env` file
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=your_database
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```

5. Configure Stripe, Firebase, and Pusher credentials in the `.env` file

6. Run migrations and seed the database
   ```bash
   php artisan migrate --seed
   ```

7. Start the Laravel server
   ```bash
   php artisan serve
   ```

### Frontend Setup

1. Navigate to the frontend directory
   ```bash
   cd ../frontend
   ```

2. Install JavaScript dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Configure the environment variables
   ```bash
   cp .env.example .env
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## 🔄 API Routes

The application provides a comprehensive RESTful API for interaction between the frontend and backend:

- Authentication: `/api/auth/*`
- User Management: `/api/users/*`
- Listings: `/api/listings/*`
- Reservations: `/api/reservations/*`
- Lessor Dashboard: `/api/lessor/*`
- Payments: `/api/payments/*`
- Chat: `/api/messages/*`

## 🚀 Deployment

### Backend
1. Set up a production server with PHP 8.1+
2. Configure your web server (Nginx/Apache) to point to the public directory
3. Set up proper environment variables for production
4. Run optimizations
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

### Frontend
1. Build the production assets
   ```bash
   npm run build
   # or
   yarn build
   ```
2. Deploy the generated files in the `dist` directory to your hosting service

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
