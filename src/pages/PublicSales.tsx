
import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Plus, Search, ShoppingCart, Trash2, UserPlus, Users } from 'lucide-react';
import { lumi } from '../lib/lumi';
import toast from 'react-hot-toast';
import { generateSalePDF, generateSaleImage } from '../utils/pdfGenerator';

interface Product {
  _id: string;
  code: string;
  name: string;
  unitPrice: number;
  stockQuantity: number;
  description?: string;
  category?: string;
  active?: boolean;
}

interface Customer {
  _id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface SaleProduct {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  observations?: string;
}

interface PaymentMethod {
  _id: string;
  name: string;
  value: string;
  active: boolean;
  order: number;
}

// Funções defensivas para evitar erros
const safeNumber = (value: any, defaultValue: number = 0): number => {
  const num = parseFloat(value);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

const safeToFixed = (value: any, decimals: number = 2): string => {
  const num = safeNumber(value);
  return num.toFixed(decimals);
};

const safeFormatCurrency = (value: any): string => {
  return `R$ ${safeToFixed(value, 2)}`;
};


// 🔢 FUNÇÃO PARA OBTER PRÓXIMO NÚMERO DE VENDA DO BANCO
const getNextSaleNumber = async (): Promise<number> => {
  try {
    console.log('🔢 Obtendo próximo número de venda do banco...');
    
    // Buscar todas as vendas ordenadas por saleNumber decrescente
    const response = await lumi.entities.sales.list({
      limit: 1,
      sort: { saleNumber: -1 }
    });
    
    if (response.list && response.list.length > 0 && response.list[0].saleNumber) {
      const lastNumber = response.list[0].saleNumber;
      console.log(`📊 Último número no banco: ${lastNumber}`);
      return lastNumber + 1;
    }
    
    // Se não houver vendas com saleNumber, contar total de vendas
    const allSalesResponse = await lumi.entities.sales.list({
      limit: 10000
    });
    const totalSales = allSalesResponse.list?.length || 0;
    console.log(`📊 Total de vendas no banco: ${totalSales}`);
    return totalSales + 1;
    
  } catch (error) {
    console.error('❌ Erro ao obter próximo número de venda:', error);
    // Fallback: usar timestamp
    return Date.now();
  }
};

// Função para formatar data para input date
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Função melhorada de normalização de texto
const normalizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove caracteres especiais, mantém apenas letras, números e espaços
    .trim();
};

const PublicSales: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saleProducts, setSaleProducts] = useState<SaleProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [customerType, setCustomerType] = useState<'registered' | 'guest'>('registered');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'em_andamento' | 'finalizada'>('em_andamento');
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'jpg'>('pdf');
  const [pendingSaleData, setPendingSaleData] = useState<any>(null);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    cpfCnpj: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    customerType: 'pessoa_fisica'
  });

  const [formData, setFormData] = useState({
    customerName: '',
    customerCpfCnpj: '',
    customerAddress: '',
    customerPhone: '',
    saleDate: formatDateForInput(new Date()), // Data atual como padrão
    deliveryDate: '',
    discountValue: 0,
    additionalValue: 0,
    paymentMethod: 'dinheiro',
    observations: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchPaymentMethods();
    loadSavedSale();
  }, []);

  // Salvar progresso da venda automaticamente
  useEffect(() => {
    if (saleProducts.length > 0 || formData.customerName || selectedCustomer) {
      saveSaleProgress();
    }
  }, [saleProducts, formData, selectedCustomer, customerType, selectedStatus]);

  const saveSaleProgress = () => {
    try {
      const progressData = {
        saleProducts,
        formData,
        selectedCustomer,
        customerType,
        selectedStatus,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('sale_in_progress', JSON.stringify(progressData));
      console.log('💾 Progresso da venda salvo automaticamente');
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
  };

  const loadSavedSale = () => {
    try {
      const savedData = localStorage.getItem('sale_in_progress');
      if (savedData) {
        const progressData = JSON.parse(savedData);
        
        // Restaurar dados salvos
        if (progressData.saleProducts && progressData.saleProducts.length > 0) {
          setSaleProducts(progressData.saleProducts);
        }
        
        if (progressData.formData) {
          setFormData(progressData.formData);
        }
        
        if (progressData.selectedCustomer) {
          setSelectedCustomer(progressData.selectedCustomer);
        }
        
        if (progressData.customerType) {
          setCustomerType(progressData.customerType);
        }
        
        if (progressData.selectedStatus) {
          setSelectedStatus(progressData.selectedStatus);
        }
        
        console.log('✅ Venda em andamento restaurada');
        toast.success('Venda em andamento restaurada!');
      }
    } catch (error) {
      console.error('Erro ao carregar venda salva:', error);
    }
  };

  const clearSavedSale = () => {
    try {
      localStorage.removeItem('sale_in_progress');
      console.log('🗑️ Progresso da venda limpo');
    } catch (error) {
      console.error('Erro ao limpar progresso:', error);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      console.log('🔄 Carregando produtos...');
      const response = await lumi.entities.products.list({
        filter: { active: true },
        sort: { name: 1 },
        limit: 1000
      });
      
      console.log('✅ Produtos carregados:', response.list?.length || 0);
      const productsList = response.list || [];
      
      // Validar dados dos produtos
      const validProducts = productsList.map(product => ({
        ...product,
        unitPrice: safeNumber(product.unitPrice),
        stockQuantity: safeNumber(product.stockQuantity),
        name: product.name || 'Produto sem nome',
        code: product.code || 'SEM CÓDIGO'
      }));
      
      setProducts(validProducts);
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await lumi.entities.customers.list({
        filter: { active: true },
        sort: { name: 1 },
        limit: 1000
      });

      console.log('Clientes carregados:', response.list?.length || 0);
      setCustomers(response.list || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await lumi.entities.payment_methods.list({
        filter: { active: true },
        sort: { order: 1 },
        limit: 100
      });

      console.log('Formas de pagamento carregadas:', response.list?.length || 0);
      setPaymentMethods(response.list || []);
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error);
      toast.error('Erro ao carregar formas de pagamento');
    }
  };

  // Função para adicionar produto à venda
  const addProductToSale = (product: Product, quantity: number = 1) => {
    try {
      console.log('🛒 Adicionando produto à venda:', product.name);
      
      // Verificar se há estoque suficiente
      if (safeNumber(product.stockQuantity) < quantity) {
        toast.error(`Estoque insuficiente. Disponível: ${product.stockQuantity}`);
        return;
      }

      // Verificar se o produto já está na venda
      const existingIndex = saleProducts.findIndex(item => item.productId === product._id);
      
      if (existingIndex >= 0) {
        // Produto já existe, aumentar quantidade
        const updatedProducts = [...saleProducts];
        const newQuantity = updatedProducts[existingIndex].quantity + quantity;
        
        if (safeNumber(product.stockQuantity) < newQuantity) {
          toast.error(`Estoque insuficiente. Máximo disponível: ${product.stockQuantity}`);
          return;
        }
        
        updatedProducts[existingIndex].quantity = newQuantity;
        updatedProducts[existingIndex].totalPrice = newQuantity * safeNumber(product.unitPrice);
        setSaleProducts(updatedProducts);
        toast.success(`Quantidade aumentada: ${product.name}`);
      } else {
        // Novo produto na venda
        const newSaleProduct: SaleProduct = {
          productId: product._id,
          productName: product.name,
          quantity: quantity,
          unitPrice: safeNumber(product.unitPrice),
          totalPrice: quantity * safeNumber(product.unitPrice),
          observations: ''
        };
        
        setSaleProducts([...saleProducts, newSaleProduct]);
        toast.success(`Produto adicionado: ${product.name}`);
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar produto:', error);
      toast.error('Erro ao adicionar produto à venda');
    }
  };

  // Função para remover produto da venda
  const removeProductFromSale = (index: number) => {
    try {
      const productName = saleProducts[index]?.productName || 'Produto';
      setSaleProducts(saleProducts.filter((_, i) => i !== index));
      toast.success(`${productName} removido da venda`);
    } catch (error) {
      console.error('❌ Erro ao remover produto:', error);
      toast.error('Erro ao remover produto');
    }
  };

  // Função para atualizar quantidade do produto na venda
  const updateProductQuantity = (index: number, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        removeProductFromSale(index);
        return;
      }

      const updatedProducts = [...saleProducts];
      const product = products.find(p => p._id === updatedProducts[index].productId);
      
      if (!product) {
        toast.error('Produto não encontrado');
        return;
      }

      if (newQuantity > safeNumber(product.stockQuantity)) {
        toast.error(`Estoque insuficiente. Máximo: ${product.stockQuantity}`);
        return;
      }

      updatedProducts[index].quantity = newQuantity;
      updatedProducts[index].totalPrice = newQuantity * safeNumber(updatedProducts[index].unitPrice);
      setSaleProducts(updatedProducts);
    } catch (error) {
      console.error('❌ Erro ao atualizar quantidade:', error);
      toast.error('Erro ao atualizar quantidade');
    }
  };

  // Função melhorada de filtro de clientes
  const filteredCustomers = customers.filter((customer) => {
    if (!customerSearch.trim()) return true;

    const searchTerm = normalizeText(customerSearch);
    console.log('🔍 Termo de busca normalizado:', searchTerm);
    
    // Normalizar dados do cliente
    const customerName = normalizeText(customer.name || '');
    const customerEmail = normalizeText(customer.email || '');
    
    // Para CPF/CNPJ e telefone, remover apenas caracteres não numéricos
    const customerCpfCnpj = (customer.cpfCnpj || '').replace(/[^\d]/g, '');
    const searchCpfCnpj = customerSearch.replace(/[^\d]/g, '');
    const customerPhone = (customer.phone || '').replace(/[^\d]/g, '');
    const searchPhone = customerSearch.replace(/[^\d]/g, '');

    console.log('🔍 Comparando:', {
      searchTerm,
      customerName,
      customerEmail,
      customerCpfCnpj,
      searchCpfCnpj,
      customerPhone,
      searchPhone
    });

    // Verificar se algum campo corresponde
    const nameMatch = customerName.includes(searchTerm);
    const emailMatch = customerEmail.includes(searchTerm);
    const cpfMatch = searchCpfCnpj && customerCpfCnpj.includes(searchCpfCnpj);
    const phoneMatch = searchPhone && customerPhone.includes(searchPhone);

    console.log('🔍 Matches:', { nameMatch, emailMatch, cpfMatch, phoneMatch });

    return nameMatch || emailMatch || cpfMatch || phoneMatch;
  });

  // Filtrar produtos para busca
  const filteredProducts = products.filter((product) => {
    if (!productSearch.trim()) return true;

    const searchTerm = normalizeText(productSearch);
    const productName = normalizeText(product.name);
    const productCode = normalizeText(product.code || '');
    const productCategory = normalizeText(product.category || '');

    return (
      productName.includes(searchTerm) ||
      productCode.includes(searchTerm) ||
      productCategory.includes(searchTerm)
    );
  });

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setFormData({
      ...formData,
      customerName: customer.name,
      customerCpfCnpj: customer.cpfCnpj,
      customerPhone: customer.phone,
      customerAddress: customer.address || ''
    });
  };

  const handleCustomerTypeChange = (type: 'registered' | 'guest') => {
    setCustomerType(type);
    setSelectedCustomer(null);
    setCustomerSearch('');

    if (type === 'guest') {
      setFormData({
        ...formData,
        customerName: 'Cliente Avulso',
        customerCpfCnpj: 'N/A',
        customerPhone: 'N/A',
        customerAddress: ''
      });
    } else {
      setFormData({
        ...formData,
        customerName: '',
        customerCpfCnpj: '',
        customerPhone: '',
        customerAddress: ''
      });
    }
  };

  const handleNewCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCustomerData.name || !newCustomerData.cpfCnpj || !newCustomerData.phone) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const customerData = {
        ...newCustomerData,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newCustomer = await lumi.entities.customers.create(customerData);
      toast.success('Cliente cadastrado com sucesso!');
      await fetchCustomers();
      selectCustomer(newCustomer);

      setNewCustomerData({
        name: '',
        cpfCnpj: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        customerType: 'pessoa_fisica'
      });
      setShowCustomerModal(false);

    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      toast.error('Erro ao cadastrar cliente');
    }
  };

  const calculateTotals = () => {
    const subtotal = saleProducts.reduce((sum, item) => sum + safeNumber(item.totalPrice), 0);
    const total = subtotal - safeNumber(formData.discountValue) + safeNumber(formData.additionalValue);
    return { subtotal, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Iniciando validações para registro de venda...');

    // Validações básicas
    if (saleProducts.length === 0) {
      console.log('❌ Validação falhou: Nenhum produto na venda');
      toast.error('Adicione pelo menos um produto à venda');
      return;
    }

    if (customerType === 'registered') {
      if (!formData.customerName || !formData.customerCpfCnpj || !formData.customerPhone) {
        console.log('❌ Validação falhou: Dados do cliente incompletos');
        toast.error('Preencha os dados obrigatórios do cliente');
        return;
      }
    }

    if (!formData.saleDate) {
      console.log('❌ Validação falhou: Data da venda não selecionada');
      toast.error('Selecione a data da venda');
      return;
    }

    // Abrir modal para escolher status da venda
    setShowStatusModal(true);
  };

  const confirmSubmit = async () => {
    setShowStatusModal(false);
    setLoading(true);
    
    try {
      console.log('📊 Calculando totais...');
      const { subtotal, total } = calculateTotals();
      
      console.log('🔢 Gerando número sequencial da venda...');
      const saleNumber = await getNextSaleNumber();
      console.log(`✅ Número da venda gerado: ${saleNumber}`);
      
      console.log('📝 Preparando dados da venda...');
      
      // Converter data selecionada para ISO string com hora 00:00:00
      const selectedDate = new Date(formData.saleDate + 'T00:00:00');
      const saleDateISO = selectedDate.toISOString();
      
      console.log('📅 Data selecionada pelo usuário:', formData.saleDate);
      console.log('📅 Data convertida para ISO:', saleDateISO);
      
      const saleData = {
        saleNumber: saleNumber, // 🔢 NÚMERO SEQUENCIAL PERMANENTE
        customerId: selectedCustomer?._id || null,
        customerName: formData.customerName,
        customerCpfCnpj: formData.customerCpfCnpj,
        customerAddress: formData.customerAddress,
        customerPhone: formData.customerPhone,
        customerType: customerType,
        products: saleProducts,
        date: saleDateISO, // Usar 'date' com a data selecionada pelo usuário
        saleDate: saleDateISO, // Manter compatibilidade
        deliveryDate: formData.deliveryDate || null,
        subtotalValue: subtotal,
        discountValue: safeNumber(formData.discountValue),
        additionalValue: safeNumber(formData.additionalValue),
        totalValue: total,
        paymentMethod: formData.paymentMethod,
        status: selectedStatus,
        observations: formData.observations,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('💾 Dados da venda preparados:', {
        ...saleData,
        products: saleData.products.length + ' produtos'
      });

      console.log('📤 Enviando venda para o banco de dados...');
      const newSale = await lumi.entities.sales.create(saleData);
      console.log('✅ Venda criada com sucesso:', newSale._id);

      console.log('📦 Atualizando estoque dos produtos...');
      let stockUpdateErrors = [];
      
      for (let i = 0; i < saleProducts.length; i++) {
        const item = saleProducts[i];
        console.log(`📦 Atualizando produto ${i + 1}/${saleProducts.length}: ${item.productName}`);
        
        try {
          const product = products.find((p) => p._id === item.productId);
          if (product) {
            const newStock = Math.max(0, safeNumber(product.stockQuantity) - item.quantity);
            console.log(`📦 Estoque ${product.name}: ${product.stockQuantity} → ${newStock}`);
            
            await lumi.entities.products.update(product._id, {
              stockQuantity: newStock,
              updatedAt: new Date().toISOString()
            });
            console.log(`✅ Estoque atualizado: ${product.name}`);
          } else {
            console.warn(`⚠️ Produto não encontrado para atualização: ${item.productId}`);
            stockUpdateErrors.push(`Produto ${item.productName} não encontrado`);
          }
        } catch (stockError) {
          console.error(`❌ Erro ao atualizar estoque do produto ${item.productName}:`, stockError);
          stockUpdateErrors.push(`Erro ao atualizar ${item.productName}: ${stockError.message}`);
        }
      }

      if (stockUpdateErrors.length > 0) {
        console.warn('⚠️ Alguns produtos tiveram problemas na atualização de estoque:', stockUpdateErrors);
        toast.error(`Venda registrada, mas houve problemas na atualização de estoque: ${stockUpdateErrors.join(', ')}`, {
          duration: 6000,
        });
      } else {
        console.log('✅ Todos os estoques atualizados com sucesso');
      }

      console.log('📄 Preparando dados da venda para download...');
      try {
        // Preparar dados para o PDF/JPG
        const downloadData = {
          ...newSale,
          saleNumber: saleNumber, // 🔢 INCLUIR NÚMERO DA VENDA
          id: newSale._id,
          date: saleData.saleDate,
          items: saleProducts.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            total: item.totalPrice, // Alias para compatibilidade
            observations: item.observations || ''
          })),
          total: total,
          totalValue: total,
          customer: selectedCustomer ? {
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            cpfCnpj: selectedCustomer.cpfCnpj,
            address: selectedCustomer.address
          } : null,
          observations: formData.observations,
          status: selectedStatus
        };

        console.log('📄 Dados preparados:', {
          id: downloadData.id,
          saleNumber: downloadData.saleNumber,
          itemsCount: downloadData.items.length,
          total: downloadData.total,
          customerName: downloadData.customer?.name || formData.customerName
        });

        // Guardar dados e mostrar modal de escolha de formato
        setPendingSaleData(downloadData);
        setShowFormatModal(true);
        
      } catch (error) {
        console.error('❌ Erro ao preparar dados:', error);
        toast.error('Venda registrada, mas houve erro ao preparar download: ' + error.message, {
          duration: 5000,
        });
      }

      console.log('🧹 Limpando formulário...');
      // Limpar formulário
      setFormData({
        customerName: '',
        customerCpfCnpj: '',
        customerAddress: '',
        customerPhone: '',
        saleDate: formatDateForInput(new Date()), // Resetar para data atual
        deliveryDate: '',
        discountValue: 0,
        additionalValue: 0,
        paymentMethod: 'dinheiro',
        observations: ''
      });
      setSaleProducts([]);
      setSelectedCustomer(null);
      setCustomerType('registered');
      setCustomerSearch('');
      setProductSearch('');
      setSelectedStatus('em_andamento');
      
      // Limpar venda salva do localStorage
      clearSavedSale();

      console.log('🔄 Recarregando produtos para atualizar estoque...');
      // Recarregar produtos para atualizar estoque
      await fetchProducts();
      console.log('✅ Processo completo finalizado com sucesso');
      
      // Notificação simples de sucesso
      toast.success('Venda concluída com sucesso!');

    } catch (error) {
      console.error('❌ ERRO CRÍTICO no processo de venda:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        name: error.name,
        cause: error.cause
      });
      
      toast.error(`Erro ao registrar venda: ${error.message}`);
    } finally {
      console.log('🏁 Finalizando processo (removendo loading)');
      setLoading(false);
    }
  };

  const { subtotal, total } = calculateTotals();

  return (
    <div className="sales-theme min-h-screen bg-[#07020d] px-2 py-4 sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-[1500px]">

        <div className="rounded-2xl bg-[#12081e]/95 p-4 shadow-[0_0_50px_rgba(219,39,119,0.18)] sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-3 border-b border-fuchsia-900/40 pb-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Nova Venda</h1>
            <div className="inline-flex items-center rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fuchsia-200">
              Ambiente de Vendas
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* NOVA SEÇÃO: Data da Venda */}
            <div className="bg-indigo-50 rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-indigo-800 mb-4 flex items-center">
                <Calendar className="mr-2" size={20} />
                Data da Venda
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data da Venda *
                  </label>
                  <input
                    type="date"
                    value={formData.saleDate}
                    onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Selecione quando a venda foi realizada
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="bg-white rounded-lg p-3 border-2 border-indigo-200">
                    <div className="text-sm text-indigo-700 font-medium">Data Selecionada:</div>
                    <div className="text-lg font-semibold text-indigo-800">
                      {formData.saleDate ? new Date(formData.saleDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não selecionada'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seleção de Tipo de Cliente */}
            <div className="bg-purple-50 rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-purple-800 mb-4">Tipo de Cliente</h2>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => handleCustomerTypeChange('registered')}
                  className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors ${
                    customerType === 'registered'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <Users size={18} className="sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Cliente Cadastrado</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCustomerTypeChange('guest')}
                  className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors ${
                    customerType === 'guest'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <UserPlus size={18} className="sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Cliente Avulso</span>
                </button>
              </div>

              {/* Seleção de Cliente Cadastrado */}
              {customerType === 'registered' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buscar Cliente {loadingCustomers && <span className="text-blue-500">(Carregando...)</span>}
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => {
                            console.log('🔍 Valor de busca alterado:', e.target.value);
                            setCustomerSearch(e.target.value);
                          }}
                          placeholder="Digite nome, CPF/CNPJ ou telefone..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Total de clientes: {customers.length} | Encontrados: {filteredCustomers.length}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base whitespace-nowrap"
                    >
                      <UserPlus size={16} className="sm:w-4 sm:h-4" />
                      <span>Novo Cliente</span>
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={fetchCustomers}
                      disabled={loadingCustomers}
                      className="text-sm text-purple-600 hover:text-purple-800 underline disabled:opacity-50"
                    >
                      {loadingCustomers ? 'Atualizando...' : 'Atualizar lista de clientes'}
                    </button>
                  </div>

                  {(customerSearch.trim() || !selectedCustomer) && (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer._id}
                          onClick={() => selectCustomer(customer)}
                          className={`p-3 sm:p-4 border-b border-gray-100 cursor-pointer hover:bg-purple-50 transition-colors ${
                            selectedCustomer?._id === customer._id ? 'bg-purple-100' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-800 text-sm sm:text-base">{customer.name}</div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            {customer.cpfCnpj} • {customer.phone}
                          </div>
                          {customer.address && (
                            <div className="text-xs sm:text-sm text-gray-500 mt-1">{customer.address}</div>
                          )}
                        </div>
                      ))}
                      {filteredCustomers.length === 0 && customerSearch.trim() && (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          <div>Nenhum cliente encontrado para "{customerSearch}"</div>
                          <button
                            type="button"
                            onClick={fetchCustomers}
                            className="text-purple-600 hover:text-purple-800 underline mt-2"
                          >
                            Atualizar lista
                          </button>
                        </div>
                      )}
                      {filteredCustomers.length === 0 && !customerSearch.trim() && customers.length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Nenhum cliente cadastrado no sistema
                        </div>
                      )}
                    </div>
                  )}

                  {selectedCustomer && (
                    <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-purple-300">
                      <div className="font-medium text-purple-800 mb-2 text-sm">Cliente Selecionado:</div>
                      <div className="text-base sm:text-lg font-semibold">{selectedCustomer.name}</div>
                      <div className="text-gray-600 text-sm">{selectedCustomer.cpfCnpj} • {selectedCustomer.phone}</div>
                      {selectedCustomer.address && (
                        <div className="text-gray-500 text-sm mt-1">{selectedCustomer.address}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Informação para Cliente Avulso */}
              {customerType === 'guest' && (
                <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-semibold text-purple-800">Cliente Avulso Selecionado</div>
                    <div className="text-gray-600 mt-2 text-sm sm:text-base">
                      Nenhuma informação pessoal será coletada para este tipo de venda
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dados do Cliente - Apenas para Cliente Cadastrado */}
            {customerType === 'registered' && (
              <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-blue-800 mb-4">Dados do Cliente</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      required
                      disabled={selectedCustomer}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CPF/CNPJ *
                    </label>
                    <input
                      type="text"
                      value={formData.customerCpfCnpj}
                      onChange={(e) => setFormData({ ...formData, customerCpfCnpj: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      required
                      disabled={selectedCustomer}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone *
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      required
                      disabled={selectedCustomer}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Previsão de Entrega
                    </label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                  
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endereço Completo
                    </label>
                    <textarea
                      value={formData.customerAddress}
                      onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                      rows={2}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      disabled={selectedCustomer}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Campo de Previsão de Entrega para Cliente Avulso */}
            {customerType === 'guest' && (
              <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-blue-800 mb-4">Informações da Venda</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Previsão de Entrega (opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>
            )}

            {/* NOVA SEÇÃO: Produtos Disponíveis */}
            <div className="bg-green-50 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-green-800 mb-2 sm:mb-0">Produtos Disponíveis</h2>
                <button
                  type="button"
                  onClick={fetchProducts}
                  disabled={loadingProducts}
                  className="text-sm text-green-600 hover:text-green-800 underline disabled:opacity-50"
                >
                  {loadingProducts ? 'Atualizando...' : 'Atualizar produtos'}
                </button>
              </div>

              {/* Busca de Produtos */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar produtos por nome, código ou categoria..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Total de produtos: {products.length} | Encontrados: {filteredProducts.length}
                </div>
              </div>

              {/* Lista de Produtos */}
              {loadingProducts ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <p className="mt-2 text-gray-600">Carregando produtos...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div key={product._id} className="bg-white rounded-lg p-4 border border-green-200 hover:border-green-400 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 text-sm">{product.name}</h3>
                          <p className="text-xs text-gray-600">{product.code}</p>
                          {product.category && (
                            <p className="text-xs text-gray-500">{product.category}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{safeFormatCurrency(product.unitPrice)}</p>
                          <p className={`text-xs ${safeNumber(product.stockQuantity) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Estoque: {safeNumber(product.stockQuantity)}
                          </p>
                        </div>
                      </div>
                      
                      {product.description && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => addProductToSale(product, 1)}
                          disabled={safeNumber(product.stockQuantity) <= 0}
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                        >
                          <ShoppingCart size={14} />
                          <span>Adicionar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addProductToSale(product, 1)}
                          disabled={safeNumber(product.stockQuantity) <= 0}
                          className="bg-green-100 text-green-700 px-2 py-2 rounded text-xs hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredProducts.length === 0 && !loadingProducts && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      {productSearch.trim() ? (
                        <div>
                          <p>Nenhum produto encontrado para "{productSearch}"</p>
                          <button
                            type="button"
                            onClick={() => setProductSearch('')}
                            className="text-green-600 hover:text-green-800 underline mt-2"
                          >
                            Limpar busca
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p>Nenhum produto cadastrado no sistema</p>
                          <p className="text-sm mt-1">Cadastre produtos na seção de administração</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Produtos na Venda */}
            <div className="bg-orange-50 rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-orange-800">Produtos na Venda</h2>
                <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-sm font-medium">
                  {saleProducts.length} {saleProducts.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {saleProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Nenhum produto adicionado à venda</p>
                  <p className="text-sm mt-1">Use a seção "Produtos Disponíveis" acima para adicionar itens</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {saleProducts.map((item, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 sm:p-4 border border-orange-200">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{item.productName}</h3>
                            <p className="text-sm text-gray-600">Valor unitário: {safeFormatCurrency(item.unitPrice)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProductFromSale(index)}
                            className="text-red-500 hover:text-red-700 p-2"
                            title="Remover produto"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantidade
                            </label>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => updateProductQuantity(index, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1}
                                className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                                  item.quantity <= 1 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                                title={item.quantity <= 1 ? 'Quantidade mínima atingida' : 'Diminuir quantidade'}
                              >
                                <span className="text-lg font-bold">−</span>
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 1;
                                  updateProductQuantity(index, value);
                                }}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const product = products.find(p => p._id === item.productId);
                                  const maxStock = safeNumber(product?.stockQuantity, 0);
                                  if (item.quantity < maxStock) {
                                    updateProductQuantity(index, item.quantity + 1);
                                  } else {
                                    toast.error(`Estoque máximo atingido! Disponível: ${maxStock}`);
                                  }
                                }}
                                disabled={(() => {
                                  const product = products.find(p => p._id === item.productId);
                                  const maxStock = safeNumber(product?.stockQuantity, 0);
                                  return item.quantity >= maxStock;
                                })()}
                                className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                                  (() => {
                                    const product = products.find(p => p._id === item.productId);
                                    const maxStock = safeNumber(product?.stockQuantity, 0);
                                    return item.quantity >= maxStock;
                                  })()
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                                }`}
                                title={(() => {
                                  const product = products.find(p => p._id === item.productId);
                                  const maxStock = safeNumber(product?.stockQuantity, 0);
                                  return item.quantity >= maxStock ? `Estoque máximo: ${maxStock}` : 'Aumentar quantidade';
                                })()}
                              >
                                <span className="text-lg font-bold">+</span>
                              </button>
                              <span className={`text-xs whitespace-nowrap ${
                                (() => {
                                  const product = products.find(p => p._id === item.productId);
                                  const maxStock = safeNumber(product?.stockQuantity, 0);
                                  return item.quantity >= maxStock ? 'text-orange-600 font-medium' : 'text-gray-500';
                                })()
                              }`}>
                                Est: {(() => {
                                  const product = products.find(p => p._id === item.productId);
                                  return safeNumber(product?.stockQuantity, 0);
                                })()}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Valor Unitário
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const updatedProducts = [...saleProducts];
                                const value = parseFloat(e.target.value) || 0;
                                updatedProducts[index].unitPrice = value;
                                updatedProducts[index].totalPrice = updatedProducts[index].quantity * value;
                                setSaleProducts(updatedProducts);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total
                            </label>
                            <div className="text-lg font-bold text-orange-600 py-2">
                              {safeFormatCurrency(item.totalPrice)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observações do Produto
                          </label>
                          <textarea
                            value={item.observations || ''}
                            onChange={(e) => {
                              const updatedProducts = [...saleProducts];
                              updatedProducts[index].observations = e.target.value;
                              setSaleProducts(updatedProducts);
                            }}
                            rows={2}
                            placeholder="Ex: cor, tamanho, detalhes específicos..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Valores e Pagamento */}
            <div className="bg-yellow-50 rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-yellow-800 mb-4">Valores e Pagamento</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: safeNumber(e.target.value) })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Acréscimo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.additionalValue}
                    onChange={(e) => setFormData({ ...formData, additionalValue: safeNumber(e.target.value) })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm sm:text-base"
                  >
                    {paymentMethods.length === 0 ? (
                      <option value="">Carregando...</option>
                    ) : (
                      paymentMethods.map((method) => (
                        <option key={method._id} value={method.value}>
                          {method.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-6 bg-white rounded-lg p-4 border-2 border-yellow-300">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span>Subtotal:</span>
                    <span>{safeFormatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span>Desconto:</span>
                    <span className="text-red-600">- {safeFormatCurrency(formData.discountValue)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span>Acréscimo:</span>
                    <span className="text-green-600">+ {safeFormatCurrency(formData.additionalValue)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between items-center text-xl sm:text-2xl font-bold text-yellow-800">
                    <span>Total:</span>
                    <span>{safeFormatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações Gerais
              </label>
              <textarea
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={3}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Informações adicionais sobre a venda..."
              />
            </div>

            {/* Botão de Submissão */}
            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={loading || saleProducts.length === 0}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg font-semibold"
              >
                <FileText size={18} className="sm:w-5 sm:h-5" />
                <span>{loading ? 'Processando...' : 'Finalizar Venda'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Novo Cliente */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Cadastrar Novo Cliente</h2>
            
            <form onSubmit={handleNewCustomerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF/CNPJ *
                  </label>
                  <input
                    type="text"
                    value={newCustomerData.cpfCnpj}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, cpfCnpj: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={newCustomerData.address}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={newCustomerData.city}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={newCustomerData.state}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, state: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
                >
                  Cadastrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Formato (PDF ou JPG) */}
      {showFormatModal && pendingSaleData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 sm:p-8 max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Escolha o Formato de Download</h2>
            <p className="text-gray-600 mb-6">Como você deseja baixar a nota de venda?</p>
            
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => setSelectedFormat('pdf')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedFormat === 'pdf'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-semibold text-gray-800">📄 PDF</div>
                    <div className="text-sm text-gray-600">Formato PDF (recomendado)</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    selectedFormat === 'pdf'
                      ? 'bg-red-500 border-red-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedFormat === 'pdf' && (
                      <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('jpg')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedFormat === 'jpg'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-semibold text-gray-800">🖼️ JPG</div>
                    <div className="text-sm text-gray-600">Formato de imagem</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    selectedFormat === 'jpg'
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedFormat === 'jpg' && (
                      <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowFormatModal(false);
                  setPendingSaleData(null);
                  // Notificação simples de sucesso
                  toast.success('Venda concluída com sucesso!');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Pular Download
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    if (selectedFormat === 'pdf') {
                      generateSalePDF(pendingSaleData);
                      toast.success('PDF gerado com sucesso!');
                    } else {
                      generateSaleImage(pendingSaleData);
                      toast.success('Imagem JPG gerada com sucesso!');
                    }
                  } catch (error) {
                    console.error('❌ Erro ao gerar arquivo:', error);
                    toast.error('Erro ao gerar arquivo: ' + error.message);
                  }
                  setShowFormatModal(false);
                  setPendingSaleData(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Baixar {selectedFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Status */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 sm:p-8 max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Escolha o Status da Venda</h2>
            <p className="text-gray-600 mb-6">Selecione como deseja registrar esta venda:</p>
            
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => setSelectedStatus('em_andamento')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedStatus === 'em_andamento'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-300 hover:border-yellow-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-semibold text-gray-800">Em Andamento</div>
                    <div className="text-sm text-gray-600">Venda ainda não foi concluída</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    selectedStatus === 'em_andamento'
                      ? 'bg-yellow-500 border-yellow-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedStatus === 'em_andamento' && (
                      <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('finalizada')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedStatus === 'finalizada'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-semibold text-gray-800">Finalizada</div>
                    <div className="text-sm text-gray-600">Venda já foi concluída</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    selectedStatus === 'finalizada'
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedStatus === 'finalizada' && (
                      <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Confirmar e Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicSales;
