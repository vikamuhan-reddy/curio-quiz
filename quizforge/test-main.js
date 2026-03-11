import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
console.log('process.argv:', process.argv);
console.log('__filename:', __filename);
console.log('is main:', process.argv[1] === __filename);
