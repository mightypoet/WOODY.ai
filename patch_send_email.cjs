const fs = require('fs');
let content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

const replacement = `
  const handleSendIntroEmail = async (lead: Lead) => {
    const confirm = window.confirm(\`Send an automated email to \${lead.name} (\${lead.email})?\`);
    if (!confirm) return;

    try {
      showToast(\`Sending email to \${lead.email}...\`);
      
      // Fetch template for current stage
      const { data, error } = await supabase.from('email_templates').select('*').eq('stage', lead.status).single();
      
      let subject = \`Connecting regarding \${lead.company || lead.name}\`;
      let body = \`I would love to connect to discuss how we can help \${lead.company || 'your business'} reach its goals.<br><br>Let's schedule a brief call next week.\`;
      
      if (data && !error) {
        const replaceVars = (text: string) => {
          return text
            .replace(/\\{\\{lead_name\\}\\}/g, lead.name)
            .replace(/\\{\\{company\\}\\}/g, lead.company || 'your business')
            .replace(/\\{\\{sender_name\\}\\}/g, user?.name || "Your Account Executive");
        };
        subject = replaceVars(data.subject || subject);
        body = replaceVars(data.body || body);
      }

      await gmailService.sendEmail(
        lead.email,
        subject,
        buildHtmlEmail({
          recipientName: lead.name,
          headline: subject,
          messageBody: body,
          ctaText: "Schedule Call",
          ctaUrl: "https://calendly.com",
          senderName: user?.name || "Your Account Executive"
        })
      );

      // Update lead status
      await dbService.update("leads", lead.id, { 
        status: lead.status === "New" ? "Contacted" : lead.status, // Progress only if new, otherwise keep it? Or just keep it as Proposal?
        lastContactDate: new Date().toISOString(),
        last_touch_date: new Date().toISOString(),
        nextStep: "Follow-Up Ongoing"
      });

      fetchSheets();
      fetchLeads();
      showToast("Email sent successfully!");
    } catch (e: any) {
      console.error("Error sending email:", e);
      showToast(\`Failed to send email: \${e.message || "Check API permissions."}\`);
    }
  };
`;

content = content.replace(/  const handleSendIntroEmail = async \(lead: Lead\) => \{[\s\S]*?showToast\(\`Failed to send email: \$\{e\.message \|\| "Check API permissions\."\}\`\);\n    \}\n  \};/m, replacement.trim());

fs.writeFileSync('src/components/CRMLeadPipeline.tsx', content);
