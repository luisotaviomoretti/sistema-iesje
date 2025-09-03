/**
 * TESTE SIMPLES DO SISTEMA FRONTEND DE ELEGIBILIDADE
 * Execute no console do navegador para testar
 */

console.log('🧪 TESTANDO SISTEMA FRONTEND DE ELEGIBILIDADE');
console.log('==============================================');

// Simular dados de teste
const testDiscounts = [
  { codigo: 'IIR', descricao: 'Irmãos', categoria: 'familiar' },
  { codigo: 'CEP5', descricao: 'CEP 5%', categoria: 'geografico' },
  { codigo: 'CEP10', descricao: 'CEP 10%', categoria: 'geografico' },
  { codigo: 'ABI', descricao: 'Bolsa Integral', categoria: 'bolsa' },
  { codigo: 'RES', descricao: 'Outras Cidades', categoria: 'geografico' }
];

const testCeps = [
  { cep: '37701-000', expectedCategory: 'alta', desc: 'Centro Poços (Alta Renda)' },
  { cep: '37704-000', expectedCategory: 'baixa', desc: 'Região Sul (Baixa Renda)' },
  { cep: '01000-000', expectedCategory: 'fora', desc: 'São Paulo (Fora)' },
  { cep: '', expectedCategory: null, desc: 'CEP vazio' }
];

// Função para testar (será importada dinamicamente)
async function testEligibilitySystem() {
  try {
    // Importar módulos (simula o que acontece no navegador)
    const { FrontendEligibilityService } = await import('./src/features/enrollment/services/frontendEligibilityService.js');
    const { getCategoryShortDescription } = await import('./src/features/enrollment/utils/cepClassifier.js');
    
    console.log('✅ Módulos carregados com sucesso');
    
    // Testar classificação de CEPs
    console.log('\n📍 TESTE DE CLASSIFICAÇÃO DE CEP:');
    testCeps.forEach(test => {
      const categoria = FrontendEligibilityService.classifyCep(test.cep);
      const status = categoria === test.expectedCategory ? '✅' : '❌';
      console.log(`${status} ${test.desc}: ${test.cep} → ${categoria || 'null'}`);
    });
    
    // Testar elegibilidade para diferentes CEPs
    console.log('\n🎯 TESTE DE ELEGIBILIDADE:');
    testCeps.forEach(test => {
      if (test.cep) {
        console.log(`\n--- ${test.desc} (${test.cep}) ---`);
        
        const eligible = FrontendEligibilityService.getEligibleDiscounts(test.cep, testDiscounts);
        const enriched = FrontendEligibilityService.enrichDiscountsWithEligibility(test.cep, testDiscounts);
        const stats = FrontendEligibilityService.getEligibilityStats(test.cep, testDiscounts.map(d => d.codigo));
        const automatic = FrontendEligibilityService.getAutomaticDiscounts(test.cep);
        
        console.log(`  Elegíveis: ${eligible.length}/${testDiscounts.length}`);
        console.log(`  Códigos elegíveis: [${eligible.map(d => d.codigo).join(', ')}]`);
        console.log(`  Automáticos: [${automatic.join(', ')}]`);
        console.log(`  Estatísticas:`, stats);
      }
    });
    
    // Testar validação de descontos selecionados
    console.log('\n✅ TESTE DE VALIDAÇÃO:');
    const selectedDiscounts = ['IIR', 'CEP5', 'ABI'];
    
    testCeps.forEach(test => {
      if (test.cep) {
        const validation = FrontendEligibilityService.validateDiscounts(test.cep, selectedDiscounts, testDiscounts);
        console.log(`${test.desc}: ${validation.isValid ? '✅ Válido' : '❌ Inválido'}`);
        if (!validation.isValid) {
          console.log(`  Inválidos: [${validation.invalidDiscounts.join(', ')}]`);
        }
      }
    });
    
    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Instruções para executar
console.log('\n📋 PARA EXECUTAR ESTE TESTE:');
console.log('1. Abra o DevTools do navegador (F12)');
console.log('2. Vá até a aba Console');
console.log('3. Cole e execute o comando: testEligibilitySystem()');
console.log('\nOu execute diretamente no terminal Node.js se os módulos estiverem compilados.');