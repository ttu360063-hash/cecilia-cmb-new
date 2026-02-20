
import React, { useState, useEffect } from 'react'
import {Users, Plus, Edit, Trash2, Search, Phone, Mail, MapPin, Calendar, Check, X, Save, RefreshCw, Database, AlertCircle, UserPlus} from 'lucide-react'
import { lumi } from '../lib/lumi'

interface Customer {
  _id: string
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

const CustomersManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    cpfCnpj: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    birthDate: '',
    customerType: 'pessoa_fisica',
    observations: ''
  })

  // 🔥 FUNÇÃO CRÍTICA: Carregar clientes com TODAS as estratégias possíveis
  const loadCustomersFromDatabase = async () => {
    try {
      setLoading(true)
      setError(null)
      setDebugInfo('🔍 Iniciando busca de clientes...')
      
      console.log('🔍 INICIANDO CARREGAMENTO DE CLIENTES...')
      console.log('📡 SDK Lumi:', !!lumi)
      console.log('🔗 Entidades disponíveis:', Object.keys(lumi?.entities || {}))
      
      // Verificar se o SDK está configurado
      if (!lumi || !lumi.entities) {
        throw new Error('SDK Lumi não está configurado corretamente')
      }

      // Listar todas as entidades disponíveis
      const availableEntities = Object.keys(lumi.entities)
      console.log('📋 Entidades encontradas:', availableEntities)
      setDebugInfo(`📋 Entidades disponíveis: ${availableEntities.join(', ')}`)
      
      // Tentar TODOS os nomes possíveis de entidade
      const possibleEntityNames = [
        'customers', 'customer', 'clientes', 'cliente', 
        'Customers', 'Customer', 'Clientes', 'Cliente',
        'CUSTOMERS', 'CUSTOMER', 'CLIENTES', 'CLIENTE'
      ]
      
      let entityName = ''
      let entity = null
      
      for (const name of possibleEntityNames) {
        if (lumi.entities[name]) {
          entityName = name
          entity = lumi.entities[name]
          console.log(`✅ Entidade encontrada: ${name}`)
          setDebugInfo(`✅ Entidade encontrada: ${name}`)
          break
        }
      }
      
      if (!entity) {
        console.log('❌ Nenhuma entidade de clientes encontrada')
        setDebugInfo(`❌ Entidade de clientes não encontrada. Entidades disponíveis: ${availableEntities.join(', ')}`)
        
        // Tentar acessar diretamente pelo primeiro item disponível
        if (availableEntities.length > 0) {
          const firstEntity = availableEntities[0]
          entity = lumi.entities[firstEntity]
          entityName = firstEntity
          console.log(`🔄 Tentando usar primeira entidade: ${firstEntity}`)
          setDebugInfo(`🔄 Tentando usar primeira entidade: ${firstEntity}`)
        } else {
          setCustomers([])
          return
        }
      }

      // Tentar TODOS os métodos possíveis de busca
      let response = null
      let method = ''
      const methods = [
        'list', 'find', 'get', 'findMany', 'getAll', 'findAll', 
        'query', 'search', 'fetch', 'load', 'retrieve'
      ]
      
      for (const methodName of methods) {
        try {
          console.log(`🔍 Tentando ${entityName}.${methodName}()...`)
          setDebugInfo(`🔍 Tentando ${entityName}.${methodName}()...`)
          
          if (typeof entity[methodName] === 'function') {
            if (methodName === 'find') {
              response = await entity[methodName]({})
            } else {
              response = await entity[methodName]()
            }
            method = `${entityName}.${methodName}()`
            console.log(`✅ Método ${methodName}() funcionou:`, response)
            setDebugInfo(`✅ Método ${methodName}() funcionou`)
            break
          }
        } catch (methodError) {
          console.log(`❌ Método ${methodName}() falhou:`, methodError)
          continue
        }
      }
      
      if (!response) {
        throw new Error(`Todos os métodos de busca falharam para entidade ${entityName}`)
      }
      
      // Processar resposta com MÁXIMA flexibilidade
      let customersList = []
      
      console.log('📋 Resposta bruta do banco:', response)
      setDebugInfo(`📋 Processando resposta do método: ${method}`)
      
      // Estratégia 1: Resposta é array direto
      if (Array.isArray(response)) {
        customersList = response
        console.log('✅ Resposta é array direto')
      }
      // Estratégia 2: Propriedades conhecidas
      else if (response && typeof response === 'object') {
        const possibleArrayProps = [
          'data', 'items', 'results', 'customers', 'docs', 'records', 
          'list', 'entities', 'rows', 'documents', 'collection'
        ]
        
        for (const prop of possibleArrayProps) {
          if (response[prop] && Array.isArray(response[prop])) {
            customersList = response[prop]
            console.log(`✅ Dados encontrados em response.${prop}`)
            break
          }
        }
        
        // Estratégia 3: Objeto único
        if (customersList.length === 0 && (response._id || response.id)) {
          customersList = [response]
          console.log('✅ Objeto único convertido para array')
        }
        
        // Estratégia 4: Buscar qualquer array na resposta
        if (customersList.length === 0) {
          for (const [key, value] of Object.entries(response)) {
            if (Array.isArray(value) && value.length > 0) {
              customersList = value
              console.log(`✅ Array encontrado em response.${key}`)
              break
            }
          }
        }
      }
      
      console.log('📋 Lista de clientes processada:', customersList)
      setDebugInfo(`📋 ${customersList.length} registros encontrados`)
      
      if (customersList.length > 0) {
        // Processar cada cliente com máxima flexibilidade
        const processedCustomers = customersList.map((customer, index) => {
          // Garantir ID único
          const id = customer._id || customer.id || `temp_${Date.now()}_${index}`
          
          // Mapear campos com múltiplas possibilidades
          const processedCustomer = {
            _id: id,
            name: customer.name || customer.nome || customer.fullName || customer.customerName || `Cliente ${index + 1}`,
            cpfCnpj: customer.cpfCnpj || customer.cpf || customer.cnpj || customer.documento || customer.document || '',
            phone: customer.phone || customer.telefone || customer.celular || customer.phoneNumber || customer.mobile || '',
            email: customer.email || customer.emailAddress || customer.mail || '',
            address: customer.address || customer.endereco || customer.street || customer.addr || '',
            city: customer.city || customer.cidade || customer.municipality || '',
            state: customer.state || customer.estado || customer.uf || customer.province || '',
            zipCode: customer.zipCode || customer.cep || customer.postalCode || customer.zip || '',
            birthDate: customer.birthDate || customer.dataNascimento || customer.dateOfBirth || '',
            customerType: customer.customerType || customer.tipo || customer.type || 'pessoa_fisica',
            active: customer.active !== false, // Default true
            observations: customer.observations || customer.observacoes || customer.notes || customer.comments || '',
            createdAt: customer.createdAt || customer.created_at || customer.dateCreated || new Date().toISOString(),
            updatedAt: customer.updatedAt || customer.updated_at || customer.dateModified || new Date().toISOString()
          }
          
          return processedCustomer
        })
        
        setCustomers(processedCustomers)
        setLastSaved(new Date().toISOString())
        
        console.log(`✅ ${processedCustomers.length} CLIENTES CARREGADOS:`, processedCustomers)
        setDebugInfo(`✅ ${processedCustomers.length} clientes carregados com sucesso usando ${method}`)
        
      } else {
        console.log('📭 NENHUM CLIENTE ENCONTRADO')
        setDebugInfo(`📭 Nenhum cliente encontrado (método: ${method})`)
        setCustomers([])
      }
      
    } catch (error) {
      console.error('❌ ERRO AO CARREGAR CLIENTES:', error)
      setError(`Erro ao carregar clientes: ${error.message}`)
      setCustomers([])
      setDebugInfo(`❌ Erro: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Carregar na inicialização
  useEffect(() => {
    loadCustomersFromDatabase()
  }, [])

  // 🔍 FILTRAR CLIENTES
  useEffect(() => {
    const activeCustomers = customers.filter(c => c.active !== false)
    
    if (searchTerm) {
      const filtered = activeCustomers.filter(customer => 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.cpfCnpj?.includes(searchTerm) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredCustomers(filtered)
    } else {
      setFilteredCustomers(activeCustomers)
    }
  }, [customers, searchTerm])

  // 🔥 ADICIONAR/EDITAR CLIENTE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const now = new Date().toISOString()
      
      const customerData = {
        name: formData.name.trim(),
        cpfCnpj: formData.cpfCnpj.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        birthDate: formData.birthDate || undefined,
        customerType: formData.customerType,
        active: true,
        observations: formData.observations.trim() || undefined,
        updatedAt: now
      }

      // Determinar qual entidade usar
      const availableEntities = Object.keys(lumi?.entities || {})
      const possibleEntityNames = ['customers', 'customer', 'clientes', 'cliente']
      let entityName = ''
      let entity = null
      
      for (const name of possibleEntityNames) {
        if (lumi.entities[name]) {
          entityName = name
          entity = lumi.entities[name]
          break
        }
      }
      
      if (!entity && availableEntities.length > 0) {
        entity = lumi.entities[availableEntities[0]]
        entityName = availableEntities[0]
      }
      
      if (!entity) {
        throw new Error(`Entidade de clientes não encontrada. Entidades disponíveis: ${availableEntities.join(', ')}`)
      }

      let savedCustomer

      if (editingCustomer) {
        // EDIÇÃO
        console.log('✏️ EDITANDO CLIENTE:', editingCustomer._id)
        savedCustomer = await entity.update(editingCustomer._id, customerData)
        
        // Atualizar na lista local
        setCustomers(prev => prev.map(c => 
          c._id === editingCustomer._id ? { ...savedCustomer, _id: savedCustomer._id || savedCustomer.id } : c
        ))
        
        alert('Cliente atualizado com sucesso!')
      } else {
        // ADIÇÃO
        console.log('➕ ADICIONANDO CLIENTE:', customerData.name)
        savedCustomer = await entity.create({
          ...customerData,
          createdAt: now
        })
        
        // Adicionar à lista local
        const newCustomer = { ...savedCustomer, _id: savedCustomer._id || savedCustomer.id }
        setCustomers(prev => [...prev, newCustomer])
        
        alert('Cliente adicionado com sucesso!')
      }

      resetForm()
      setLastSaved(now)
      
    } catch (error) {
      console.error('❌ ERRO AO SALVAR CLIENTE:', error)
      alert(`Erro ao salvar cliente: ${error.message}`)
    }
  }

  // 🗑️ EXCLUIR CLIENTE
  const handleDelete = async (customerId: string) => {
    const customerToDelete = customers.find(c => c._id === customerId)
    if (!customerToDelete) {
      alert('Cliente não encontrado!')
      return
    }

    const confirmMessage = `⚠️ EXCLUIR PERMANENTEMENTE?\n\n"${customerToDelete.name}"\n\nEsta ação não pode ser desfeita!`
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log('🗑️ EXCLUINDO CLIENTE:', customerId)
        
        // Determinar qual entidade usar
        const availableEntities = Object.keys(lumi?.entities || {})
        const possibleEntityNames = ['customers', 'customer', 'clientes', 'cliente']
        let entity = null
        
        for (const name of possibleEntityNames) {
          if (lumi.entities[name]) {
            entity = lumi.entities[name]
            break
          }
        }
        
        if (!entity && availableEntities.length > 0) {
          entity = lumi.entities[availableEntities[0]]
        }
        
        if (!entity) {
          throw new Error('Entidade de clientes não encontrada')
        }
        
        await entity.delete(customerId)
        
        // Remove da lista local
        setCustomers(prev => prev.filter(c => c._id !== customerId))
        
        console.log('✅ CLIENTE EXCLUÍDO COM SUCESSO')
        alert('Cliente excluído permanentemente!')
        
      } catch (error) {
        console.error('❌ ERRO AO EXCLUIR CLIENTE:', error)
        alert(`Erro ao excluir cliente: ${error.message}`)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      cpfCnpj: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      birthDate: '',
      customerType: 'pessoa_fisica',
      observations: ''
    })
    setShowForm(false)
    setEditingCustomer(null)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || '',
      cpfCnpj: customer.cpfCnpj || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zipCode: customer.zipCode || '',
      birthDate: customer.birthDate || '',
      customerType: customer.customerType || 'pessoa_fisica',
      observations: customer.observations || ''
    })
    setShowForm(true)
  }

  // 🔄 RECARREGAR DADOS DO BANCO
  const handleReload = () => {
    setDebugInfo('🔄 Recarregando dados...')
    loadCustomersFromDatabase()
  }

  // 📊 Estatísticas
  const activeCustomers = customers.filter(c => c.active !== false)
  const stats = {
    total: activeCustomers.length,
    pessoaFisica: activeCustomers.filter(c => c.customerType === 'pessoa_fisica').length,
    pessoaJuridica: activeCustomers.filter(c => c.customerType === 'pessoa_juridica').length,
    lastModified: lastSaved ? new Date(lastSaved).toLocaleString('pt-BR') : 'Nunca'
  }

  if (loading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando clientes do banco de dados...</p>
            <p className="text-sm text-gray-500 mt-2">Testando múltiplas estratégias de carregamento...</p>
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
          Gestão de Clientes
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Área administrativa - Banco de dados MongoDB
        </p>
      </div>

      {/* Debug Info Detalhado */}
      {debugInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-blue-800 font-medium">Status de Carregamento</p>
              <p className="text-blue-700 text-sm">{debugInfo}</p>
              <button
                onClick={handleReload}
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tentar Novamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Erro na Conexão</p>
              <p className="text-red-700 text-sm">{error}</p>
              <button 
                onClick={handleReload} 
                className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status do Banco */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-green-800 font-medium">
                🗄️ MongoDB {customers.length > 0 ? 'CONECTADO' : 'Buscando...'}
              </p>
              <p className="text-green-600 text-sm">
                {stats.total} clientes • {stats.pessoaFisica} PF • {stats.pessoaJuridica} PJ
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleReload}
              className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Atualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ações Principais */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                Clientes Cadastrados
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Exibindo: {filteredCustomers.length} de {stats.total} clientes
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 sm:px-6 py-3 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Novo Cliente</span>
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Buscar clientes por nome, telefone, CPF/CNPJ ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
              {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 p-1 sm:p-2"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Nome Completo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Nome completo do cliente"
              />
            </div>

            {/* CPF/CNPJ e Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF/CNPJ *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cpfCnpj}
                  onChange={(e) => setFormData({...formData, cpfCnpj: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cliente *
                </label>
                <select
                  required
                  value={formData.customerType}
                  onChange={(e) => setFormData({...formData, customerType: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="pessoa_fisica">Pessoa Física</option>
                  <option value="pessoa_juridica">Pessoa Jurídica</option>
                </select>
              </div>
            </div>

            {/* Telefone e Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            {/* Endereço */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Rua, número, bairro"
              />
            </div>

            {/* Cidade, Estado e CEP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="Cidade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado *
                </label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="SP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CEP *
                </label>
                <input
                  type="text"
                  required
                  value={formData.zipCode}
                  onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="00000-000"
                />
              </div>
            </div>

            {/* Data de Nascimento */}
            {formData.customerType === 'pessoa_fisica' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
            )}

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base resize-none"
                placeholder="Observações adicionais (opcional)"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="w-full sm:flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{editingCustomer ? 'Atualizar' : 'Salvar'} Cliente</span>
              </button>
              
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Cancelar</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Clientes */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
        {filteredCustomers.length > 0 ? (
          <>
            {/* MOBILE: Cards */}
            <div className="block lg:hidden space-y-4">
              {filteredCustomers.map((customer) => (
                <div key={customer._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">
                        {customer.name}
                      </h3>
                      <div className="flex items-center text-xs text-gray-600 mb-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          customer.customerType === 'pessoa_fisica' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {customer.customerType === 'pessoa_fisica' ? 'PF' : 'PJ'}
                        </span>
                        <span className="ml-2">{customer.cpfCnpj}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 ml-3 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-700">
                      <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{customer.phone}</span>
                    </div>
                    
                    {customer.email && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    
                    <div className="flex items-start text-sm text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{customer.address}, {customer.city} - {customer.state}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP: Tabela */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Documento
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Endereço
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-gray-800">
                            {customer.name}
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            customer.customerType === 'pessoa_fisica' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {customer.customerType === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-800">
                            {customer.cpfCnpj}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-700">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {customer.phone}
                            </div>
                            {customer.email && (
                              <div className="flex items-center text-sm text-gray-700">
                                <Mail className="w-3 h-3 mr-1 text-gray-400" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-start text-sm text-gray-700">
                            <MapPin className="w-3 h-3 mr-1 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{customer.address}, {customer.city} - {customer.state}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(customer)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(customer._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {loading ? 'Carregando clientes...' : 'Nenhum cliente encontrado'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm 
                ? 'Tente ajustar os termos de busca' 
                : 'Verifique a conexão com o banco de dados'
              }
            </p>
            <button
              onClick={handleReload}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recarregar Dados</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomersManagement
