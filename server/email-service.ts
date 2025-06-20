import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private usePhpMailer: boolean;
  private execAsync = promisify(exec);

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@memoria-premiada.com';
    this.usePhpMailer = process.env.USE_PHP_MAILER === 'true';
    
    if (!this.usePhpMailer) {
      // Configuration for different email providers
      const emailConfig = this.getEmailConfig();
      this.transporter = nodemailer.createTransport(emailConfig);
    }
  }

  private getEmailConfig(): EmailConfig {
    // Try to use environment variables first
    if (process.env.SMTP_HOST) {
      return {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || ''
        } : undefined
      };
    }

    // Fallback to local testing configuration
    return {
      host: '127.0.0.1',
      port: 1025,
      secure: false,
      // No auth for local testing
    };
  }

  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    try {
      const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
      
      if (this.usePhpMailer) {
        return await this.sendWithPhpMailer(email, userName, resetUrl, resetToken);
      } else if (this.transporter) {
        const mailOptions = {
          from: this.fromEmail,
          to: email,
          subject: 'Recuperação de Senha - Memória Premiada',
          html: this.generatePasswordResetHTML(userName, resetUrl, resetToken),
          text: this.generatePasswordResetText(userName, resetUrl, resetToken)
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log('[EMAIL] Password reset email sent:', info.messageId);
        return true;
      } else {
        console.error('[EMAIL] No email transport configured');
        return false;
      }
    } catch (error) {
      console.error('[EMAIL] Failed to send password reset email:', error);
      return false;
    }
  }

  private async sendWithPhpMailer(email: string, userName: string, resetUrl: string, resetToken: string): Promise<boolean> {
    try {
      // Log the reset URL for development/testing purposes
      console.log(`[EMAIL] Password reset URL generated for ${email}: ${resetUrl}`);
      
      const phpScript = await this.createPhpMailerScript(email, userName, resetUrl, resetToken);
      const scriptPath = path.join(process.cwd(), 'temp_mailer.php');
      
      // Salvar o script PHP temporário
      await fs.writeFile(scriptPath, phpScript);
      
      // Executar o script PHP
      const { stdout, stderr } = await this.execAsync(`php ${scriptPath}`);
      
      // Limpar o arquivo temporário
      await fs.unlink(scriptPath);
      
      if (stderr && !stderr.includes('sendmail')) {
        console.error('[EMAIL] PHPMailer error:', stderr);
        return false;
      }
      
      // In development environment, always return success since we're logging the URL
      if (process.env.NODE_ENV !== 'production') {
        console.log('[EMAIL] Development mode: Email would be sent in production');
        console.log('[EMAIL] Reset link:', resetUrl);
        return true;
      }
      
      console.log('[EMAIL] PHPMailer output:', stdout);
      return stdout.includes('SUCCESS');
    } catch (error) {
      console.error('[EMAIL] PHPMailer execution failed:', error);
      
      // In development, still return success with logged URL
      if (process.env.NODE_ENV !== 'production') {
        console.log('[EMAIL] Development fallback: Check console for reset link');
        return true;
      }
      
      return false;
    }
  }

  private async createPhpMailerScript(email: string, userName: string, resetUrl: string, resetToken: string): Promise<string> {
    const htmlContent = this.generatePasswordResetHTML(userName, resetUrl, resetToken)
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');

    return `<?php
// Script temporário para envio de email via PHPMailer nativo
$to = "${email}";
$subject = "Recuperação de Senha - Memória Premiada";
$from = "${this.fromEmail}";
$fromName = "Memória Premiada";

// Headers para email HTML
$headers = array();
$headers[] = "MIME-Version: 1.0";
$headers[] = "Content-type: text/html; charset=UTF-8";
$headers[] = "From: " . $fromName . " <" . $from . ">";
$headers[] = "Reply-To: " . $from;
$headers[] = "X-Mailer: PHP/" . phpversion();
$headers[] = "Return-Path: " . $from;

$htmlMessage = "${htmlContent}";

// Configurar parâmetros adicionais para compatibilidade
$additional_params = "-f" . $from;

// Tentar enviar email com parâmetros adicionais
if (mail($to, $subject, $htmlMessage, implode("\\r\\n", $headers), $additional_params)) {
    echo "SUCCESS: Email sent to $to";
} else {
    // Tentar método alternativo sem parâmetros extras
    if (mail($to, $subject, $htmlMessage, implode("\\r\\n", $headers))) {
        echo "SUCCESS: Email sent to $to (fallback method)";
    } else {
        echo "ERROR: Failed to send email to $to";
    }
}
?>`;
  }

  private generatePasswordResetHTML(userName: string, resetUrl: string, resetToken: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperação de Senha</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .token { background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace; word-break: break-all; }
          .warning { background: #fff3cd; border: 1px solid #ffecb5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎮 Memória Premiada</h1>
            <p>Recuperação de Senha</p>
          </div>
          <div class="content">
            <h2>Olá, ${userName}!</h2>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetUrl}" class="button">Redefinir Senha</a>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <div class="token">${resetUrl}</div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul>
                <li>Este link expira em 1 hora</li>
                <li>Use apenas se você solicitou a recuperação</li>
                <li>Nunca compartilhe este link com outras pessoas</li>
              </ul>
            </div>
            
            <p>Caso você não tenha solicitado esta recuperação, pode ignorar este email com segurança.</p>
          </div>
          <div class="footer">
            <p>Memória Premiada<br>Este email foi enviado automaticamente pelo sistema.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetText(userName: string, resetUrl: string, resetToken: string): string {
    return `
🎮 MEMÓRIA PREMIADA - Recuperação de Senha

Olá, ${userName}!

Recebemos uma solicitação para redefinir a senha da sua conta.

Para criar uma nova senha, acesse o link abaixo:
${resetUrl}

⚠️ IMPORTANTE:
- Este link expira em 1 hora
- Use apenas se você solicitou a recuperação  
- Nunca compartilhe este link com outras pessoas

Caso você não tenha solicitado esta recuperação, pode ignorar este email com segurança.

---
Memória Premiada
Este email foi enviado automaticamente pelo sistema.
    `;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (this.usePhpMailer) {
        // Testar se PHP está disponível
        try {
          await this.execAsync('php --version');
          console.log('[EMAIL] PHPMailer available');
          return true;
        } catch (error) {
          console.error('[EMAIL] PHP not available for PHPMailer');
          return false;
        }
      } else if (this.transporter) {
        await this.transporter.verify();
        console.log('[EMAIL] SMTP connection verified successfully');
        return true;
      } else {
        console.error('[EMAIL] No email transport configured');
        return false;
      }
    } catch (error) {
      console.error('[EMAIL] Connection test failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();