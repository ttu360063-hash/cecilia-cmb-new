
import jsPDF from 'jspdf'
import { lumi } from '../lib/lumi'

interface Product {
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface SaleData {
  _id: string
  customerName: string
  customerPhone: string
  customerCpfCnpj: string
  customerAddress: string
  products: Product[]
  totalValue: number
  saleDate: string // Data da venda selecionada pelo usuário
  createdAt: string
  observations?: string
  status: string
  paymentMethod?: string // NOVO CAMPO
}

// NOVA FUNÇÃO: Formatação de data SEM problemas de timezone
const formatDateForPDF = (dateString: string): string => {
  if (!dateString) return new Date().toLocaleDateString('pt-BR')
  
  try {
    // Se a data está no formato YYYY-MM-DD (do input date)
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-')
      // CORREÇÃO: Criar data local sem conversão de timezone
      return `${day}/${month}/${year}`
    }
    
    // Se a data tem horário ISO (YYYY-MM-DDTHH:mm:ss.sssZ)
    if (dateString.includes('T')) {
      const dateOnly = dateString.split('T')[0]
      const [year, month, day] = dateOnly.split('-')
      // CORREÇÃO: Retornar data formatada diretamente
      return `${day}/${month}/${year}`
    }
    
    // Fallback para outros formatos
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
    
  } catch (error) {
    console.error('Erro ao formatar data:', error)
    return new Date().toLocaleDateString('pt-BR')
  }
}

// NOVA FUNÇÃO: Formatação da forma de pagamento
const formatPaymentMethod = (paymentMethod: string): string => {
  const paymentMethods = {
    'dinheiro': 'Dinheiro',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'pix': 'PIX',
    'transferencia': 'Transferência Bancária',
    'cheque': 'Cheque',
    'boleto': 'Boleto Bancário',
    'parcelado': 'Parcelado'
  }
  
  return paymentMethods[paymentMethod] || paymentMethod || 'Não informado'
}

// 🖼️ NOVA FUNÇÃO: Gerar venda como imagem JPG
export const generateSaleImage = async (sale: any, customers?: any[]) => {
  console.log('🖼️ Iniciando geração da IMAGEM JPG...')
  
  try {
    // Criar PDF temporariamente
    const doc = await createSaleDocument(sale, customers)
    
    // Preparar nome do arquivo
    const customerName = sale.customer?.name || sale.customerName || 'Cliente'
    const noteNumber = sale.saleNumber ? String(sale.saleNumber).padStart(4, '0') : '????'
    const fileName = `Nota_${noteNumber}_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
    
    console.log(`📄 Nome do arquivo: ${fileName}`)
    
    // Obter número de páginas
    const pageCount = doc.getNumberOfPages()
    console.log(`📄 Número de páginas: ${pageCount}`)
    
    // Processar cada página
    for (let i = 1; i <= pageCount; i++) {
      console.log(`🖼️ Processando página ${i} de ${pageCount}...`)
      
      doc.setPage(i)
      
      // Criar canvas diretamente do conteúdo do PDF
      const canvas = document.createElement('canvas')
      
      // Dimensões A4 em alta resolução (300 DPI)
      const width = 2480  // 210mm a 300 DPI
      const height = 3508 // 297mm a 300 DPI
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        console.error('❌ Não foi possível obter contexto do canvas')
        throw new Error('Contexto do canvas não disponível')
      }
      
      // Preencher fundo branco
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, width, height)
      
      console.log('✅ Canvas criado com fundo branco')
      
      // Renderizar o conteúdo do PDF no canvas usando output datauri
      try {
        const imgData = doc.output('datauristring', { returnPromise: false })
        
        // Criar imagem temporária para carregar o PDF
        const tempImg = new Image()
        
        await new Promise<void>((resolveImg, rejectImg) => {
          tempImg.onload = () => {
            console.log(`✅ PDF carregado como imagem: ${tempImg.width}x${tempImg.height}`)
            
            // Desenhar a imagem do PDF no canvas
            ctx.drawImage(tempImg, 0, 0, width, height)
            console.log('✅ PDF renderizado no canvas')
            resolveImg()
          }
          
          tempImg.onerror = () => {
            console.error('❌ Erro ao carregar PDF como imagem')
            rejectImg(new Error('Erro ao carregar PDF como imagem'))
          }
          
          // Definir source (inicia carregamento)
          tempImg.src = imgData
        })
        
      } catch (error) {
        console.error('❌ Erro ao renderizar PDF:', error)
        throw error
      }
      
      // Converter canvas para blob JPG
      const blob = await new Promise<Blob>((resolveBlob, rejectBlob) => {
        canvas.toBlob((result) => {
          if (!result) {
            rejectBlob(new Error('Erro ao converter canvas para blob'))
            return
          }
          console.log(`✅ Blob criado, tamanho: ${result.size} bytes`)
          resolveBlob(result)
        }, 'image/jpeg', 0.95)
      })
      
      // Criar URL do blob
      const url = URL.createObjectURL(blob)
      
      // Criar link de download
      const link = document.createElement('a')
      link.href = url
      link.download = pageCount > 1 
        ? fileName.replace('.jpg', `_pagina_${i}.jpg`) 
        : fileName
      
      // Forçar download
      link.style.display = 'none'
      document.body.appendChild(link)
      
      console.log(`📥 Iniciando download: ${link.download}`)
      link.click()
      
      // Limpar após pequeno delay
      await new Promise(resolve => setTimeout(resolve, 100))
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log(`✅ Imagem JPG ${i} de ${pageCount} baixada com sucesso!`)
    }
    
    console.log('✅ Todas as páginas foram processadas e baixadas!')
    
  } catch (error) {
    console.error('❌ ERRO ao gerar imagem JPG:', error)
    alert('Erro ao gerar imagem JPG. Verifique o console para mais detalhes.')
    throw error
  }
}

// 📄 Função auxiliar para criar documento (usada por PDF e imagem)
const createSaleDocument = async (sale: any, customers?: any[]): Promise<jsPDF> => {
  console.log('📄 Criando documento da venda...')
  console.log('🔍 DEBUG - DADOS DA VENDA RECEBIDOS:', JSON.stringify(sale, null, 2))
  console.log('🔍 DEBUG - DADOS DO CLIENTE:', sale.customer)
  console.log('🔍 DEBUG - NOME DO CLIENTE:', sale.customer?.name || sale.customerName)
  console.log('🔍 DEBUG - ITENS DA VENDA:', sale.items)
  console.log('🔍 DEBUG - PRODUTOS DA VENDA:', sale.products)
  
  // Usar número da venda passado como parâmetro (obrigatório)
  let noteNumber: string
  
  if (sale.saleNumber) {
    // Formatar o número com 4 dígitos (ex: 0001, 0002, 0112, etc.)
    noteNumber = String(sale.saleNumber).padStart(4, '0')
    console.log(`🔢 Usando número da venda: ${noteNumber} (original: ${sale.saleNumber})`)
  } else {
    // Fallback de emergência: usar "???" se não houver número
    noteNumber = '????'
    console.error('❌ ERRO: sale.saleNumber não encontrado! Todas as vendas devem ter saleNumber após migração.')
    console.error('🔍 Dados da venda:', sale)
  }
  
  const doc = new jsPDF()
  const products = sale.items || sale.products || []
  const hasMoreThan5Products = products.length > 5
  
  console.log(`📦 Produtos na venda: ${products.length}`)
  console.log(`📑 Será gerado em ${hasMoreThan5Products ? '2 páginas' : '1 página'}`)
  console.log(`💳 Forma de pagamento: ${sale.paymentMethod || 'Não informado'}`)
  
  // Função para criar uma via da nota
  const createVia = (viaTitle: string, startY: number = 20, isVendorVia: boolean = false) => {
    let currentY = startY
    
    // Cabeçalho da empresa - NOME ATUALIZADO
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('CECILIA CAMA MESA E BANHO', 105, currentY, { align: 'center' })
    currentY += 10
    
    // Telefone - NÚMERO ATUALIZADO
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Contato: (79) 99882-2376', 105, currentY, { align: 'center' })
    currentY += 10
    
    // Título da via
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(viaTitle, 105, currentY, { align: 'center' })
    currentY += 8
    
    // Linha separadora
    doc.setLineWidth(0.5)
    doc.line(15, currentY, 195, currentY)
    currentY += 8
    
    // Informações da venda
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    // NUMERAÇÃO SEQUENCIAL - usando o número obtido do banco
    doc.text(`Nota Nº: ${noteNumber}`, 15, currentY)
    
    // CORREÇÃO DEFINITIVA: Usar nova função que não tem problema de timezone
    const saleDate = sale.saleDate || sale.date || sale.createdAt || new Date().toISOString()
    doc.text(`Data: ${formatDateForPDF(saleDate)}`, 140, currentY)
    currentY += 6
    
    // QUANTIDADE DE PRODUTOS (LADO ESQUERDO)
    doc.setFont('helvetica', 'bold')
    doc.text(`Quantidade de produtos: ${products.length}`, 15, currentY)
    
    // 💳 FORMA DE PAGAMENTO (LADO DIREITO, MESMA LINHA)
    doc.setFontSize(10)
    const paymentMethodText = formatPaymentMethod(sale.paymentMethod)
    doc.text(`FORMA DE PAGAMENTO: ${paymentMethodText}`, 140, currentY)
    currentY += 6
    
    // STATUS (LOGO APÓS FORMA DE PAGAMENTO, DO LADO DIREITO)
    const statusText = getStatusText(sale.status)
    doc.text(`Status: ${statusText}`, 140, currentY)
    doc.setFont('helvetica', 'normal')
    currentY += 10
    
    // Dados do cliente (completos para cliente, resumidos para vendedor)
    if (!isVendorVia || hasMoreThan5Products) {
      doc.setFont('helvetica', 'bold')
      doc.text('DADOS DO CLIENTE:', 15, currentY)
      currentY += 6
      
      doc.setFont('helvetica', 'normal')
      const customerName = sale.customer?.name || sale.customerName || 'Cliente não informado'
      doc.text(`Nome: ${customerName}`, 15, currentY)
      currentY += 5
      
      const customerPhone = sale.customer?.phone || sale.customerPhone || 'Não informado'
      doc.text(`Telefone: ${customerPhone}`, 15, currentY)
      currentY += 5
      
      const customerCpf = sale.customer?.cpfCnpj || sale.customerCpfCnpj || 'Não informado'
      doc.text(`CPF/CNPJ: ${customerCpf}`, 15, currentY)
      currentY += 5
      
      // Endereço (quebra de linha se necessário)
      const customerAddress = sale.customer?.address || sale.customerAddress
      if (customerAddress && customerAddress.trim()) {
        const addressLines = doc.splitTextToSize(`Endereço: ${customerAddress}`, 175)
        doc.text(addressLines, 15, currentY)
        currentY += addressLines.length * 5
      }
      currentY += 5
    } else {
      // Via do vendedor com dados resumidos (menos de 5 produtos)
      doc.setFont('helvetica', 'normal')
      const customerName = sale.customer?.name || sale.customerName || 'Cliente não informado'
      doc.text(`Cliente: ${customerName}`, 15, currentY)
      currentY += 8
    }
    
    // Produtos
    doc.setFont('helvetica', 'bold')
    doc.text('PRODUTOS:', 15, currentY)
    currentY += 8
    
    // Cabeçalho da tabela de produtos
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ITEM', 15, currentY)
    doc.text('QTD', 120, currentY)
    doc.text('VALOR UNIT.', 140, currentY)
    doc.text('TOTAL', 170, currentY)
    currentY += 3
    
    // Linha da tabela
    doc.setLineWidth(0.3)
    doc.line(15, currentY, 195, currentY)
    currentY += 6
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    
    products.forEach((product, index) => {
      // Nome do produto com observações na mesma linha
      const productName = product.productName || product.name || 'Produto não informado'
      const observations = product.observations && product.observations.trim() 
        ? ` (${product.observations})` 
        : ''
      const fullProductText = productName + observations
      
      // Quebrar texto se for muito longo (nome + observações)
      const productTextLines = doc.splitTextToSize(fullProductText, 100)
      doc.text(productTextLines, 15, currentY)
      
      // Alinhar outros campos na mesma linha do primeiro nome
      doc.text(product.quantity.toString(), 120, currentY)
      const unitPrice = product.unitPrice || 0
      const totalPrice = product.total || product.totalPrice || 0
      doc.text(`R$ ${unitPrice.toFixed(2)}`, 140, currentY)
      doc.text(`R$ ${totalPrice.toFixed(2)}`, 170, currentY)
      
      // Ajustar currentY baseado no número de linhas do texto completo
      currentY += Math.max(productTextLines.length * 4, 6)
    })
    
    currentY += 5
    
    // Linha separadora antes do total
    doc.setLineWidth(0.5)
    doc.line(15, currentY, 195, currentY)
    currentY += 8
    
    // Total
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    const totalValue = sale.total || sale.totalValue || 0
    doc.text(`TOTAL GERAL: R$ ${totalValue.toFixed(2)}`, 140, currentY)
    currentY += 8
    
    // Retornar a posição Y final para calcular próxima via
    return currentY
  }
  
  // Criar primeira via (Cliente)
  console.log('📄 Criando via do cliente...')
  const clientViaEndY = createVia('VIA DO CLIENTE', 20, false)
  
  if (hasMoreThan5Products) {
    // Se tem mais de 5 produtos, criar via do vendedor em nova página
    console.log('📄 Criando via do vendedor em nova página...')
    doc.addPage()
    createVia('VIA DO VENDEDOR', 20, true)
  } else {
    // Se tem 5 ou menos produtos, criar na mesma página com espaçamento adequado
    console.log('📄 Criando via do vendedor na mesma página...')
    const separatorY = Math.max(clientViaEndY + 8, 148) // Garantir espaço mínimo
    
    // Linha divisória com mais espaço
    doc.setLineWidth(1)
    doc.setDrawColor(100, 100, 100)
    doc.setLineDashPattern([3, 3], 0)
    doc.line(10, separatorY, 200, separatorY)
    
    // Texto "corte aqui" na linha divisória
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text('✂ CORTE AQUI ✂', 105, separatorY + 3, { align: 'center' })
    
    // Resetar cor do texto
    doc.setTextColor(0, 0, 0)
    doc.setLineDashPattern([], 0)
    
    // Criar segunda via na mesma página (VIA DO VENDEDOR) com posição calculada
    const vendorStartY = separatorY + 10
    createVia('VIA DO VENDEDOR', vendorStartY, true)
  }
  
  return doc
}

// 📄 FUNÇÃO PRINCIPAL: Gerar venda como PDF
export const generateSalePDF = async (sale: any, customers?: any[]) => {
  console.log('📄 Iniciando geração do PDF...')
  const doc = await createSaleDocument(sale, customers)
  
  // Salvar o PDF
  const customerName = sale.customer?.name || sale.customerName || 'Cliente'
  const noteNumber = sale.saleNumber ? String(sale.saleNumber).padStart(4, '0') : '????'
  const fileName = `Nota_${noteNumber}_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  
  console.log(`💾 Salvando PDF: ${fileName}`)
  doc.save(fileName)
  console.log('✅ PDF gerado com sucesso!')
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'em_andamento': return 'Em Andamento'
    case 'enviado': return 'Enviado'
    case 'entregue': return 'Entregue'
    case 'cancelado': return 'Cancelado'
    default: return status
  }
}
