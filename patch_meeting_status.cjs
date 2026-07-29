const fs = require('fs');
let content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');
content = content.replace(
/      await dbService\.update\("leads", leadToSchedule\.id, \{[\s\S]*?meeting_status: "scheduled",[\s\S]*?nextStep: "Discovery Call Scheduled",[\s\S]*?last_touch_date: new Date\(\)\.toISOString\(\)[\s\S]*?\}\);/g,
`      await dbService.update("leads", leadToSchedule.id, { 
        nextStep: "Discovery Call Scheduled",
        last_touch_date: new Date().toISOString()
      });`
);
fs.writeFileSync('src/components/CRMLeadPipeline.tsx', content);
