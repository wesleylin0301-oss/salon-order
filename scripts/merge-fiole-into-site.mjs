import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync('data/fiole-full-catalog.json','utf8'));
const fioleVendors=/^(Fiole|艾淂|艾得|艾淂 PRO|一日之計)$/i;

function designerProduct(r){
  return {id:r.id,audience:'設計師/店用',category:r.department,vendor:'Fiole',series:r.series,name:r.name,spec:r.spec,originalPrice:r.basePrice,price:r.designerPrice,priceText:`${r.basePrice} / ${r.designerPrice}`,mainCategory:r.department};
}
function shopProduct(r){
  const text=`${r.name} ${r.series}`;
  const category=/(雙氧|OX\d|AC[36]%)/i.test(text)?'染髮雙氧水':/(頭皮隔離|頭皮保護乳化)/.test(text)?'頭皮隔離':r.department;
  return {id:r.id,audience:'店用',category,vendor:'Fiole',series:r.series,name:r.name,spec:r.spec,price:r.basePrice,priceText:String(r.basePrice),mainCategory:category};
}

function updateIndex(){
  const file='index.html',s=fs.readFileSync(file,'utf8');
  const m=s.match(/const PRODUCTS=(\[.*?\]);const productMap=/s);
  if(!m)throw new Error('index PRODUCTS not found');
  const old=JSON.parse(m[1]);
  const kept=old.filter(p=>p.vendor!=='Fiole'||(p.mainCategory==='染膏'&&String(p.spec).toLowerCase()==='120g')).map(p=>{
    if(p.vendor==='Fiole'&&p.mainCategory==='染膏'){
      const price=Math.round(Number(p.originalPrice||0)*0.7);
      return {...p,price,priceText:`${p.originalPrice} / ${price}`};
    }
    return p;
  });
  const added=catalog.filter(r=>r.designerAllowed).map(designerProduct);
  const products=[...kept,...added];
  const out=s.replace(m[0],`const PRODUCTS=${JSON.stringify(products)};const productMap=`);
  fs.writeFileSync(file,out);
  return {before:old.length,kept:kept.length,added:added.length,after:products.length};
}

function updateAdmin(){
  const file='admin.html',s=fs.readFileSync(file,'utf8');
  const m=s.match(/const SHOP_PRODUCTS=(\[.*?\])\.filter/s);
  if(!m)throw new Error('admin SHOP_PRODUCTS not found');
  const old=JSON.parse(m[1]);
  const kept=old.filter(p=>!fioleVendors.test(String(p.vendor||''))&&p.id!=='P0312').map(p=>{
    const text=`${p.name||''} ${p.series||''}`;
    if(/雙氧/i.test(text))return {...p,category:'染髮雙氧水',mainCategory:'染髮雙氧水'};
    if(/頭皮隔離/.test(text))return {...p,category:'頭皮隔離',mainCategory:'頭皮隔離'};
    return p;
  });
  const added=catalog.filter(r=>r.shopAllowed).map(shopProduct);
  const products=[...kept,...added];
  const out=s.replace(m[1],JSON.stringify(products));
  fs.writeFileSync(file,out);
  return {before:old.length,kept:kept.length,added:added.length,after:products.length};
}

console.log(JSON.stringify({index:updateIndex(),admin:updateAdmin()},null,2));
