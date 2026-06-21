import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiUrl = process.env.CONSTRUCTION_API_URL || '/api';
const target = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl.replace(/'/g, "\\'")}',
};
`;

fs.writeFileSync(target, content);
console.log(`Generated environment.prod.ts with apiUrl: ${apiUrl}`);
