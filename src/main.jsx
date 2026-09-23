import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { CurrencyProvider } from './context/CurrencyContext.jsx';
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CurrencyProvider>
        <CartProvider>
          <AdminAuthProvider>
            <App />
          </AdminAuthProvider>
        </CartProvider>
      </CurrencyProvider>
    </BrowserRouter>
  </StrictMode>
);
