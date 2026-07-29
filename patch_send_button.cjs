const fs = require('fs');
let content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

content = content.replace(
/                \{status === "New" && \(\n                  <button onClick=\{\(\) => handleSendIntroEmail\(lead\)\} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs py-1\.5 flex items-center justify-center gap-1\.5 transition-colors" title="Send Intro Email via Gmail">\n                    <Mail size=\{12\} \/> Contact\n                  <\/button>\n                \)\}/g,
`                  <button onClick={() => handleSendIntroEmail(lead)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs py-1.5 flex items-center justify-center gap-1.5 transition-colors" title="Send Email via Gmail">
                    <Mail size={12} /> Email
                  </button>`
);

fs.writeFileSync('src/components/CRMLeadPipeline.tsx', content);
