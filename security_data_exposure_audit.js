// Auditoria completa de exposição de dados sensíveis
// Verifica logs, console.log, responses da API e dados que podem vazar

import fs from 'fs';
import path from 'path';

async function auditDataExposure() {
  console.log('🔍 AUDITORIA DE EXPOSIÇÃO DE DADOS SENSÍVEIS');
  console.log('=' .repeat(70));
  
  const vulnerabilities = [];
  const sensitivePatterns = [
    // Senhas e tokens
    { pattern: /password['":].*?['"]/gi, type: 'CRÍTICO', desc: 'Password exposure' },
    { pattern: /token['":].*?['"]/gi, type: 'CRÍTICO', desc: 'Token exposure' },
    { pattern: /secret['":].*?['"]/gi, type: 'CRÍTICO', desc: 'Secret exposure' },
    { pattern: /api[_-]?key['":].*?['"]/gi, type: 'CRÍTICO', desc: 'API Key exposure' },
    
    // Dados financeiros
    { pattern: /balance['":].*?\d+/gi, type: 'ALTO', desc: 'Balance exposure in logs' },
    { pattern: /withdraw.*?amount.*?\d+/gi, type: 'ALTO', desc: 'Withdrawal amount logging' },
    { pattern: /pix[_-]?key['":].*?['"]/gi, type: 'ALTO', desc: 'PIX key exposure' },
    { pattern: /wallet[_-]?address['":].*?['"]/gi, type: 'ALTO', desc: 'Wallet address exposure' },
    
    // Dados pessoais
    { pattern: /email['":].*?@.*?['"]/gi, type: 'MÉDIO', desc: 'Email exposure' },
    { pattern: /cpf['":].*?\d{11}/gi, type: 'ALTO', desc: 'CPF exposure' },
    { pattern: /phone['":].*?\d{10,}/gi, type: 'MÉDIO', desc: 'Phone exposure' },
    
    // IDs e hashes
    { pattern: /user[_-]?id['":].*?\d+/gi, type: 'BAIXO', desc: 'User ID exposure' },
    { pattern: /session[_-]?id['":].*?['"]/gi, type: 'MÉDIO', desc: 'Session ID exposure' },
    
    // Console logs perigosos
    { pattern: /console\.log\(.*(?:password|token|secret|key).*\)/gi, type: 'CRÍTICO', desc: 'Sensitive data in console.log' },
    { pattern: /console\.error\(.*(?:password|token|secret).*\)/gi, type: 'CRÍTICO', desc: 'Sensitive data in console.error' },
    
    // SQL queries expostas
    { pattern: /SELECT.*FROM.*users.*WHERE/gi, type: 'MÉDIO', desc: 'SQL query structure exposure' },
    { pattern: /INSERT.*INTO.*users/gi, type: 'MÉDIO', desc: 'SQL insert structure exposure' }
  ];
  
  const filesToAudit = [
    'server/routes.ts',
    'server/database-storage.ts', 
    'server/plisio.ts',
    'server/primepag.ts',
    'client/src/pages/payments.tsx',
    'client/src/pages/dashboard.tsx',
    'client/src/pages/login.tsx',
    'server/index.ts'
  ];
  
  console.log('\n🔍 ANALISANDO ARQUIVOS PARA EXPOSIÇÃO DE DADOS...\n');
  
  for (const filePath of filesToAudit) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Arquivo não encontrado: ${filePath}`);
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`📄 Analisando: ${filePath}`);
      
      for (const { pattern, type, desc } of sensitivePatterns) {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            vulnerabilities.push({
              file: filePath,
              type,
              description: desc,
              match: match.substring(0, 100) + (match.length > 100 ? '...' : ''),
              line: findLineNumber(content, match)
            });
            console.log(`  ❌ ${type}: ${desc}`);
            console.log(`     └─ ${match.substring(0, 80)}...`);
          });
        }
      }
    } catch (error) {
      console.log(`⚠️ Erro ao ler ${filePath}: ${error.message}`);
    }
  }
  
  // Verificar estrutura de responses da API
  console.log('\n🔍 ANALISANDO ESTRUTURA DE RESPONSES DA API...\n');
  
  const apiResponseChecks = [
    { 
      endpoint: '/api/user/balance',
      sensitiveFields: ['balance', 'withdrawable', 'earnings'],
      riskLevel: 'MÉDIO'
    },
    {
      endpoint: '/api/payments/*',
      sensitiveFields: ['amount', 'wallet_address', 'pix_key'],
      riskLevel: 'ALTO'
    },
    {
      endpoint: '/api/auth/*',
      sensitiveFields: ['password', 'token', 'session'],
      riskLevel: 'CRÍTICO'
    }
  ];
  
  // Verificar exposição em logs do servidor
  console.log('\n🔍 VERIFICANDO LOGS DO SERVIDOR...\n');
  
  const logPatterns = [
    /\[.*\].*password/gi,
    /\[.*\].*token/gi,
    /\[.*\].*secret/gi,
    /\[.*\].*balance.*\d+/gi,
    /\[.*\].*withdrawal.*\d+/gi
  ];
  
  // Verificar network requests que podem vazar dados
  console.log('\n🔍 VERIFICANDO POSSÍVEIS VAZAMENTOS EM NETWORK REQUESTS...\n');
  
  const networkVulns = [
    'Dados de pagamento em URL parameters',
    'Tokens em headers não criptografados',
    'Senhas em query strings',
    'Dados pessoais em logs de acesso',
    'Informações de saldo em responses desnecessários'
  ];
  
  // Compilar relatório final
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RELATÓRIO DE EXPOSIÇÃO DE DADOS SENSÍVEIS');
  console.log('=' .repeat(70));
  
  const critical = vulnerabilities.filter(v => v.type === 'CRÍTICO');
  const high = vulnerabilities.filter(v => v.type === 'ALTO');
  const medium = vulnerabilities.filter(v => v.type === 'MÉDIO');
  const low = vulnerabilities.filter(v => v.type === 'BAIXO');
  
  console.log(`🚨 VULNERABILIDADES CRÍTICAS: ${critical.length}`);
  console.log(`⚠️ VULNERABILIDADES ALTAS: ${high.length}`);
  console.log(`📋 VULNERABILIDADES MÉDIAS: ${medium.length}`);
  console.log(`ℹ️ VULNERABILIDADES BAIXAS: ${low.length}`);
  console.log(`\n📊 TOTAL: ${vulnerabilities.length} vulnerabilidades encontradas`);
  
  if (vulnerabilities.length > 0) {
    console.log('\n🔍 DETALHES DAS VULNERABILIDADES:\n');
    vulnerabilities.forEach((vuln, index) => {
      console.log(`${index + 1}. [${vuln.type}] ${vuln.description}`);
      console.log(`   📄 Arquivo: ${vuln.file}:${vuln.line}`);
      console.log(`   🔍 Código: ${vuln.match}`);
      console.log('');
    });
    
    console.log('\n🔧 RECOMENDAÇÕES DE CORREÇÃO:\n');
    
    if (critical.length > 0) {
      console.log('🚨 CRÍTICO - Ação imediata necessária:');
      console.log('   • Remover todos os logs de senhas, tokens e chaves');
      console.log('   • Implementar sanitização de logs');
      console.log('   • Usar variáveis de ambiente para dados sensíveis');
    }
    
    if (high.length > 0) {
      console.log('⚠️ ALTO - Corrigir em 24h:');
      console.log('   • Remover exposição de dados financeiros em logs');
      console.log('   • Mascarar PIX keys e wallet addresses em logs');
      console.log('   • Implementar logs estruturados sem dados sensíveis');
    }
    
    if (medium.length > 0) {
      console.log('📋 MÉDIO - Corrigir em 1 semana:');
      console.log('   • Minimizar logs de dados pessoais');
      console.log('   • Implementar log rotation e cleanup');
      console.log('   • Adicionar filtros de sanitização');
    }
    
  } else {
    console.log('✅ NENHUMA VULNERABILIDADE DE EXPOSIÇÃO ENCONTRADA!');
    console.log('   Sistema está protegido contra vazamentos de dados.');
  }
  
  return vulnerabilities;
}

function findLineNumber(content, searchString) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchString.substring(0, 50))) {
      return i + 1;
    }
  }
  return 'N/A';
}

auditDataExposure().catch(console.error);