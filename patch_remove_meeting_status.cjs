const fs = require('fs');
let content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

content = content.replace(
/          meeting_status: editForm\.meeting_status \|\| null,\n/g,
''
);

content = content.replace(
/        if \(finalForm\.meeting_status === ""\) finalForm\.meeting_status = null as any;\n/g,
''
);

fs.writeFileSync('src/components/CRMLeadPipeline.tsx', content);
