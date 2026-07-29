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
