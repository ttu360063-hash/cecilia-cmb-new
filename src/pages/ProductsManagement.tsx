
import React, { useState, useEffect } from 'react'
import {Plus, Edit, Trash2, Package, Search, AlertCircle, CheckCircle, XCircle} from 'lucide-react'
import { lumi } from '../lib/lumi'
import toast from 'react-hot-toast'

interface Product {
  _id: string
  code: string
  name: string
  description?: string
  unitPrice: number
  costPrice?: number
  stockQuantity: number
  category?: string
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

const ProductsManagement: React.FC = () => {
  // Estados principais com inicialização segura
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados do modal com inicialização defensiva
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  
  // Estados do formulário SEMPRE inicializados
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unitPrice: '0',
    costPrice: '0',
    stockQuantity: '0',
    category: ''
  })

  // 🔧 FUNÇÃO CRÍTICA: Reset completo e seguro dos estados
  const resetAllStates = () => {
    console.log('🔄 RESETANDO TODOS OS ESTADOS...')
    
    try {
      setShowModal(false)
      setEditingProduct(null)
      setModalLoading(false)
      setError(null)
      
      setFormData({
        code: '',
        name: '',
        description: '',
        unitPrice: '0',
        costPrice: '0',
        stockQuantity: '0',
        category: ''
      })
      
      console.log('✅ RESET COMPLETO REALIZADO')
    } catch (resetError) {
      console.error('❌ ERRO NO RESET:', resetError)
      // Force reset usando setTimeout para evitar loops
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }
  }

  // 🔧 FUNÇÃO CRÍTICA: Gerar código único DE FORMA SEGURA
  const generateSafeCode = () => {
    try {
      console.log('🔢 GERANDO CÓDIGO SEGURO...')
      
      // Verificar se products existe e é array
      if (!Array.isArray(products)) {
        console.warn('⚠️ Products não é array, usando código padrão')
        return 'PRD001'
      }
      
      // Extrair códigos existentes de forma segura
      const existingCodes = products
        .filter(p => p && typeof p.code === 'string')
        .map(p => p.code)
        .filter(code => code && code.trim())
      
      console.log('📋 Códigos existentes:', existingCodes.length)
      
      // Gerar novo código
      let counter = 1
      let newCode = `PRD${counter.toString().padStart(3, '0')}`
      
      while (existingCodes.includes(newCode) && counter < 9999) {
        counter++
        newCode = `PRD${counter.toString().padStart(3, '0')}`
      }
      
      console.log('✅ Código gerado:', newCode)
      return newCode
      
    } catch (codeError) {
      console.error('❌ ERRO NA GERAÇÃO DE CÓDIGO:', codeError)
      // Fallback com timestamp
      const fallbackCode = `PRD${Date.now().toString().slice(-3)}`
      console.log('🔧 Usando código fallback:', fallbackCode)
      return fallbackCode
    }
  }

  // 🚨 FUNÇÃO CRÍTICA REESCRITA: Abrir modal de adicionar produto
  const handleAddProduct = async () => {
    console.log('🚀 INICIANDO PROCESSO DE ADICIONAR PRODUTO - VERSÃO SEGURA')
    
    try {
      // PASSO 1: Reset preventivo
      console.log('1️⃣ Resetando estados...')
      setModalLoading(false)
      setEditingProduct(null)
      setError(null)
      
      // PASSO 2: Gerar código de forma segura
      console.log('2️⃣ Gerando código único...')
      let uniqueCode = 'PRD001'
      
      try {
        uniqueCode = generateSafeCode()
      } catch (codeError) {
        console.warn('⚠️ Erro na geração, usando padrão:', codeError)
        uniqueCode = `PRD${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`
      }
      
      // PASSO 3: Configurar formulário com dados seguros
      console.log('3️⃣ Configurando formulário...')
      const safeFormData = {
        code: uniqueCode || 'PRD001',
        name: '',
        description: '',
        unitPrice: '0',
        costPrice: '0',
        stockQuantity: '0',
        category: ''
      }
      
      console.log('📝 Dados do formulário:', safeFormData)
      
      // PASSO 4: Aplicar dados de forma segura
      setFormData(safeFormData)
      
      // PASSO 5: Aguardar um tick para garantir que o estado foi aplicado
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // PASSO 6: Abrir modal por último
      console.log('4️⃣ Abrindo modal...')
      setShowModal(true)
      
      console.log('✅ MODAL ABERTO COM SUCESSO!')
      
    } catch (criticalError) {
      console.error('🚨 ERRO CRÍTICO AO ABRIR MODAL:', criticalError)
      
      // Reset de emergência
      resetAllStates()
      
      // Notificar usuário
      toast.error('Erro ao abrir formulário de produto')
      
      // Tentar recarregar dados se necessário
      if (!Array.isArray(products)) {
        console.log('🔄 Recarregando dados após erro...')
        fetchProducts()
      }
    }
  }

  // Carregar produtos com múltiplas tentativas e tratamento robusto
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Carregando produtos...')
      
      let response
      let productList: Product[] = []
      
      // Tentativa 1: Busca completa
      try {
        response = await lumi.entities.products.list({
          sort: { createdAt: -1 },
          limit: 1000
        })
        productList = response?.list || []
        console.log(`✅ Busca completa: ${productList.length} produtos`)
      } catch (error1) {
        console.warn('⚠️ Busca completa falhou, tentando simples...')
        
        // Tentativa 2: Busca simples
        try {
          response = await lumi.entities.products.list()
          productList = response?.list || []
          console.log(`✅ Busca simples: ${productList.length} produtos`)
        } catch (error2) {
          console.warn('⚠️ Busca simples falhou, tentando básica...')
          
          // Tentativa 3: Busca básica
          try {
            response = await lumi.entities.products.list({})
            productList = Array.isArray(response) ? response : (response?.list || [])
            console.log(`✅ Busca básica: ${productList.length} produtos`)
          } catch (error3) {
            console.error('❌ Todas as tentativas falharam')
            productList = []
          }
        }
      }
      
      // Processar produtos de forma segura
      const validProducts = (productList || []).map(product => {
        try {
          return {
            _id: product._id || `temp-${Date.now()}-${Math.random()}`,
            code: product.code || '',
            name: product.name || 'Produto sem nome',
            description: product.description || '',
            unitPrice: typeof product.unitPrice === 'number' ? product.unitPrice : 0,
            costPrice: typeof product.costPrice === 'number' ? product.costPrice : 0,
            stockQuantity: typeof product.stockQuantity === 'number' ? product.stockQuantity : 0,
            category: product.category || '',
            active: product.active !== false,
            createdAt: product.createdAt || new Date().toISOString(),
            updatedAt: product.updatedAt || new Date().toISOString()
          }
        } catch (productError) {
          console.error('Erro ao processar produto:', product, productError)
          return null
        }
      }).filter(Boolean) as Product[]
      
      setProducts(validProducts)
      console.log(`✅ ${validProducts.length} produtos carregados`)
      
    } catch (error: any) {
      console.error('❌ Erro no carregamento:', error)
      setError('Erro ao carregar produtos')
      setProducts([])
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  // Editar produto
  const handleEditProduct = (product: Product) => {
    try {
      if (!product || !product._id) {
        throw new Error('Produto inválido')
      }
      
      console.log('✏️ Editando produto:', product.name)
      
      const editFormData = {
        code: product.code || '',
        name: product.name || '',
        description: product.description || '',
        unitPrice: product.unitPrice?.toString() || '0',
        costPrice: product.costPrice?.toString() || '0',
        stockQuantity: product.stockQuantity?.toString() || '0',
        category: product.category || ''
      }
      
      setFormData(editFormData)
      setEditingProduct(product)
      setShowModal(true)
      
    } catch (error: any) {
      console.error('❌ Erro ao editar:', error)
      toast.error('Erro ao carregar produto para edição')
    }
  }

  // Fechar modal
  const handleCloseModal = () => {
    try {
      console.log('🔒 Fechando modal...')
      resetAllStates()
    } catch (error) {
      console.error('Erro ao fechar modal:', error)
      setShowModal(false)
    }
  }

  // Salvar produto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (!formData.name?.trim()) {
        toast.error('Nome é obrigatório')
        return
      }

      setModalLoading(true)
      
      const productData = {
        code: formData.code?.trim() || '',
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        unitPrice: Math.max(0, parseFloat(formData.unitPrice) || 0),
        costPrice: Math.max(0, parseFloat(formData.costPrice) || 0),
        stockQuantity: Math.max(0, parseInt(formData.stockQuantity) || 0),
        category: formData.category?.trim() || '',
        active: true,
        updatedAt: new Date().toISOString()
      }

      if (editingProduct && editingProduct._id) {
        const updatedProduct = await lumi.entities.products.update(editingProduct._id, productData)
        setProducts(prev => prev.map(p => p._id === editingProduct._id ? updatedProduct : p))
        toast.success('Produto atualizado!')
      } else {
        const newProductData = {
          ...productData,
          createdAt: new Date().toISOString()
        }
        const newProduct = await lumi.entities.products.create(newProductData)
        setProducts(prev => [newProduct, ...prev])
        toast.success('Produto cadastrado!')
      }

      handleCloseModal()
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error)
      toast.error('Erro ao salvar produto')
    } finally {
      setModalLoading(false)
    }
  }

  // Deletar produto
  const handleDeleteProduct = async (product: Product) => {
    try {
      if (!product?._id) return

      if (!confirm(`Excluir "${product.name}"?`)) return

      await lumi.entities.products.delete(product._id)
      
      setProducts(prev => prev.filter(p => p._id !== product._id))
      toast.success('Produto excluído!')
      
    } catch (error: any) {
      console.error('❌ Erro ao excluir:', error)
      toast.error('Erro ao excluir produto')
    }
  }

  // Filtrar produtos
  const filteredProducts = React.useMemo(() => {
    try {
      if (!Array.isArray(products)) return []
      if (!searchTerm?.trim()) return products
      
      const search = searchTerm.toLowerCase()
      return products.filter(product => {
        if (!product) return false
        
        return (
          product.name?.toLowerCase().includes(search) ||
          product.code?.toLowerCase().includes(search) ||
          product.category?.toLowerCase().includes(search) ||
          product.description?.toLowerCase().includes(search)
        )
      })
    } catch (error) {
      console.error('Erro ao filtrar:', error)
      return products || []
    }
  }, [products, searchTerm])

  // Carregar dados na inicialização
  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      if (!mounted) return
      
      try {
        await fetchProducts()
      } catch (error) {
        console.error('Erro na inicialização:', error)
        if (mounted) {
          setError('Erro ao carregar dados')
          setLoading(false)
        }
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [])

  // 🛡️ RENDERIZAÇÃO COM PROTEÇÃO TOTAL CONTRA CRASHES
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando produtos...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchProducts}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-0">
              <Package className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-800">Gerenciar Produtos</h1>
            </div>
            
            {/* 🚨 BOTÃO CRÍTICO CORRIGIDO */}
            <button
              onClick={handleAddProduct}
              disabled={loading || modalLoading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              <span>Adicionar Produto</span>
            </button>
          </div>

          {/* Barra de pesquisa */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total</p>
                  <p className="text-2xl font-bold text-blue-800">{products?.length || 0}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Ativos</p>
                  <p className="text-2xl font-bold text-green-800">
                    {products?.filter(p => p?.active !== false).length || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Estoque Baixo</p>
                  <p className="text-2xl font-bold text-red-800">
                    {products?.filter(p => p?.active !== false && (p?.stockQuantity || 0) <= 5).length || 0}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Lista de produtos */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddProduct}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Cadastrar Primeiro Produto
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Código</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Categoria</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Preço Custo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Preço Venda</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Estoque</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">{product.code}</td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">{product.category || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        R$ {(product.costPrice || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        R$ {(product.unitPrice || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-sm font-medium ${
                          (product.stockQuantity || 0) <= 2 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {product.stockQuantity || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {product.active !== false ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 🚨 MODAL CRÍTICO PROTEGIDO */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço de Custo (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estoque *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={modalLoading}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {modalLoading ? 'Salvando...' : editingProduct ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductsManagement
