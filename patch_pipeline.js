import fs from 'fs';

let content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

// Ensure import Papa from 'papaparse' is added
if (!content.includes("import Papa from 'papaparse';")) {
  content = content.replace("import React,", "import React,\n");
  content = content.replace("import {", "import Papa from 'papaparse';\nimport {");
}

// Replace the CSV parsing logic
content = content.replace(
  /\/\/ Simple CSV parser[\s\S]*?console\.log\(\`Finished import loop, imported count: \$\{imported\}\`\);/,
  `// Parse with PapaParse to handle newlines in quotes correctly
        Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          complete: async function(results) {
            const rows = results.data;
            console.log(\`Parsed \${rows.length} rows using PapaParse\`);
            
            // Assuming first row is header
            const dataRows = rows.slice(1);
            console.log(\`Data rows length: \${dataRows.length}\`);
            
            let imported = 0;
            for (const row of dataRows) {
              if (!row || row.length < 2) continue;
              
              let name = row[0] || "";
              const email = row[1] || "";
              const company = row[2] || "";
              const statusRaw = (row[3] || "New").toUpperCase().trim();
              const contact_number = row[4] || "";
              const conversations = row[5] || ""; // Meeting Notes
              // Try to find meeting date in later columns, adjusting for empty cols
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
            
            console.log(\`Finished import loop, imported count: \${imported}\`);
            alert(\`Successfully imported \${imported} leads!\`);
            await fetchLeads();
            setImporting(false);
            if (inputElement) {
              inputElement.value = '';
            }
          },
          error: function(error) {
            console.error("PapaParse error:", error);
            alert("Failed to parse CSV: " + error.message);
            setImporting(false);
            if (inputElement) {
              inputElement.value = '';
            }
          }
        });
        
        // Return early since PapaParse complete callback will handle the rest
        return;`
);

// We also need to remove the synchronous code after the parsing that we moved into the complete callback
content = content.replace(/alert\(\`Successfully imported \$\{imported\} leads\!\`\);\n\s*await fetchLeads\(\);/, '');
// But wait, my previous replace already ate all that up to the console.log("Finished...").
// Let's just check the state of the file

fs.writeFileSync('src/components/CRMLeadPipeline.tsx', content);
