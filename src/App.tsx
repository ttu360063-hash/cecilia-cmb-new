import React from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import AdminDashboard from './pages/AdminDashboard'
import CustomersManagement from './pages/CustomersManagement'
import PaymentMethodsManagement from './pages/PaymentMethodsManagement'
import ProductsManagement from './pages/ProductsManagement'
import PublicSales from './pages/PublicSales'
import Reports from './pages/Reports'
import SalesManagement from './pages/SalesManagement'

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: '14px',
            fontWeight: '600',
            padding: '14px 16px',
            borderRadius: '12px',
            boxShadow: '0 18px 50px -26px rgba(15, 23, 42, 0.9)',
          },
          success: {
            style: {
              background: '#0f766e',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#0f766e',
            },
          },
          error: {
            style: {
              background: '#be123c',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#be123c',
            },
          },
        }}
      />

      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/vendas" replace />} />
          <Route path="vendas" element={<PublicSales />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="produtos" element={<ProductsManagement />} />
          <Route path="clientes" element={<CustomersManagement />} />
          <Route path="vendas-lista" element={<SalesManagement />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="pagamentos" element={<PaymentMethodsManagement />} />

          <Route path="admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="admin/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="admin/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="admin/produtos" element={<Navigate to="/produtos" replace />} />
          <Route path="admin/clientes" element={<Navigate to="/clientes" replace />} />
          <Route path="admin/vendas" element={<Navigate to="/vendas-lista" replace />} />
          <Route path="admin/relatorios" element={<Navigate to="/relatorios" replace />} />
          <Route path="admin/formas-pagamento" element={<Navigate to="/pagamentos" replace />} />

          <Route path="*" element={<Navigate to="/vendas" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
