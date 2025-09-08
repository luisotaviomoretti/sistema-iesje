// src/features/matricula-nova/hooks/data/useDiscounts.ts

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Desconto } from '../../types/discounts'
import { TipoTrilho, CategoriaDesconto } from '../../types/discounts'
import { DiscountRuleEngine } from '../../services/business/discountRules'
import { usePublicDiscountTypes } from '@/features/admin/hooks/useDiscountTypes'
import { usePublicTrilhos } from '@/features/admin/hooks/useTrilhos'
import type { TipoDesconto } from '@/lib/supabase'

/**
 * Converte TipoDesconto do admin para Desconto do sistema
 */
function convertAdminDiscountToDesconto(adminDiscount: TipoDesconto): Desconto {
  // Mapear categoria do admin para categoria do sistema
  let categoria: CategoriaDesconto
  
  // Converter categoria para string se necessário e normalizar
  const catOriginal = adminDiscount.categoria
  const catString = String(catOriginal || '').toLowerCase().replace('ç', 'c').replace('ã', 'a')
  
  console.log(`Convertendo desconto ${adminDiscount.codigo}:`)
  console.log(`  - categoria original: "${catOriginal}" (tipo: ${typeof catOriginal})`)
  console.log(`  - categoria normalizada: "${catString}"`)
  
  if (catString === 'especial') {
    categoria = CategoriaDesconto.ESPECIAL
  } else if (catString === 'regular') {
    categoria = CategoriaDesconto.REGULAR
  } else if (catString === 'negociacao' || catString === 'negocicao') {
    categoria = CategoriaDesconto.NEGOCIACAO
  } else {
    // Para descontos específicos, atribuir categoria baseada no código
    if (['ABI', 'ABP', 'PASS', 'PBS', 'COL', 'SAE'].includes(adminDiscount.codigo)) {
      categoria = CategoriaDesconto.ESPECIAL
      console.log(`  → Categoria forçada para ESPECIAL baseado no código ${adminDiscount.codigo}`)
    } else if (['IIR', 'RES', 'PAV'].includes(adminDiscount.codigo)) {
      categoria = CategoriaDesconto.REGULAR
      console.log(`  → Categoria forçada para REGULAR baseado no código ${adminDiscount.codigo}`)
    } else {
      categoria = CategoriaDesconto.NEGOCIACAO
      console.log(`  → Categoria default NEGOCIACAO para código ${adminDiscount.codigo}`)
    }
  }
  
  console.log(`  → Categoria final: ${categoria}`)

  return {
    id: adminDiscount.id,
    nome: adminDiscount.descricao,
    codigo: adminDiscount.codigo,
    categoria,
    percentual_maximo: adminDiscount.percentual_fixo || 100, // Se variável, usar 100 como máximo
    percentual_atual: undefined,
    requer_documento: (adminDiscount.documentos_necessarios && adminDiscount.documentos_necessarios.length > 0) || false,
    documento_url: undefined,
    ativo: adminDiscount.ativo,
    incompativel_com: adminDiscount.incompativel_com || [],
    trilhos_compativeis: [] // Será preenchido baseado nos trilhos
  }
}

/**
 * Hook principal para buscar descontos
 * Integra com sistema administrativo
 */
export function useDiscounts(trilhoId?: string) {
  // Buscar dados do admin
  const { data: adminDiscounts, isLoading: loadingAdmin, error: errorAdmin } = usePublicDiscountTypes()
  const { data: trilhos, isLoading: loadingTrilhos } = usePublicTrilhos()
  
  // Converter dados do admin para formato do sistema
  const descontosConvertidos = useMemo(() => {
    if (!adminDiscounts) return []
    return adminDiscounts.map(convertAdminDiscountToDesconto)
  }, [adminDiscounts])
  
  // Aplicar filtros se trilho especificado
  const descontosFiltrados = useMemo(() => {
    if (!descontosConvertidos || descontosConvertidos.length === 0) {
      return []
    }
    
    if (!trilhoId) {
      return descontosConvertidos
    }
    
    // Buscar tipo do trilho
    let trilhoTipo: TipoTrilho
    const trilho = trilhos?.find(t => 
      t.id === trilhoId || 
      t.nome?.toLowerCase() === trilhoId.toLowerCase()
    )
    
    if (trilho) {
      // Determinar tipo baseado nas categorias permitidas do trilho
      const categorias = trilho.categorias_permitidas || []
      
      if (categorias.includes('especial') || categorias.includes('Especial')) {
        trilhoTipo = TipoTrilho.ESPECIAL
      } else if (categorias.includes('negociacao') || categorias.includes('Negociação')) {
        if (categorias.includes('regular') || categorias.includes('Regular')) {
          trilhoTipo = TipoTrilho.COMBINADO
        } else {
          trilhoTipo = TipoTrilho.COMERCIAL
        }
      } else {
        trilhoTipo = TipoTrilho.COMBINADO
      }
    } else {
      // Fallback para nomes conhecidos
      switch (trilhoId.toLowerCase()) {
        case 'especial':
        case 'trilho-especial':
          trilhoTipo = TipoTrilho.ESPECIAL
          break
        case 'comercial':
        case 'trilho-comercial':
          trilhoTipo = TipoTrilho.COMERCIAL
          break
        default:
          trilhoTipo = TipoTrilho.COMBINADO
      }
    }
    
    return DiscountRuleEngine.filterDiscountsByTrilho(descontosConvertidos, trilhoTipo)
  }, [descontosConvertidos, trilhoId, trilhos])

  return {
    data: descontosFiltrados,
    rawData: descontosConvertidos,
    isLoading: loadingAdmin || loadingTrilhos,
    error: errorAdmin,
    isEmpty: !descontosFiltrados.length && !loadingAdmin && !loadingTrilhos,
    refetch: () => {} // Implementar se necessário
  }
}

/**
 * Hook otimizado para buscar descontos por trilho específico
 */
export function useDiscountsByTrilho(trilhoTipo: TipoTrilho) {
  const { data: adminDiscounts, isLoading, error } = usePublicDiscountTypes()
  
  const descontosFiltrados = useMemo(() => {
    if (!adminDiscounts) return []
    
    const convertidos = adminDiscounts.map(convertAdminDiscountToDesconto)
    return DiscountRuleEngine.filterDiscountsByTrilho(convertidos, trilhoTipo)
  }, [adminDiscounts, trilhoTipo])
  
  return {
    data: descontosFiltrados,
    isLoading,
    error
  }
}

/**
 * Hook para buscar um desconto específico por ID
 */
export function useDiscountById(descontoId: string) {
  const { data: adminDiscounts, isLoading } = usePublicDiscountTypes()
  
  const desconto = useMemo(() => {
    if (!adminDiscounts) return null
    
    const adminDesconto = adminDiscounts.find(d => d.id === descontoId)
    return adminDesconto ? convertAdminDiscountToDesconto(adminDesconto) : null
  }, [adminDiscounts, descontoId])
  
  return {
    data: desconto,
    isLoading
  }
}

/**
 * Hook compatível com código existente - integrado com dados reais
 */
export function useDescontosCompativeis(trilho: 'especial' | 'combinado' | undefined) {
  const { data: trilhos, isLoading: loadingTrilhos } = usePublicTrilhos()
  const { data: adminDiscounts, isLoading: loadingDiscounts, error } = usePublicDiscountTypes()
  
  const descontosFiltrados = useMemo(() => {
    console.log('🎯 === useDescontosCompativeis Debug COMPLETO ===')
    console.log('📋 DADOS RAW DO SUPABASE:')
    console.log('  - Total recebido:', adminDiscounts?.length || 0)
    console.log('📍 Trilho solicitado:', trilho)
    console.log('📦 Total de descontos no banco:', adminDiscounts?.length || 0)
    
    if (adminDiscounts) {
      // Listar TODOS os descontos para debug
      console.log('🔍 TODOS OS DESCONTOS DO BANCO:')
      adminDiscounts.forEach(d => {
        console.log(`  - [${d.codigo}]: categoria="${d.categoria}", ativo=${d.ativo}, descricao="${d.descricao}"`)
      })
      
      const descontosPorCategoria = adminDiscounts.reduce((acc: any, d) => {
        const cat = d.categoria || 'sem_categoria'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      }, {})
      console.log('📊 Descontos por categoria no banco:', descontosPorCategoria)
      
      // Listar especificamente os descontos da categoria Especial
      // IMPORTANTE: No banco está como 'especial' (minúsculo)
      const especiais = adminDiscounts.filter(d => {
        const catNormalized = d.categoria?.toLowerCase()
        return catNormalized === 'especial'
      })
      console.log(`⭐ Descontos Especiais no banco (${especiais.length}):`)
      especiais.forEach(d => {
        console.log(`  - ${d.codigo}: categoria="${d.categoria}", ativo=${d.ativo}`)
      })
      
      // Verificar se ABI e ABP estão chegando
      const abi = adminDiscounts.find(d => d.codigo === 'ABI')
      const abp = adminDiscounts.find(d => d.codigo === 'ABP')
      console.log('🔎 PROCURANDO ABI E ABP:')
      console.log('  - ABI encontrado?', abi ? `SIM - categoria="${abi.categoria}", ativo=${abi.ativo}` : 'NÃO')
      console.log('  - ABP encontrado?', abp ? `SIM - categoria="${abp.categoria}", ativo=${abp.ativo}` : 'NÃO')
    }
    
    if (!adminDiscounts || !trilho) {
      console.log('⚠️ Retornando todos os descontos - dados incompletos')
      return adminDiscounts ? adminDiscounts.map(convertAdminDiscountToDesconto) : []
    }
    
    // Mapear trilho para categorias esperadas
    let categoriasPermitidas: string[] = []
    
    switch(trilho) {
      case 'especial':
        // Trilho especial só permite categoria Especial
        // IMPORTANTE: No banco está armazenado como 'especial' (minúsculo)
        categoriasPermitidas = ['especial', 'Especial', 'ESPECIAL']
        break
      case 'combinado':
        // Trilho combinado permite Regular e Negociação
        // No banco: 'regular' e 'negociacao' (minúsculos)
        categoriasPermitidas = ['regular', 'Regular', 'REGULAR', 'negociacao', 'Negociacao', 'Negociação', 'negociação', 'NEGOCIACAO', 'NEGOCIAÇÃO']
        break
      default:
        // Se não souber, retorna todos
        return adminDiscounts.map(convertAdminDiscountToDesconto)
    }
    
    console.log('Categorias permitidas para trilho', trilho, ':', categoriasPermitidas)
    
    // Filtrar descontos baseado nas categorias permitidas
    // NOTA: Incluindo descontos inativos para visibilidade completa
    const descontosFiltrados = adminDiscounts.filter(desconto => {
      const categoriaDesconto = desconto.categoria
      
      console.log(`Verificando desconto ${desconto.codigo}:`)
      console.log(`  - Categoria bruta: "${categoriaDesconto}"`)
      console.log(`  - Tipo da categoria: ${typeof categoriaDesconto}`)
      console.log(`  - Ativo: ${desconto.ativo}`)
      
      // Debug: verificar se é um objeto
      if (typeof categoriaDesconto === 'object' && categoriaDesconto !== null) {
        console.log(`  - Categoria é um objeto:`, categoriaDesconto)
      }
      
      // Para trilho especial, incluir descontos conhecidos por código
      if (trilho === 'especial' && ['ABI', 'ABP', 'PASS', 'PBS', 'COL', 'SAE'].includes(desconto.codigo)) {
        console.log(`  - ✅ PERMITIDO por código conhecido: ${desconto.codigo}`)
        return true
      }
      
      // Verificar se a categoria do desconto está nas permitidas
      const permitido = categoriasPermitidas.some(cat => {
        // Converter para string se necessário
        const catString = String(categoriaDesconto || '')
        
        // Comparação case-insensitive
        const match = cat.toLowerCase() === catString.toLowerCase()
        
        console.log(`    Comparando: "${cat}" vs "${catString}" = ${match}`)
        
        if (match) {
          console.log(`  - ✅ Match encontrado com categoria: "${cat}"`)
        }
        
        return match
      })
      
      // Incluir nota sobre status ativo/inativo no log
      if (permitido && !desconto.ativo) {
        console.log(`  - ⚠️ PERMITIDO (mas INATIVO - será mostrado desabilitado)`)
      } else {
        console.log(`  - Resultado: ${permitido ? '✅ PERMITIDO' : '❌ BLOQUEADO'}`)
      }
      
      return permitido
    })
    
    console.log(`✅ Total de descontos filtrados para ${trilho}:`, descontosFiltrados.length)
    
    // Identificar quais descontos foram removidos
    const removidos = adminDiscounts.filter(d => !descontosFiltrados.includes(d))
    if (removidos.length > 0 && trilho === 'especial') {
      console.log(`❌ Descontos REMOVIDOS do trilho ${trilho} (${removidos.length}):`)
      removidos.forEach(d => {
        console.log(`  - ${d.codigo}: categoria="${d.categoria}", ativo=${d.ativo}`)
      })
    }
    
    // Listar os que passaram
    console.log(`✅ Descontos que PASSARAM para ${trilho}:`)
    descontosFiltrados.forEach(d => {
      console.log(`  - ${d.codigo}: categoria="${d.categoria}"`)
    })
    
    return descontosFiltrados.map(convertAdminDiscountToDesconto)
  }, [adminDiscounts, trilho])
  
  return {
    data: descontosFiltrados,
    isLoading: loadingTrilhos || loadingDiscounts,
    error,
    isEmpty: !descontosFiltrados.length && !loadingTrilhos && !loadingDiscounts
  }
}

/**
 * Hook para estatísticas de descontos
 */
export function useDiscountsStats() {
  const { data: descontos, isLoading } = useDiscounts()

  const stats = useMemo(() => {
    if (!descontos) {
      return {
        total: 0,
        ativos: 0,
        porCategoria: {},
        requerDocumento: 0,
        percentualMedio: 0
      }
    }

    const ativo = descontos.filter(d => d.ativo)
    const comDocumento = descontos.filter(d => d.requer_documento)
    
    const porCategoria = descontos.reduce((acc, d) => {
      acc[d.categoria] = (acc[d.categoria] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const percentualMedio = descontos.length > 0 
      ? descontos.reduce((sum, d) => sum + d.percentual_maximo, 0) / descontos.length
      : 0

    return {
      total: descontos.length,
      ativos: ativo.length,
      porCategoria,
      requerDocumento: comDocumento.length,
      percentualMedio: Math.round(percentualMedio * 100) / 100
    }
  }, [descontos])

  return {
    ...stats,
    isLoading
  }
}