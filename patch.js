const fs = require('fs');
const file = 'app/dashboard/urunler/etiket/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Gömlek RFID
content = content.replace(
  'for(let i=0; i<adet; i++){\r\n               zplOutput += `^XA\r\n^CFA,20',
  'for(let i=0; i<adet; i++){\r\n                const rfidTag = rfidModu ? `^RS8\\n^RFW,E,,,^FD${u.barkod}^FS\\n` : ""\r\n                zplOutput += `^XA\\n${rfidTag}^CFA,20'
);

content = content.replace(
  'for(let i=0; i<adet; i++){\n               zplOutput += `^XA\n^CFA,20',
  'for(let i=0; i<adet; i++){\n                const rfidTag = rfidModu ? `^RS8\\n^RFW,E,,,^FD${u.barkod}^FS\\n` : ""\n                zplOutput += `^XA\\n${rfidTag}^CFA,20'
);

// 2. Kumas RFID
content = content.replace(
  'for(let i=0; i<adet; i++){\r\n               zplOutput += `^XA\r\n^CFA,30',
  'for(let i=0; i<adet; i++){\r\n                const rfidTag = rfidModu ? `^RS8\\n^RFW,E,,,^FD${k.kumas_barkod}^FS\\n` : ""\r\n                zplOutput += `^XA\\n${rfidTag}^CFA,30'
);

content = content.replace(
  'for(let i=0; i<adet; i++){\n               zplOutput += `^XA\n^CFA,30',
  'for(let i=0; i<adet; i++){\n                const rfidTag = rfidModu ? `^RS8\\n^RFW,E,,,^FD${k.kumas_barkod}^FS\\n` : ""\n                zplOutput += `^XA\\n${rfidTag}^CFA,30'
);

fs.writeFileSync(file, content);
console.log('Patched RFID logic.');
