
import React, { useState, useEffect } from 'react'
import {ShoppingCart, Plus, Eye, Trash2, Search, Filter, Calendar, DollarSign, User, Package, Download, Save, RefreshCw, Database, UserPlus, X, Phone, Mail, MapPin, Minus, Edit, FileText, Image} from 'lucide-react'
import { generateSalePDF, generateSaleImage } from '../utils/pdfGenerator'

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
  saleNumber?: number
  paymentMethod?: string
}

interface NewSaleItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

interface NewSale {
  customer: {
    name: string
    phone: string
    email?: string
    address?: string
  }
  items: NewSaleItem[]
  total: number
  date: string
  observations?: string
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

const safeToFixed = (value: any, decimals: number = 2): string => {
  const num = safeNumber(value, 0)
  return num.toFixed(decimals)
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

// 🔢 FUNÇÃO PARA GERAR NÚMERO SEQUENCIAL DA VENDA BASEADO NO ÍNDICE (para exibição)
const generateSaleNumberFromIndex = (index: number): string => {
  return String(index + 1).padStart(4, '0')
}

// 🔢 FUNÇÃO PARA OBTER PRÓXIMO NÚMERO DE VENDA DO BANCO (para criação)
const getNextSaleNumber = async (): Promise<number> => {
  try {
    console.log('🔢 Obtendo próximo número de venda do banco...')
    
    // Buscar todas as vendas ordenadas por saleNumber decrescente
    const response = await lumi.entities.sales.list({
      limit: 1,
      sort: { saleNumber: -1 }
    })
    
    if (response.list && response.list.length > 0 && response.list[0].saleNumber) {
      const lastNumber = response.list[0].saleNumber
      console.log(`📊 Último número no banco: ${lastNumber}`)
      return lastNumber + 1
    }
    
    // Se não houver vendas com saleNumber, contar total de vendas
    const allSalesResponse = await lumi.entities.sales.list({
      limit: 10000
    })
    const totalSales = allSalesResponse.list?.length || 0
    console.log(`📊 Total de vendas no banco: ${totalSales}`)
    return totalSales + 1
    
  } catch (error) {
    console.error('❌ Erro ao obter próximo número de venda:', error)
    // Fallback: usar timestamp
    return Date.now()
  }
}

// 📊 FUNÇÃO CORRIGIDA PARA CALCULAR TOTAL DE PRODUTOS NA VENDA
const calculateTotalItems = (items: any[]): number => {
  console.log('🔍 CALCULANDO TOTAL DE ITENS:', items)
  
  if (!Array.isArray(items)) {
    console.warn('⚠️ ITEMS NÃO É UM ARRAY:', items)
    return 0
  }
  
  const total = items.reduce((sum, item) => {
    if (!item) {
      console.warn('⚠️ ITEM NULO/UNDEFINED:', item)
      return sum
    }
    
    const quantity = safeNumber(item.quantity, 0)
    console.log(`📦 Item: ${item.productName || 'N/A'} - Quantidade: ${quantity}`)
    return sum + quantity
  }, 0)
  
  console.log('✅ TOTAL CALCULADO:', total)
  return total
}

// 📊 FUNÇÃO PARA CALCULAR TIPOS DE PRODUTOS NA VENDA
const calculateProductTypes = (items: any[]): number => {
  if (!Array.isArray(items)) return 0
  return items.filter(item => item && safeNumber(item.quantity, 0) > 0).length
}

const SalesManagement: React.FC = () => {
  // Estados principais
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('date_asc') // 'date_asc', 'date_desc', 'em_andamento', 'finalizada'
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('') // Novo filtro de forma de pagamento
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para filtros de período
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Estados para seleção de clientes
  const [showCustomerSelector, setShowCustomerSelector] = useState(false)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Estados para Nova Venda
  const [showNewSaleModal, setShowNewSaleModal] = useState(false)
  const [newSale, setNewSale] = useState<NewSale>({
    customer: { name: '', phone: '', email: '', address: '' },
    items: [],
    total: 0,
    date: new Date().toISOString().split('T')[0], // Data de hoje por padrão
    observations: ''
  })

  // Estados para modal de produtos
  const [showProductModal, setShowProductModal] = useState(false)
  const [productModalLoading, setProductModalLoading] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productQuantity, setProductQuantity] = useState(1)

  // Estados para edição de vendas
  const [showEditSaleModal, setShowEditSaleModal] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])

  // Estados para confirmar adição de produto duplicado
  const [showDuplicateProductModal, setShowDuplicateProductModal] = useState(false)
  const [pendingProductToAdd, setPendingProductToAdd] = useState<{ product: Product, quantity: number } | null>(null)

  // 🔥 FUNÇÃO CRÍTICA: Carregar vendas do MongoDB COM CORREÇÃO DE DADOS E ORDENAÇÃO
  const loadSalesFromDatabase = async () => {
    try {
      console.log('🔄 CARREGANDO VENDAS DO MONGODB...')
      const response = await lumi.entities.sales.list({
        sort: { createdAt: 1 }, // Ordenar por data de criação (ordem cronológica crescente)
        limit: 1000 // Limitar carregamento inicial para melhor performance
      })
      
      console.log('📊 RESPOSTA BRUTA DO MONGODB (VENDAS):', response)
      
      if (!response || !response.list) {
        console.warn('⚠️ RESPOSTA INVÁLIDA DO MONGODB:', response)
        setSales([])
        return []
      }

      const salesData = response.list.map((sale: any, index: number) => {
        console.log('🔍 PROCESSANDO VENDA INDIVIDUAL:', sale)
        console.log('📦 ITENS DA VENDA:', sale.items)
        console.log('📦 TIPO DE ITEMS:', typeof sale.items, 'É Array?', Array.isArray(sale.items))
        console.log('📦 TODAS AS CHAVES DO OBJETO VENDA:', Object.keys(sale))
        
        // 🛡️ CORREÇÃO CRÍTICA: Garantir estrutura correta dos dados
        const processedSale = {
          _id: sale._id || sale.id || '',
          id: sale._id || sale.id || '',
          active: sale.active !== false,
          
          // 🔧 CORREÇÃO: Dados do cliente
          customer: {
            name: safeString(sale.customer?.name || sale.customerName, 'Cliente não informado'),
            phone: safeString(sale.customer?.phone || sale.customerPhone, 'Telefone não informado'),
            email: safeString(sale.customer?.email || sale.customerEmail, ''),
            address: safeString(sale.customer?.address || sale.customerAddress, '')
          },
          
          // 🔧 CORREÇÃO CRÍTICA: Itens da venda com validação ULTRA-ROBUSTA
          // Tentar múltiplos nomes de campo possíveis do MongoDB
          items: (() => {
            // Tentar encontrar o array de items em diferentes campos possíveis
            const itemsArray = sale.items || sale.products || sale.saleItems || sale.vendaItems || []
            
            console.log('🔍 TENTANDO CARREGAR ITEMS DE:', {
              'sale.items': sale.items,
              'sale.products': sale.products,
              'sale.saleItems': sale.saleItems,
              'itemsArray escolhido': itemsArray,
              'É array?': Array.isArray(itemsArray),
              'Tamanho': itemsArray?.length || 0
            })
            
            if (!Array.isArray(itemsArray)) {
              console.warn('⚠️ ITEMS NÃO É ARRAY! Retornando vazio.')
              return []
            }
            
            return itemsArray.map((item: any) => {
              const processedItem = {
                productId: safeString(item.productId || item.product_id || item.id, ''),
                productName: safeString(item.productName || item.product_name || item.name || item.productname, 'Produto não informado'),
                quantity: safeNumber(item.quantity || item.qty || item.quantidade, 1),
                unitPrice: safeNumber(item.unitPrice || item.unit_price || item.price || item.preco, 0),
                total: safeNumber(item.total || item.totalPrice || item.total_price || (safeNumber(item.quantity, 1) * safeNumber(item.unitPrice || item.price, 0)), 0)
              }
              console.log('📦 ITEM PROCESSADO:', processedItem)
              return processedItem
            })
          })(),
          
          // 🔧 CORREÇÃO: Valores e datas
          total: safeNumber(sale.total || sale.totalValue, 0),
          date: sale.date || sale.createdAt || new Date().toISOString(),
          status: safeString(sale.status, 'Pendente'),
          observations: safeString(sale.observations || sale.notes, ''),
          
          // 💳 CORREÇÃO: Forma de pagamento (necessário para o filtro funcionar)
          paymentMethod: safeString(sale.paymentMethod, '')
        }

        // 🔍 DEBUG: Verificar quantidade total calculada
        const totalItems = calculateTotalItems(processedSale.items)
        console.log(`✅ VENDA PROCESSADA - ID: ${processedSale._id} - Total Itens: ${totalItems}`)
        
        return processedSale
      })

      console.log('✅ VENDAS PROCESSADAS FINAL:', salesData.length, salesData)
      setSales(salesData)
      return salesData
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO AO CARREGAR VENDAS:', error)
      throw error
    }
  }

  // 🔥 FUNÇÃO CRÍTICA: Carregar clientes do MongoDB
  const loadCustomersFromDatabase = async () => {
    try {
      console.log('🔄 CARREGANDO CLIENTES DO MONGODB...')
      const response = await lumi.entities.customers.list({
        sort: { name: 1 }
      })
      
      const customersData = (response.list || []).map((customer: any) => ({
        ...customer,
        id: customer._id || customer.id,
        active: customer.active !== false
      }))

      console.log('✅ CLIENTES CARREGADOS DO MONGODB:', customersData.length)
      setCustomers(customersData)
      return customersData
    } catch (error) {
      console.error('❌ ERRO AO CARREGAR CLIENTES DO MONGODB:', error)
      throw error
    }
  }

  // 🔥 FUNÇÃO CRÍTICA: Carregar produtos do MongoDB
  const loadProductsFromDatabase = async () => {
    try {
      console.log('🔄 CARREGANDO PRODUTOS DO MONGODB...')
      const response = await lumi.entities.products.list({
        sort: { name: 1 }
      })
      
      const productsData = (response.list || []).map((product: any) => ({
        ...product,
        id: product._id || product.id,
        active: product.active !== false,
        price: safeNumber(product.price, 0),
        stock: safeNumber(product.stock, 0)
      }))

      console.log('✅ PRODUTOS CARREGADOS DO MONGODB:', productsData.length)
      setProducts(productsData)
      return productsData
    } catch (error) {
      console.error('❌ ERRO AO CARREGAR PRODUTOS DO MONGODB:', error)
      throw error
    }
  }

  // 🔧 MIGRAÇÃO REMOVIDA: A migração já foi executada anteriormente
  // A função foi removida para melhorar performance no carregamento inicial
  // Todas as novas vendas já são criadas com saleNumber desde a implementação

  // 🔥 FUNÇÃO: Carregar formas de pagamento do MongoDB
  const loadPaymentMethodsFromDatabase = async () => {
    try {
      console.log('🔄 CARREGANDO FORMAS DE PAGAMENTO DO MONGODB...')
      const response = await lumi.entities.payment_methods.list({
        filter: { active: true },
        sort: { order: 1, name: 1 }
      })
      
      const paymentMethodsData = (response.list || []).map((pm: any) => ({
        ...pm,
        id: pm._id || pm.id
      }))

      console.log('✅ FORMAS DE PAGAMENTO CARREGADAS:', paymentMethodsData.length)
      setPaymentMethods(paymentMethodsData)
      return paymentMethodsData
    } catch (error) {
      console.error('❌ ERRO AO CARREGAR FORMAS DE PAGAMENTO:', error)
      return []
    }
  }

  // 📂 CARREGAR DADOS INICIAIS DO MONGODB
  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🚀 INICIANDO CARREGAMENTO DE DADOS DO MONGODB...')

      // Carregar dados em paralelo para melhor performance
      const [salesData, customersData, productsData, paymentMethodsData] = await Promise.all([
        loadSalesFromDatabase(),
        loadCustomersFromDatabase(),
        loadProductsFromDatabase(),
        loadPaymentMethodsFromDatabase()
      ])

      console.log('✅ TODOS OS DADOS CARREGADOS COM SUCESSO:', {
        vendas: salesData.length,
        clientes: customersData.length,
        produtos: productsData.length,
        formasPagamento: paymentMethodsData.length
      })
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO NO CARREGAMENTO:', error)
      setError('Erro ao carregar dados do banco de dados')
      toast.error('Erro ao carregar dados do banco')
    } finally {
      setLoading(false)
    }
  }

  // Carregar dados na inicialização
  useEffect(() => {
    loadInitialData()
  }, [])

  // Filtrar vendas - VERSÃO MELHORADA COM DEBUG, FILTRO DE PERÍODO E ORDENAÇÃO
  useEffect(() => {
    try {
      console.log('🔍 FILTRANDO VENDAS...')
      console.log('📊 Total de vendas brutas:', sales.length)
      
      const activeSales = (sales || []).filter(s => {
        const isActive = s.active !== false
        console.log(`Venda ${s._id}: active=${s.active}, isActive=${isActive}`)
        return isActive
      })
      
      console.log('📊 Vendas ativas:', activeSales.length)
      
      let filtered = activeSales

      // Filtro de período
      if (startDate || endDate) {
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.date)
          const start = startDate ? new Date(startDate) : null
          const end = endDate ? new Date(endDate) : null
          
          if (start && saleDate < start) return false
          if (end && saleDate > end) return false
          return true
        })
        console.log('📊 Vendas após filtro de período:', filtered.length)
      }

      if (searchTerm) {
        console.log('🔍 Aplicando filtro de busca:', searchTerm)
        filtered = filtered.filter(sale => 
          safeString(sale?.customer?.name, '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          safeString(sale?.customer?.phone, '').includes(searchTerm) ||
          safeString(sale?._id, '').includes(searchTerm) ||
          safeString(sale?.id, '').includes(searchTerm)
        )
        console.log('📊 Vendas após filtro de busca:', filtered.length)
      }

      if (statusFilter) {
        console.log('🔍 Aplicando filtro de status:', statusFilter)
        filtered = filtered.filter(sale => safeString(sale?.status, '') === statusFilter)
        console.log('📊 Vendas após filtro de status:', filtered.length)
      }

      // Filtro de forma de pagamento
      if (paymentMethodFilter) {
        console.log('🔍 Aplicando filtro de forma de pagamento:', paymentMethodFilter)
        filtered = filtered.filter(sale => safeString(sale?.paymentMethod, '') === paymentMethodFilter)
        console.log('📊 Vendas após filtro de forma de pagamento:', filtered.length)
      }

      // Aplicar ordenação conforme filtro selecionado
      console.log('🔀 Aplicando ordenação:', sortOrder)
      if (sortOrder === 'date_asc') {
        // Data mais antiga para mais nova
        filtered = [...filtered].sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateA - dateB
        })
      } else if (sortOrder === 'date_desc') {
        // Data mais nova para mais antiga
        filtered = [...filtered].sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA
        })
      } else if (sortOrder === 'em_andamento') {
        // Apenas vendas em andamento
        filtered = filtered.filter(sale => 
          safeString(sale?.status, '').toLowerCase().includes('andamento') ||
          safeString(sale?.status, '') === 'Em Andamento' ||
          safeString(sale?.status, '') === 'Pendente'
        )
      } else if (sortOrder === 'finalizada') {
        // Apenas vendas finalizadas
        filtered = filtered.filter(sale => 
          safeString(sale?.status, '').toLowerCase().includes('conclu') ||
          safeString(sale?.status, '').toLowerCase().includes('finaliz') ||
          safeString(sale?.status, '') === 'Concluída' ||
          safeString(sale?.status, '') === 'Entregue'
        )
      }
      console.log('📊 Vendas após ordenação:', filtered.length)

      console.log('✅ VENDAS FILTRADAS FINAL:', filtered.length, filtered)
      setFilteredSales(filtered)
    } catch (error) {
      console.error('❌ ERRO AO FILTRAR VENDAS:', error)
      setFilteredSales([])
    }
  }, [sales, searchTerm, statusFilter, startDate, endDate, sortOrder, paymentMethodFilter])

  // Filtrar clientes
  useEffect(() => {
    try {
      const activeCustomers = (customers || []).filter(c => c.active !== false)
      let filtered = activeCustomers

      if (customerSearchTerm) {
        filtered = filtered.filter(customer => 
          safeString(customer?.name, '').toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
          safeString(customer?.phone, '').includes(customerSearchTerm) ||
          safeString(customer?.cpfCnpj, '').includes(customerSearchTerm) ||
          safeString(customer?.email, '').toLowerCase().includes(customerSearchTerm.toLowerCase())
        )
      }

      setFilteredCustomers(filtered)
    } catch (error) {
      console.error('❌ ERRO AO FILTRAR CLIENTES:', error)
      setFilteredCustomers([])
    }
  }, [customers, customerSearchTerm])

  // Filtrar produtos
  useEffect(() => {
    try {
      console.log('🔍 FILTRANDO PRODUTOS')
      console.log('📦 Total de produtos:', products.length)
      console.log('🔍 Termo de busca:', productSearchTerm)

      if (!Array.isArray(products)) {
        console.warn('⚠️ PRODUTOS NÃO É UM ARRAY:', products)
        setFilteredProducts([])
        return
      }

      // Produtos ativos com estoque
      const activeProducts = products.filter(product => {
        if (!product) return false
        const isActive = product.active !== false
        const hasStock = safeNumber(product.stock, 0) > 0
        return isActive && hasStock
      })

      console.log('✅ Produtos ativos com estoque:', activeProducts.length)

      let filtered = activeProducts

      if (productSearchTerm && productSearchTerm.trim()) {
        const searchLower = productSearchTerm.toLowerCase().trim()
        filtered = activeProducts.filter(product => {
          if (!product) return false
          
          const name = safeString(product.name, '').toLowerCase()
          const code = safeString(product.code, '').toLowerCase()
          const category = safeString(product.category, '').toLowerCase()
          const description = safeString(product.description, '').toLowerCase()
          
          return name.includes(searchLower) ||
                 code.includes(searchLower) ||
                 category.includes(searchLower) ||
                 description.includes(searchLower)
        })
      }

      console.log('🎯 Produtos filtrados final:', filtered.length)
      setFilteredProducts(filtered)
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO AO FILTRAR PRODUTOS:', error)
      setFilteredProducts([])
    }
  }, [products, productSearchTerm])

  // 🔥 FUNÇÃO CRÍTICA: ABRIR MODAL DE PRODUTOS
  const handleOpenProductModal = () => {
    console.log('🚀 ABRINDO MODAL DE PRODUTOS')
    
    try {
      setSelectedProduct(null)
      setProductQuantity(1)
      setProductSearchTerm('')
      setProductModalLoading(true)
      
      console.log('📊 Estado antes de abrir modal:', {
        totalProdutos: products.length,
        produtosAtivos: products.filter(p => p && p.active !== false).length,
        produtosComEstoque: products.filter(p => p && p.active !== false && safeNumber(p.stock, 0) > 0).length
      })

      setShowProductModal(true)
      
      setTimeout(() => {
        setProductModalLoading(false)
        console.log('✅ MODAL DE PRODUTOS CARREGADO COM SUCESSO')
      }, 300)
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO AO ABRIR MODAL DE PRODUTOS:', error)
      setProductModalLoading(false)
      setShowProductModal(false)
      toast.error('Erro ao abrir seleção de produtos')
    }
  }

  // FECHAR MODAL DE PRODUTOS
  const handleCloseProductModal = () => {
    console.log('❌ FECHANDO MODAL DE PRODUTOS')
    setShowProductModal(false)
    setSelectedProduct(null)
    setProductQuantity(1)
    setProductSearchTerm('')
    setProductModalLoading(false)
  }

  // SELECIONAR PRODUTO
  const handleSelectProduct = (product: Product) => {
    console.log('✅ PRODUTO SELECIONADO:', product?.name || 'PRODUTO INVÁLIDO')
    if (!product) {
      console.error('❌ PRODUTO INVÁLIDO SELECIONADO')
      return
    }
    setSelectedProduct(product)
    setProductQuantity(1)
  }

  // ALTERAR QUANTIDADE
  const handleChangeQuantity = (change: number) => {
    if (!selectedProduct) return
    
    const currentStock = safeNumber(selectedProduct.stock, 0)
    const newQuantity = Math.max(1, Math.min(currentStock, productQuantity + change))
    
    setProductQuantity(newQuantity)
    
    console.log('📊 QUANTIDADE ALTERADA:', {
      produto: selectedProduct.name,
      quantidadeNova: newQuantity,
      estoque: currentStock
    })
  }

  // CONFIRMAR ADIÇÃO DE PRODUTO
  const handleConfirmAddProduct = () => {
    console.log('🎯 CONFIRMANDO ADIÇÃO DE PRODUTO')
    
    if (!selectedProduct) {
      toast.error('Selecione um produto primeiro!')
      return
    }

    if (productQuantity <= 0) {
      toast.error('Quantidade deve ser maior que zero!')
      return
    }

    const productStock = safeNumber(selectedProduct.stock, 0)
    if (productQuantity > productStock) {
      toast.error(`Estoque insuficiente! Disponível: ${productStock}`)
      return
    }

    // Se estiver editando, usar função de edição
    if (showEditSaleModal && editingSale) {
      handleAddProductToEdit()
      return
    }

    // Verificar se produto já existe na lista (nova venda)
    const existingIndex = newSale.items.findIndex(item => item.productId === (selectedProduct._id || selectedProduct.id))
    
    if (existingIndex >= 0) {
      // Produto já existe - mostrar modal de confirmação
      setPendingProductToAdd({ product: selectedProduct, quantity: productQuantity })
      setShowDuplicateProductModal(true)
    } else {
      // Produto novo - adicionar direto
      addProductToSale(selectedProduct, productQuantity, false)
    }
  }

  // ADICIONAR PRODUTO À VENDA (com opção de adicionar separado ou somar)
  const addProductToSale = (product: Product, quantity: number, addSeparately: boolean) => {
    try {
      const productPrice = safeNumber(product.price, 0)
      const itemTotal = quantity * productPrice
      const productStock = safeNumber(product.stock, 0)

      // Verificar se produto já existe na lista
      const existingIndex = newSale.items.findIndex(item => item.productId === (product._id || product.id))
      
      let updatedItems: NewSaleItem[]
      
      if (existingIndex >= 0 && !addSeparately) {
        // Atualizar produto existente (somar quantidade)
        const existingItem = newSale.items[existingIndex]
        const newQuantityTotal = safeNumber(existingItem.quantity, 0) + quantity
        
        if (newQuantityTotal > productStock) {
          toast.error(`Estoque insuficiente! Máximo: ${productStock}`)
          return
        }
        
        updatedItems = [...newSale.items]
        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: newQuantityTotal,
          total: newQuantityTotal * productPrice
        }
        
        console.log('📦 PRODUTO ATUALIZADO (SOMADO):', {
          produto: product.name,
          quantidadeNova: newQuantityTotal
        })
        toast.success(`Quantidade de "${product.name}" atualizada!`)
      } else {
        // Adicionar novo produto (separadamente ou primeira vez)
        const newItem: NewSaleItem = {
          productId: product._id || product.id || '',
          productName: product.name,
          quantity: quantity,
          unitPrice: productPrice,
          total: itemTotal
        }
        
        updatedItems = [...newSale.items, newItem]
        
        console.log('🆕 NOVO PRODUTO ADICIONADO (SEPARADO):', {
          produto: product.name,
          quantidade: quantity,
          total: itemTotal
        })
        toast.success(`Produto "${product.name}" adicionado separadamente!`)
      }

      // Calcular novo total
      const newTotal = updatedItems.reduce((sum, item) => sum + safeNumber(item.total, 0), 0)

      // Atualizar venda
      setNewSale({
        ...newSale,
        items: updatedItems,
        total: newTotal
      })

      // Fechar modals
      handleCloseProductModal()
      setShowDuplicateProductModal(false)
      setPendingProductToAdd(null)
      
    } catch (error) {
      console.error('❌ ERRO AO ADICIONAR PRODUTO:', error)
      toast.error('Erro ao adicionar produto. Tente novamente.')
    }
  }

  // REMOVER PRODUTO DA VENDA (por índice, para permitir múltiplos do mesmo produto)
  const handleRemoveProductFromSale = (index: number) => {
    const updatedItems = newSale.items.filter((_, i) => i !== index)
    const newTotal = updatedItems.reduce((sum, item) => sum + safeNumber(item.total, 0), 0)
    
    setNewSale({
      ...newSale,
      items: updatedItems,
      total: newTotal
    })
    
    toast.success('Produto removido da venda')
  }

  // ALTERAR QUANTIDADE NA VENDA (por índice, respeitando estoque do banco)
  const handleChangeProductQuantityInSale = (index: number, change: number) => {
    const updatedItems = newSale.items.map((item, i) => {
      if (i === index) {
        const product = products.find(p => (p._id || p.id) === item.productId)
        const maxStock = safeNumber(product?.stock, 0)
        const currentQuantity = safeNumber(item.quantity, 1)
        const newQuantity = Math.max(1, Math.min(maxStock, currentQuantity + change))
        
        // Mostrar alerta se atingir limite de estoque
        if (change > 0 && newQuantity === maxStock && currentQuantity === maxStock) {
          toast.error(`Estoque máximo atingido! Disponível: ${maxStock}`)
        }
        
        console.log(`📊 Alterando quantidade de "${item.productName}": ${currentQuantity} -> ${newQuantity} (Estoque: ${maxStock})`)
        
        return {
          ...item,
          quantity: newQuantity,
          total: newQuantity * safeNumber(item.unitPrice, 0)
        }
      }
      return item
    })
    
    const newTotal = updatedItems.reduce((sum, item) => sum + safeNumber(item.total, 0), 0)
    
    setNewSale({
      ...newSale,
      items: updatedItems,
      total: newTotal
    })
  }

  // ✏️ ABRIR MODAL DE EDIÇÃO DE VENDA
  const handleOpenEditSale = (sale: Sale) => {
    console.log('✏️ ABRINDO EDIÇÃO DA VENDA:', sale._id)
    setEditingSale({
      ...sale,
      date: sale.date.split('T')[0] // Converter para formato de input date
    })
    setShowEditSaleModal(true)
  }

  // 💾 SALVAR EDIÇÃO DA VENDA NO MONGODB
  const handleSaveEditSale = async () => {
    if (!editingSale) return

    if (!editingSale.customer.name.trim()) {
      toast.error('Nome do cliente é obrigatório!')
      return
    }
    
    if (!editingSale.customer.phone.trim()) {
      toast.error('Telefone do cliente é obrigatório!')
      return
    }
    
    if (editingSale.items.length === 0) {
      toast.error('A venda deve ter pelo menos um produto!')
      return
    }

    try {
      const updatedSaleData = {
        customer: editingSale.customer,
        items: editingSale.items,
        total: safeNumber(editingSale.total, 0),
        date: new Date(editingSale.date).toISOString(),
        status: editingSale.status,
        observations: editingSale.observations,
        paymentMethod: editingSale.paymentMethod,
        saleNumber: editingSale.saleNumber, // Manter número original
        active: true
      }

      console.log('💾 ATUALIZANDO VENDA NO MONGODB:', updatedSaleData)
      
      await lumi.entities.sales.update(editingSale._id || editingSale.id || '', updatedSaleData)
      
      // Recarregar vendas
      await loadSalesFromDatabase()
      
      toast.success('Venda atualizada com sucesso!')
      console.log('✅ VENDA ATUALIZADA NO MONGODB:', editingSale._id)
      
      setShowEditSaleModal(false)
      setEditingSale(null)
      
    } catch (error) {
      console.error('❌ ERRO AO ATUALIZAR VENDA:', error)
      toast.error('Erro ao atualizar venda no banco de dados')
    }
  }

  // ADICIONAR PRODUTO À VENDA EM EDIÇÃO
  const handleAddProductToEdit = () => {
    if (!selectedProduct || !editingSale) {
      toast.error('Selecione um produto primeiro!')
      return
    }

    if (productQuantity <= 0) {
      toast.error('Quantidade deve ser maior que zero!')
      return
    }

    const productStock = safeNumber(selectedProduct.stock, 0)
    if (productQuantity > productStock) {
      toast.error(`Estoque insuficiente! Disponível: ${productStock}`)
      return
    }

    // Verificar se produto já existe
    const existingIndex = editingSale.items.findIndex(item => item.productId === (selectedProduct._id || selectedProduct.id))
    
    if (existingIndex >= 0) {
      // Mostrar modal de confirmação
      setPendingProductToAdd({ product: selectedProduct, quantity: productQuantity })
      setShowDuplicateProductModal(true)
    } else {
      // Adicionar novo produto
      addProductToEdit(selectedProduct, productQuantity, false)
    }
  }

  // ADICIONAR PRODUTO À EDIÇÃO (com opção de adicionar separado ou somar)
  const addProductToEdit = (product: Product, quantity: number, addSeparately: boolean) => {
    if (!editingSale) return

    try {
      const productPrice = safeNumber(product.price, 0)
      const itemTotal = quantity * productPrice
      const productStock = safeNumber(product.stock, 0)

      const existingIndex = editingSale.items.findIndex(item => item.productId === (product._id || product.id))
      
      let updatedItems: any[]
      
      if (existingIndex >= 0 && !addSeparately) {
        // Somar quantidade
        const existingItem = editingSale.items[existingIndex]
        const newQuantityTotal = safeNumber(existingItem.quantity, 0) + quantity
        
        if (newQuantityTotal > productStock) {
          toast.error(`Estoque insuficiente! Máximo: ${productStock}`)
          return
        }
        
        updatedItems = [...editingSale.items]
        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: newQuantityTotal,
          total: newQuantityTotal * productPrice
        }
        
        toast.success(`Quantidade de "${product.name}" atualizada!`)
      } else {
        // Adicionar separadamente
        const newItem = {
          productId: product._id || product.id || '',
          productName: product.name,
          quantity: quantity,
          unitPrice: productPrice,
          total: itemTotal
        }
        
        updatedItems = [...editingSale.items, newItem]
        toast.success(`Produto "${product.name}" adicionado!`)
      }

      const newTotal = updatedItems.reduce((sum, item) => sum + safeNumber(item.total, 0), 0)

      setEditingSale({
        ...editingSale,
        items: updatedItems,
        total: newTotal
      })

      handleCloseProductModal()
      setShowDuplicateProductModal(false)
      setPendingProductToAdd(null)
      
    } catch (error) {
      console.error('❌ ERRO AO ADICIONAR PRODUTO:', error)
      toast.error('Erro ao adicionar produto')
    }
  }

  // REMOVER PRODUTO DA EDIÇÃO
  const handleRemoveProductFromEdit = (index: number) => {
    if (!editingSale) return

    const updatedItems = editingSale.items.filter((_, i) => i !== index)
    const newTotal = updatedItems.reduce((sum, item) => sum + safeNumber(item.total, 0), 0)
    
    setEditingSale({
      ...editingSale,
      items: updatedItems,
      total: newTotal
    })
    
    toast.success('Produto removido')
  }

  // ALTERAR QUANTIDADE NA EDIÇÃO
  const handleChangeProductQuantityInEdit = (index: number, change: number) => {
    if (!editingSale) return

    const updatedItems = editingSale.items.map((item, i) => {
      if (i === index) {
        const product = products.find(p => (p._id || p.id) === item.productId)
        const maxStock = safeNumber(product?.stock, 0)
        const currentQuantity = safeNumber(item.quantity, 1)
        const newQuantity = Math.max(1, Math.min(maxStock, currentQuantity + change))
        
        if (change > 0 && newQuantity === maxStock && currentQuantity === maxStock) {
          toast.error(`Estoque máximo atingido! Disponível: ${maxStock}`)
        }
        
        return {
          ...item,
          quantity: newQuantity,
          total: newQuantity * safeNumber(item.unitPrice, 0)
        }
      }
      return item
    })
    
    const newTotal = updatedItems.reduce((sum, item) => sum + safeNumber(item.total, 0), 0)
    
    setEditingSale({
      ...editingSale,
      items: updatedItems,
      total: newTotal
    })
  }

  // 🗑️ EXCLUIR VENDA DO MONGODB
  const handleDeleteSale = async (saleId: string) => {
    const saleToDelete = sales.find(s => (s._id || s.id) === saleId)
    if (!saleToDelete) {
      toast.error('Venda não encontrada!')
      return
    }

    const confirmMessage = `⚠️ EXCLUIR VENDA?\n\nVenda #${saleId}\nCliente: ${saleToDelete.customer.name}\nTotal: R$ ${safeFormatCurrency(saleToDelete.total)}`
    
    if (window.confirm(confirmMessage)) {
      try {
        await lumi.entities.sales.delete(saleId)
        
        // Atualizar lista local
        const updatedSales = sales.filter(s => (s._id || s.id) !== saleId)
        setSales(updatedSales)
        
        toast.success('Venda excluída com sucesso!')
        console.log('✅ VENDA EXCLUÍDA DO MONGODB:', saleId)
      } catch (error) {
        console.error('❌ ERRO AO EXCLUIR VENDA:', error)
        toast.error('Erro ao excluir venda do banco de dados')
      }
    }
  }

  // 💾 SALVAR NOVA VENDA NO MONGODB
  const handleSaveNewSale = async () => {
    if (!newSale.customer.name.trim()) {
      toast.error('Nome do cliente é obrigatório!')
      return
    }
    
    if (!newSale.customer.phone.trim()) {
      toast.error('Telefone do cliente é obrigatório!')
      return
    }
    
    if (newSale.items.length === 0) {
      toast.error('Adicionar pelo menos um produto!')
      return
    }

    try {
      // 🔢 OBTER PRÓXIMO NÚMERO SEQUENCIAL
      const nextNumber = await getNextSaleNumber()
      console.log(`🆕 Próximo número de venda: ${nextNumber}`)
      
      const newSaleData = {
        customer: newSale.customer,
        items: newSale.items,
        total: safeNumber(newSale.total, 0),
        date: new Date(newSale.date).toISOString(), // Usar data selecionada pelo usuário
        status: 'Pendente',
        observations: newSale.observations,
        saleNumber: nextNumber, // 🔥 SALVAR NÚMERO PERMANENTE
        active: true
      }

      console.log('💾 SALVANDO NOVA VENDA NO MONGODB:', newSaleData)
      
      const createdSale = await lumi.entities.sales.create(newSaleData)
      
      // Recarregar todas as vendas para garantir ordenação correta
      await loadSalesFromDatabase()
      
      toast.success(`Venda #${String(nextNumber).padStart(4, '0')} registrada com sucesso!`)
      console.log('✅ VENDA SALVA NO MONGODB:', createdSale._id)
      
      setShowNewSaleModal(false)
      setNewSale({
        customer: { name: '', phone: '', email: '', address: '' },
        items: [],
        total: 0,
        date: new Date().toISOString().split('T')[0],
        observations: ''
      })
      
    } catch (error) {
      console.error('❌ ERRO AO SALVAR VENDA:', error)
      toast.error('Erro ao salvar venda no banco de dados')
    }
  }

  // Outras funções auxiliares
  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale)
    setShowDetails(true)
  }

  const handleGeneratePDF = (sale: Sale) => {
    console.log('🖨️ ========== GERANDO PDF ==========')
    console.log('🖨️ VENDA SELECIONADA (COMPLETA):', JSON.stringify(sale, null, 2))
    console.log('🖨️ CLIENTE:', sale.customer)
    console.log('🖨️ ITENS:', sale.items)
    console.log('🖨️ QUANTIDADE DE ITENS:', sale.items?.length || 0)
    console.log('🖨️ TOTAL:', sale.total)
    console.log('🖨️ TODAS AS CHAVES:', Object.keys(sale))
    
    // 🔥 VERIFICAÇÃO CRÍTICA: Se items estiver vazio, tentar recarregar do estado
    if (!sale.items || sale.items.length === 0) {
      console.error('❌ ITEMS VAZIO! Tentando recarregar venda do estado...')
      const fullSale = sales.find(s => (s._id || s.id) === (sale._id || sale.id))
      
      if (fullSale && fullSale.items && fullSale.items.length > 0) {
        console.log('✅ VENDA COMPLETA ENCONTRADA NO ESTADO:', fullSale)
        console.log('✅ ITEMS RECUPERADOS:', fullSale.items)
        
        // Usar número salvo no banco ou calcular como fallback
        const saleNumber = fullSale.saleNumber 
          ? String(fullSale.saleNumber).padStart(4, '0')
          : generateSaleNumberFromIndex(sales.findIndex(s => (s._id || s.id) === (fullSale._id || fullSale.id)))
        
        console.log(`📊 NÚMERO DA VENDA: ${saleNumber} (do banco: ${fullSale.saleNumber || 'não encontrado'})`)
        
        // Adicionar número da venda ao objeto
        const saleWithNumber = { ...fullSale, saleNumber }
        generateSalePDF(saleWithNumber, customers)
        return
      } else {
        console.error('❌ VENDA NÃO ENCONTRADA NO ESTADO OU AINDA SEM ITEMS!')
        alert('⚠️ ERRO: Não foi possível carregar os produtos desta venda. Tente recarregar a página.')
        return
      }
    }
    
    // Usar número salvo no banco ou calcular como fallback
    const saleNumber = sale.saleNumber 
      ? String(sale.saleNumber).padStart(4, '0')
      : generateSaleNumberFromIndex(sales.findIndex(s => (s._id || s.id) === (sale._id || sale.id)))
    
    console.log(`📊 NÚMERO DA VENDA: ${saleNumber} (do banco: ${sale.saleNumber || 'não encontrado'})`)
    console.log('🖨️ ==================================')
    
    // Adicionar número da venda ao objeto antes de gerar o PDF
    const saleWithNumber = { ...sale, saleNumber }
    generateSalePDF(saleWithNumber, customers)
  }

  const handleGenerateImage = (sale: Sale) => {
    console.log('🖼️ ========== GERANDO IMAGEM JPG ==========')
    
    // 🔥 VERIFICAÇÃO CRÍTICA: Se items estiver vazio, tentar recarregar do estado
    if (!sale.items || sale.items.length === 0) {
      console.error('❌ ITEMS VAZIO! Tentando recarregar venda do estado...')
      const fullSale = sales.find(s => (s._id || s.id) === (sale._id || sale.id))
      
      if (fullSale && fullSale.items && fullSale.items.length > 0) {
        console.log('✅ VENDA COMPLETA ENCONTRADA NO ESTADO:', fullSale)
        const saleNumber = fullSale.saleNumber 
          ? String(fullSale.saleNumber).padStart(4, '0')
          : generateSaleNumberFromIndex(sales.findIndex(s => (s._id || s.id) === (fullSale._id || fullSale.id)))
        
        const saleWithNumber = { ...fullSale, saleNumber }
        generateSaleImage(saleWithNumber, customers)
        return
      } else {
        console.error('❌ VENDA NÃO ENCONTRADA NO ESTADO OU AINDA SEM ITEMS!')
        alert('⚠️ ERRO: Não foi possível carregar os produtos desta venda. Tente recarregar a página.')
        return
      }
    }
    
    const saleNumber = sale.saleNumber 
      ? String(sale.saleNumber).padStart(4, '0')
      : generateSaleNumberFromIndex(sales.findIndex(s => (s._id || s.id) === (sale._id || sale.id)))
    
    console.log(`📊 NÚMERO DA VENDA: ${saleNumber}`)
    
    const saleWithNumber = { ...sale, saleNumber }
    generateSaleImage(saleWithNumber, customers)
  }

  const handleOpenCustomerSelector = () => {
    setShowCustomerSelector(true)
    setCustomerSearchTerm('')
    setSelectedCustomer(null)
  }

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
  }

  const handleConfirmCustomerSelection = () => {
    if (selectedCustomer) {
      setNewSale({
        customer: {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          email: selectedCustomer.email || '',
          address: selectedCustomer.address
        },
        items: [],
        total: 0,
        date: new Date().toISOString().split('T')[0],
        observations: ''
      })
      
      setShowCustomerSelector(false)
      setSelectedCustomer(null)
      setShowNewSaleModal(true)
    }
  }

  const handleOpenNewSale = () => {
    setNewSale({
      customer: { name: '', phone: '', email: '', address: '' },
      items: [],
      total: 0,
      date: new Date().toISOString().split('T')[0],
      observations: ''
    })
    setShowNewSaleModal(true)
  }

  const handleCloseNewSale = () => {
    setShowNewSaleModal(false)
    setNewSale({
      customer: { name: '', phone: '', email: '', address: '' },
      items: [],
      total: 0,
      date: new Date().toISOString().split('T')[0],
      observations: ''
    })
  }

  const handleReload = async () => {
    if (window.confirm('⚠️ RECARREGAR DADOS DO BANCO?\n\nTodos os dados serão recarregados do MongoDB!')) {
      await loadInitialData()
      toast.success('Dados recarregados do banco!')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluída': return 'bg-green-100 text-green-800'
      case 'Em Andamento': return 'bg-yellow-100 text-yellow-800'
      case 'Pendente': return 'bg-orange-100 text-orange-800'
      case 'Cancelada': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Estatísticas - CORREÇÃO CRÍTICA: Contagem correta de produtos ativos
  const activeSales = (sales || []).filter(s => s.active !== false)
  const activeCustomers = (customers || []).filter(c => c.active !== false)
  const activeProducts = (products || []).filter(p => p && p.active !== false)
  const stats = {
    total: activeSales.length,
    concluidas: activeSales.filter(s => s.status === 'Concluída').length,
    pendentes: activeSales.filter(s => s.status === 'Pendente').length,
    totalValue: activeSales.reduce((sum, sale) => sum + safeNumber(sale.total, 0), 0),
    totalCustomers: activeCustomers.length,
    totalProducts: activeProducts.length
  }

  if (loading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando vendas do banco de dados...</p>
            <p className="text-gray-500 text-sm mt-2">Conectando ao MongoDB...</p>
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

  // 🔥 DEBUG: MOSTRAR INFORMAÇÕES DE VENDAS NA INTERFACE
  console.log('🖥️ RENDERIZANDO INTERFACE - ESTADO ATUAL:', {
    totalVendas: sales.length,
    vendasFiltradas: filteredSales.length,
    loading,
    error
  })

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          Gestão de Vendas
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Sistema de vendas integrado com banco de dados MongoDB
        </p>
      </div>

      {/* 🔥 DEBUG: PAINEL DE INFORMAÇÕES DE VENDAS */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-blue-600" />
          <div>
            <p className="text-blue-800 font-medium">
              🔍 Debug - Estado das Vendas
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
              <div className="text-blue-700">
                <strong>Total Carregadas:</strong> {sales.length}
              </div>
              <div className="text-blue-700">
                <strong>Vendas Ativas:</strong> {activeSales.length}
              </div>
              <div className="text-blue-700">
                <strong>Filtradas:</strong> {filteredSales.length}
              </div>
              <div className="text-blue-700">
                <strong>Busca/Status:</strong> "{searchTerm}" / "{statusFilter}"
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status do Sistema */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-indigo-600" />
            <div>
              <p className="text-indigo-800 font-medium">
                🗄️ MongoDB Conectado
              </p>
              <p className="text-indigo-600 text-sm">
                {stats.total} vendas • {stats.concluidas} concluídas • {stats.pendentes} pendentes • Valor: R$ {safeFormatCurrency(stats.totalValue)}
              </p>
              <p className="text-indigo-500 text-xs">
                {stats.totalCustomers} clientes • {stats.totalProducts} produtos cadastrados
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleReload}
              className="flex items-center space-x-1 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recarregar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{stats.total}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Vendas Concluídas</p>
              <h3 className="text-xl sm:text-2xl font-bold text-green-600">{stats.concluidas}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
              <h3 className="text-xl sm:text-2xl font-bold text-purple-600">{stats.totalCustomers}</h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <User className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Produtos Ativos</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{stats.totalProducts}</h3>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Ações Principais */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                Vendas Registradas
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Exibindo: {filteredSales.length} de {stats.total} vendas do banco
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleOpenNewSale}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Venda</span>
            </button>
            
            <button
              onClick={handleOpenCustomerSelector}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              <span>Selecionar Cliente</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Buscar por cliente, telefone ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>

          <div className="w-full sm:w-56 relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base appearance-none bg-white"
            >
              <option value="date_asc">📅 Mais Antiga → Mais Nova</option>
              <option value="date_desc">📅 Mais Nova → Mais Antiga</option>
              <option value="em_andamento">⏳ Em Andamento</option>
              <option value="finalizada">✅ Finalizada</option>
            </select>
          </div>

          <div className="w-full sm:w-56 relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base appearance-none bg-white"
            >
              <option value="">💳 Todas as Formas de Pagamento</option>
              {paymentMethods.map((pm) => (
                <option key={pm._id || pm.id} value={pm.value}>
                  {pm.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros de Período */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Data Inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Data Final</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Vendas */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
        {filteredSales.length > 0 ? (
          <>
            {/* MOBILE: Cards */}
            <div className="block lg:hidden space-y-4">
              {filteredSales.map((sale, index) => {
                const totalItems = calculateTotalItems(sale.items)
                const productTypes = calculateProductTypes(sale.items)
                
                console.log(`🔍 MOBILE CARD - Venda ${sale._id}: ${totalItems} itens, ${productTypes} tipos`)
                
                return (
                  <div key={sale._id || sale.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                            #{sale.saleNumber ? String(sale.saleNumber).padStart(4, '0') : generateSaleNumberFromIndex(index)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(sale.status)}`}>
                            {sale.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-1">
                          {safeString(sale?.customer?.name, 'Cliente não informado')}
                        </h3>
                        <div className="flex items-center text-xs text-gray-600 mb-2">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{safeDate(sale.date)}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-1 ml-3 flex-shrink-0">
                        <button
                          onClick={() => handleViewDetails(sale)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditSale(sale)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar venda"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleGeneratePDF(sale)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Baixar PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleGenerateImage(sale)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Baixar JPG"
                        >
                          <Image className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale._id || sale.id || '')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Qtd. Produtos</p>
                        <p className="text-sm font-medium text-gray-800">
                          {totalItems} unidades
                        </p>
                        <p className="text-xs text-gray-500">
                          {productTypes} tipo(s)
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="text-sm font-bold text-green-600">
                          R$ {safeFormatCurrency(sale.total)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center text-sm text-gray-700">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="truncate">{safeString(sale?.customer?.phone, 'Telefone não informado')}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* DESKTOP: Tabela */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Nº Venda</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Data</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Qtd. Produtos</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale, index) => {
                      const totalItems = calculateTotalItems(sale.items)
                      const productTypes = calculateProductTypes(sale.items)
                      
                      console.log(`🔍 DESKTOP ROW - Venda ${sale._id}: ${totalItems} itens, ${productTypes} tipos`)
                      
                      return (
                        <tr key={sale._id || sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                              #{sale.saleNumber ? String(sale.saleNumber).padStart(4, '0') : generateSaleNumberFromIndex(index)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="text-sm font-medium text-gray-800">
                                {safeString(sale?.customer?.name, 'Cliente não informado')}
                              </div>
                              <div className="text-xs text-gray-600">
                                {safeString(sale?.customer?.phone, 'Telefone não informado')}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">
                              {safeDate(sale.date)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-800">
                                {totalItems} unidades
                              </div>
                              <div className="text-xs text-gray-600">
                                {productTypes} tipo(s)
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-semibold text-green-600">
                              R$ {safeFormatCurrency(sale.total)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                              {sale.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewDetails(sale)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditSale(sale)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar venda"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleGeneratePDF(sale)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Baixar PDF"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleGenerateImage(sale)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Baixar JPG"
                              >
                                <Image className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSale(sale._id || sale.id || '')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {sales.length === 0 ? 'Nenhuma venda registrada' : 'Nenhuma venda encontrada'}
            </h3>
            <p className="text-sm text-gray-500">
              {sales.length === 0 
                ? 'Registre a primeira venda para começar'
                : searchTerm || statusFilter 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'As vendas do banco de dados aparecerão aqui'
              }
            </p>
            {sales.length === 0 && (
              <button
                onClick={handleOpenNewSale}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Registrar Primeira Venda
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Nova Venda */}
      {showNewSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Nova Venda</h3>
                  <p className="text-sm text-gray-600 mt-1">Registrar nova venda no banco de dados</p>
                </div>
                <button
                  onClick={handleCloseNewSale}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh]">
              {/* Dados do Cliente */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Dados do Cliente
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={newSale.customer.name}
                      onChange={(e) => setNewSale({
                        ...newSale,
                        customer: { ...newSale.customer, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="Nome completo do cliente"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                    <input
                      type="tel"
                      value={newSale.customer.phone}
                      onChange={(e) => setNewSale({
                        ...newSale,
                        customer: { ...newSale.customer, phone: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="(XX) XXXXX-XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newSale.customer.email}
                      onChange={(e) => setNewSale({
                        ...newSale,
                        customer: { ...newSale.customer, email: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={newSale.customer.address}
                      onChange={(e) => setNewSale({
                        ...newSale,
                        customer: { ...newSale.customer, address: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="Endereço completo"
                    />
                  </div>
                </div>
              </div>

              {/* Data da Venda */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Data da Venda
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input
                    type="date"
                    value={newSale.date}
                    onChange={(e) => setNewSale({
                      ...newSale,
                      date: e.target.value
                    })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="Selecione a data da venda"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Você pode selecionar uma data anterior para registrar vendas passadas
                  </p>
                </div>
              </div>

              {/* Produtos */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    Produtos ({newSale.items.length})
                  </h4>
                  <button
                    onClick={handleOpenProductModal}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Produto</span>
                  </button>
                </div>

                {newSale.items.length > 0 ? (
                  <div className="space-y-3">
                    {newSale.items.map((item, index) => {
                      const product = products.find(p => (p._id || p.id) === item.productId)
                      const maxStock = safeNumber(product?.stock, 0)
                      const isAtMaxStock = item.quantity >= maxStock
                      
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-gray-800">{item.productName}</h5>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-gray-600">
                                  R$ {safeToFixed(item.unitPrice)} cada
                                </span>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleChangeProductQuantityInSale(index, -1)}
                                    disabled={item.quantity <= 1}
                                    className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                                      item.quantity <= 1 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                    }`}
                                    title={item.quantity <= 1 ? 'Quantidade mínima atingida' : 'Diminuir quantidade'}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="text-sm font-bold w-10 text-center bg-gray-50 py-1 rounded border border-gray-200">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleChangeProductQuantityInSale(index, 1)}
                                    disabled={isAtMaxStock}
                                    className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                                      isAtMaxStock 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                                    }`}
                                    title={isAtMaxStock ? `Estoque máximo: ${maxStock}` : 'Aumentar quantidade'}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                                <span className={`text-xs ${isAtMaxStock ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                                  Estoque: {maxStock}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-semibold text-green-600">
                                R$ {safeToFixed(item.total)}
                              </span>
                              <button
                                onClick={() => handleRemoveProductFromSale(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover produto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Nenhum produto adicionado</p>
                    <p className="text-xs text-gray-500">Clique em "Adicionar Produto" para começar</p>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-800">Total da Venda:</span>
                  <span className="text-2xl font-bold text-green-600">
                    R$ {safeFormatCurrency(newSale.total)}
                  </span>
                </div>
              </div>

              {/* Observações */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  value={newSale.observations}
                  onChange={(e) => setNewSale({ ...newSale, observations: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="Observações sobre a venda (opcional)"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 sm:p-6 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={handleCloseNewSale}
                  className="w-full sm:w-auto bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNewSale}
                  className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium"
                >
                  Salvar no Banco
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Produtos */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                    🛒 Selecionar Produto
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Escolha um produto do banco para adicionar à venda
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {filteredProducts.length} produtos disponíveis
                  </p>
                </div>
                <button
                  onClick={handleCloseProductModal}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 sm:px-6 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, código ou categoria..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {productModalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Carregando produtos do banco...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="max-h-[50vh] overflow-y-auto mb-6">
                    {filteredProducts.length > 0 ? (
                      <div className="space-y-3">
                        {filteredProducts.map((product) => (
                          <div
                            key={product._id || product.id}
                            onClick={() => handleSelectProduct(product)}
                            className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                              selectedProduct?._id === product._id || selectedProduct?.id === product.id
                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h4 className="text-sm font-semibold text-gray-800 truncate">
                                    {safeString(product.name, 'Produto sem nome')}
                                  </h4>
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                    {safeString(product.code, 'S/C')}
                                  </span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    {safeString(product.category, 'S/Cat')}
                                  </span>
                                </div>

                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                  {safeString(product.description, 'Sem descrição')}
                                </p>

                                <div className="flex items-center space-x-4 text-sm">
                                  <div className="flex items-center text-green-600">
                                    <DollarSign className="w-4 h-4 mr-1" />
                                    <span className="font-semibold">
                                      R$ {safeToFixed(product.price)}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-gray-600">
                                    <Package className="w-4 h-4 mr-1" />
                                    <span>Estoque: {safeNumber(product.stock, 0)}</span>
                                  </div>
                                </div>
                              </div>

                              {(selectedProduct?._id === product._id || selectedProduct?.id === product.id) && (
                                <div className="ml-3 flex-shrink-0">
                                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">
                          Nenhum produto encontrado
                        </h3>
                        <p className="text-sm text-gray-500">
                          {productSearchTerm ? 'Tente ajustar o termo de busca' : 'Não há produtos disponíveis no estoque'}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedProduct && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">
                        Produto Selecionado: {selectedProduct.name}
                      </h4>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantidade
                          </label>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleChangeQuantity(-1)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded text-gray-600 hover:bg-gray-300 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={safeNumber(selectedProduct.stock, 0)}
                              value={productQuantity}
                              onChange={(e) => setProductQuantity(Math.max(1, Math.min(safeNumber(selectedProduct.stock, 0), parseInt(e.target.value) || 1)))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            />
                            <button
                              onClick={() => handleChangeQuantity(1)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded text-gray-600 hover:bg-gray-300 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-gray-600 ml-2">
                              de {safeNumber(selectedProduct.stock, 0)} disponíveis
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-600 mb-1">Total</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {safeToFixed(productQuantity * safeNumber(selectedProduct.price, 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 sm:p-6 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={handleCloseProductModal}
                  className="w-full sm:w-auto bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAddProduct}
                  disabled={!selectedProduct}
                  className={`w-full sm:w-auto py-3 px-6 rounded-lg transition-all duration-200 font-medium ${
                    selectedProduct
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {selectedProduct ? `Adicionar ${productQuantity}x ${selectedProduct.name}` : 'Selecione um produto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Clientes */}
      {showCustomerSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                    Selecionar Cliente do Banco
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredCustomers.length} de {activeCustomers.length} clientes disponíveis
                  </p>
                </div>
                <button
                  onClick={() => setShowCustomerSelector(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 px-4 sm:px-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, telefone, CPF/CNPJ ou email..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
              {filteredCustomers.length > 0 ? (
                <div className="space-y-3">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer._id || customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedCustomer?._id === customer._id || selectedCustomer?.id === customer.id
                          ? 'border-indigo-500 bg-indigo-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-sm font-semibold text-gray-800 truncate">
                              {safeString(customer.name, 'Nome não informado')}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              customer.customerType === 'pessoa_fisica' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {customer.customerType === 'pessoa_fisica' ? 'PF' : 'PJ'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="truncate">{safeString(customer.phone, 'Não informado')}</span>
                            </div>
                            
                            {customer.email && (
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="truncate">{safeString(customer.city, 'Não informado')}, {safeString(customer.state, '')}</span>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-gray-500">
                            CPF/CNPJ: {safeString(customer.cpfCnpj, 'Não informado')}
                          </div>

                          {customer.observations && (
                            <div className="mt-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                              <strong>Obs:</strong> {customer.observations}
                            </div>
                          )}
                        </div>

                        {(selectedCustomer?._id === customer._id || selectedCustomer?.id === customer.id) && (
                          <div className="ml-3 flex-shrink-0">
                            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Nenhum cliente encontrado
                  </h3>
                  <p className="text-sm text-gray-500">
                    {customerSearchTerm ? 'Tente ajustar o termo de busca' : 'Não há clientes cadastrados no banco'}
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 sm:p-6 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={() => setShowCustomerSelector(false)}
                  className="w-full sm:w-auto bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmCustomerSelection}
                  disabled={!selectedCustomer}
                  className={`w-full sm:w-auto py-3 px-6 rounded-lg transition-all duration-200 font-medium ${
                    selectedCustomer
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {selectedCustomer ? `Iniciar Venda com ${selectedCustomer.name}` : 'Selecione um cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Produto Duplicado */}
      {showDuplicateProductModal && pendingProductToAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                ⚠️ Produto Já Adicionado
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                O produto <strong>"{pendingProductToAdd.product.name}"</strong> já foi adicionado à venda. 
                Como você deseja proceder?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (showEditSaleModal && editingSale) {
                      addProductToEdit(pendingProductToAdd.product, pendingProductToAdd.quantity, false)
                    } else {
                      addProductToSale(pendingProductToAdd.product, pendingProductToAdd.quantity, false)
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Somar à quantidade existente</span>
                </button>
                
                <button
                  onClick={() => {
                    if (showEditSaleModal && editingSale) {
                      addProductToEdit(pendingProductToAdd.product, pendingProductToAdd.quantity, true)
                    } else {
                      addProductToSale(pendingProductToAdd.product, pendingProductToAdd.quantity, true)
                    }
                  }}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <Package className="w-4 h-4" />
                  <span>Adicionar como item separado</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowDuplicateProductModal(false)
                    setPendingProductToAdd(null)
                  }}
                  className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Venda */}
      {showEditSaleModal && editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                    Editar Venda #{editingSale.saleNumber ? String(editingSale.saleNumber).padStart(4, '0') : '????'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Alterar informações da venda registrada</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditSaleModal(false)
                    setEditingSale(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh]">
              {/* Dados do Cliente */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Dados do Cliente
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={editingSale.customer.name}
                      onChange={(e) => setEditingSale({
                        ...editingSale,
                        customer: { ...editingSale.customer, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="Nome completo do cliente"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                    <input
                      type="tel"
                      value={editingSale.customer.phone}
                      onChange={(e) => setEditingSale({
                        ...editingSale,
                        customer: { ...editingSale.customer, phone: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="(XX) XXXXX-XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editingSale.customer.email || ''}
                      onChange={(e) => setEditingSale({
                        ...editingSale,
                        customer: { ...editingSale.customer, email: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={editingSale.customer.address || ''}
                      onChange={(e) => setEditingSale({
                        ...editingSale,
                        customer: { ...editingSale.customer, address: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="Endereço completo"
                    />
                  </div>
                </div>
              </div>

              {/* Data da Venda e Status */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Informações da Venda
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                    <input
                      type="date"
                      value={editingSale.date}
                      onChange={(e) => setEditingSale({
                        ...editingSale,
                        date: e.target.value
                      })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select
                      value={editingSale.status}
                      onChange={(e) => setEditingSale({
                        ...editingSale,
                        status: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Concluída">Concluída</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                    <select
                      value={editingSale.paymentMethod || ''}
                      onChange={(e) => setEditingSale({
                        ...editingSale,
                        paymentMethod: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    >
                      <option value="">Selecione...</option>
                      {paymentMethods.map((pm) => (
                        <option key={pm._id || pm.id} value={pm.value}>
                          {pm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Produtos */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    Produtos ({editingSale.items.length})
                  </h4>
                  <button
                    onClick={handleOpenProductModal}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Produto</span>
                  </button>
                </div>

                {editingSale.items.length > 0 ? (
                  <div className="space-y-3">
                    {editingSale.items.map((item, index) => {
                      const product = products.find(p => (p._id || p.id) === item.productId)
                      const maxStock = safeNumber(product?.stock, 0)
                      const isAtMaxStock = item.quantity >= maxStock
                      
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-gray-800">{item.productName}</h5>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-gray-600">
                                  R$ {safeToFixed(item.unitPrice)} cada
                                </span>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleChangeProductQuantityInEdit(index, -1)}
                                    disabled={item.quantity <= 1}
                                    className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                                      item.quantity <= 1 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                    }`}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="text-sm font-bold w-10 text-center bg-gray-50 py-1 rounded border border-gray-200">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleChangeProductQuantityInEdit(index, 1)}
                                    disabled={isAtMaxStock}
                                    className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                                      isAtMaxStock 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                                    }`}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                                <span className={`text-xs ${isAtMaxStock ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                                  Estoque: {maxStock}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-semibold text-green-600">
                                R$ {safeToFixed(item.total)}
                              </span>
                              <button
                                onClick={() => handleRemoveProductFromEdit(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Nenhum produto na venda</p>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-800">Total da Venda:</span>
                  <span className="text-2xl font-bold text-green-600">
                    R$ {safeFormatCurrency(editingSale.total)}
                  </span>
                </div>
              </div>

              {/* Observações */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  value={editingSale.observations || ''}
                  onChange={(e) => setEditingSale({ ...editingSale, observations: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="Observações sobre a venda (opcional)"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 sm:p-6 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={() => {
                    setShowEditSaleModal(false)
                    setEditingSale(null)
                  }}
                  className="w-full sm:w-auto bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEditSale}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetails && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                  Detalhes da Venda #{selectedSale.saleNumber ? String(selectedSale.saleNumber).padStart(4, '0') : generateSaleNumberFromIndex(filteredSales.findIndex(s => s._id === selectedSale._id))}
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Informações do Cliente
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Nome:</span>
                    <span className="ml-2 font-medium text-gray-800">{safeString(selectedSale?.customer?.name, 'Não informado')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Telefone:</span>
                    <span className="ml-2 font-medium text-gray-800">{safeString(selectedSale?.customer?.phone, 'Não informado')}</span>
                  </div>
                  {selectedSale.customer.email && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2 font-medium text-gray-800">{selectedSale.customer.email}</span>
                    </div>
                  )}
                  {selectedSale.customer.address && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-600">Endereço:</span>
                      <span className="ml-2 font-medium text-gray-800">{selectedSale.customer.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Informações da Venda
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Data:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {safeDate(selectedSale.date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedSale.status)}`}>
                      {selectedSale.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-2 font-bold text-green-600">
                      R$ {safeFormatCurrency(selectedSale.total)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Produtos ({(selectedSale.items || []).length}) - Total: {calculateTotalItems(selectedSale.items)} unidades
                </h4>
                <div className="space-y-3">
                  {(selectedSale.items || []).map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-800">{safeString(item.productName, 'Produto não informado')}</h5>
                        <span className="text-sm font-semibold text-green-600">
                          R$ {safeFormatCurrency(item.total)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span>Quantidade: </span>
                          <span className="font-medium">{safeNumber(item.quantity, 0)} unidades</span>
                        </div>
                        <div>
                          <span>Valor unitário: </span>
                          <span className="font-medium">R$ {safeFormatCurrency(item.unitPrice)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSale.observations && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Observações</h4>
                  <p className="text-sm text-gray-700">{selectedSale.observations}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleGeneratePDF(selectedSale)}
                  className="w-full sm:flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </button>
                <button
                  onClick={() => handleGenerateImage(selectedSale)}
                  className="w-full sm:flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
                >
                  <Image className="w-4 h-4" />
                  <span>Baixar JPG</span>
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="w-full sm:w-auto bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesManagement
