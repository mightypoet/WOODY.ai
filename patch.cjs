const fs = require('fs');
const content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

const targetRegex = /  const handleScheduleCall = async \(lead: Lead\) => \{[\s\S]*?Failed to schedule call\."\);\n    \}\n  \};/m;

const replacement = `  const handleScheduleCall = (lead: Lead) => {
    setLeadToSchedule(lead);
    
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    setScheduleForm({
      date: dateStr,
      time: "10:00",
      duration: 30,
      addGoogleMeetLink: true,
    });
    setIsSchedulingCall(true);
  };

  const submitScheduleCall = async () => {
    if (!leadToSchedule || !scheduleForm.date || !scheduleForm.time) return;

    try {
      const startDateTime = new Date(\`\${scheduleForm.date}T\${scheduleForm.time}:00\`).toISOString();
      const endTime = new Date(\`\${scheduleForm.date}T\${scheduleForm.time}:00\`);
      endTime.setMinutes(endTime.getMinutes() + scheduleForm.duration);
      const endDateTime = endTime.toISOString();

      const eventRes = await calendarService.createEvent({
        summary: \`Discovery Call: \${leadToSchedule.company || leadToSchedule.name} / Us\`,
        description: \`Introductory call with \${leadToSchedule.name}\`,
        attendees: [{ email: leadToSchedule.email }],
        startDateTime,
        endDateTime,
        addGoogleMeetLink: scheduleForm.addGoogleMeetLink
      });

      const meetingLink = eventRes.hangoutLink || "";
      
      const emailBody = \`
        <p>Your discovery call is scheduled for <strong>\${new Date(startDateTime).toLocaleString()}</strong>.</p>
        <p>Duration: \${scheduleForm.duration} minutes</p>
        \${meetingLink ? \`<p>Meeting Link: <a href="\${meetingLink}">\${meetingLink}</a></p>\` : ''}
        <p>Looking forward to speaking with you!</p>
      \`;

      const htmlEmail = buildHtmlEmail({
        recipientName: leadToSchedule.name,
        headline: "Discovery Call Scheduled",
        messageBody: emailBody,
        ctaText: meetingLink ? "Join Meeting" : "View Details",
        ctaUrl: meetingLink || "#",
        senderName: "WOODY Team"
      });

      await gmailService.sendEmail(leadToSchedule.email, "Discovery Call Scheduled", htmlEmail);

      // Do not change lead state so it doesn't disappear from its current column, 
      // just update meeting_status to Scheduled.
      await dbService.update("leads", leadToSchedule.id, { 
        meeting_status: "Scheduled",
        nextStep: "Discovery Call Scheduled",
        last_touch_date: new Date().toISOString()
      });

      fetchSheets();
      fetchLeads();
      setIsSchedulingCall(false);
      setLeadToSchedule(null);
      console.log("Event scheduled and invite sent via Google Calendar!");
    } catch (e: any) {
      console.error("Error scheduling:", e);
      alert(e.message || "Failed to schedule call.");
    }
  };`;

const newContent = content.replace(targetRegex, replacement);
fs.writeFileSync('src/components/CRMLeadPipeline.tsx', newContent);
