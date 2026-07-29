const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

// Helper to map created_at to createdAt for output
const outputMapper = `
const mapOutput = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => mapOutput(item));
  }
  if (data.created_at && !data.createdAt) {
    data.createdAt = data.created_at;
  }
  return data;
};
`;

if (!content.includes('mapOutput')) {
  content = content.replace('export const dbService', outputMapper + 'export const dbService');
}

// Modify create finalPayload
content = content.replace(
  `let finalPayload = { ...payload };\n      if (table === 'leads') {`,
  `let finalPayload = { ...payload };
      if (finalPayload.createdAt) {
        finalPayload.created_at = finalPayload.createdAt;
        delete finalPayload.createdAt;
      }
      if (table === 'leads') {`
);

// Modify update finalPayload
content = content.replace(
  `let finalPayload = { ...data };\n      if (table === 'leads') {`,
  `let finalPayload = { ...data };
      if (finalPayload.createdAt) {
        finalPayload.created_at = finalPayload.createdAt;
        delete finalPayload.createdAt;
      }
      if (table === 'leads') {`
);

// Modify get
content = content.replace(
  `return data;\n    } catch (error) {`,
  `return mapOutput(data);\n    } catch (error) {`
);

// Modify list
content = content.replace(
  `return data || [];\n    } catch (error) {`,
  `return mapOutput(data || []);\n    } catch (error) {`
);

fs.writeFileSync('src/services/dbService.ts', content);
