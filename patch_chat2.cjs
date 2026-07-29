const fs = require('fs');
let content = fs.readFileSync('src/components/ChatInterface.tsx', 'utf8');

const replacement = `
          case "CREATE_LEAD":
            let sheetId = null;
            if (action.payload.sheet_name) {
              const sheets = await dbService.list("sheets");
              const matchingSheet = sheets.find((s: any) => 
                s.name.toLowerCase() === action.payload.sheet_name.toLowerCase() ||
                s.name.toLowerCase().includes(action.payload.sheet_name.toLowerCase())
              );
              if (matchingSheet) {
                sheetId = matchingSheet.id;
              }
            }

            await dbService.create("leads", {
              name: action.payload.name || action.payload.client_name || "",
              email: action.payload.email || "",
              company: action.payload.company || action.payload.brand || "",
              contact_number: action.payload.phone || "",
              total_deal_value: action.payload.estimated_value || 0,
              status: action.payload.stage || "New",
              ...(sheetId ? { sheet_id: sheetId } : {})
            });
            results.push(
              \`Created lead: \${action.payload.name || action.payload.client_name}\` + (sheetId ? \` in sheet \${action.payload.sheet_name}\` : "")
            );
            break;
`;

content = content.replace(
  /case "CREATE_LEAD":[\s\S]*?break;/,
  replacement.trim()
);

fs.writeFileSync('src/components/ChatInterface.tsx', content);
