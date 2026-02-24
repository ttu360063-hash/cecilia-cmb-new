import React from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import AdminDashboard from './pages/AdminDashboard'
import AccessDenied from './pages/AccessDenied'
import CustomersManagement from './pages/CustomersManagement'
import Login from './pages/Login'
import PaymentMethodsManagement from './pages/PaymentMethodsManagement'
import ProductsManagement from './pages/ProductsManagement'
import PublicSales from './pages/PublicSales'
import Reports from './pages/Reports'
import SalesManagement from './pages/SalesManagement'
import UsersManagement from './pages/UsersManagement'
import { useAuth } from './context/AuthContext'
import type { Permission } from './lib/auth'
import { resolveDefaultRoute } from './lib/routes'

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen grid place-content-center bg-[#07030d] text-fuchsia-100">
        Validando sessao...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const PermissionGate: React.FC<{ permission: Permission; children: React.ReactNode }> = ({
  permission,
  children,
}) => {
  const { hasPermission } = useAuth()

  if (!hasPermission(permission)) {
    return <Navigate to="/acesso-negado" replace />
  }

  return <>{children}</>
}

const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated, user } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen grid place-content-center bg-[#07030d] text-fuchsia-100">
        Validando sessao...
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={resolveDefaultRoute(user)} replace />
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
        }}
      />

      <Routes>
        <Route
          path="/login"
          element={
            <LoginGate>
              <Login />
            </LoginGate>
          }
        />

        <Route
          path="/"
          element={
            <AuthGate>
              <Layout />
            </AuthGate>
          }
        >
          <Route index element={<Navigate to="/vendas" replace />} />

          <Route
            path="vendas"
            element={
              <PermissionGate permission="vender">
                <PublicSales />
              </PermissionGate>
            }
          />
          <Route
            path="dashboard"
            element={
              <PermissionGate permission="dashboard">
                <AdminDashboard />
              </PermissionGate>
            }
          />
          <Route
            path="produtos"
            element={
              <PermissionGate permission="produtos">
                <ProductsManagement />
              </PermissionGate>
            }
          />
          <Route
            path="clientes"
            element={
              <PermissionGate permission="clientes">
                <CustomersManagement />
              </PermissionGate>
            }
          />
          <Route
            path="vendas-lista"
            element={
              <PermissionGate permission="ver_vendas">
                <SalesManagement />
              </PermissionGate>
            }
          />
          <Route
            path="relatorios"
            element={
              <PermissionGate permission="relatorios">
                <Reports />
              </PermissionGate>
            }
          />
          <Route
            path="pagamentos"
            element={
              <PermissionGate permission="configuracoes">
                <PaymentMethodsManagement />
              </PermissionGate>
            }
          />
          <Route
            path="usuarios"
            element={
              <PermissionGate permission="usuarios">
                <UsersManagement />
              </PermissionGate>
            }
          />

          <Route path="acesso-negado" element={<AccessDenied />} />

          <Route path="admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="admin/login" element={<Navigate to="/login" replace />} />
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
