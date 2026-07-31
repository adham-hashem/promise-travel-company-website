import fs from 'fs';
import path from 'path';
const dir = 'd:/New folder/PROGRAMMING/ASP.Net Projects/Promise/promise lastee/project/src/pages';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    if (content.includes('revert') || content.includes('Undo2')) {
      console.log(file);
    }
  }
});
