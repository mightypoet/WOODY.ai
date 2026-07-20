import fs from 'fs';

let content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

const updatedContent = content.replace(
  /for \(const row of dataRows\) \{[\s\S]*?console\.log\(`Finished import loop, imported count: \$\{imported\}`\);/m,
  `for (const row of dataRows) {
          if (row.length < 2) continue;
          
          let name = row[0] || "";
          const email = row[1] || "";
          const company = row[2] || "";
          const statusRaw = (row[3] || "New").toUpperCase().trim();
          const contact_number = row[4] || "";
          const conversations = row[5] || ""; // Meeting Notes
          const meeting_date = row[8] || row[7] || row[6] || "";

          let status = "New";
          if (["DEAD", "NOT INTERESTED", "DNP"].includes(statusRaw)) status = "Lost";
          else if (statusRaw === "SALE") status = "Won";
          else if (["FOLLOW UP", "INTERESTED"].includes(statusRaw)) status = "Follow-Up Ongoing";
          else if (statusRaw === "MEETING") status = "Meeting Follow-Up";
          else if (statusRaw === "SEND MATERIALS") status = "Proposal";

          if (!name && (company || contact_number)) {
             name = company || "Unknown Contact";
          }

          if (name || email || contact_number) {
            console.log(\`Inserting row \${imported + 1}: \${name} (\${email})\`);
            await dbService.create("leads", {
              name, email, company, status, contact_number, conversations, meeting_date, 
              createdAt: new Date().toISOString(), 
              last_touch_date: new Date().toISOString()
            });
            imported++;
          } else {
            console.log("Skipping row due to no identifiable info:", row);
          }
        }
        
        console.log(\`Finished import loop, imported count: \${imported}\`);`
);

fs.writeFileSync('src/components/CRMLeadPipeline.tsx', updatedContent);
