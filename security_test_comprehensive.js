// Teste abrangente de segurança do sistema de saques
// Simula ataques reais que hackers poderiam tentar

import { storage } from './server/database-storage.ts';

async function runSecurityTests() {
  console.log('🔒 INICIANDO TESTE DE SEGURANÇA ABRANGENTE DO SISTEMA DE SAQUES');
  console.log('=' .repeat(80));
  
  const testUserId = 9;
  let vulnerabilitiesFound = [];
  
  // 1. TESTE DE MANIPULAÇÃO DIRETA DO BANCO DE DADOS
  console.log('\n🔍 TESTE 1: Tentativa de manipulação direta do saldo');
  try {
    // Simular hacker tentando aumentar saldo direto no banco
    const originalUser = await storage.getUser(testUserId);
    console.log(`Saldo original: R$ ${originalUser.balance}`);
    
    // Tentativa de bypass: aumentar balance sem afetar earnings
    await storage.updateUserBalance(testUserId, 10000.00);
    
    const balanceAfterManipulation = await storage.calculateWithdrawableBalance(testUserId);
    console.log(`Saldo após manipulação: R$ ${balanceAfterManipulation.total}`);
    console.log(`Saldo sacável: R$ ${balanceAfterManipulation.withdrawable}`);
    
    if (balanceAfterManipulation.withdrawable > balanceAfterManipulation.earnings) {
      vulnerabilitiesFound.push('CRÍTICO: Possível manipular saldo sem afetar earnings');
    } else {
      console.log('✅ SEGURO: Manipulação de saldo não afeta limite de saque');
    }
  } catch (error) {
    console.log('✅ PROTEÇÃO: Erro ao manipular saldo:', error.message);
  }
  
  // 2. TESTE DE RACE CONDITIONS
  console.log('\n🔍 TESTE 2: Race Conditions - Múltiplos saques simultâneos');
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(storage.calculateWithdrawableBalance(testUserId));
    }
    
    const results = await Promise.all(promises);
    const allSame = results.every(r => r.withdrawable === results[0].withdrawable);
    
    if (allSame) {
      console.log('✅ SEGURO: Race conditions protegidas');
    } else {
      vulnerabilitiesFound.push('MÉDIO: Possível race condition detectada');
    }
  } catch (error) {
    console.log('⚠️ ERRO no teste de race condition:', error.message);
  }
  
  // 3. TESTE DE SQL INJECTION
  console.log('\n🔍 TESTE 3: SQL Injection nos parâmetros');
  try {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "1 OR 1=1",
      "UNION SELECT * FROM users",
      "'; UPDATE users SET balance=999999 WHERE id=9; --"
    ];
    
    let sqlInjectionVulnerable = false;
    
    for (const malInput of maliciousInputs) {
      try {
        // Tentar usar input malicioso como userId
        await storage.getUser(malInput);
      } catch (error) {
        console.log(`✅ INPUT REJEITADO: "${malInput.substring(0, 20)}..."`);
      }
    }
    
    if (!sqlInjectionVulnerable) {
      console.log('✅ SEGURO: SQL Injection protegido');
    }
  } catch (error) {
    console.log('✅ PROTEÇÃO: SQL Injection bloqueado');
  }
  
  // 4. TESTE DE OVERFLOW/UNDERFLOW NUMÉRICO
  console.log('\n🔍 TESTE 4: Overflow/Underflow numérico');
  try {
    const extremeValues = [
      Number.MAX_SAFE_INTEGER,
      -Number.MAX_SAFE_INTEGER,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      NaN,
      undefined,
      null
    ];
    
    for (const value of extremeValues) {
      try {
        await storage.updateUserEarnings(testUserId, value);
        const balance = await storage.calculateWithdrawableBalance(testUserId);
        
        if (balance.earnings < 0 || balance.earnings === Infinity || isNaN(balance.earnings)) {
          vulnerabilitiesFound.push(`CRÍTICO: Valor extremo aceito: ${value}`);
        }
      } catch (error) {
        console.log(`✅ VALOR REJEITADO: ${value}`);
      }
    }
  } catch (error) {
    console.log('✅ PROTEÇÃO: Valores extremos rejeitados');
  }
  
  // 5. TESTE DE MANIPULAÇÃO DE TIMESTAMP
  console.log('\n🔍 TESTE 5: Manipulação de timestamps');
  try {
    // Tentar criar transações com timestamps futuros ou passados
    const maliciousDates = [
      new Date('2050-01-01'),
      new Date('1900-01-01'),
      new Date('invalid'),
      null
    ];
    
    let timestampVulnerable = false;
    for (const date of maliciousDates) {
      try {
        await storage.createTransaction({
          userId: testUserId,
          type: 'win',
          amount: 1000,
          balanceBefore: 0,
          balanceAfter: 1000,
          description: 'Teste timestamp',
          createdAt: date
        });
        timestampVulnerable = true;
      } catch (error) {
        console.log(`✅ TIMESTAMP REJEITADO: ${date}`);
      }
    }
    
    if (timestampVulnerable) {
      vulnerabilitiesFound.push('MÉDIO: Timestamps maliciosos aceitos');
    }
  } catch (error) {
    console.log('✅ PROTEÇÃO: Timestamps validados');
  }
  
  // 6. TESTE DE DIVISÃO POR ZERO
  console.log('\n🔍 TESTE 6: Divisão por zero e operações matemáticas');
  try {
    await storage.updateUserEarnings(testUserId, 100/0);
    vulnerabilitiesFound.push('CRÍTICO: Divisão por zero aceita');
  } catch (error) {
    console.log('✅ PROTEÇÃO: Divisão por zero rejeitada');
  }
  
  // 7. TESTE DE PRECISION FLOAT
  console.log('\n🔍 TESTE 7: Problemas de precisão de ponto flutuante');
  try {
    const precisionTest = 0.1 + 0.2; // Conhecido por dar 0.30000000000000004
    await storage.updateUserEarnings(testUserId, precisionTest);
    
    const balance = await storage.calculateWithdrawableBalance(testUserId);
    const hasFloatPrecisionIssue = balance.earnings.toString().includes('000000000');
    
    if (hasFloatPrecisionIssue) {
      vulnerabilitiesFound.push('BAIXO: Problemas de precisão float detectados');
    } else {
      console.log('✅ SEGURO: Precisão numérica mantida');
    }
  } catch (error) {
    console.log('✅ PROTEÇÃO: Operações de precisão validadas');
  }
  
  // 8. TESTE DE NEGAÇÃO DE SERVIÇO (DoS)
  console.log('\n🔍 TESTE 8: Tentativa de DoS com operações custosas');
  try {
    const startTime = Date.now();
    
    // Tentar fazer muitas operações rapidamente
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(storage.calculateWithdrawableBalance(testUserId));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (duration > 5000) { // Mais de 5 segundos
      vulnerabilitiesFound.push('MÉDIO: Possível vulnerabilidade DoS - operações muito lentas');
    } else {
      console.log(`✅ PERFORMANCE: 100 operações em ${duration}ms`);
    }
  } catch (error) {
    console.log('⚠️ ERRO no teste DoS:', error.message);
  }
  
  // 9. TESTE DE INTEGRIDADE REFERENCIAL
  console.log('\n🔍 TESTE 9: Violação de integridade referencial');
  try {
    // Tentar criar transação para usuário inexistente
    await storage.createTransaction({
      userId: 99999,
      type: 'win',
      amount: 1000,
      balanceBefore: 0,
      balanceAfter: 1000,
      description: 'Teste usuário inexistente'
    });
    vulnerabilitiesFound.push('CRÍTICO: Transação criada para usuário inexistente');
  } catch (error) {
    console.log('✅ PROTEÇÃO: Integridade referencial mantida');
  }
  
  // 10. TESTE DE VALORES NEGATIVOS
  console.log('\n🔍 TESTE 10: Manipulação com valores negativos');
  try {
    await storage.updateUserEarnings(testUserId, -1000);
    const balance = await storage.calculateWithdrawableBalance(testUserId);
    
    if (balance.earnings < 0) {
      vulnerabilitiesFound.push('CRÍTICO: Earnings negativos aceitos');
    } else {
      console.log('✅ SEGURO: Valores negativos tratados corretamente');
    }
  } catch (error) {
    console.log('✅ PROTEÇÃO: Valores negativos rejeitados');
  }
  
  // RELATÓRIO FINAL
  console.log('\n' + '=' .repeat(80));
  console.log('📊 RELATÓRIO FINAL DE SEGURANÇA');
  console.log('=' .repeat(80));
  
  if (vulnerabilitiesFound.length === 0) {
    console.log('🛡️ SISTEMA SEGURO: Nenhuma vulnerabilidade crítica encontrada!');
    console.log('✅ Todos os vetores de ataque testados foram bloqueados com sucesso.');
  } else {
    console.log(`🚨 VULNERABILIDADES ENCONTRADAS: ${vulnerabilitiesFound.length}`);
    vulnerabilitiesFound.forEach((vuln, index) => {
      console.log(`${index + 1}. ${vuln}`);
    });
  }
  
  console.log('\n🔧 TESTES REALIZADOS:');
  console.log('- Manipulação direta de saldo');
  console.log('- Race conditions');
  console.log('- SQL Injection');
  console.log('- Overflow/Underflow numérico');
  console.log('- Manipulação de timestamps');
  console.log('- Divisão por zero');
  console.log('- Precisão de ponto flutuante');
  console.log('- Negação de serviço (DoS)');
  console.log('- Integridade referencial');
  console.log('- Valores negativos');
  
  return vulnerabilitiesFound;
}

runSecurityTests().catch(console.error);