
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ProductsManagement from './pages/ProductsManagement'
import PublicSales from './pages/PublicSales'
import SalesManagement from './pages/SalesManagement'
import CustomersManagement from './pages/CustomersManagement'
import Reports from './pages/Reports'
import PaymentMethodsManagement from './pages/PaymentMethodsManagement'

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '500',
            padding: '16px',
            borderRadius: '8px',
          },
          success: {
            style: {
              background: '#10b981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
        }}
      />
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/vendas" replace />} />
          <Route path="vendas" element={<PublicSales />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/produtos" element={<ProductsManagement />} />
          <Route path="admin/vendas" element={<SalesManagement />} />
          <Route path="admin/clientes" element={<CustomersManagement />} />
          <Route path="admin/relatorios" element={<Reports />} />
          <Route path="admin/formas-pagamento" element={<PaymentMethodsManagement />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
