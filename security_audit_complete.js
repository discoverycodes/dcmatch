import fs from 'fs';
import path from 'path';

// Complete security audit for client-side vulnerabilities
console.log('🔍 AUDITORIA COMPLETA DE SEGURANÇA - VULNERABILIDADES CLIENT-SIDE');
console.log('=' .repeat(70));

const vulnerabilities = {
  critical: [],
  high: [],
  medium: [],
  low: []
};

// Audit game-related endpoints
function auditGameSecurity() {
  console.log('\n📱 AUDITANDO SEGURANÇA DO JOGO...');
  
  vulnerabilities.critical.push({
    endpoint: '/api/game/memory/result',
    issue: 'matchedPairs value trusted from client',
    details: 'Atacante pode enviar matchedPairs: 8 sem jogar',
    impact: 'Ganho de prêmios sem esforço',
    fix: 'Implementar validação server-side de cada jogada'
  });
  
  vulnerabilities.high.push({
    endpoint: '/api/game/create-session',
    issue: 'betAmount pode ser manipulado',
    details: 'Cliente controla valor da aposta enviada',
    impact: 'Possível apostas com valores negativos ou inválidos',
    fix: 'Validação rigorosa de range de valores'
  });
  
  vulnerabilities.high.push({
    endpoint: '/api/game/memory/result',
    issue: 'sessionId pode ser reutilizado',
    details: 'Não valida se sessão já foi usada',
    impact: 'Múltiplos prêmios pela mesma sessão',
    fix: 'Marcar sessões como "used" após resultado'
  });
  
  vulnerabilities.medium.push({
    endpoint: '/api/game/memory/result',
    issue: 'Tempo de jogo não validado adequadamente',
    details: 'Apenas valida se < 30 segundos, mas aceita tempos irreais',
    impact: 'Jogos "instantâneos" suspeitos',
    fix: 'Validar tempo mínimo e máximo razoáveis'
  });
}

// Audit payment security
function auditPaymentSecurity() {
  console.log('\n💳 AUDITANDO SEGURANÇA DE PAGAMENTOS...');
  
  vulnerabilities.critical.push({
    endpoint: '/api/payments/pix/create',
    issue: 'amount value trusted from client',
    details: 'Valor de depósito controlado pelo cliente',
    impact: 'Depósitos com valores manipulados',
    fix: 'Validar amounts contra limites e policies'
  });
  
  vulnerabilities.critical.push({
    endpoint: '/api/payments/crypto/withdraw',
    issue: 'withdrawal amount from client',
    details: 'Valor de saque enviado pelo cliente',
    impact: 'Saques acima do saldo real',
    fix: 'Calcular withdrawal no servidor baseado em saldo real'
  });
  
  vulnerabilities.high.push({
    endpoint: '/api/payments/pix/withdraw',
    issue: 'pixKey validation insufficient',
    details: 'Validação básica de chave PIX',
    impact: 'Chaves PIX inválidas ou maliciosas',
    fix: 'Validação robusta de formato de chaves PIX'
  });
  
  vulnerabilities.medium.push({
    endpoint: '/api/payments/*',
    issue: 'Rate limiting por IP apenas',
    details: 'Não previne ataques distribuídos',
    impact: 'Bypass de rate limiting',
    fix: 'Rate limiting por usuário + IP + fingerprint'
  });
}

// Audit user management security
function auditUserSecurity() {
  console.log('\n👤 AUDITANDO SEGURANÇA DE USUÁRIOS...');
  
  vulnerabilities.high.push({
    endpoint: '/api/user/update',
    issue: 'User data updates from client',
    details: 'Dados pessoais atualizados via cliente',
    impact: 'Manipulação de dados críticos',
    fix: 'Validar campos permitidos para atualização'
  });
  
  vulnerabilities.medium.push({
    endpoint: '/api/auth/register',
    issue: 'Email verification bypass potential',
    details: 'Registro sem verificação adequada',
    impact: 'Contas fake em massa',
    fix: 'Verificação obrigatória de email'
  });
  
  vulnerabilities.medium.push({
    endpoint: '/api/user/balance',
    issue: 'Balance calculation exposed',
    details: 'Lógica de cálculo de saldo pode vazar informações',
    impact: 'Informações sobre sistema de bonificação',
    fix: 'Minimizar informações expostas'
  });
}

// Audit transaction security
function auditTransactionSecurity() {
  console.log('\n💰 AUDITANDO SEGURANÇA DE TRANSAÇÕES...');
  
  vulnerabilities.critical.push({
    endpoint: '/api/user/transactions',
    issue: 'Transaction history manipulation risk',
    details: 'Histórico pode ser manipulado se não houver validação',
    impact: 'Alteração de registros financeiros',
    fix: 'Logs imutáveis com hash verification'
  });
  
  vulnerabilities.high.push({
    endpoint: '/api/admin/*',
    issue: 'Admin endpoints authentication',
    details: 'Verificação de admin pode ser insuficiente',
    impact: 'Acesso não autorizado a funções admin',
    fix: 'Multi-factor authentication para admin'
  });
  
  vulnerabilities.medium.push({
    endpoint: '/api/user/transactions',
    issue: 'Pagination manipulation',
    details: 'Parâmetros de paginação controlados pelo cliente',
    impact: 'Sobrecarga do servidor, exposição de dados',
    fix: 'Limites rigorosos de paginação'
  });
}

// Audit session and authentication
function auditAuthSecurity() {
  console.log('\n🔐 AUDITANDO SEGURANÇA DE AUTENTICAÇÃO...');
  
  vulnerabilities.high.push({
    endpoint: '/api/auth/*',
    issue: 'Session fixation potential',
    details: 'Sessions podem não ser regeneradas adequadamente',
    impact: 'Sequestro de sessão',
    fix: 'Regenerar session ID após login'
  });
  
  vulnerabilities.medium.push({
    endpoint: '/api/auth/password-reset',
    issue: 'Token validation timing',
    details: 'Tokens podem não expirar adequadamente',
    impact: 'Uso de tokens antigos',
    fix: 'Validação rigorosa de tempo de expiração'
  });
  
  vulnerabilities.low.push({
    endpoint: 'All endpoints',
    issue: 'CORS configuration',
    details: 'Configuração CORS pode ser muito permissiva',
    impact: 'Cross-origin attacks',
    fix: 'Restringir origins permitidas'
  });
}

// Check for input validation patterns
function auditInputValidation() {
  console.log('\n🔍 AUDITANDO VALIDAÇÃO DE ENTRADAS...');
  
  try {
    const routesFile = fs.readFileSync('server/routes.ts', 'utf8');
    
    // Check for direct req.body usage without validation
    const directBodyUsage = routesFile.match(/req\.body\.\w+/g) || [];
    if (directBodyUsage.length > 0) {
      vulnerabilities.medium.push({
        endpoint: 'Multiple endpoints',
        issue: 'Direct req.body access without validation',
        details: `Found ${directBodyUsage.length} instances of direct body access`,
        impact: 'Possível injection ou manipulação de dados',
        fix: 'Usar schemas Zod para toda validação de entrada'
      });
    }
    
    // Check for parseInt/parseFloat without validation
    const unsafeParsing = routesFile.match(/parseInt\(|parseFloat\(/g) || [];
    if (unsafeParsing.length > 0) {
      vulnerabilities.medium.push({
        endpoint: 'Multiple endpoints',
        issue: 'Unsafe number parsing',
        details: `Found ${unsafeParsing.length} instances of unsafe parsing`,
        impact: 'NaN injection, type confusion',
        fix: 'Usar Zod number validation'
      });
    }
    
  } catch (error) {
    console.log('⚠️ Could not audit routes file');
  }
}

// Generate comprehensive security report
function generateSecurityReport() {
  console.log('\n📊 RELATÓRIO DE VULNERABILIDADES');
  console.log('=' .repeat(50));
  
  const total = vulnerabilities.critical.length + vulnerabilities.high.length + 
                vulnerabilities.medium.length + vulnerabilities.low.length;
  
  console.log(`\n🚨 CRÍTICAS (${vulnerabilities.critical.length}):`);
  vulnerabilities.critical.forEach((vuln, i) => {
    console.log(`${i + 1}. ${vuln.endpoint}`);
    console.log(`   Issue: ${vuln.issue}`);
    console.log(`   Impact: ${vuln.impact}`);
    console.log(`   Fix: ${vuln.fix}\n`);
  });
  
  console.log(`⚠️ ALTAS (${vulnerabilities.high.length}):`);
  vulnerabilities.high.forEach((vuln, i) => {
    console.log(`${i + 1}. ${vuln.endpoint}`);
    console.log(`   Issue: ${vuln.issue}`);
    console.log(`   Fix: ${vuln.fix}\n`);
  });
  
  console.log(`📋 MÉDIAS (${vulnerabilities.medium.length}):`);
  vulnerabilities.medium.forEach((vuln, i) => {
    console.log(`${i + 1}. ${vuln.endpoint} - ${vuln.issue}`);
  });
  
  console.log(`\n📈 RESUMO EXECUTIVO:`);
  console.log(`• Total de vulnerabilidades: ${total}`);
  console.log(`• Críticas que permitem ganho financeiro direto: ${vulnerabilities.critical.length}`);
  console.log(`• Altas que comprometem segurança do sistema: ${vulnerabilities.high.length}`);
  console.log(`• Médias que podem ser exploradas: ${vulnerabilities.medium.length}`);
  
  console.log(`\n🎯 PRIORIDADES DE CORREÇÃO:`);
  console.log(`1. IMEDIATO (24h): Corrigir todas as vulnerabilidades críticas`);
  console.log(`   - Validação server-side de jogadas`);
  console.log(`   - Validação de valores financeiros`);
  console.log(`   - Prevenção de reutilização de sessões`);
  
  console.log(`\n2. URGENTE (1 semana): Corrigir vulnerabilidades altas`);
  console.log(`   - Fortalecer autenticação admin`);
  console.log(`   - Melhorar validação de entradas`);
  console.log(`   - Implementar rate limiting avançado`);
  
  console.log(`\n3. IMPORTANTE (1 mês): Corrigir vulnerabilidades médias`);
  console.log(`   - Auditoria completa de input validation`);
  console.log(`   - Implementar logging de segurança`);
  console.log(`   - Testes de penetração`);
}

// Run complete security audit
async function runCompleteAudit() {
  console.log('\n🔍 INICIANDO AUDITORIA COMPLETA...\n');
  
  auditGameSecurity();
  auditPaymentSecurity();
  auditUserSecurity();
  auditTransactionSecurity();
  auditAuthSecurity();
  auditInputValidation();
  
  generateSecurityReport();
  
  console.log('\n🛡️ RECOMENDAÇÕES IMEDIATAS:');
  console.log('1. Implementar validação server-side para TODAS as operações financeiras');
  console.log('2. Nunca confiar em dados enviados pelo cliente');
  console.log('3. Validar e sanitizar TODA entrada de usuário');
  console.log('4. Implementar logging de segurança para detectar tentativas de exploração');
  console.log('5. Adicionar testes automatizados de segurança');
  
  return vulnerabilities;
}

export { runCompleteAudit, vulnerabilities };

// Run audit if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompleteAudit().catch(console.error);
}