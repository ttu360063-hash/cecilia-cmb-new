
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
import { isAdminAuthenticated } from './lib/auth'

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />
  }
  return <>{children}</>
}

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
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/vendas" replace />} />
          <Route path="vendas" element={<PublicSales />} />
          <Route
            path="admin"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/produtos"
            element={
              <ProtectedAdminRoute>
                <ProductsManagement />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/vendas"
            element={
              <ProtectedAdminRoute>
                <SalesManagement />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/clientes"
            element={
              <ProtectedAdminRoute>
                <CustomersManagement />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/relatorios"
            element={
              <ProtectedAdminRoute>
                <Reports />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/formas-pagamento"
            element={
              <ProtectedAdminRoute>
                <PaymentMethodsManagement />
              </ProtectedAdminRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
