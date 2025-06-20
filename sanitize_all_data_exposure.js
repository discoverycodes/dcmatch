// Comprehensive data sanitization script to eliminate all remaining vulnerabilities
import fs from 'fs';
import path from 'path';

const files = [
  'server/routes.ts',
  'server/database-storage.ts', 
  'server/plisio.ts',
  'server/primepag.ts',
  'server/index.ts'
];

const replacements = [
  // Critical token and password logging
  {
    pattern: /console\.log\([^)]*(?:password|token|secret|key)[^)]*\)/gi,
    replacement: 'LogSanitizer.logAuth("Sensitive operation completed", "system")'
  },
  {
    pattern: /console\.error\([^)]*(?:password|token|secret)[^)]*\)/gi,
    replacement: 'LogSanitizer.logError("Authentication error", new Error("Operation failed"))'
  },
  
  // Balance and financial data logging
  {
    pattern: /console\.log\([^)]*balance[^)]*\d+[^)]*\)/gi,
    replacement: 'LogSanitizer.logFinancial("Balance operation", userId || 0)'
  },
  {
    pattern: /console\.log\([^)]*withdrawal[^)]*amount[^)]*\)/gi,
    replacement: 'LogSanitizer.logFinancial("Withdrawal operation", userId || 0)'
  },
  
  // Remove specific vulnerable log statements
  {
    pattern: /console\.log\(`\[SECURITY\] Admin password hash for '\$\{defaultPassword\}': \$\{hash\}`\);/,
    replacement: 'safeLog("info", "Admin password hash generated for default password");'
  },
  {
    pattern: /console\.log\('\[SECURITY\] Please set ADMIN_PASSWORD_HASH environment variable with this hash for production'\);/,
    replacement: 'safeLog("info", "Please set ADMIN_PASSWORD_HASH environment variable with generated hash for production");'
  },
  {
    pattern: /console\.log\('\[PRIMEPAG\] Using stored token'\);/,
    replacement: 'LogSanitizer.logAuth("Using stored Primepag token", "system");'
  },
  {
    pattern: /console\.log\('\[PRIMEPAG\] Generating new token'\);/,
    replacement: 'LogSanitizer.logAuth("Generating new Primepag token", "system");'
  },
  {
    pattern: /console\.log\('\[PRIMEPAG\] Token received successfully'\);/,
    replacement: 'LogSanitizer.logAuth("Primepag token received successfully", "system");'
  },
  {
    pattern: /console\.log\('PrimePag token handling bypassed - using fresh tokens'\);/,
    replacement: 'LogSanitizer.logAuth("PrimePag token handling bypassed", "system");'
  },
  
  // Error logging sanitization
  {
    pattern: /console\.error\('\[PIX\] Token test error:', error\);/,
    replacement: 'LogSanitizer.logError("PIX token test", error);'
  },
  {
    pattern: /console\.error\('\[PASSWORD RESET\] Failed to send email for user:', user\.email\);/,
    replacement: 'LogSanitizer.logError("Password reset email failed", new Error("Email send failed"));'
  },
  {
    pattern: /console\.error\('Forgot password error:', error\);/,
    replacement: 'LogSanitizer.logError("Forgot password operation", error);'
  },
  {
    pattern: /console\.error\('Reset password error:', error\);/,
    replacement: 'LogSanitizer.logError("Reset password operation", error);'
  },
  {
    pattern: /console\.error\('Error creating password reset:', error\);/,
    replacement: 'LogSanitizer.logError("Create password reset", error);'
  },
  {
    pattern: /console\.error\('Error getting password reset:', error\);/,
    replacement: 'LogSanitizer.logError("Get password reset", error);'
  },
  {
    pattern: /console\.error\('Error marking password reset as used:', error\);/,
    replacement: 'LogSanitizer.logError("Mark password reset used", error);'
  },
  {
    pattern: /console\.error\('Error getting user by token:', error\);/,
    replacement: 'LogSanitizer.logError("Get user by token", error);'
  },
  {
    pattern: /console\.error\('Error checking user token existence:', error\);/,
    replacement: 'LogSanitizer.logError("Check user token existence", error);'
  },
  {
    pattern: /console\.error\('\[SECURITY\] Password migration failed on startup:', error\);/,
    replacement: 'LogSanitizer.logError("Password migration startup", error);'
  }
];

async function sanitizeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Add import statement if not present
    if (!content.includes('import { LogSanitizer, safeLog }')) {
      if (filePath.includes('client/')) {
        // Skip client files for now
        return false;
      }
      
      const importLine = `import { LogSanitizer, safeLog } from './log-sanitizer';\n`;
      
      // Find the best place to insert import
      const lines = content.split('\n');
      let insertIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() === '' && insertIndex > 0) {
          break;
        }
      }
      
      lines.splice(insertIndex, 0, importLine);
      content = lines.join('\n');
      changed = true;
    }
    
    // Apply all replacements
    for (const { pattern, replacement } of replacements) {
      const originalContent = content;
      content = content.replace(pattern, replacement);
      if (content !== originalContent) {
        changed = true;
        console.log(`✅ Applied sanitization to ${filePath}`);
      }
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`📝 Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function sanitizeAllFiles() {
  console.log('🛡️ INICIANDO SANITIZAÇÃO COMPLETA DE DADOS SENSÍVEIS');
  console.log('=' .repeat(60));
  
  let totalUpdated = 0;
  
  for (const file of files) {
    console.log(`\n📄 Processando: ${file}`);
    const updated = await sanitizeFile(file);
    if (updated) {
      totalUpdated++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESULTADO DA SANITIZAÇÃO');
  console.log('=' .repeat(60));
  console.log(`✅ Arquivos atualizados: ${totalUpdated}/${files.length}`);
  console.log('🛡️ Sanitização de dados sensíveis concluída!');
  
  return totalUpdated;
}

sanitizeAllFiles().catch(console.error);