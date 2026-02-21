
import React, { useState, useEffect } from 'react'
import {BarChart3, TrendingUp, Calendar, DollarSign, Package, Users, FileText, Download, RefreshCw, Database} from 'lucide-react'
import { generateSalesReportPDF, generateProductStockReportPDF, generateCustomerReportPDF } from '../utils/reportGenerator'

import { lumi } from '../lib/lumi'
import toast from 'react-hot-toast'

interface Product {
  _id: string
  id?: string
  code: string
  name: string
  description: string
  price: number
  stock: number
  category: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface Sale {
  _id: string
  id?: string
  customer: {
    name: string
    phone: string
    email?: string
    address?: string
  }
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }>
  total: number
  date: string
  status: string
  observations?: string
  active?: boolean
}

interface Customer {
  _id: string
  id?: string
  name: string
  cpfCnpj: string
  phone: string
  email?: string
  address: string
  city: string
  state: string
  zipCode: string
  birthDate?: string
  customerType: string
  active: boolean
  observations?: string
  createdAt: string
  updatedAt: string
}

// 🛡️ FUNÇÕES DEFENSIVAS ULTRA-ROBUSTAS
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') return defaultValue
  if (typeof value === 'number') return isNaN(value) || !isFinite(value) ? defaultValue : value
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''))
    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

const safeString = (value: any, defaultValue: string = ''): string => {
  if (value === null || value === undefined) return defaultValue
  return String(value)
}

const safeFormatCurrency = (value: any): string => {
  const num = safeNumber(value, 0)
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const safeDate = (value: any): string => {
  if (!value) return 'Data inválida'
  
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return 'Data inválida'
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    console.error('❌ ERRO AO FORMATAR DATA:', error, value)
    return 'Data inválida'
  }
}

const Reports: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })

  // 🔥 FUNÇÃO CRÍTICA: Carregar vendas do Supabase
  const loadSalesFromDatabase = async () => {
    try {
      console.log('🔄 CARREGANDO VENDAS DO Supabase PARA RELATÓRIOS...')
      const response = await lumi.entities.sales.list({
        sort: { date: -1 }
      })
      
      if (!response || !response.list) {
        console.warn('⚠️ RESPOSTA INVÁLIDA DO Supabase:', response)
        return []
      }

      const salesData = response.list.map((sale: any) => ({
        _id: sale._id || sale.id || '',
        id: sale._id || sale.id || '',
        active: sale.active !== false,
        customer: {
          name: safeString(sale.customer?.name || sale.customerName, 'Cliente não informado'),
          phone: safeString(sale.customer?.phone || sale.customerPhone, ''),
          email: safeString(sale.customer?.email || sale.customerEmail, ''),
          address: safeString(sale.customer?.address || sale.customerAddress, '')
        },
        items: Array.isArray(sale.items) ? sale.items.map((item: any) => ({
          productId: safeString(item.productId, ''),
          productName: safeString(item.productName || item.name, 'Produto não informado'),
          quantity: safeNumber(item.quantity, 1),
          unitPrice: safeNumber(item.unitPrice || item.price, 0),
          total: safeNumber(item.total || (item.quantity * item.unitPrice), 0)
        })) : [],
        total: safeNumber(sale.total || sale.totalValue, 0),
        date: sale.date || sale.createdAt || new Date().toISOString(),
        status: safeString(sale.status, 'Pendente'),
        observations: safeString(sale.observations || sale.notes, '')
      }))

      console.log('✅ VENDAS CARREGADAS PARA RELATÓRIOS:', salesData.length)
      return salesData
      
    } catch (error) {
      console.error('❌ ERRO AO CARREGAR VENDAS PARA RELATÓRIOS:', error)
      throw error
    }
  }

  // 🔥 FUNÇÃO CRÍTICA: Carregar produtos do Supabase
  const loadProductsFromDatabase = async () => {
    try {
      console.log('🔄 CARREGANDO PRODUTOS DO Supabase PARA RELATÓRIOS...')
      const response = await lumi.entities.products.list({
        sort: { name: 1 }
      })
      
      const productsData = (response.list || []).map((product: any) => ({
        ...product,
        _id: product._id || product.id,
        id: product._id || product.id,
        active: product.active !== false,
        price: safeNumber(product.price, 0),
        stock: safeNumber(product.stock, 0)
      }))

      console.log('✅ PRODUTOS CARREGADOS PARA RELATÓRIOS:', productsData.length)
      return productsData
    } catch (error) {
      console.error('❌ ERRO AO CARREGAR PRODUTOS PARA RELATÓRIOS:', error)
      throw error
    }
  }

  // 🔥 FUNÇÃO CRÍTICA: Carregar clientes do Supabase
  const loadCustomersFromDatabase = async () => {
    try {
      console.log('🔄 CARREGANDO CLIENTES DO Supabase PARA RELATÓRIOS...')
      const response = await lumi.entities.customers.list({
        sort: { name: 1 }
      })
      
      const customersData = (response.list || []).map((customer: any) => ({
        ...customer,
        _id: customer._id || customer.id,
        id: customer._id || customer.id,
        active: customer.active !== false
      }))

      console.log('✅ CLIENTES CARREGADOS PARA RELATÓRIOS:', customersData.length)
      return customersData
    } catch (error) {
      console.error('❌ ERRO AO CARREGAR CLIENTES PARA RELATÓRIOS:', error)
      throw error
    }
  }

  // 📂 CARREGAR DADOS INICIAIS DO Supabase
  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🚀 INICIANDO CARREGAMENTO DE DADOS PARA RELATÓRIOS...')

      // Carregar dados em paralelo para melhor performance
      const [salesData, productsData, customersData] = await Promise.all([
        loadSalesFromDatabase(),
        loadProductsFromDatabase(),
        loadCustomersFromDatabase()
      ])

      setSales(salesData)
      setProducts(productsData)
      setCustomers(customersData)

      console.log('✅ TODOS OS DADOS CARREGADOS PARA RELATÓRIOS:', {
        vendas: salesData.length,
        produtos: productsData.length,
        clientes: customersData.length
      })
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO NO CARREGAMENTO DOS RELATÓRIOS:', error)
      setError('Erro ao carregar dados do banco de dados')
      toast.error('Erro ao carregar dados para relatórios')
    } finally {
      setLoading(false)
    }
  }

  // Carregar dados na inicialização
  useEffect(() => {
    loadInitialData()
  }, [])

  // Filtrar vendas por período
  const filteredSales = sales.filter(sale => {
    if (sale.active === false) return false
    
    if (!dateRange.start && !dateRange.end) return true
    
    const saleDate = new Date(sale.date)
    const startDate = dateRange.start ? new Date(dateRange.start) : null
    const endDate = dateRange.end ? new Date(dateRange.end) : null
    
    if (startDate && saleDate < startDate) return false
    if (endDate && saleDate > endDate) return false
    
    return true
  })

  // Cálculos de estatísticas
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + safeNumber(sale.total, 0), 0)
  const totalSales = filteredSales.length
  const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0
  const activeProducts = products.filter(p => p.active !== false)
  const activeCustomers = customers.filter(c => c.active !== false)
  const totalProducts = activeProducts.length
  const totalCustomers = activeCustomers.length

  // Produtos mais vendidos
  const productSales = filteredSales.reduce((acc, sale) => {
    if (sale?.items && Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        if (item?.productId && item?.productName) {
          if (!acc[item.productId]) {
            acc[item.productId] = {
              name: item.productName,
              quantity: 0,
              revenue: 0
            }
          }
          acc[item.productId].quantity += safeNumber(item.quantity, 0)
          acc[item.productId].revenue += safeNumber(item.total, 0)
        }
      })
    }
    return acc
  }, {} as Record<string, { name: string; quantity: number; revenue: number }>)

  const topProducts = Object.entries(productSales)
    .sort(([,a], [,b]) => (b?.quantity || 0) - (a?.quantity || 0))
    .slice(0, 10)

  // Vendas por mês
  const salesByMonth = filteredSales.reduce((acc, sale) => {
    const month = new Date(sale.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
    if (!acc[month]) {
      acc[month] = { count: 0, revenue: 0 }
    }
    acc[month].count += 1
    acc[month].revenue += safeNumber(sale.total, 0)
    return acc
  }, {} as Record<string, { count: number; revenue: number }>)

  const handleGenerateReport = async (type: 'sales' | 'products' | 'customers') => {
    try {
      console.log(`📊 GERANDO RELATÓRIO DE ${type.toUpperCase()}...`)
      
      // Preparar dados para os relatórios
      const reportData = {
        weeklyRevenue: totalRevenue * 0.1, // Estimativa semanal
        monthlyRevenue: totalRevenue * 0.4, // Estimativa mensal
        yearlyRevenue: totalRevenue,
        weeklyExpenses: 0,
        monthlyExpenses: 0,
        yearlyExpenses: 0,
        totalCustomers: totalCustomers,
        topProducts: topProducts.map(([id, data]) => ({
          name: data.name,
          totalSold: data.quantity,
          revenue: data.revenue,
          salesCount: filteredSales.filter(sale => 
            sale.items?.some(item => item.productId === id)
          ).length
        })),
        customerHistory: activeCustomers.map(customer => {
          const customerSales = filteredSales.filter(sale => 
            sale.customer?.name === customer.name
          )
          const totalSpent = customerSales.reduce((sum, sale) => sum + safeNumber(sale.total, 0), 0)
          const lastSale = customerSales.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0]
          
          return {
            customerName: customer.name,
            customerPhone: customer.phone,
            totalPurchases: customerSales.length,
            totalSpent,
            lastPurchase: lastSale?.date || customer.createdAt
          }
        }),
        stockReport: activeProducts.map(product => {
          const stockValue = safeNumber(product.stock, 0)
          console.log('🔍 DEBUG PRODUTO PARA RELATÓRIO:', {
            name: product.name,
            code: product.code,
            stockOriginal: product.stock,
            stockProcessado: stockValue,
            produtoCompleto: product
          })
          return {
            name: safeString(product.name, 'Sem nome'),
            code: safeString(product.code, 'Sem código'),
            stockQuantity: stockValue,
            category: safeString(product.category, 'Sem categoria')
          }
        }),
        expenses: [],
        sales: filteredSales.map(sale => ({
          _id: sale._id,
          totalValue: sale.total,
          createdAt: sale.date,
          customerName: sale.customer?.name || 'Cliente Avulso',
          customerPhone: sale.customer?.phone || '',
          customerCpfCnpj: '',
          products: sale.items?.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            totalPrice: item.total
          })) || []
        }))
      }

      switch (type) {
        case 'sales':
          await generateSalesReportPDF(reportData)
          toast.success('Relatório de vendas gerado com sucesso!')
          break
        case 'products':
          await generateProductStockReportPDF(reportData)
          toast.success('Relatório de produtos gerado com sucesso!')
          break
        case 'customers':
          await generateCustomerReportPDF(reportData)
          toast.success('Relatório de clientes gerado com sucesso!')
          break
      }
    } catch (error) {
      console.error('❌ ERRO AO GERAR RELATÓRIO:', error)
      toast.error('Erro ao gerar relatório. Tente novamente.')
    }
  }

  const handleReload = async () => {
    if (window.confirm('⚠️ RECARREGAR DADOS DO BANCO?\n\nTodos os dados dos relatórios serão recarregados do Supabase!')) {
      await loadInitialData()
      toast.success('Dados dos relatórios recarregados!')
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados dos relatórios...</p>
            <p className="text-gray-500 text-sm mt-2">Conectando ao Supabase...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Erro no Sistema</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={loadInitialData}
                className="bg-red-600 text-white px-4 py-2 rounded mr-2 hover:bg-red-700"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          Relatórios
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Análises e relatórios detalhados do negócio com dados do Supabase
        </p>
      </div>

      {/* Status do Sistema */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-green-800 font-medium">
                📊 Dados dos Relatórios - Supabase Conectado
              </p>
              <p className="text-green-600 text-sm">
                {totalSales} vendas • R$ {safeFormatCurrency(totalRevenue)} em receita • {totalCustomers} clientes • {totalProducts} produtos
              </p>
              <p className="text-green-500 text-xs">
                Período: {dateRange.start || 'Início'} até {dateRange.end || 'Hoje'} • {filteredSales.length} vendas filtradas
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleReload}
              className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recarregar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtros de Data */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-2" />
          Filtros de Período
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2 sm:items-end">
            <button
              onClick={() => setDateRange({ start: '', end: '' })}
              className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
        
        {/* Debug Info */}
        <div className="mt-4 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <strong>Dados carregados:</strong> {sales.length} vendas
            </div>
            <div>
              <strong>Produtos:</strong> {totalProducts} ativos
            </div>
            <div>
              <strong>Clientes:</strong> {totalCustomers} cadastrados
            </div>
            <div>
              <strong>Filtrado:</strong> {filteredSales.length} vendas
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Relatórios Completos */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mr-2" />
          Relatórios Completos em PDF
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => handleGenerateReport('sales')}
            className="flex flex-col items-center p-6 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <BarChart3 className="w-8 h-8 text-green-600 mb-3" />
            <span className="text-sm font-semibold text-green-800 mb-1">Relatório de Vendas</span>
            <span className="text-xs text-green-600 text-center">
              {filteredSales.length} vendas<br />
              R$ {safeFormatCurrency(totalRevenue)} em receita
            </span>
          </button>

          <button
            onClick={() => handleGenerateReport('products')}
            className="flex flex-col items-center p-6 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Package className="w-8 h-8 text-blue-600 mb-3" />
            <span className="text-sm font-semibold text-blue-800 mb-1">Relatório de Produtos</span>
            <span className="text-xs text-blue-600 text-center">
              {totalProducts} produtos ativos<br />
              {topProducts.length} produtos vendidos
            </span>
          </button>

          <button
            onClick={() => handleGenerateReport('customers')}
            className="flex flex-col items-center p-6 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Users className="w-8 h-8 text-purple-600 mb-3" />
            <span className="text-sm font-semibold text-purple-800 mb-1">Relatório de Clientes</span>
            <span className="text-xs text-purple-600 text-center">
              {totalCustomers} clientes cadastrados<br />
              Histórico de compras completo
            </span>
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <FileText className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 mb-2">📋 Informações sobre os relatórios:</p>
              <ul className="space-y-1 text-yellow-700">
                <li>• <strong>Relatório de Vendas:</strong> Considera o período selecionado nos filtros acima ({filteredSales.length} vendas)</li>
                <li>• <strong>Relatório de Produtos:</strong> Lista todos os produtos ativos no sistema ({totalProducts} produtos)</li>
                <li>• <strong>Relatório de Clientes:</strong> Lista todos os clientes cadastrados ({totalCustomers} clientes) com histórico de compras</li>
                <li>• <strong>Dados em tempo real:</strong> Todos os relatórios são gerados com dados atualizados do Supabase</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas Resumidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-100 p-2 sm:p-3 rounded-lg">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">
              R$ {safeFormatCurrency(totalRevenue)}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Receita Total</p>
            <p className="text-xs text-gray-500">
              {dateRange.start || dateRange.end ? 'Período filtrado' : 'Todos os tempos'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-100 p-2 sm:p-3 rounded-lg">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{totalSales}</h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Total de Vendas</p>
            <p className="text-xs text-gray-500">
              {filteredSales.length} no período selecionado
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-purple-100 p-2 sm:p-3 rounded-lg">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">
              R$ {safeFormatCurrency(averageSaleValue)}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Ticket Médio</p>
            <p className="text-xs text-gray-500">
              Baseado em {filteredSales.length} vendas
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-orange-100 p-2 sm:p-3 rounded-lg">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{topProducts.length}</h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Produtos Vendidos</p>
            <p className="text-xs text-gray-500">
              De {totalProducts} produtos cadastrados
            </p>
          </div>
        </div>
      </div>

      {/* Seção de Relatórios Detalhados */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        {/* Produtos Mais Vendidos */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mr-2" />
              Produtos Mais Vendidos
            </h2>
            <button
              onClick={() => handleGenerateReport('products')}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </button>
          </div>

          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.slice(0, 5).map(([productId, data], index) => (
                <div key={productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">
                        {data?.name || 'Produto sem nome'}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {data?.quantity || 0} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    R$ {safeFormatCurrency(data?.revenue || 0)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Nenhuma venda registrada no período</p>
              </div>
            )}
          </div>
        </div>

        {/* Vendas por Período */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-2" />
              Vendas por Mês
            </h2>
            <button
              onClick={() => handleGenerateReport('sales')}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </button>
          </div>

          <div className="space-y-3">
            {Object.entries(salesByMonth).length > 0 ? (
              Object.entries(salesByMonth)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .slice(0, 6)
                .map(([month, data]) => (
                  <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 capitalize">
                        {month}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {data.count} vendas
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      R$ {safeFormatCurrency(data.revenue)}
                    </span>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Nenhuma venda registrada no período</p>
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  )
}

export default Reports
