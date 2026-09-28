import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import CurrencySync from './components/CurrencySync.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import RequireCustomerAuth from './components/RequireCustomerAuth.jsx';
import RequireAdminAuth from './components/RequireAdminAuth.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Gallery from './pages/Gallery.jsx';
import Contact from './pages/Contact.jsx';
import Shop from './pages/Shop.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Services from './pages/Services.jsx';
import BookingFlow from './pages/BookingFlow.jsx';
import BuildMyAquarium from './pages/BuildMyAquarium.jsx';
import Experience from './pages/Experience.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminOrders from './pages/AdminOrders.jsx';
import AdminAnalytics from './pages/AdminAnalytics.jsx';
import AdminInventory from './pages/AdminInventory.jsx';
import AdminProducts from './pages/AdminProducts.jsx';
import AdminCategories from './pages/AdminCategories.jsx';
import AdminAppointments from './pages/AdminAppointments.jsx';
import AdminCustomers from './pages/AdminCustomers.jsx';
import AdminReviews from './pages/AdminReviews.jsx';
import AdminPromotions from './pages/AdminPromotions.jsx';
import AdminServices from './pages/AdminServices.jsx';
import AccountLogin from './pages/AccountLogin.jsx';
import AccountSignup from './pages/AccountSignup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DashboardWishlist from './pages/DashboardWishlist.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <>
      <CurrencySync />
      <Routes>
        {/* The jellyfish experience owns the full viewport and its own
            scroll/overflow behavior, so it sits outside the shop Layout
            (no header/footer/container chrome around it). */}
        <Route path="/experience" element={<Experience />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:serviceId" element={<BookingFlow />} />
          <Route path="/build-my-aquarium" element={<BuildMyAquarium />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/account/login" element={<AccountLogin />} />
          <Route path="/account/signup" element={<AccountSignup />} />
          {/* /account consolidates into /dashboard (research.md §8) */}
          <Route path="/account" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<RequireCustomerAuth />}>
          <Route element={<DashboardLayout role="customer" />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/wishlist" element={<DashboardWishlist />} />
          </Route>
        </Route>

        <Route element={<RequireAdminAuth />}>
          <Route element={<DashboardLayout role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/inventory" element={<AdminInventory />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/appointments" element={<AdminAppointments />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/promotions" element={<AdminPromotions />} />
            <Route path="/admin/services" element={<AdminServices />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
