
import jsPDF from 'jspdf'
import { format, startOfMonth, endOfMonth, isWithinInterval, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Expense {
  _id: string
  description: string
  amount: number
  category: string
  date: string
  paymentMethod?: string
  notes?: string
  createdAt: string
}

interface Sale {
  _id: string
  totalValue: number
  createdAt: string
  customerName: string
  customerPhone: string
  customerCpfCnpj: string
  products: Array<{
    productName: string
    quantity: number
    totalPrice: number
  }>
}

interface ReportData {
  weeklyRevenue: number
  monthlyRevenue: number
  yearlyRevenue: number
  weeklyExpenses: number
  monthlyExpenses: number
  yearlyExpenses: number
  totalCustomers: number
  topProducts: Array<{
    name: string
    totalSold: number
    revenue: number
    salesCount: number
  }>
  customerHistory: Array<{
    customerName: string
    customerPhone: string
    totalPurchases: number
    totalSpent: number
    lastPurchase: string
  }>
  stockReport: Array<{
    name: string
    code: string
    stockQuantity: number
    category: string
  }>
  expenses: Expense[]
  sales: Sale[]
}

// Função para criar gráfico de pizza
const createPieChart = (data: Array<{name: string, value: number, color: string}>, width: number, height: number, title: string): string => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  
  const centerX = width / 2
  const centerY = height / 2 + 20
  const radius = Math.min(width, height) / 4
  
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 16px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(title, centerX, 20)
  
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  if (total === 0) {
    ctx.fillStyle = '#666666'
    ctx.font = '14px Arial'
    ctx.fillText('Sem dados disponíveis', centerX, centerY)
    return canvas.toDataURL('image/png')
  }
  
  let currentAngle = -Math.PI / 2
  
  data.forEach(item => {
    const sliceAngle = (item.value / total) * 2 * Math.PI
    
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
    ctx.fillStyle = item.color
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    
    if (sliceAngle > 0.1) {
      const labelAngle = currentAngle + sliceAngle / 2
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7)
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7)
      
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${((item.value / total) * 100).toFixed(0)}%`, labelX, labelY)
    }
    
    currentAngle += sliceAngle
  })
  
  const legendStartY = centerY + radius + 30
  const legendItemHeight = 18
  const legendWidth = width * 0.8
  const legendX = (width - legendWidth) / 2
  
  ctx.font = '12px Arial'
  ctx.textAlign = 'left'
  
  data.forEach((item, index) => {
    const y = legendStartY + (index * legendItemHeight)
    
    ctx.fillStyle = item.color
    ctx.fillRect(legendX, y - 8, 12, 12)
    
    ctx.fillStyle = '#000000'
    ctx.fillText(`${item.name}: ${item.value}`, legendX + 18, y)
  })
  
  return canvas.toDataURL('image/png')
}

// Função para criar gráfico de colunas
const createColumnChart = (data: Array<{name: string, value: number, color: string}>, width: number, height: number, title: string): string => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 16px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(title, width / 2, 20)
  
  if (data.length === 0) {
    ctx.fillStyle = '#666666'
    ctx.font = '14px Arial'
    ctx.fillText('Sem dados disponíveis', width / 2, height / 2)
    return canvas.toDataURL('image/png')
  }
  
  const chartArea = {
    x: 50,
    y: 40,
    width: width - 100,
    height: height - 100
  }
  
  const maxValue = Math.max(...data.map(d => d.value))
  const columnWidth = chartArea.width / data.length * 0.6
  const spacing = chartArea.width / data.length * 0.4
  
  data.forEach((item, index) => {
    const columnHeight = maxValue > 0 ? (item.value / maxValue) * chartArea.height : 0
    const x = chartArea.x + (index * (columnWidth + spacing)) + spacing / 2
    const y = chartArea.y + chartArea.height - columnHeight
    
    ctx.fillStyle = item.color
    ctx.fillRect(x, y, columnWidth, columnHeight)
    
    ctx.fillStyle = '#000000'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(item.value.toString(), x + columnWidth / 2, y - 5)
    
    ctx.save()
    ctx.translate(x + columnWidth / 2, chartArea.y + chartArea.height + 20)
    ctx.textAlign = 'center'
    ctx.font = '10px Arial'
    ctx.fillText(item.name.substring(0, 10), 0, 0)
    ctx.restore()
  })
  
  return canvas.toDataURL('image/png')
}

// Função para adicionar cabeçalho padrão
const addHeader = (doc: jsPDF, title: string) => {
  const pageWidth = doc.internal.pageSize.width
  let yPosition = 20

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('SÔNIA CECÍLIA LTDA', pageWidth / 2, yPosition, { align: 'center' })
  
  yPosition += 6
  doc.setFontSize(14)
  doc.text('CAMA, MESA E BANHO', pageWidth / 2, yPosition, { align: 'center' })
  
  yPosition += 10
  doc.setFontSize(16)
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' })
  
  yPosition += 5
  doc.setFontSize(9)
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' })
  
  return yPosition + 20
}

// Função para adicionar gráfico com posicionamento automático
const addChartToPage = (doc: jsPDF, chartImage: string, yPosition: number, chartWidth: number = 160, chartHeight: number = 100): number => {
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 20
  
  // Verificar se o gráfico cabe na página atual
  if (yPosition + chartHeight + 20 > pageHeight - margin) {
    doc.addPage()
    yPosition = margin
  }
  
  // Centralizar o gráfico horizontalmente
  const chartX = (pageWidth - chartWidth) / 2
  
  // Adicionar o gráfico
  doc.addImage(chartImage, 'PNG', chartX, yPosition, chartWidth, chartHeight)
  
  // Retornar nova posição Y com espaçamento
  return yPosition + chartHeight + 30
}

// RELATÓRIO DE VENDAS MENSAL
export const generateSalesReportPDF = async (reportData: ReportData) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 20

  // Obter período do mês atual
  const now = new Date()
  const startOfCurrentMonth = startOfMonth(now)
  const endOfCurrentMonth = endOfMonth(now)
  
  // Filtrar vendas do mês atual
  const currentMonthSales = reportData.sales.filter(sale => {
    const saleDate = new Date(sale.createdAt)
    return isWithinInterval(saleDate, { start: startOfCurrentMonth, end: endOfCurrentMonth })
  })

  // Filtrar gastos do mês atual
  const currentMonthExpenses = reportData.expenses.filter(expense => {
    const expenseDate = new Date(expense.date)
    return isWithinInterval(expenseDate, { start: startOfCurrentMonth, end: endOfCurrentMonth })
  })

  // Calcular totais do mês atual
  const monthlyRevenue = currentMonthSales.reduce((sum, sale) => sum + sale.totalValue, 0)
  const monthlyExpenses = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const monthlyProfit = monthlyRevenue - monthlyExpenses
  const averageTicket = currentMonthSales.length > 0 ? monthlyRevenue / currentMonthSales.length : 0

  // ===== PÁGINA 1: RESUMO MENSAL =====
  let yPosition = addHeader(doc, `RELATÓRIO DE VENDAS - ${format(startOfCurrentMonth, 'MMMM/yyyy', { locale: ptBR }).toUpperCase()}`)

  // Período do relatório
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`PERÍODO: ${format(startOfCurrentMonth, 'dd/MM/yyyy', { locale: ptBR })} a ${format(now, 'dd/MM/yyyy', { locale: ptBR })}`, margin, yPosition)
  
  yPosition += 20

  // Resumo Executivo do Mês
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RESUMO EXECUTIVO DO MÊS ATUAL', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  doc.text(`Total de Vendas Realizadas: ${currentMonthSales.length}`, margin, yPosition)
  yPosition += 6
  doc.text(`Receita Total do Mês: R$ ${monthlyRevenue.toFixed(2)}`, margin, yPosition)
  yPosition += 6
  doc.text(`Gastos Total do Mês: R$ ${monthlyExpenses.toFixed(2)}`, margin, yPosition)
  yPosition += 6
  doc.setFont('helvetica', 'bold')
  doc.text(`Resultado do Mês: R$ ${Math.abs(monthlyProfit).toFixed(2)} ${monthlyProfit >= 0 ? '(LUCRO)' : '(PREJUÍZO)'}`, margin, yPosition)
  doc.setFont('helvetica', 'normal')
  yPosition += 6
  doc.text(`Ticket Médio: R$ ${averageTicket.toFixed(2)}`, margin, yPosition)

  if (monthlyRevenue > 0) {
    const profitMargin = (monthlyProfit / monthlyRevenue * 100).toFixed(1)
    yPosition += 6
    doc.text(`Margem de Lucro: ${profitMargin}%`, margin, yPosition)
  }

  yPosition += 20

  // Análise de Performance
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('ANÁLISE DE PERFORMANCE MENSAL', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const daysInMonth = differenceInDays(now, startOfCurrentMonth) + 1
  const avgSalesPerDay = currentMonthSales.length / daysInMonth
  const avgRevenuePerDay = monthlyRevenue / daysInMonth
  
  doc.text(`Dias Decorridos no Mês: ${daysInMonth}`, margin, yPosition)
  yPosition += 6
  doc.text(`Média de Vendas por Dia: ${avgSalesPerDay.toFixed(1)} vendas`, margin, yPosition)
  yPosition += 6
  doc.text(`Média de Receita por Dia: R$ ${avgRevenuePerDay.toFixed(2)}`, margin, yPosition)

  // Projeção para fim do mês
  const daysRemainingInMonth = differenceInDays(endOfCurrentMonth, now)
  const projectedSales = currentMonthSales.length + (avgSalesPerDay * daysRemainingInMonth)
  const projectedRevenue = monthlyRevenue + (avgRevenuePerDay * daysRemainingInMonth)
  
  yPosition += 10
  doc.setFont('helvetica', 'bold')
  doc.text('PROJEÇÃO PARA FIM DO MÊS:', margin, yPosition)
  doc.setFont('helvetica', 'normal')
  yPosition += 8
  doc.text(`Vendas Projetadas: ${Math.round(projectedSales)} vendas`, margin, yPosition)
  yPosition += 6
  doc.text(`Receita Projetada: R$ ${projectedRevenue.toFixed(2)}`, margin, yPosition)

  yPosition += 20

  // Verificar se precisa de nova página
  if (yPosition > pageHeight - 120) {
    doc.addPage()
    yPosition = margin
  }

  // Detalhamento de Vendas do Mês
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('DETALHAMENTO DAS VENDAS DO MÊS', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('DATA', margin, yPosition)
  doc.text('CLIENTE', margin + 30, yPosition)
  doc.text('VALOR', margin + 100, yPosition)
  doc.text('PRODUTOS', margin + 140, yPosition)
  doc.text('STATUS', margin + 170, yPosition)
  
  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 8

  doc.setFont('helvetica', 'normal')
  
  // Ordenar vendas por data (mais recente primeiro)
  const sortedSales = currentMonthSales.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  sortedSales.forEach(sale => {
    if (yPosition > pageHeight - 30) {
      doc.addPage()
      yPosition = margin
    }
    
    doc.text(format(new Date(sale.createdAt), 'dd/MM', { locale: ptBR }), margin, yPosition)
    doc.text(sale.customerName.substring(0, 20), margin + 30, yPosition)
    doc.text(`R$ ${sale.totalValue.toFixed(2)}`, margin + 100, yPosition)
    doc.text(`${sale.products?.length || 0} itens`, margin + 140, yPosition)
    doc.text('Concluída', margin + 170, yPosition)
    yPosition += 6
  })

  // ===== PÁGINA 2: ANÁLISE DE PRODUTOS VENDIDOS =====
  doc.addPage()
  yPosition = addHeader(doc, 'ANÁLISE DE PRODUTOS - MÊS ATUAL')

  // Calcular produtos mais vendidos no mês
  const productSalesMonth: Record<string, { name: string; quantity: number; revenue: number; salesCount: number }> = {}
  
  currentMonthSales.forEach(sale => {
    if (sale.products && Array.isArray(sale.products)) {
      sale.products.forEach(item => {
        if (item.productName) {
          if (!productSalesMonth[item.productName]) {
            productSalesMonth[item.productName] = {
              name: item.productName,
              quantity: 0,
              revenue: 0,
              salesCount: 0
            }
          }
          productSalesMonth[item.productName].quantity += item.quantity || 0
          productSalesMonth[item.productName].revenue += item.totalPrice || 0
          productSalesMonth[item.productName].salesCount += 1
        }
      })
    }
  })

  const topProductsMonth = Object.values(productSalesMonth)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('TOP 10 PRODUTOS MAIS VENDIDOS NO MÊS', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTO', margin, yPosition)
  doc.text('QTD', margin + 80, yPosition)
  doc.text('VENDAS', margin + 110, yPosition)
  doc.text('RECEITA', margin + 140, yPosition)
  
  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 8

  doc.setFont('helvetica', 'normal')
  
  if (topProductsMonth.length > 0) {
    topProductsMonth.forEach((product, index) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage()
        yPosition = margin
      }
      
      doc.text(`${index + 1}. ${product.name.substring(0, 25)}`, margin, yPosition)
      doc.text(product.quantity.toString(), margin + 80, yPosition)
      doc.text(product.salesCount.toString(), margin + 110, yPosition)
      doc.text(`R$ ${product.revenue.toFixed(2)}`, margin + 140, yPosition)
      yPosition += 6
    })
  } else {
    doc.text('Nenhum produto vendido no período', margin, yPosition)
  }

  // ===== PÁGINA 3: ANÁLISE DE CLIENTES =====
  doc.addPage()
  yPosition = addHeader(doc, 'ANÁLISE DE CLIENTES - MÊS ATUAL')

  // Calcular clientes do mês
  const customerSalesMonth: Record<string, { name: string; purchases: number; totalSpent: number; lastPurchase: string }> = {}
  
  currentMonthSales.forEach(sale => {
    if (sale.customerName) {
      if (!customerSalesMonth[sale.customerName]) {
        customerSalesMonth[sale.customerName] = {
          name: sale.customerName,
          purchases: 0,
          totalSpent: 0,
          lastPurchase: sale.createdAt
        }
      }
      customerSalesMonth[sale.customerName].purchases += 1
      customerSalesMonth[sale.customerName].totalSpent += sale.totalValue
      
      // Atualizar última compra se for mais recente
      if (new Date(sale.createdAt) > new Date(customerSalesMonth[sale.customerName].lastPurchase)) {
        customerSalesMonth[sale.customerName].lastPurchase = sale.createdAt
      }
    }
  })

  const topCustomersMonth = Object.values(customerSalesMonth)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('TOP 10 CLIENTES DO MÊS', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENTE', margin, yPosition)
  doc.text('COMPRAS', margin + 80, yPosition)
  doc.text('TOTAL GASTO', margin + 120, yPosition)
  doc.text('ÚLTIMA COMPRA', margin + 160, yPosition)
  
  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 8

  doc.setFont('helvetica', 'normal')
  
  if (topCustomersMonth.length > 0) {
    topCustomersMonth.forEach((customer, index) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage()
        yPosition = margin
      }
      
      doc.text(`${index + 1}. ${customer.name.substring(0, 25)}`, margin, yPosition)
      doc.text(customer.purchases.toString(), margin + 80, yPosition)
      doc.text(`R$ ${customer.totalSpent.toFixed(2)}`, margin + 120, yPosition)
      doc.text(format(new Date(customer.lastPurchase), 'dd/MM', { locale: ptBR }), margin + 160, yPosition)
      yPosition += 6
    })
  } else {
    doc.text('Nenhum cliente registrado no período', margin, yPosition)
  }

  // ===== PÁGINA 4: GRÁFICOS =====
  doc.addPage()
  yPosition = addHeader(doc, 'GRÁFICOS - ANÁLISE VISUAL')

  // Gráfico de Pizza - Top 5 Produtos do Mês
  if (topProductsMonth.length > 0) {
    try {
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      
      const productChartData = topProductsMonth.slice(0, 5).map((product, index) => ({
        name: product.name.substring(0, 12),
        value: product.quantity,
        color: colors[index]
      }))
      
      const productChart = createPieChart(productChartData, 400, 250, 'Top 5 Produtos - Quantidade Vendida')
      yPosition = addChartToPage(doc, productChart, yPosition, 160, 100)
      
    } catch (error) {
      console.warn('Erro ao gerar gráfico de produtos:', error)
    }
  }

  // Gráfico de Colunas - Top 5 Clientes do Mês
  if (topCustomersMonth.length > 0) {
    try {
      const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336']
      
      const customerChartData = topCustomersMonth.slice(0, 5).map((customer, index) => ({
        name: customer.name.substring(0, 8),
        value: Math.round(customer.totalSpent),
        color: colors[index]
      }))
      
      const customerChart = createColumnChart(customerChartData, 400, 250, 'Top 5 Clientes - Valor Gasto (R$)')
      yPosition = addChartToPage(doc, customerChart, yPosition, 160, 100)
      
    } catch (error) {
      console.warn('Erro ao gerar gráfico de clientes:', error)
    }
  }

  const fileName = `Relatorio_Vendas_${format(startOfCurrentMonth, 'MM_yyyy')}_${format(now, 'ddMMyyyy_HHmm')}.pdf`
  doc.save(fileName)
}

// RELATÓRIO DE CLIENTES
export const generateCustomerReportPDF = async (reportData: ReportData) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 20

  // ===== PÁGINA 1: INFORMAÇÕES DE CLIENTES =====
  let yPosition = addHeader(doc, 'RELATÓRIO DE CLIENTES')

  // Resumo de clientes
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RESUMO GERAL DE CLIENTES', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  const customers = reportData.customerHistory
  
  if (customers.length > 0) {
    const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0)
    const totalPurchases = customers.reduce((sum, c) => sum + c.totalPurchases, 0)
    const avgTicket = totalSpent / customers.length
    const avgPurchases = totalPurchases / customers.length

    doc.text(`Total de Clientes: ${reportData.totalCustomers}`, margin, yPosition)
    yPosition += 6
    doc.text(`Ticket Médio: R$ ${avgTicket.toFixed(2)}`, margin, yPosition)
    yPosition += 6
    doc.text(`Compras Médias por Cliente: ${avgPurchases.toFixed(1)}`, margin, yPosition)
    yPosition += 6
    doc.text(`Faturamento Total de Clientes: R$ ${totalSpent.toFixed(2)}`, margin, yPosition)

    yPosition += 20

    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 80) {
      doc.addPage()
      yPosition = margin
    }

    // Segmentação de clientes
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('SEGMENTAÇÃO DE CLIENTES', margin, yPosition)
    
    yPosition += 15
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    const highValueCustomers = customers.filter(c => c.totalSpent >= 500).length
    const mediumValueCustomers = customers.filter(c => c.totalSpent >= 200 && c.totalSpent < 500).length
    const lowValueCustomers = customers.filter(c => c.totalSpent < 200).length
    
    doc.text(`Clientes Alto Valor (≥R$ 500): ${highValueCustomers}`, margin, yPosition)
    yPosition += 6
    doc.text(`Clientes Médio Valor (R$ 200-499): ${mediumValueCustomers}`, margin, yPosition)
    yPosition += 6
    doc.text(`Clientes Baixo Valor (<R$ 200): ${lowValueCustomers}`, margin, yPosition)
    
    yPosition += 15
    
    const frequentCustomers = customers.filter(c => c.totalPurchases >= 5).length
    const occasionalCustomers = customers.filter(c => c.totalPurchases >= 2 && c.totalPurchases < 5).length
    const rareCustomers = customers.filter(c => c.totalPurchases < 2).length
    
    doc.text(`Clientes Frequentes (≥5 compras): ${frequentCustomers}`, margin, yPosition)
    yPosition += 6
    doc.text(`Clientes Ocasionais (2-4 compras): ${occasionalCustomers}`, margin, yPosition)
    yPosition += 6
    doc.text(`Clientes Raros (<2 compras): ${rareCustomers}`, margin, yPosition)

    yPosition += 20

    // Top 10 clientes
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('TOP 10 CLIENTES POR VALOR', margin, yPosition)
    
    yPosition += 15
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENTE', margin, yPosition)
    doc.text('COMPRAS', margin + 80, yPosition)
    doc.text('TOTAL GASTO', margin + 120, yPosition)
    doc.text('ÚLTIMA COMPRA', margin + 160, yPosition)
    
    yPosition += 3
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 8

    doc.setFont('helvetica', 'normal')
    
    customers.slice(0, 10).forEach(customer => {
      if (yPosition > pageHeight - 30) {
        doc.addPage()
        yPosition = margin
      }
      
      doc.text(customer.customerName.substring(0, 25), margin, yPosition)
      doc.text(customer.totalPurchases.toString(), margin + 80, yPosition)
      doc.text(`R$ ${customer.totalSpent.toFixed(2)}`, margin + 120, yPosition)
      doc.text(format(new Date(customer.lastPurchase), 'dd/MM/yyyy', { locale: ptBR }), margin + 160, yPosition)
      yPosition += 6
    })

  } else {
    doc.text('Nenhum cliente registrado ainda', margin, yPosition)
  }

  // ===== PÁGINA 2: GRÁFICOS DE CLIENTES =====
  doc.addPage()
  yPosition = addHeader(doc, 'GRÁFICOS - ANÁLISE DE CLIENTES')

  if (customers.length > 0) {
    // Gráfico de Pizza - Top 5 Clientes por Valor
    try {
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      
      const topCustomersByValue = customers.slice(0, 5)
      const customerValueData = topCustomersByValue.map((customer, index) => ({
        name: customer.customerName.substring(0, 12),
        value: Math.round(customer.totalSpent),
        color: colors[index]
      }))
      
      const customerValueChart = createPieChart(customerValueData, 400, 250, 'Top 5 Clientes por Valor Gasto')
      yPosition = addChartToPage(doc, customerValueChart, yPosition, 160, 100)
      
    } catch (error) {
      console.warn('Erro ao gerar gráfico de clientes:', error)
    }

    // Gráfico de Colunas - Top 5 Clientes por Frequência
    try {
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      
      const topCustomersByFrequency = customers
        .sort((a, b) => b.totalPurchases - a.totalPurchases)
        .slice(0, 5)
      
      const customerFrequencyData = topCustomersByFrequency.map((customer, index) => ({
        name: customer.customerName.substring(0, 8),
        value: customer.totalPurchases,
        color: colors[index]
      }))
      
      const customerFrequencyChart = createColumnChart(customerFrequencyData, 400, 250, 'Top 5 Clientes por Frequência')
      yPosition = addChartToPage(doc, customerFrequencyChart, yPosition, 160, 100)
      
    } catch (error) {
      console.warn('Erro ao gerar gráfico de frequência:', error)
    }
  } else {
    doc.setFontSize(14)
    doc.text('Sem dados suficientes para gerar gráficos', pageWidth / 2, yPosition + 50, { align: 'center' })
  }

  const fileName = `Relatorio_Clientes_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`
  doc.save(fileName)
}

// RELATÓRIO DE PRODUTOS E ESTOQUE
export const generateProductStockReportPDF = async (reportData: ReportData) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 20

  // ===== PÁGINA 1: INFORMAÇÕES DE PRODUTOS =====
  let yPosition = addHeader(doc, 'RELATÓRIO DE PRODUTOS E ESTOQUE')

  // Resumo de produtos
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RESUMO GERAL DE PRODUTOS', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  const totalProductsSold = reportData.topProducts.reduce((sum, p) => sum + p.totalSold, 0)
  const totalProductRevenue = reportData.topProducts.reduce((sum, p) => sum + p.revenue, 0)
  const avgProductSales = reportData.topProducts.length > 0 ? (totalProductsSold / reportData.topProducts.length).toFixed(1) : '0'
  const lowStockProducts = reportData.stockReport.filter(p => p.stockQuantity <= 5).length
  
  doc.text(`Total de Produtos Cadastrados: ${reportData.stockReport.length}`, margin, yPosition)
  yPosition += 6
  doc.text(`Produtos com Vendas: ${reportData.topProducts.length}`, margin, yPosition)
  yPosition += 6
  doc.text(`Total de Unidades Vendidas: ${totalProductsSold}`, margin, yPosition)
  yPosition += 6
  doc.text(`Receita Total de Produtos: R$ ${totalProductRevenue.toFixed(2)}`, margin, yPosition)
  yPosition += 6
  doc.text(`Média de Vendas por Produto: ${avgProductSales} unidades`, margin, yPosition)
  yPosition += 6
  doc.text(`Produtos com Estoque Baixo (≤5): ${lowStockProducts}`, margin, yPosition)

  yPosition += 20

  // Verificar se precisa de nova página
  if (yPosition > pageHeight - 100) {
    doc.addPage()
    yPosition = margin
  }

  // Top produtos mais vendidos
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('TOP 10 PRODUTOS MAIS VENDIDOS', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTO', margin, yPosition)
  doc.text('QTD VENDIDA', margin + 70, yPosition)
  doc.text('Nº VENDAS', margin + 110, yPosition)
  doc.text('RECEITA', margin + 150, yPosition)
  
  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 8

  doc.setFont('helvetica', 'normal')
  
  const topProducts = reportData.topProducts.slice(0, 10)
  topProducts.forEach(product => {
    if (yPosition > pageHeight - 30) {
      doc.addPage()
      yPosition = margin
    }
    
    doc.text(product.name.substring(0, 22), margin, yPosition)
    doc.text(product.totalSold.toString(), margin + 70, yPosition)
    doc.text(product.salesCount.toString(), margin + 110, yPosition)
    doc.text(`R$ ${product.revenue.toFixed(2)}`, margin + 150, yPosition)
    yPosition += 6
  })

  yPosition += 15

  // Produtos com estoque baixo
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTOS COM ESTOQUE BAIXO (≤5 UNIDADES)', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTO', margin, yPosition)
  doc.text('CÓDIGO', margin + 70, yPosition)
  doc.text('CATEGORIA', margin + 110, yPosition)
  doc.text('ESTOQUE', margin + 150, yPosition)
  
  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 8

  doc.setFont('helvetica', 'normal')
  const lowStockItems = reportData.stockReport.filter(product => product.stockQuantity <= 5)
  
  if (lowStockItems.length > 0) {
    lowStockItems.forEach(product => {
      if (yPosition > pageHeight - 30) {
        doc.addPage()
        yPosition = margin
      }
      
      doc.text(product.name.substring(0, 22), margin, yPosition)
      doc.text(product.code.substring(0, 10), margin + 70, yPosition)
      doc.text(product.category.substring(0, 12), margin + 110, yPosition)
      
      doc.setTextColor(255, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(`${product.stockQuantity} un`, margin + 150, yPosition)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      
      yPosition += 6
    })
  } else {
    doc.text('Nenhum produto com estoque baixo', margin, yPosition)
  }

  // ===== PÁGINA 2: GRÁFICOS DE PRODUTOS =====
  doc.addPage()
  yPosition = addHeader(doc, 'GRÁFICOS - ANÁLISE DE PRODUTOS')

  // Gráfico de Pizza - Top 5 Produtos Mais Vendidos
  if (reportData.topProducts.length > 0) {
    try {
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      
      const topProductsForChart = reportData.topProducts.slice(0, 5)
      const productPieData = topProductsForChart.map((product, index) => ({
        name: product.name.substring(0, 12),
        value: product.totalSold,
        color: colors[index]
      }))
      
      const productPieChart = createPieChart(productPieData, 400, 250, 'Top 5 Produtos - Quantidade Vendida')
      yPosition = addChartToPage(doc, productPieChart, yPosition, 160, 100)
      
    } catch (error) {
      console.warn('Erro ao gerar gráfico de produtos:', error)
    }

    // Gráfico de Colunas - Top 5 Produtos por Receita
    try {
      const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336']
      
      const topProductsByRevenue = reportData.topProducts
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
      
      const productRevenueData = topProductsByRevenue.map((product, index) => ({
        name: product.name.substring(0, 8),
        value: Math.round(product.revenue),
        color: colors[index]
      }))
      
      const productRevenueChart = createColumnChart(productRevenueData, 400, 250, 'Top 5 Produtos por Receita (R$)')
      yPosition = addChartToPage(doc, productRevenueChart, yPosition, 160, 100)
      
    } catch (error) {
      console.warn('Erro ao gerar gráfico de receita de produtos:', error)
    }
  } else {
    doc.setFontSize(14)
    doc.text('Sem dados suficientes para gerar gráficos', pageWidth / 2, yPosition + 50, { align: 'center' })
  }

  const fileName = `Relatorio_Produtos_Estoque_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`
  doc.save(fileName)
}

// RELATÓRIO FINANCEIRO
export const generateFinancialReportPDF = async (reportData: ReportData) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 20

  // ===== PÁGINA 1: INFORMAÇÕES FINANCEIRAS =====
  let yPosition = addHeader(doc, 'RELATÓRIO FINANCEIRO')

  const weeklyProfit = reportData.weeklyRevenue - reportData.weeklyExpenses
  const monthlyProfit = reportData.monthlyRevenue - reportData.monthlyExpenses
  const yearlyProfit = reportData.yearlyRevenue - reportData.yearlyExpenses

  // Resumo financeiro
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RESUMO FINANCEIRO', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  doc.text(`Receita Total Anual: R$ ${reportData.yearlyRevenue.toFixed(2)}`, margin, yPosition)
  yPosition += 6
  doc.text(`Gastos Total Anual: R$ ${reportData.yearlyExpenses.toFixed(2)}`, margin, yPosition)
  yPosition += 6
  doc.setFont('helvetica', 'bold')
  doc.text(`Resultado Anual: R$ ${Math.abs(yearlyProfit).toFixed(2)} ${yearlyProfit >= 0 ? '(Lucro)' : '(Prejuízo)'}`, margin, yPosition)
  doc.setFont('helvetica', 'normal')

  if (reportData.yearlyRevenue > 0) {
    const profitMargin = (yearlyProfit / reportData.yearlyRevenue * 100).toFixed(1)
    yPosition += 6
    doc.text(`Margem de Lucro Anual: ${profitMargin}%`, margin, yPosition)
  }

  yPosition += 20

  // Balanço por período
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('BALANÇO POR PERÍODO', margin, yPosition)
  
  yPosition += 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PERÍODO', margin, yPosition)
  doc.text('RECEITAS', margin + 50, yPosition)
  doc.text('GASTOS', margin + 90, yPosition)
  doc.text('RESULTADO', margin + 130, yPosition)
  
  yPosition += 3
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 8

  doc.setFont('helvetica', 'normal')
  
  // Dados semanais
  doc.text('Semanal', margin, yPosition)
  doc.text(`R$ ${reportData.weeklyRevenue.toFixed(2)}`, margin + 50, yPosition)
  doc.text(`R$ ${reportData.weeklyExpenses.toFixed(2)}`, margin + 90, yPosition)
  doc.setFont('helvetica', 'bold')
  doc.text(`R$ ${Math.abs(weeklyProfit).toFixed(2)} ${weeklyProfit >= 0 ? '(L)' : '(P)'}`, margin + 130, yPosition)
  doc.setFont('helvetica', 'normal')
  yPosition += 6
  
  // Dados mensais
  doc.text('Mensal', margin, yPosition)
  doc.text(`R$ ${reportData.monthlyRevenue.toFixed(2)}`, margin + 50, yPosition)
  doc.text(`R$ ${reportData.monthlyExpenses.toFixed(2)}`, margin + 90, yPosition)
  doc.setFont('helvetica', 'bold')
  doc.text(`R$ ${Math.abs(monthlyProfit).toFixed(2)} ${monthlyProfit >= 0 ? '(L)' : '(P)'}`, margin + 130, yPosition)
  doc.setFont('helvetica', 'normal')
  yPosition += 6
  
  // Dados anuais
  doc.text('Anual', margin, yPosition)
  doc.text(`R$ ${reportData.yearlyRevenue.toFixed(2)}`, margin + 50, yPosition)
  doc.text(`R$ ${reportData.yearlyExpenses.toFixed(2)}`, margin + 90, yPosition)
  doc.setFont('helvetica', 'bold')
  doc.text(`R$ ${Math.abs(yearlyProfit).toFixed(2)} ${yearlyProfit >= 0 ? '(L)' : '(P)'}`, margin + 130, yPosition)
  doc.setFont('helvetica', 'normal')

  yPosition += 20

  // Verificar se precisa de nova página
  if (yPosition > pageHeight - 120) {
    doc.addPage()
    yPosition = margin
  }

  // Gastos por categoria
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('GASTOS POR CATEGORIA', margin, yPosition)
  
  yPosition += 15
  
  const expensesByCategory: Record<string, number> = {}
  reportData.expenses.forEach(expense => {
    const categoryName = expense.category === 'fornecedores' ? 'Fornecedores' :
                        expense.category === 'funcionarios' ? 'Funcionários' :
                        expense.category === 'impostos' ? 'Impostos' :
                        expense.category === 'aluguel' ? 'Aluguel' :
                        expense.category === 'energia' ? 'Energia' :
                        expense.category === 'agua' ? 'Água' :
                        expense.category === 'telefone' ? 'Telefone' :
                        expense.category === 'transporte' ? 'Transporte' :
                        expense.category === 'marketing' ? 'Marketing' :
                        expense.category === 'equipamentos' ? 'Equipamentos' :
                        expense.category === 'manutencao' ? 'Manutenção' : 'Outros'
    
    expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + expense.amount
  })
  
  const sortedCategories = Object.entries(expensesByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  sortedCategories.forEach(([category, amount]) => {
    if (yPosition > pageHeight - 30) {
      doc.addPage()
      yPosition = margin
    }
    doc.text(`${category}: R$ ${amount.toFixed(2)}`, margin, yPosition)
    yPosition += 6
  })

  // ===== PÁGINA 2: GRÁFICOS FINANCEIROS =====
  doc.addPage()
  yPosition = addHeader(doc, 'GRÁFICOS - ANÁLISE FINANCEIRA')

  // Gráfico de Pizza - Receitas vs Gastos
  try {
    const financialPieData = [
      { name: 'Receitas', value: Math.round(reportData.monthlyRevenue), color: '#4CAF50' },
      { name: 'Gastos', value: Math.round(reportData.monthlyExpenses), color: '#F44336' }
    ]
    
    const financialPieChart = createPieChart(financialPieData, 400, 250, 'Receitas vs Gastos (Mensal)')
    yPosition = addChartToPage(doc, financialPieChart, yPosition, 160, 100)
    
  } catch (error) {
    console.warn('Erro ao gerar gráfico financeiro:', error)
  }

  // Gráfico de Colunas - Resultado por Período
  try {
    const financialColumnData = [
      { name: 'Semanal', value: Math.abs(Math.round(weeklyProfit)), color: weeklyProfit >= 0 ? '#4CAF50' : '#F44336' },
      { name: 'Mensal', value: Math.abs(Math.round(monthlyProfit)), color: monthlyProfit >= 0 ? '#4CAF50' : '#F44336' },
      { name: 'Anual', value: Math.abs(Math.round(yearlyProfit)), color: yearlyProfit >= 0 ? '#4CAF50' : '#F44336' }
    ]
    
    const financialColumnChart = createColumnChart(financialColumnData, 400, 250, 'Resultado por Período (Valores Absolutos)')
    yPosition = addChartToPage(doc, financialColumnChart, yPosition, 160, 100)
    
  } catch (error) {
    console.warn('Erro ao gerar gráfico de resultado:', error)
  }

  const fileName = `Relatorio_Financeiro_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`
  doc.save(fileName)
}
