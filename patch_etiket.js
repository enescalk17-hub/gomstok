const fs = require('fs');
const file = 'app/dashboard/urunler/etiket/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add states
content = content.replace(
  "const [hata, setHata] = useState('')",
  "const [hata, setHata] = useState('')\n  const [lokasyonlar, setLokasyonlar] = useState<any[]>([])\n  const [secilenBaslik, setSecilenBaslik] = useState('GOMSTOK')"
);

// 2. Add lokasyonlar fetch
content = content.replace(
  "async function getir() {",
  "async function getir() {\n      const lokData = await supabase.from('lokasyonlar').select('id, ad').in('tip', ['magaza', 'depo']).order('ad');\n      if(lokData.data) setLokasyonlar(lokData.data);"
);

// 3. UI Dropdown
const filterUI = `                 <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="font-medium text-sm mb-3 text-gray-800">1. Şablon Tipi</h3>`;

const replaceFilterUI = `                 <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="font-medium text-sm mb-3 text-gray-800 flex justify-between">
                       <span>Etiket Başlığı</span>
                    </h3>
                    <select value={secilenBaslik} onChange={e => setSecilenBaslik(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm mb-4 focus:ring-blue-500 bg-gray-50">
                       <option value="GOMSTOK">Varsayılan (GOMSTOK)</option>
                       {lokasyonlar.map(l => <option key={l.id} value={l.ad.toUpperCase()}>{l.ad}</option>)}
                    </select>

                    <h3 className="font-medium text-sm mb-3 text-gray-800">Şablon Tipi</h3>`;

content = content.replace(filterUI, replaceFilterUI);

// 4. Update Print CSS output
content = content.replace(
  '<div className="text-[10pt] font-black uppercase tracking-widest mt-1">MOTİF SHIRTS</div>',
  '<div className="text-[10pt] font-black uppercase tracking-widest mt-1">{secilenBaslik}</div>'
);

content = content.replace(
  '<div className="text-[14pt] font-black uppercase mb-1">GÖMSTOK KUMAŞ</div>',
  '<div className="text-[14pt] font-black uppercase mb-1">{secilenBaslik} KUMAŞ</div>'
);

// 5. Update ZPL Output
content = content.replace(/\^FDGOMSTOK\^FS/g, '^FD${secilenBaslik}^FS');
content = content.replace(/\^FDGOMSTOK KUMAS\^FS/g, '^FD${secilenBaslik} KUMAS^FS');

fs.writeFileSync(file, content);
console.log('Etiket patch completed.');
