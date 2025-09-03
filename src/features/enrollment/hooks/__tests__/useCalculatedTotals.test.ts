import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCalculatedTotals, useSimpleTotal } from '../useCalculatedTotals';
import type { DiscountData } from '../useDiscountData';
import type { TrackData } from '../useTrackData';

// Mock dos hooks dependentes
jest.mock('../useDiscountData');
jest.mock('../useTrackData');

const mockUseMultipleDiscountData = jest.fn();
const mockUseTrackData = jest.fn();

// Configuração dos mocks
beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock padrão para useMultipleDiscountData
  mockUseMultipleDiscountData.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetchAll: jest.fn(),
  });
  
  // Mock padrão para useTrackData
  mockUseTrackData.mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
});

// Wrapper para QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Dados de teste
const mockDiscountIIR: DiscountData = {
  id: 'discount-1',
  codigo: 'IIR',
  nome: 'Irmãos Carnais',
  descricao: 'Desconto para irmãos carnais',
  percentual_base: 10,
  percentual_efetivo: 10,
  documentos_necessarios: ['certidao_nascimento'],
  categoria: 'familiar',
  ativo: true,
  requer_aprovacao: false,
  nivel_aprovacao: 'automatica',
  metadata: {
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    version: 1,
  },
};

const mockDiscountRES: DiscountData = {
  id: 'discount-2',
  codigo: 'RES',
  nome: 'Outras Cidades',
  descricao: 'Desconto para alunos de outras cidades',
  percentual_base: 20,
  percentual_efetivo: 20,
  documentos_necessarios: ['comprovante_residencia'],
  categoria: 'geografico',
  ativo: true,
  requer_aprovacao: false,
  nivel_aprovacao: 'automatica',
  metadata: {
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    version: 1,
  },
};

const mockDiscountPASS: DiscountData = {
  id: 'discount-3',
  codigo: 'PASS',
  nome: 'Filho Professor IESJE',
  descricao: 'Bolsa integral para filhos de professores',
  percentual_base: 100,
  percentual_efetivo: 100,
  documentos_necessarios: ['comprovante_vinculo'],
  categoria: 'profissional',
  ativo: true,
  requer_aprovacao: true,
  nivel_aprovacao: 'direcao',
  metadata: {
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    version: 1,
  },
};

const mockTrackA: TrackData = {
  id: 'A',
  nome: 'Especial',
  descricao: 'Trilho especial sem limite',
  cap_percentual: null, // Sem limite
  condicoes: ['Sem limite de desconto'],
  prioridade: 1,
  configuracao: {
    permite_bolsa_integral: true,
    permite_combinacao_descontos: true,
    nivel_aprovacao_automatica: 20,
  },
  metadata: {
    ativo: true,
    data_criacao: '2024-01-01T00:00:00Z',
    data_atualizacao: '2024-01-01T00:00:00Z',
    versao: 1,
  },
};

const mockTrackB: TrackData = {
  id: 'B',
  nome: 'Combinado',
  descricao: 'Trilho com CAP de 25%',
  cap_percentual: 25,
  condicoes: ['Limite de 25%'],
  prioridade: 2,
  configuracao: {
    permite_bolsa_integral: false,
    permite_combinacao_descontos: true,
    nivel_aprovacao_automatica: 20,
  },
  restricoes: {
    tipos_desconto_excluidos: ['PASS', 'ABI'],
  },
  metadata: {
    ativo: true,
    data_criacao: '2024-01-01T00:00:00Z',
    data_atualizacao: '2024-01-01T00:00:00Z',
    versao: 1,
  },
};

const mockTrackC: TrackData = {
  id: 'C',
  nome: 'Normal',
  descricao: 'Trilho com CAP de 60%',
  cap_percentual: 60,
  condicoes: ['Limite de 60%'],
  prioridade: 3,
  configuracao: {
    permite_bolsa_integral: true,
    permite_combinacao_descontos: true,
    nivel_aprovacao_automatica: 20,
  },
  metadata: {
    ativo: true,
    data_criacao: '2024-01-01T00:00:00Z',
    data_atualizacao: '2024-01-01T00:00:00Z',
    versao: 1,
  },
};

describe('useCalculatedTotals', () => {
  describe('Cenário 1: Trilho A + 2 descontos de 50% cada', () => {
    it('deve calcular 100% sem aplicar CAP (trilho sem limite)', async () => {
      // Mock dos dados
      mockUseTrackData.mockReturnValue({
        data: mockTrackA,
        isLoading: false,
        error: null,
      });
      
      const mockDiscount50_1 = { ...mockDiscountIIR, percentual_base: 50, percentual_efetivo: 50 };
      const mockDiscount50_2 = { ...mockDiscountRES, percentual_base: 50, percentual_efetivo: 50 };
      
      mockUseMultipleDiscountData.mockReturnValue({
        data: [mockDiscount50_1, mockDiscount50_2],
        isLoading: false,
        error: null,
        refetchAll: jest.fn(),
      });

      const { result } = renderHook(
        () => useCalculatedTotals('A', ['discount-1', 'discount-2'], 1000),
        { wrapper: createWrapper() }
      );

      expect(result.current.totals.subtotal_percentual).toBe(100);
      expect(result.current.totals.percentual_aplicado).toBe(100);
      expect(result.current.totals.valor_final).toBe(0);
      expect(result.current.totals.trilho_info.cap).toBe(100);
      expect(result.current.totals.trilho_info.cap_aplicado).toBe(false);
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Cenário 2: Trilho B + 3 descontos de 20% cada', () => {
    it('deve aplicar CAP de 25% (limitado pelo trilho)', async () => {
      // Mock dos dados
      mockUseTrackData.mockReturnValue({
        data: mockTrackB,
        isLoading: false,
        error: null,
      });
      
      const mockDiscount20_1 = { ...mockDiscountIIR, percentual_base: 20, percentual_efetivo: 20 };
      const mockDiscount20_2 = { ...mockDiscountRES, percentual_base: 20, percentual_efetivo: 20 };
      const mockDiscount20_3 = { ...mockDiscountRES, id: 'discount-3', percentual_base: 20, percentual_efetivo: 20 };
      
      mockUseMultipleDiscountData.mockReturnValue({
        data: [mockDiscount20_1, mockDiscount20_2, mockDiscount20_3],
        isLoading: false,
        error: null,
        refetchAll: jest.fn(),
      });

      const { result } = renderHook(
        () => useCalculatedTotals('B', ['discount-1', 'discount-2', 'discount-3'], 1000),
        { wrapper: createWrapper() }
      );

      expect(result.current.totals.subtotal_percentual).toBe(60);
      expect(result.current.totals.percentual_aplicado).toBe(25);
      expect(result.current.totals.valor_final).toBe(750);
      expect(result.current.totals.trilho_info.cap).toBe(25);
      expect(result.current.totals.trilho_info.cap_aplicado).toBe(true);
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Cenário 3: Trilho C + Bolsa Integral', () => {
    it('deve aplicar 100% mesmo com CAP de 60% (regra especial)', async () => {
      // Mock dos dados
      mockUseTrackData.mockReturnValue({
        data: mockTrackC,
        isLoading: false,
        error: null,
      });
      
      mockUseMultipleDiscountData.mockReturnValue({
        data: [mockDiscountPASS],
        isLoading: false,
        error: null,
        refetchAll: jest.fn(),
      });

      const { result } = renderHook(
        () => useCalculatedTotals('C', ['discount-3'], 1000),
        { wrapper: createWrapper() }
      );

      expect(result.current.totals.subtotal_percentual).toBe(100);
      expect(result.current.totals.percentual_aplicado).toBe(100);
      expect(result.current.totals.valor_final).toBe(0);
      expect(result.current.totals.trilho_info.cap).toBe(60);
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Cenário 4: Sem trilho selecionado', () => {
    it('deve usar CAP padrão de 60%', async () => {
      // Mock dos dados
      mockUseTrackData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });
      
      const mockDiscount40_1 = { ...mockDiscountIIR, percentual_base: 40, percentual_efetivo: 40 };
      const mockDiscount40_2 = { ...mockDiscountRES, percentual_base: 40, percentual_efetivo: 40 };
      
      mockUseMultipleDiscountData.mockReturnValue({
        data: [mockDiscount40_1, mockDiscount40_2],
        isLoading: false,
        error: null,
        refetchAll: jest.fn(),
      });

      const { result } = renderHook(
        () => useCalculatedTotals(null, ['discount-1', 'discount-2'], 1000),
        { wrapper: createWrapper() }
      );

      expect(result.current.totals.subtotal_percentual).toBe(80);
      expect(result.current.totals.percentual_aplicado).toBe(60);
      expect(result.current.totals.valor_final).toBe(400);
      expect(result.current.totals.trilho_info.cap).toBe(60);
      expect(result.current.totals.trilho_info.cap_aplicado).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('deve retornar valores padrão quando valor base é zero', async () => {
      const { result } = renderHook(
        () => useCalculatedTotals('A', [], 0),
        { wrapper: createWrapper() }
      );

      expect(result.current.totals.valor_base).toBe(0);
      expect(result.current.totals.valor_final).toBe(0);
      expect(result.current.isValid).toBe(false);
      expect(result.current.totals.validacao.errors).toContain('Valor base deve ser maior que zero');
    });

    it('deve lidar com descontos inativos', async () => {
      mockUseTrackData.mockReturnValue({
        data: mockTrackA,
        isLoading: false,
        error: null,
      });
      
      const mockDiscountInativo = { ...mockDiscountIIR, ativo: false };
      
      mockUseMultipleDiscountData.mockReturnValue({
        data: [mockDiscountInativo],
        isLoading: false,
        error: null,
        refetchAll: jest.fn(),
      });

      const { result } = renderHook(
        () => useCalculatedTotals('A', ['discount-1'], 1000),
        { wrapper: createWrapper() }
      );

      expect(result.current.totals.descontos[0].status_elegibilidade).toBe('bloqueado');
      expect(result.current.totals.percentual_aplicado).toBe(0);
    });

    it('deve detectar descontos não permitidos no trilho', async () => {
      mockUseTrackData.mockReturnValue({
        data: mockTrackB, // Trilho B exclui PASS
        isLoading: false,
        error: null,
      });
      
      mockUseMultipleDiscountData.mockReturnValue({
        data: [mockDiscountPASS],
        isLoading: false,
        error: null,
        refetchAll: jest.fn(),
      });

      const { result } = renderHook(
        () => useCalculatedTotals('B', ['discount-3'], 1000),
        { wrapper: createWrapper() }
      );

      expect(result.current.isValid).toBe(false);
      expect(result.current.totals.validacao.errors.length).toBeGreaterThan(0);
    });

    it('deve lidar com erro de carregamento', async () => {
      mockUseTrackData.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
      });

      const { result } = renderHook(
        () => useCalculatedTotals('A', [], 1000),
        { wrapper: createWrapper() }
      );

      expect(result.current.error).toEqual(new Error('Network error'));
      expect(result.current.isValid).toBe(false);
    });

    it('deve mostrar estado de loading', async () => {
      mockUseTrackData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(
        () => useCalculatedTotals('A', [], 1000),
        { wrapper: createWrapper() }
      );

      expect(result.current.isCalculating).toBe(true);
    });
  });

  describe('Proporção nos descontos com CAP', () => {
    it('deve aplicar proporção correta quando CAP é aplicado', async () => {
      mockUseTrackData.mockReturnValue({
        data: mockTrackC, // CAP de 60%
        isLoading: false,
        error: null,
      });
      
      const mockDiscount30_1 = { ...mockDiscountIIR, percentual_base: 30, percentual_efetivo: 30 };
      const mockDiscount60_2 = { ...mockDiscountRES, percentual_base: 60, percentual_efetivo: 60 };
      
      mockUseMultipleDiscountData.mockReturnValue({
        data: [mockDiscount30_1, mockDiscount60_2],
        isLoading: false,
        error: null,
        refetchAll: jest.fn(),
      });

      const { result } = renderHook(
        () => useCalculatedTotals('C', ['discount-1', 'discount-2'], 1000),
        { wrapper: createWrapper() }
      );

      expect(result.current.totals.subtotal_percentual).toBe(90);
      expect(result.current.totals.percentual_aplicado).toBe(60);
      
      // Verificar se a proporção foi aplicada corretamente
      // 30% de 90% = 1/3, então deve ter 20% (1/3 de 60%)
      // 60% de 90% = 2/3, então deve ter 40% (2/3 de 60%)
      expect(result.current.totals.descontos[0].percentual_aplicado).toBeCloseTo(20);
      expect(result.current.totals.descontos[1].percentual_aplicado).toBeCloseTo(40);
    });
  });
});

describe('useSimpleTotal', () => {
  it('deve retornar apenas percentual e valor final', async () => {
    mockUseTrackData.mockReturnValue({
      data: mockTrackA,
      isLoading: false,
      error: null,
    });
    
    const mockDiscount25 = { ...mockDiscountIIR, percentual_base: 25, percentual_efetivo: 25 };
    
    mockUseMultipleDiscountData.mockReturnValue({
      data: [mockDiscount25],
      isLoading: false,
      error: null,
      refetchAll: jest.fn(),
    });

    const { result } = renderHook(
      () => useSimpleTotal('A', ['discount-1'], 1000),
      { wrapper: createWrapper() }
    );

    expect(result.current.percentual).toBe(25);
    expect(result.current.valorFinal).toBe(750);
    expect(result.current.isValid).toBe(true);
  });
});

// Configuração global para mocks
jest.mock('../useDiscountData', () => ({
  useMultipleDiscountData: () => mockUseMultipleDiscountData(),
}));

jest.mock('../useTrackData', () => ({
  useTrackData: () => mockUseTrackData(),
}));