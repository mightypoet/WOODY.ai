const fs = require('fs');
let content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

// onDragEnd
content = content.replace(
/            updatedLead\.meeting_status = "Scheduled";/g,
'            // updatedLead.meeting_status = "Scheduled"; // REMOVED TO FIX CONSTRAINT'
);

content = content.replace(
/        partialUpdate\.meeting_status = updatedLead\.meeting_status;/g,
'        // partialUpdate.meeting_status = updatedLead.meeting_status; // REMOVED TO FIX CONSTRAINT'
);

// handleSaveLead
content = content.replace(
/              finalForm\.meeting_status = "scheduled";/g,
'              // finalForm.meeting_status = "scheduled"; // REMOVED TO FIX CONSTRAINT'
);

fs.writeFileSync('src/components/CRMLeadPipeline.tsx', content);
