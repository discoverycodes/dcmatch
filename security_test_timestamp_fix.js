// Teste específico para timestamps maliciosos
import { storage } from './server/database-storage.ts';

async function testTimestampValidation() {
  console.log('🔍 TESTE ESPECÍFICO: Validação de timestamps maliciosos');
  console.log('=' .repeat(60));
  
  const testUserId = 9;
  let vulnerabilitiesFound = [];
  
  const maliciousDates = [
    new Date('2050-01-01'),        // Futuro distante
    new Date('1900-01-01'),        // Passado distante
    new Date('invalid'),           // Data inválida
    null,                          // Null
    undefined,                     // Undefined
    new Date('2024-12-17T23:59:59.999Z'), // Futuro próximo (mais de 5 min)
    new Date('1990-01-01'),        // Muito antigo
    new Date('2040-01-01'),        // Ano fora do range
    'not a date',                  // String inválida
    123456789,                     // Número
    {}                             // Objeto
  ];
  
  for (let i = 0; i < maliciousDates.length; i++) {
    const date = maliciousDates[i];
    console.log(`\nTestando timestamp ${i + 1}: ${date}`);
    
    try {
      await storage.createTransaction({
        userId: testUserId,
        type: 'test',
        amount: 1,
        balanceBefore: 0,
        balanceAfter: 1,
        description: `Test timestamp ${i + 1}`,
        createdAt: date
      });
      
      // Se chegou aqui, o timestamp malicioso foi aceito
      vulnerabilitiesFound.push(`Timestamp malicioso aceito: ${date}`);
      console.log(`❌ VULNERABILIDADE: Timestamp aceito: ${date}`);
      
    } catch (error) {
      console.log(`✅ BLOQUEADO: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESULTADO FINAL DO TESTE DE TIMESTAMP');
  console.log('=' .repeat(60));
  
  if (vulnerabilitiesFound.length === 0) {
    console.log('🛡️ TIMESTAMP SECURITY: Todos os timestamps maliciosos foram bloqueados!');
  } else {
    console.log(`🚨 VULNERABILIDADES ENCONTRADAS: ${vulnerabilitiesFound.length}`);
    vulnerabilitiesFound.forEach((vuln, index) => {
      console.log(`${index + 1}. ${vuln}`);
    });
  }
  
  return vulnerabilitiesFound;
}

testTimestampValidation().catch(console.error);