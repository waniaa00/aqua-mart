import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
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
import AccountLogin from './pages/AccountLogin.jsx';
import AccountSignup from './pages/AccountSignup.jsx';
import Account from './pages/Account.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
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
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/account/login" element={<AccountLogin />} />
        <Route path="/account/signup" element={<AccountSignup />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
