import fs from 'fs';

let content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

const regex = /const handleCSVUpload = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?reader\.readAsText\(file\);\n  \};/;

const newHandler = `const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleCSVUpload triggered");
    const inputElement = e.target;
    const file = inputElement.files?.[0];
    console.log("Selected file:", file);
    if (!file) {
      console.log("No file selected, returning.");
      return;
    }

    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      console.log("FileReader onload triggered");
      try {
        const text = event.target?.result as string;
        console.log("File read successfully, length:", text?.length);
        if (!text) throw new Error("File could not be read (empty text)");

        Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          complete: async function(results) {
            const rows = results.data as string[][];
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
          error: function(error: any) {
            console.error("PapaParse error:", error);
            alert("Failed to parse CSV: " + error.message);
            setImporting(false);
            if (inputElement) {
              inputElement.value = '';
            }
          }
        });
      } catch (error: any) {
        console.error("Error parsing CSV:", error);
        alert(\`Failed to parse CSV: \${error.message || JSON.stringify(error)}\`);
        setImporting(false);
        if (inputElement) {
          inputElement.value = '';
        }
      }
    };

    reader.onerror = () => {
      console.error("Error reading file");
      alert("Failed to read the file.");
      setImporting(false);
      if (inputElement) {
        inputElement.value = '';
      }
    };

    console.log("Calling readAsText");
    reader.readAsText(file);
  };`;

content = content.replace(regex, newHandler);

fs.writeFileSync('src/components/CRMLeadPipeline.tsx', content);
