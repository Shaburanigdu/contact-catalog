// lib/email.ts
import nodemailer from 'nodemailer';

// Надёжная конфигурация для Mailtrap / любого SMTP с портом 587 или 2525
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // 587 и 2525 требуют STARTTLS, а не SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // полезно для самоподписанных сертификатов и dev-среды
  },
});

// Проверка соединения (полезна для отладки)
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection error:', error);
  } else {
    console.log('✅ SMTP server is ready to send messages');
  }
});

function getEmailTemplate(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container { padding: 24px !important; }
          .button { display: block !important; text-align: center !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border-radius: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="padding: 32px 32px 16px 32px; text-align: center; border-bottom: 1px solid #E5E7EB;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <span style="font-size: 28px;">🤝</span>
                        <span style="font-size: 24px; font-weight: 700; color: #4F46E5; margin-left: 8px;">Kindred</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td class="container" style="padding: 32px;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 12px;">
                  <p style="margin: 0 0 8px 0;">© ${new Date().getFullYear()} Kindred — Управление контактами и событиями</p>
                  <p style="margin: 0;">Это письмо отправлено автоматически, пожалуйста, не отвечайте на него.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${resetToken}`;
  
  const content = `
    <h2 style="font-size: 24px; font-weight: 600; color: #111827; margin-bottom: 16px;">Сброс пароля</h2>
    <p style="font-size: 16px; line-height: 1.5; color: #374151; margin-bottom: 24px;">
      Вы запросили сброс пароля для аккаунта <strong>${email}</strong>.
    </p>
    <p style="margin-bottom: 28px;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 16px;">Сбросить пароль</a>
    </p>
    <p style="font-size: 14px; color: #6b7280; margin-bottom: 12px;">
      Или скопируйте ссылку в браузер:<br/>
      <a href="${resetUrl}" style="color: #4F46E5; word-break: break-all;">${resetUrl}</a>
    </p>
    <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
      Ссылка действительна <strong>1 час</strong>.
    </p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="font-size: 13px; color: #6b7280;">
      Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо. Ваш пароль останется без изменений.
    </p>
  `;
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Сброс пароля - Kindred',
    html: getEmailTemplate(content, 'Сброс пароля'),
  });
}

export async function sendPasswordChangedEmail(email: string) {
  const content = `
    <h2 style="font-size: 24px; font-weight: 600; color: #111827; margin-bottom: 16px;">Пароль успешно изменён</h2>
    <p style="font-size: 16px; line-height: 1.5; color: #374151; margin-bottom: 20px;">
      Здравствуйте!
    </p>
    <p style="font-size: 16px; line-height: 1.5; color: #374151; margin-bottom: 24px;">
      Пароль для вашего аккаунта <strong>${email}</strong> в <strong>Kindred</strong> был успешно изменён.
    </p>
    <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #991B1B;">
        ⚠️ Если вы не совершали это действие, немедленно свяжитесь с поддержкой.
      </p>
    </div>
    <p style="font-size: 14px; color: #6b7280;">
      Для обеспечения безопасности не сообщайте никому свой пароль.
    </p>
  `;
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Пароль изменён - Kindred',
    html: getEmailTemplate(content, 'Пароль изменён'),
  });
}