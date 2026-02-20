
import { useState, useEffect, useCallback } from 'react'
import { lumi } from '../lib/lumi'

interface Product {
  _id: string
  code: string
  name: string
  description?: string
  unitPrice: number
  stockQuantity: number
  category?: string
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

export const useProductCRUD = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Buscar produtos do banco de dados com tratamento robusto
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Carregando produtos do banco de dados...')
      
      // Múltiplas estratégias de busca para garantir robustez
      let response
      try {
        response = await lumi.entities.products.list({
          sort: { createdAt: -1 },
          limit: 1000
        })
      } catch (primaryError) {
        console.warn('⚠️ Falha na busca primária, tentando busca simples...')
        response = await lumi.entities.products.list()
      }
      
      const productList = response?.list || []
      console.log(`✅ ${productList.length} produtos carregados`)
      
      // Validar estrutura dos produtos
      const validProducts = productList.map(product => ({
        _id: product._id || '',
        code: product.code || '',
        name: product.name || 'Produto sem nome',
        description: product.description || '',
        unitPrice: typeof product.unitPrice === 'number' ? product.unitPrice : 0,
        stockQuantity: typeof product.stockQuantity === 'number' ? product.stockQuantity : 0,
        category: product.category || '',
        active: product.active !== false,
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: product.updatedAt || new Date().toISOString()
      }))
      
      setProducts(validProducts)
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar produtos:', error)
      setError('Erro ao carregar produtos do banco de dados')
      
      // Garantir que products nunca seja undefined
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Criar novo produto com validação robusta
  const createProduct = async (productData: Omit<Product, '_id'>) => {
    try {
      console.log('➕ Criando novo produto:', productData.name)
      
      // Validação de dados de entrada
      if (!productData.name?.trim()) {
        throw new Error('Nome do produto é obrigatório')
      }
      
      // Processar e validar dados
      const processedData = {
        code: productData.code?.trim() || '',
        name: productData.name.trim(),
        description: productData.description?.trim() || '',
        unitPrice: typeof productData.unitPrice === 'string' ? 
          parseFloat(productData.unitPrice) || 0 : 
          productData.unitPrice || 0,
        stockQuantity: typeof productData.stockQuantity === 'string' ? 
          parseInt(productData.stockQuantity) || 0 : 
          productData.stockQuantity || 0,
        category: productData.category?.trim() || '',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const newProduct = await lumi.entities.products.create(processedData)
      console.log('✅ Produto criado com sucesso:', newProduct.name)
      
      // Atualizar lista local de forma segura
      setProducts(prev => {
        const updatedList = [newProduct, ...prev]
        console.log(`📋 Lista atualizada com ${updatedList.length} produtos`)
        return updatedList
      })
      
      return newProduct
      
    } catch (error: any) {
      console.error('❌ Erro ao criar produto:', error)
      throw new Error(error.message || 'Falha ao criar produto no banco de dados')
    }
  }

  // Atualizar produto existente
  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      if (typeof productId !== 'string' || !productId.trim()) {
        throw new Error('ID do produto inválido')
      }
      
      console.log('✏️ Atualizando produto:', productId)
      
      // Processar atualizações
      const processedUpdates = {
        ...updates,
        unitPrice: typeof updates.unitPrice === 'string' ? 
          parseFloat(updates.unitPrice) || 0 : 
          updates.unitPrice,
        stockQuantity: typeof updates.stockQuantity === 'string' ? 
          parseInt(updates.stockQuantity) || 0 : 
          updates.stockQuantity,
        updatedAt: new Date().toISOString()
      }
      
      const updatedProduct = await lumi.entities.products.update(productId, processedUpdates)
      console.log('✅ Produto atualizado com sucesso:', updatedProduct.name)
      
      // Atualizar lista local
      setProducts(prev => prev.map(p => p._id === productId ? updatedProduct : p))
      return updatedProduct
      
    } catch (error: any) {
      console.error('❌ Erro ao atualizar produto:', error)
      throw new Error(error.message || 'Falha ao atualizar produto no banco de dados')
    }
  }

  // Deletar produto (remover permanentemente)
  const deleteProduct = async (productId: string) => {
    try {
      if (typeof productId !== 'string' || !productId.trim()) {
        throw new Error('ID do produto inválido')
      }
      
      console.log('🗑️ Deletando produto:', productId)
      
      await lumi.entities.products.delete(productId)
      
      console.log('✅ Produto deletado com sucesso')
      
      // Remover da lista local
      setProducts(prev => prev.filter(p => p._id !== productId))
      
    } catch (error: any) {
      console.error('❌ Erro ao deletar produto:', error)
      throw new Error(error.message || 'Falha ao deletar produto no banco de dados')
    }
  }

  // Gerar código único com fallback robusto
  const generateUniqueCode = useCallback(async (): Promise<string> => {
    try {
      // Usar produtos já carregados para evitar nova consulta
      const existingCodes = products
        .map(p => p.code)
        .filter(code => code && code.trim())
      
      let counter = 1
      let newCode = `PRD${counter.toString().padStart(3, '0')}`
      
      // Garantir que o código seja único
      while (existingCodes.includes(newCode)) {
        counter++
        newCode = `PRD${counter.toString().padStart(3, '0')}`
        
        // Fallback para evitar loop infinito
        if (counter > 9999) {
          newCode = `PRD${Date.now().toString().slice(-3)}`
          break
        }
      }
      
      console.log('🔢 Código único gerado:', newCode)
      return newCode
      
    } catch (error) {
      console.error('⚠️ Erro ao gerar código único, usando fallback:', error)
      return `PRD${Date.now().toString().slice(-3)}`
    }
  }, [products])

  // Carregar produtos na inicialização com retry
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    
    const loadWithRetry = async () => {
      try {
        await fetchProducts()
      } catch (error) {
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`🔄 Tentativa ${retryCount + 1} de ${maxRetries}...`)
          setTimeout(loadWithRetry, 1000 * retryCount) // Delay progressivo
        } else {
          console.error('❌ Falha após todas as tentativas de carregamento')
        }
      }
    }
    
    loadWithRetry()
  }, [fetchProducts])

  return {
    products: products || [], // Garantir que nunca seja undefined
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    generateUniqueCode
  }
}
