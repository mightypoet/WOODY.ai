const fs = require('fs');
let content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

content = content.replace(
  /const renderPipelineColumn = \(status: "New" \| "Proposal" \| "Deposit" \| "Follow-Up Ongoing" \| "Meeting Follow-Up" \| "Won" \| "Lost"\) => \{/g,
  'const renderPipelineColumn = (status: "New" | "Contacted" | "Meeting Scheduled" | "Offer Made" | "Won" | "Lost") => {'
);

content = content.replace(
  /\{renderPipelineColumn\("Proposal"\)\}/g,
  '{renderPipelineColumn("Contacted")}'
);
content = content.replace(
  /\{renderPipelineColumn\("Deposit"\)\}/g,
  '{renderPipelineColumn("Meeting Scheduled")}'
);
content = content.replace(
  /\{renderPipelineColumn\("Follow-Up Ongoing"\)\}/g,
  '{renderPipelineColumn("Offer Made")}'
);
content = content.replace(
  /\{renderPipelineColumn\("Meeting Follow-Up"\)\}/g,
  ''
);

content = content.replace(
  /<option value="Proposal">Proposal<\/option>/g,
  '<option value="Contacted">Contacted</option>'
);
content = content.replace(
  /<option value="Deposit">Deposit<\/option>/g,
  '<option value="Meeting Scheduled">Meeting Scheduled</option>'
);
content = content.replace(
  /<option value="Follow-Up Ongoing">Follow-Up Ongoing<\/option>/g,
  '<option value="Offer Made">Offer Made</option>'
);
content = content.replace(
  /<option value="Meeting Follow-Up">Meeting Follow-Up<\/option>/g,
  ''
);

content = content.replace(
  /newStatus === "Proposal"/g,
  'newStatus === "Meeting Scheduled"'
);
content = content.replace(
  /finalForm\.status === "Proposal"/g,
  'finalForm.status === "Meeting Scheduled"'
);
content = content.replace(
  /status is Proposal/g,
  'status is Meeting Scheduled'
);
content = content.replace(
  /status === "Proposal"/g,
  'status === "Contacted"' // In the card, let's show schedule button when Contacted
);
content = content.replace(
  /status === "Meeting Follow-Up"/g,
  'status === "Offer Made"' // convertToClient button when Offer Made
);

fs.writeFileSync('src/components/CRMLeadPipeline.tsx', content);
