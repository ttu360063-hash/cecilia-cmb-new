
import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {ShoppingCart, Package, Users, BarChart3, UserCheck, LogOut, Settings, Menu, X, CreditCard} from 'lucide-react'

const Layout: React.FC = () => {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    window.location.href = '/vendas'
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header 
        className="relative bg-white/90 backdrop-blur-md shadow-xl border-b border-gray-200/50 sticky top-0 z-50 overflow-hidden"
        style={{
          backgroundImage: `url('https://i.ibb.co/xS4HLkp/fundo-background.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay para melhor legibilidade */}
        <div className="absolute inset-0 bg-white/85 backdrop-blur-sm"></div>
        
        <div className="relative container mx-auto px-4 sm:px-6 py-3 sm:py-6">
          <div className="flex items-center justify-between">
            {/* Logo e Título */}
            <div className="flex items-center space-x-2 sm:space-x-6 flex-1 min-w-0">
              {/* Logo da Empresa */}
              <div className="relative flex-shrink-0">
                <img 
                  src="https://i.ibb.co/LsL79MB/logotipo-empresa.jpg" 
                  alt="Logotipo CECÍLIA" 
                  className="w-10 h-10 sm:w-16 sm:h-16 rounded-full shadow-lg border-4 border-white object-cover"
                />
              </div>
              
              {/* Nome da Empresa */}
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-2xl font-bold text-gray-800 leading-tight truncate">
                  CECÍLIA
                </h1>
                <h2 className="text-xs sm:text-lg font-semibold text-blue-600 truncate">
                  CAMA MESA E BANHO
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 font-medium hidden sm:block">Sistema de Gerenciamento</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-2">
              {/* Link Público - Vendas */}
              <Link
                to="/vendas"
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 backdrop-blur-sm ${
                  location.pathname === '/vendas'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-white/70 bg-white/50'
                }`}
              >
                <ShoppingCart size={18} />
                <span className="font-medium">Vendas</span>
              </Link>

              {/* Links Administrativos */}
              {isAdminRoute && (
                <>
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 backdrop-blur-sm ${
                      location.pathname === '/admin'
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-700 hover:text-purple-600 hover:bg-white/70 bg-white/50'
                    }`}
                  >
                    <BarChart3 size={18} />
                    <span className="font-medium">Dashboard</span>
                  </Link>

                  <Link
                    to="/admin/produtos"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 backdrop-blur-sm ${
                      location.pathname === '/admin/produtos'
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                        : 'text-gray-700 hover:text-green-600 hover:bg-white/70 bg-white/50'
                    }`}
                  >
                    <Package size={18} />
                    <span className="font-medium">Produtos</span>
                  </Link>

                  <Link
                    to="/admin/clientes"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 backdrop-blur-sm ${
                      location.pathname === '/admin/clientes'
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                        : 'text-gray-700 hover:text-orange-600 hover:bg-white/70 bg-white/50'
                    }`}
                  >
                    <UserCheck size={18} />
                    <span className="font-medium">Clientes</span>
                  </Link>

                  <Link
                    to="/admin/vendas"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 backdrop-blur-sm ${
                      location.pathname === '/admin/vendas'
                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-white/70 bg-white/50'
                    }`}
                  >
                    <Users size={18} />
                    <span className="font-medium">Vendas</span>
                  </Link>

                  <Link
                    to="/admin/relatorios"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 backdrop-blur-sm ${
                      location.pathname === '/admin/relatorios'
                        ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg'
                        : 'text-gray-700 hover:text-teal-600 hover:bg-white/70 bg-white/50'
                    }`}
                  >
                    <BarChart3 size={18} />
                    <span className="font-medium">Relatórios</span>
                  </Link>

                  <Link
                    to="/admin/formas-pagamento"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 backdrop-blur-sm ${
                      location.pathname === '/admin/formas-pagamento'
                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                        : 'text-gray-700 hover:text-pink-600 hover:bg-white/70 bg-white/50'
                    }`}
                  >
                    <CreditCard size={18} />
                    <span className="font-medium">Pagamentos</span>
                  </Link>
                </>
              )}

              {/* Divisor */}
              <div className="w-px h-6 bg-gray-400 mx-2"></div>

              {/* Botão de Acesso Admin ou Logout */}
              {!isAdminRoute ? (
                <Link
                  to="/admin/login"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium backdrop-blur-sm"
                >
                  <Settings className="w-4 h-4 inline mr-2" />
                  Área Admin
                </Link>
              ) : (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700 px-4 py-2 rounded-xl hover:bg-red-50/80 transition-all duration-200 font-medium bg-white/70 backdrop-blur-sm"
                >
                  <LogOut size={18} />
                  <span>Sair</span>
                </button>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center space-x-2 flex-shrink-0">
              {/* Admin/Vendas Quick Access - Só mostra se não for admin route */}
              {!isAdminRoute && (
                <Link
                  to="/admin/login"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}
              
              {/* Menu Hambúrguer */}
              <button
                onClick={toggleMobileMenu}
                className="bg-white/90 backdrop-blur-sm p-3 rounded-lg text-gray-700 hover:text-blue-600 transition-colors shadow-lg border border-gray-200 z-50"
                aria-label="Menu de navegação"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu - OVERLAY COMPLETO */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={closeMobileMenu}>
          <div 
            className="absolute top-0 right-0 w-80 max-w-full h-full bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Menu */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Menu de Navegação</h3>
                <button
                  onClick={closeMobileMenu}
                  className="text-white hover:text-gray-200 p-2"
                >
                  <X size={24} />
                </button>
              </div>
              {isAdminRoute && (
                <p className="text-blue-100 text-sm mt-1">Área Administrativa</p>
              )}
            </div>

            {/* Conteúdo do Menu */}
            <div className="p-6">
              <nav className="space-y-4">
                {/* Link Público - Vendas - SEMPRE VISÍVEL */}
                <Link
                  to="/vendas"
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 text-lg font-medium w-full ${
                    location.pathname === '/vendas'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50 bg-gray-50'
                  }`}
                >
                  <ShoppingCart size={24} />
                  <span>Área de Vendas</span>
                </Link>

                {/* Links Administrativos - CONDICIONALMENTE VISÍVEIS */}
                {isAdminRoute && (
                  <>
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-2 mb-4">
                        Painel Administrativo
                      </p>
                    </div>

                    <Link
                      to="/admin"
                      onClick={closeMobileMenu}
                      className={`flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 text-lg font-medium w-full ${
                        location.pathname === '/admin'
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50 bg-gray-50'
                      }`}
                    >
                      <BarChart3 size={24} />
                      <span>Dashboard</span>
                    </Link>

                    <Link
                      to="/admin/produtos"
                      onClick={closeMobileMenu}
                      className={`flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 text-lg font-medium w-full ${
                        location.pathname === '/admin/produtos'
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                          : 'text-gray-700 hover:text-green-600 hover:bg-green-50 bg-gray-50'
                      }`}
                    >
                      <Package size={24} />
                      <span>Gestão de Produtos</span>
                    </Link>

                    <Link
                      to="/admin/clientes"
                      onClick={closeMobileMenu}
                      className={`flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 text-lg font-medium w-full ${
                        location.pathname === '/admin/clientes'
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                          : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50 bg-gray-50'
                      }`}
                    >
                      <UserCheck size={24} />
                      <span>Gestão de Clientes</span>
                    </Link>

                    <Link
                      to="/admin/vendas"
                      onClick={closeMobileMenu}
                      className={`flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 text-lg font-medium w-full ${
                        location.pathname === '/admin/vendas'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg'
                          : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 bg-gray-50'
                      }`}
                    >
                      <Users size={24} />
                      <span>Gestão de Vendas</span>
                    </Link>

                    <Link
                      to="/admin/relatorios"
                      onClick={closeMobileMenu}
                      className={`flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 text-lg font-medium w-full ${
                        location.pathname === '/admin/relatorios'
                          ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg'
                          : 'text-gray-700 hover:text-teal-600 hover:bg-teal-50 bg-gray-50'
                      }`}
                    >
                      <BarChart3 size={24} />
                      <span>Relatórios</span>
                    </Link>

                    <Link
                      to="/admin/formas-pagamento"
                      onClick={closeMobileMenu}
                      className={`flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 text-lg font-medium w-full ${
                        location.pathname === '/admin/formas-pagamento'
                          ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                          : 'text-gray-700 hover:text-pink-600 hover:bg-pink-50 bg-gray-50'
                      }`}
                    >
                      <CreditCard size={24} />
                      <span>Formas de Pagamento</span>
                    </Link>

                    {/* Logout Button */}
                    <div className="border-t border-gray-200 pt-4 mt-6">
                      <button
                        onClick={() => {
                          closeMobileMenu()
                          handleLogout()
                        }}
                        className="flex items-center space-x-4 px-4 py-4 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 font-medium w-full text-left text-lg bg-gray-50"
                      >
                        <LogOut size={24} />
                        <span>Sair da Área Restrita</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Admin Access for Public Area */}
                {!isAdminRoute && (
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <Link
                      to="/admin/login"
                      onClick={closeMobileMenu}
                      className="flex items-center space-x-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg font-medium text-lg w-full"
                    >
                      <Settings size={24} />
                      <span>Acessar Área Administrativa</span>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 min-h-[calc(100vh-200px)]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white border-t border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Informações da Empresa */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">CECÍLIA CAMA MESA E BANHO</h3>
                <p className="text-blue-200 font-medium text-sm sm:text-base">CONTATO: (79) 9 9651-3935 (CECÍLIA)</p>
                <p className="text-gray-300 text-xs sm:text-sm">Sistema de Gerenciamento Integrado</p>
              </div>
            </div>
            
            {/* Botão de Logout (apenas na área admin - Desktop) */}
            {isAdminRoute && (
              <div className="hidden sm:flex items-center space-x-4">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-sm sm:text-base"
                >
                  <LogOut size={18} />
                  <span>Sair da Área Restrita</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Linha de Copyright */}
          <div className="border-t border-gray-700 mt-4 sm:mt-6 pt-3 sm:pt-4 text-center">
            <p className="text-gray-400 text-xs sm:text-sm">
              &copy; 2024 CECÍLIA CAMA MESA E BANHO - Todos os direitos reservados
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Desenvolvido com React + TypeScript
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
