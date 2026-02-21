
import React, { useState, useEffect } from 'react'
import {BarChart3, Package, Users, ShoppingCart, TrendingUp, Calendar, DollarSign, Star} from 'lucide-react'
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
  active?: boolean
  createdAt?: string
  updatedAt?: string
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
  phone: string
  email?: string
  address?: string
  registrationDate?: string
  createdAt?: string
  active?: boolean
}

// Funções defensivas para evitar erros
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

const AdminDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [dataLoadStatus, setDataLoadStatus] = useState<{
    products: 'loading' | 'success' | 'error'
    sales: 'loading' | 'success' | 'error'
    customers: 'loading' | 'success' | 'error'
  }>({
    products: 'loading',
    sales: 'loading',
    customers: 'loading'
  })

  // 🔥 FUNÇÃO CRÍTICA: Carregar produtos do Supabase
  const loadProductsFromDatabase = async (): Promise<Product[]> => {
    try {
      console.log('🔄 CARREGANDO PRODUTOS DO Supabase...')
      const response = await lumi.entities.products.list({
        sort: { name: 1 },
        limit: 1000
      })
      
      console.log('📊 RESPOSTA BRUTA DO Supabase (PRODUTOS):', response)
      
      if (!response || !response.list) {
        console.warn('⚠️ RESPOSTA INVÁLIDA DO Supabase:', response)
        setDataLoadStatus(prev => ({ ...prev, products: 'error' }))
        return []
      }

      const productsData = response.list.map((product: any) => {
        console.log('🔍 PROCESSANDO PRODUTO INDIVIDUAL:', product)
        
        return {
          _id: product._id || product.id || '',
          id: product._id || product.id || '',
          code: safeString(product.code, 'S/C'),
          name: safeString(product.name, 'Produto sem nome'),
          description: safeString(product.description, ''),
          price: safeNumber(product.price, 0),
          stock: safeNumber(product.stock, 0),
          category: safeString(product.category, 'Sem categoria'),
          active: product.active !== false,
          createdAt: product.createdAt || new Date().toISOString(),
          updatedAt: product.updatedAt || new Date().toISOString()
        }
      })

      console.log('✅ PRODUTOS PROCESSADOS FINAL:', productsData.length, productsData)
      setDataLoadStatus(prev => ({ ...prev, products: 'success' }))
      return productsData
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO AO CARREGAR PRODUTOS:', error)
      setDataLoadStatus(prev => ({ ...prev, products: 'error' }))
      throw error
    }
  }

  // 🔥 FUNÇÃO CRÍTICA: Carregar vendas do Supabase
  const loadSalesFromDatabase = async (): Promise<Sale[]> => {
    try {
      console.log('🔄 CARREGANDO VENDAS DO Supabase...')
      const response = await lumi.entities.sales.list({
        sort: { date: -1 },
        limit: 1000
      })
      
      console.log('📊 RESPOSTA BRUTA DO Supabase (VENDAS):', response)
      
      if (!response || !response.list) {
        console.warn('⚠️ RESPOSTA INVÁLIDA DO Supabase:', response)
        setDataLoadStatus(prev => ({ ...prev, sales: 'error' }))
        return []
      }

      const salesData = response.list.map((sale: any) => {
        console.log('🔍 PROCESSANDO VENDA INDIVIDUAL:', sale)
        
        return {
          _id: sale._id || sale.id || '',
          id: sale._id || sale.id || '',
          active: sale.active !== false,
          
          // Dados do cliente
          customer: {
            name: safeString(sale.customer?.name || sale.customerName, 'Cliente não informado'),
            phone: safeString(sale.customer?.phone || sale.customerPhone, 'Telefone não informado'),
            email: safeString(sale.customer?.email || sale.customerEmail, ''),
            address: safeString(sale.customer?.address || sale.customerAddress, '')
          },
          
          // Itens da venda
          items: Array.isArray(sale.items) ? sale.items.map((item: any) => ({
            productId: safeString(item.productId, ''),
            productName: safeString(item.productName || item.name, 'Produto não informado'),
            quantity: safeNumber(item.quantity, 1),
            unitPrice: safeNumber(item.unitPrice || item.price, 0),
            total: safeNumber(item.total || (item.quantity * item.unitPrice), 0)
          })) : [],
          
          // Valores e datas
          total: safeNumber(sale.total || sale.totalValue, 0),
          date: sale.date || sale.createdAt || new Date().toISOString(),
          status: safeString(sale.status, 'Pendente'),
          observations: safeString(sale.observations || sale.notes, '')
        }
      })

      console.log('✅ VENDAS PROCESSADAS FINAL:', salesData.length, salesData)
      setDataLoadStatus(prev => ({ ...prev, sales: 'success' }))
      return salesData
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO AO CARREGAR VENDAS:', error)
      setDataLoadStatus(prev => ({ ...prev, sales: 'error' }))
      throw error
    }
  }

  // 🔥 FUNÇÃO CRÍTICA: Carregar clientes do Supabase
  const loadCustomersFromDatabase = async (): Promise<Customer[]> => {
    try {
      console.log('🔄 CARREGANDO CLIENTES DO Supabase...')
      const response = await lumi.entities.customers.list({
        sort: { name: 1 },
        limit: 1000
      })
      
      console.log('📊 RESPOSTA BRUTA DO Supabase (CLIENTES):', response)
      
      if (!response || !response.list) {
        console.warn('⚠️ RESPOSTA INVÁLIDA DO Supabase:', response)
        setDataLoadStatus(prev => ({ ...prev, customers: 'error' }))
        return []
      }

      const customersData = response.list.map((customer: any) => {
        console.log('🔍 PROCESSANDO CLIENTE INDIVIDUAL:', customer)
        
        return {
          _id: customer._id || customer.id || '',
          id: customer._id || customer.id || '',
          name: safeString(customer.name, 'Cliente sem nome'),
          phone: safeString(customer.phone, 'Telefone não informado'),
          email: safeString(customer.email, ''),
          address: safeString(customer.address, ''),
          active: customer.active !== false,
          createdAt: customer.createdAt || new Date().toISOString(),
          registrationDate: customer.registrationDate || customer.createdAt || new Date().toISOString()
        }
      })

      console.log('✅ CLIENTES PROCESSADOS FINAL:', customersData.length, customersData)
      setDataLoadStatus(prev => ({ ...prev, customers: 'success' }))
      return customersData
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO AO CARREGAR CLIENTES:', error)
      setDataLoadStatus(prev => ({ ...prev, customers: 'error' }))
      throw error
    }
  }

  // 📂 CARREGAR DADOS INICIAIS DO Supabase
  const loadAllDataFromDatabase = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🚀 INICIANDO CARREGAMENTO DE DADOS DO Supabase...')

      // Reset status
      setDataLoadStatus({
        products: 'loading',
        sales: 'loading',
        customers: 'loading'
      })

      // Carregar dados em paralelo para melhor performance
      const [productsData, salesData, customersData] = await Promise.all([
        loadProductsFromDatabase(),
        loadSalesFromDatabase(),
        loadCustomersFromDatabase()
      ])

      // Atualizar estados
      setProducts(productsData)
      setSales(salesData)
      setCustomers(customersData)

      console.log('✅ TODOS OS DADOS CARREGADOS COM SUCESSO:', {
        produtos: productsData.length,
        vendas: salesData.length,
        clientes: customersData.length
      })
      
      // Atualizar timestamp
      setLastUpdate(new Date().toLocaleString('pt-BR'))
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO NO CARREGAMENTO:', error)
      setError('Erro ao carregar dados do banco de dados Supabase')
      toast.error('Erro ao carregar dados do banco')
    } finally {
      setLoading(false)
    }
  }

  // Função para forçar atualização
  const forceRefresh = async () => {
    console.log('🔄 === FORÇANDO ATUALIZAÇÃO DOS DADOS DO Supabase ===')
    toast.info('Atualizando dados do banco...')
    await loadAllDataFromDatabase()
    toast.success('Dados atualizados!')
  }

  useEffect(() => {
    loadAllDataFromDatabase()
    
    // 🔄 Atualização automática a cada 10 segundos
    const intervalId = setInterval(() => {
      console.log('🔄 Atualizando dados automaticamente...')
      loadAllDataFromDatabase()
    }, 10000) // 10 segundos
    
    // Limpar intervalo ao desmontar componente
    return () => {
      clearInterval(intervalId)
    }
  }, [])

  // Debug dos dados carregados
  useEffect(() => {
    console.log('🔍 === DEBUG ESTADO ATUAL (DADOS REAIS) ===')
    console.log('Products state:', products.length, products)
    console.log('Sales state:', sales.length, sales)
    console.log('Customers state:', customers.length, customers)
    console.log('Data Load Status:', dataLoadStatus)
    console.log('Última atualização:', lastUpdate)
    console.log('Loading:', loading)
    console.log('Error:', error)
  }, [products, sales, customers, dataLoadStatus, lastUpdate, loading, error])

  // Cálculos com dados reais do Supabase
  const activeProducts = products.filter(product => product.active !== false)
  const activeSales = sales.filter(sale => sale.active !== false)
  const activeCustomers = customers.filter(customer => customer.active !== false)

  const totalProducts = activeProducts.length
  const totalSales = activeSales.length
  const totalCustomers = activeCustomers.length
  
  // Cálculo de receita DIÁRIA (apenas do dia atual)
  console.log('💰 === CALCULANDO RECEITA DIÁRIA (DIA ATUAL) ===')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todaySales = activeSales.filter(sale => {
    const saleDate = new Date(sale.date)
    saleDate.setHours(0, 0, 0, 0)
    return saleDate.getTime() === today.getTime()
  })
  
  const totalRevenue = todaySales.reduce((sum, sale) => {
    const saleTotal = safeNumber(sale.total, 0)
    console.log(`💰 Venda do dia ${sale._id}: R$ ${saleTotal}`)
    return sum + saleTotal
  }, 0)
  
  console.log(`📅 Total de vendas do dia: ${todaySales.length}`)
  console.log(`💰 Receita do dia: R$ ${totalRevenue}`)
  
  const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0
  const lowStockProducts = activeProducts.filter(product => safeNumber(product.stock, 0) <= 2).length

  console.log('📊 === ESTATÍSTICAS FINAIS (DADOS REAIS) ===')
  console.log('Total Produtos Ativos:', totalProducts)
  console.log('Total Vendas Ativas:', totalSales)
  console.log('Total Clientes Ativos:', totalCustomers)
  console.log('Receita Total Calculada:', totalRevenue)
  console.log('Valor Médio por Venda:', averageSaleValue)
  console.log('Produtos com Estoque Baixo:', lowStockProducts)

  // Produtos mais vendidos com dados reais
  console.log('🏆 === CALCULANDO TOP PRODUTOS (DADOS REAIS) ===')
  const productSales = activeSales.reduce((acc, sale) => {
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        if (item.productId && item.productName) {
          if (!acc[item.productId]) {
            acc[item.productId] = {
              name: item.productName,
              quantity: 0,
              revenue: 0
            }
          }
          const itemQuantity = safeNumber(item.quantity, 0)
          const itemTotal = safeNumber(item.total, 0)
          
          acc[item.productId].quantity += itemQuantity
          acc[item.productId].revenue += itemTotal
        }
      })
    }
    return acc
  }, {} as Record<string, { name: string; quantity: number; revenue: number }>)

  const topProducts = Object.entries(productSales)
    .sort(([,a], [,b]) => (b.quantity || 0) - (a.quantity || 0))
    .slice(0, 5)

  console.log('🏆 Top Produtos Calculados (Dados Reais):', topProducts)

  // Vendas recentes com dados reais
  console.log('📅 === CALCULANDO VENDAS RECENTES (DADOS REAIS) ===')
  const recentSales = activeSales
    .filter(sale => {
      const hasDate = sale.date && sale.date.trim() !== ''
      const hasCustomer = sale.customer?.name && sale.customer.name.trim() !== ''
      return hasDate && hasCustomer
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  console.log('📅 Vendas Recentes Calculadas (Dados Reais):', recentSales)

  if (loading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados reais do Supabase...</p>
            <div className="mt-4 space-y-2">
              <div className={`text-xs px-3 py-1 rounded-full ${
                dataLoadStatus.products === 'success' ? 'bg-green-100 text-green-700' :
                dataLoadStatus.products === 'error' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                Produtos: {dataLoadStatus.products}
              </div>
              <div className={`text-xs px-3 py-1 rounded-full ${
                dataLoadStatus.sales === 'success' ? 'bg-green-100 text-green-700' :
                dataLoadStatus.sales === 'error' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                Vendas: {dataLoadStatus.sales}
              </div>
              <div className={`text-xs px-3 py-1 rounded-full ${
                dataLoadStatus.customers === 'success' ? 'bg-green-100 text-green-700' :
                dataLoadStatus.customers === 'error' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                Clientes: {dataLoadStatus.customers}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="bg-red-100 p-6 rounded-lg">
              <p className="text-red-600 font-medium mb-4">{error}</p>
              <div className="space-y-2 mb-4">
                <div className={`text-xs px-3 py-1 rounded-full ${
                  dataLoadStatus.products === 'success' ? 'bg-green-100 text-green-700' :
                  dataLoadStatus.products === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  Produtos: {dataLoadStatus.products}
                </div>
                <div className={`text-xs px-3 py-1 rounded-full ${
                  dataLoadStatus.sales === 'success' ? 'bg-green-100 text-green-700' :
                  dataLoadStatus.sales === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  Vendas: {dataLoadStatus.sales}
                </div>
                <div className={`text-xs px-3 py-1 rounded-full ${
                  dataLoadStatus.customers === 'success' ? 'bg-green-100 text-green-700' :
                  dataLoadStatus.customers === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  Clientes: {dataLoadStatus.customers}
                </div>
              </div>
              <button 
                onClick={forceRefresh} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 mr-2"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
              Dashboard Administrativo
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Visão geral do desempenho da loja - Dados Reais do Supabase
            </p>
          </div>
          <button 
            onClick={forceRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
          >
            🔄 Atualizar Supabase
          </button>
        </div>
        
        {/* Status de carregamento com dados reais */}
        <div className="mt-3 space-x-2">
          <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full inline-block">
            ✅ Produtos: {totalProducts} | Vendas: {totalSales} | Clientes: {totalCustomers}
          </span>
          <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
            💰 Receita: R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-600 bg-gray-50 px-3 py-1 rounded-full inline-block">
              🕒 Atualizado: {lastUpdate}
            </span>
          )}
          <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full inline-block">
            🗄️ Supabase: P:{dataLoadStatus.products.charAt(0).toUpperCase()} | V:{dataLoadStatus.sales.charAt(0).toUpperCase()} | C:{dataLoadStatus.customers.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Card Produtos */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-blue-100 p-2 sm:p-3 rounded-lg">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <span className={`text-xs sm:text-sm font-medium px-2 py-1 rounded-full ${
              dataLoadStatus.products === 'success' ? 'text-green-500 bg-green-100' :
              dataLoadStatus.products === 'error' ? 'text-red-500 bg-red-100' :
              'text-yellow-500 bg-yellow-100'
            }`}>
              {dataLoadStatus.products === 'success' ? 'Supabase' : 
               dataLoadStatus.products === 'error' ? 'Erro' : 'Carregando'}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{totalProducts}</h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Produtos Cadastrados</p>
            {lowStockProducts > 0 && (
              <p className="text-xs text-red-600 font-medium">
                {lowStockProducts} com estoque baixo
              </p>
            )}
          </div>
        </div>

        {/* Card Vendas */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-green-100 p-2 sm:p-3 rounded-lg">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <span className={`text-xs sm:text-sm font-medium px-2 py-1 rounded-full ${
              dataLoadStatus.sales === 'success' ? 'text-green-500 bg-green-100' :
              dataLoadStatus.sales === 'error' ? 'text-red-500 bg-red-100' :
              'text-yellow-500 bg-yellow-100'
            }`}>
              {dataLoadStatus.sales === 'success' ? 'Supabase' : 
               dataLoadStatus.sales === 'error' ? 'Erro' : 'Carregando'}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{totalSales}</h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Vendas Realizadas</p>
            <p className="text-xs text-green-600 font-medium">
              Média: R$ {averageSaleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Card Clientes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-purple-100 p-2 sm:p-3 rounded-lg">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <span className={`text-xs sm:text-sm font-medium px-2 py-1 rounded-full ${
              dataLoadStatus.customers === 'success' ? 'text-green-500 bg-green-100' :
              dataLoadStatus.customers === 'error' ? 'text-red-500 bg-red-100' :
              'text-yellow-500 bg-yellow-100'
            }`}>
              {dataLoadStatus.customers === 'success' ? 'Supabase' : 
               dataLoadStatus.customers === 'error' ? 'Erro' : 'Carregando'}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{totalCustomers}</h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Clientes Cadastrados</p>
          </div>
        </div>

        {/* Card Receita */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-yellow-100 p-2 sm:p-3 rounded-lg">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Real
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Receita Diária (Hoje)</p>
          </div>
        </div>
      </div>

      {/* Seção de Conteúdo Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* Produtos Mais Vendidos */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mr-2" />
              Top Produtos
            </h2>
            <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Dados Reais
            </span>
          </div>

          <div className="block sm:hidden space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map(([productId, data], index) => (
                <div key={productId} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-800">#{index + 1}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      {data.quantity} vendas
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-1 leading-tight">
                    {data.name}
                  </h4>
                  <p className="text-xs text-green-600 font-medium">
                    R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Nenhuma venda registrada ainda</p>
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {topProducts.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Posição
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Produto
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Vendas
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Receita
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map(([productId, data], index) => (
                        <tr key={productId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="text-sm font-medium text-gray-800 leading-tight">
                              {data.name}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {data.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm font-semibold text-green-600">
                              R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Nenhuma venda registrada ainda</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vendas Recentes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-2" />
              Vendas Recentes
            </h2>
            <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Dados Reais
            </span>
          </div>

          <div className="block sm:hidden space-y-3">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div key={sale._id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {new Date(sale.date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      sale.status === 'Concluída' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {sale.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">
                    {sale.customer?.name || 'Cliente não informado'}
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {sale.items?.length || 0} item(s)
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      R$ {(sale.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Nenhuma venda registrada ainda</p>
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {recentSales.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Itens
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSales.map((sale) => (
                        <tr key={sale._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <span className="text-sm text-gray-600">
                              {new Date(sale.date).toLocaleDateString('pt-BR')}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="text-sm font-medium text-gray-800">
                              {sale.customer?.name || 'Cliente não informado'}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm text-gray-600">
                              {sale.items?.length || 0} item(s)
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm font-semibold text-green-600">
                              R$ {(sale.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              sale.status === 'Concluída' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {sale.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Nenhuma venda registrada ainda</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas e Avisos */}
      <div className="mt-6 sm:mt-8">
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-start space-x-3">
            <div className="bg-orange-100 p-2 rounded-lg flex-shrink-0">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-orange-800 mb-1">
                Produtos com Estoque Baixo (Dados Reais)
              </h3>
              {lowStockProducts > 0 ? (
                <p className="text-xs sm:text-sm text-orange-700">
                  Existem <strong>{lowStockProducts} produtos</strong> com estoque abaixo de 10 unidades. 
                  Considere reabastecer para evitar rupturas.
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-green-700">
                  ✅ Todos os produtos estão com estoque adequado.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
