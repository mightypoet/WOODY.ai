export interface EmailTemplateProps {
  recipientName: string;
  headline: string;
  messageBody: string;
  ctaText?: string;
  ctaUrl?: string;
  senderName: string;
}

export const buildHtmlEmail = ({ recipientName, headline, messageBody, ctaText, ctaUrl, senderName }: EmailTemplateProps) => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f8fafc" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px;">WOODY / REELYWOOD</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px; color: #0f172a;">
              <h2 style="margin-top: 0; margin-bottom: 24px; font-size: 20px; font-weight: 600; color: #0f172a;">${headline}</h2>
              <p style="margin-top: 0; margin-bottom: 24px; font-size: 16px; line-height: 1.6; color: #334155;">
                Hi ${recipientName},
              </p>
              
              <div style="margin-bottom: 32px; font-size: 16px; line-height: 1.6; color: #334155;">
                ${messageBody}
              </div>
              
              <!-- CTA -->
              ${ctaText && ctaUrl ? `
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Signature -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Best regards,</p>
                    <p style="margin: 0; font-size: 16px; color: #334155;">${senderName}</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">The Woody / Reelywood Team</p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 40px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                © ${new Date().getFullYear()} Woody / Reelywood. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

export const gmailService = {
  async sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    const providerToken = localStorage.getItem('google_provider_token');
    
    if (!providerToken) {
      throw new Error("No Google provider token found. Please sign in with Google again.");
    }

    const emailLines = [
      `To: ${to}`,
      'Content-type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      '',
      htmlBody
    ];

    const email = emailLines.join('\r\n');
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: base64EncodedEmail
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gmail API Error:", errorData);
      throw new Error(errorData.error?.message || "Failed to send email via Gmail API");
    }
  }
};
