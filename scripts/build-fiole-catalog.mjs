import fs from 'node:fs';

const rows=[];
const add=(page,department,series,name,spec,basePrice,retailPrice=0,notes='')=>rows.push({page,department,series,name,spec,basePrice,retailPrice,notes});
const variants=(page,department,series,names,spec,basePrice,retailPrice=0)=>names.forEach(name=>add(page,department,series,name,spec,basePrice,retailPrice));

// Page 1 — perm system
variants(1,'藥水','F.植萃燙髮（溫塑直髮）',['100 EX 一劑 EXTRA HARD','80 H 一劑 HARD','50 N 一劑 NORMAL','15 LD 一劑（酸性）'],'400g',500);
add(1,'藥水','F.植萃燙髮（溫塑直髮）','LOTION 二劑（液狀）','400mL',300);
add(1,'藥水','F.植萃燙髮（溫塑直髮）','LD 二劑（乳液狀）','400mL',300);
add(1,'藥水','F.植萃燙髮（溫塑直髮）','CREAM 二劑（霜狀）','400g',400);
add(1,'藥水','F.植萃燙髮（溫塑直髮）','LOTION OX2 二劑（液狀）','2000mL',650);
add(1,'藥水','F.植萃燙髮（溫塑直髮）','ST 軟化加強劑','200mL',400);
variants(1,'藥水','F.WAVE 翡翠冷燙',['翡翠冷燙 H1 一劑','翡翠冷燙 N1 一劑'],'400mL',350);
add(1,'藥水','F.WAVE 翡翠冷燙','翡翠冷燙 10% 二劑（溴酸鈉）','960mL',400);
variants(1,'藥水','F.綻放柔妝燙',['Ha1 一劑（液狀）','Sa1 一劑（液狀）'],'400mL',350);
variants(1,'藥水','F.綻放柔妝燙',['Ec1 一劑（膏狀）','Hc1 一劑（膏狀）','Sc1 一劑（膏狀）','Ac1 一劑（膏狀）'],'400g',500);
add(1,'藥水','F.綻放柔妝燙','燙前衛士','130g',500);

// Page 2 — protect treatment
variants(2,'護髮系統','F.PROTECT 前中後處理',['FP01 前置處理乳','FP02 前置處理凝膠'],'300mL',450);
add(2,'護髮系統','F.PROTECT 前中後處理','FP03 術後處理乳','300g',450);
add(2,'護髮系統','F.PROTECT 前中後處理','FP00 頭皮保護乳化劑 補充包','1000mL',1400);
variants(2,'護髮系統','F.PROTECT 前中後處理',['FP01 前置處理乳 補充包','FP02 前置處理凝膠 補充包','FP04 中間處理劑 補充包'],'1500mL',1400);
add(2,'護髮系統','F.PROTECT 前中後處理','FP03 術後處理乳 補充包','1500g',1400);
add(2,'其他耗材','F.PROTECT 瓶材','FP01／FP02 專用空瓶','100mL',100);
add(2,'其他耗材','F.PROTECT 瓶材','FP03 專用空瓶','1000mL',150);
add(2,'其他耗材','F.PROTECT 瓶材','FP04 專業慕斯瓶','200mL',150);
add(2,'護髮／造型','F.Protect OFF 零粹','BLEACH OFF BO 解髮露（處理液）','800mL',1500);
add(2,'洗髮／護髮','F.Protect OFF 零粹','METAL OFF MO 螯金洗（洗髮精）','900mL',600);
add(2,'護髮／造型','F.Protect OFF 零粹','ALKALI OFF AO 平鹼護（護髮素）','900mL',880);
add(2,'護髮／造型','F.Protect OFF 零粹','BLEACH OFF BO 解髮露 旅行包','100mL',280);
add(2,'洗髮／護髮','F.Protect OFF 零粹','METAL OFF MO 螯金洗 旅行包','100mL',150,300);
add(2,'護髮／造型','F.Protect OFF 零粹','ALKALI OFF AO 平鹼護 旅行包','100mL',150,300);
add(2,'其他耗材','F.Protect OFF 零粹','BLEACH OFF BO 專用瓶','250mL',200);

// Page 3 — color support (color creams already exist as individual SKUs)
variants(3,'藥水','綻放染劑',['綻放雙氧乳 OX6%','綻放雙氧乳 OX3%'],'1000mL',360);
variants(3,'藥水','綻放染劑',['綻放雙氧乳 OX6%','綻放雙氧乳 OX3%','綻放雙氧乳 OX1.5%','綻放 AC6%','綻放 AC3%'],'2000mL',650);
variants(3,'藥水','根本染劑',['根本雙氧乳 OX6%','根本雙氧乳 OX3%'],'2000mL',650);
variants(3,'染膏','露西亞漂粉',['露西亞漂粉（極速型）','露西亞漂粉'],'500g',900);
add(3,'其他耗材','染劑周邊','色卡（綻放／根本／露西亞）','',1500);
add(3,'其他耗材','染劑周邊','染劑去色水（擦拭用化妝水）','280mL',320);
variants(3,'藥水','染劑周邊',['馥郁雙氧乳 6%（灰頭）','馥郁雙氧乳 9%（灰頭）'],'2000g',650);
variants(3,'藥水','原子系列',['原子雙氧乳 3%','原子雙氧乳 6%'],'2000g',800);
add(3,'頭皮／隔離','原子系列','原子頭皮隔離','200g',350);

// Page 4 — salon treatments
variants(4,'護髮系統','np3.1 柔絲結構式護髮',['np3.1 個人化小組合 AF（藍）盒裝'],'130g',500);
add(4,'護髮系統','np3.1 柔絲結構式護髮','np3.1 個人化小組合 MF（紅）盒裝','125g',500);
add(4,'護髮系統','np3.1 柔絲結構式護髮','np3.1 護髮一劑 BC1','130g',550);
variants(4,'護髮系統','np3.1 柔絲結構式護髮',['np3.1 護髮二劑 AF2（藍）','np3.1 護髮二劑 MF2（紅）'],'130g',400);
variants(4,'護髮系統','np3.1 柔絲結構式護髮',['np3.1 護髮三劑 AF3（藍）','np3.1 護髮三劑 MF3（紅）'],'130g',550);
variants(4,'護髮／造型','np3.1 居家四劑',['np3.1 居家四劑 AF+1（藍）','np3.1 居家四劑 MF+1（紅）'],'50g',220,440);
variants(4,'護髮／造型','np3.1 居家四劑',['np3.1 居家四劑 AF+1（藍）','np3.1 居家四劑 MF+1（紅）'],'100g',420,840);
variants(4,'護髮／造型','np3.1 居家四劑',['np3.1 居家四劑 AF+1（藍）','np3.1 居家四劑 MF+1（紅）'],'240g',820,1640);
add(4,'護髮系統','F.Protect CUREALL','CUREALL 護髮一劑 C.A1','400mL',660);
add(4,'護髮系統','F.Protect CUREALL','CUREALL 護髮二劑 C.A2','250mL',660);
add(4,'護髮系統','F.Protect CUREALL','CUREALL 護髮三劑 C.A3','125mL',660);
add(4,'護髮／造型','F.Protect CUREALL','CUREALL 居家修護凝露','30mL',250,500);
add(4,'護髮／造型','F.Protect CUREALL','CUREALL 居家修護凝露','100mL',420,840);
add(4,'護髮系統','F.PROTESI 生命之鍵','F.color 生命之鍵 B 中和劑','300mL',450);
add(4,'護髮系統','F.PROTESI 生命之鍵','F.color 生命之鍵 01','300mL',720);
add(4,'護髮系統','F.PROTESI 生命之鍵','F.color 生命之鍵 02 補充包','550g',720);
add(4,'護髮系統','F.PROTESI 生命之鍵','F.color 生命之鍵 03 補充包','550g',1200);
variants(4,'其他耗材','F.PROTESI 生命之鍵',['F.color 生命之鍵 02 專用環保空瓶','F.color 生命之鍵 03 專用環保空瓶'],'',200);
variants(4,'洗髮／護髮','呵護系列',['呵護洗髮精（營業用）','呵護護髮乳（營業用）'],'5L',1800);
add(4,'其他耗材','呵護系列','呵護專用空瓶','1000mL',180,360);
add(4,'洗髮／護髮','呵護系列','呵護洗髮精','60mL',100,200);
add(4,'洗髮／護髮','呵護系列','呵護護髮乳','60mL',100,200);

// Page 5 — Admore
add(5,'護髮／造型','F.Protect ADMORE','艾茉護髮霜（條狀）','150g',550,1100);
add(5,'護髮系統','F.Protect ADMORE','艾茉護髮霜 補充包','550g',1400);
add(5,'其他耗材','F.Protect ADMORE','艾茉護髮霜 補充包專用瓶','',200);
add(5,'護髮／造型','F.Protect ADMORE','艾茉免沖洗護髮慕斯','160g',550,1100);
variants(5,'洗髮／護髮','F.Protect ADMORE 旅行',['檸檬菊花洗髮精','檸檬杏花護髮素（輕潤）','檸檬杏花護髮素（極潤）'],'100mL',200,400);
add(5,'洗髮／護髮','F.Protect ADMORE 店販','檸檬菊花洗髮精','400mL',550,1100);
variants(5,'洗髮／護髮','F.Protect ADMORE 店販',['檸檬杏花護髮素（輕潤）','檸檬杏花護髮素（極潤）'],'400g',550,1100);
add(5,'洗髮／護髮','F.Protect ADMORE 補充包','檸檬菊花洗髮精','800mL',775,1550);
variants(5,'洗髮／護髮','F.Protect ADMORE 補充包',['檸檬杏花護髮素（輕潤）','檸檬杏花護髮素（極潤）'],'800g',775,1550);

// Page 6 — Fascinato and color care
variants(6,'洗髮／護髮','FASCINATO',['抗老頭皮 AB（藍）洗髮精','彈潤修護 AC（紅）洗髮精'],'250mL',475,950);
variants(6,'洗髮／護髮','FASCINATO',['抗老頭皮 AB（藍）洗髮精 補充包','彈潤修護 AC（紅）洗髮精 補充包'],'700mL',950,1900);
variants(6,'其他耗材','FASCINATO',['抗老頭皮 AB 洗髮精補充包專用瓶','彈潤修護 AC 洗髮精補充包專用瓶'],'700mL',150,300);
variants(6,'洗髮／護髮','FASCINATO',['抗老頭皮 AB（藍）護髮素','彈潤修護 AC（紅）護髮素'],'180g',475,950);
variants(6,'洗髮／護髮','FASCINATO',['抗老頭皮 AB（藍）護髮素 補充包','彈潤修護 AC（紅）護髮素 補充包'],'700g',1300,2600);
variants(6,'其他耗材','FASCINATO',['抗老頭皮 AB 護髮素補充包專用瓶','彈潤修護 AC 護髮素補充包專用瓶'],'700g',150,300);
variants(6,'洗髮／護髮','FASCINATO 試用',['抗老頭皮 AB 洗護試用包','彈潤修護 AC 洗護試用包'],'8mL&8g',45,90);
variants(6,'洗髮／護髮','FASCINATO',['豐韌 AB 免沖洗精華乳','彈潤 AC 免沖洗精華乳'],'100mL',360,720);
variants(6,'洗髮／護髮','FASCINATO 試用',['豐韌 AB 免沖洗精華乳試用包','彈潤 AC 免沖洗精華乳試用包'],'3mL',30,60);
add(6,'洗髮／護髮','FASCINATO','沐浴露','600mL',450,900);
add(6,'頭皮／隔離','FASCINATO','抗老頭皮養髮液','150mL',600,1200);
variants(6,'洗髮／護髮','F.Protect 染燙專用',['BASIC 豐盈洗髮精','RICH 滋潤洗髮精','DX 頭皮健康洗髮精'],'300mL',360,720);
variants(6,'洗髮／護髮','F.Protect 染燙專用',['BASIC 豐盈洗髮精','RICH 滋潤洗髮精'],'1000mL',900,1800);
variants(6,'洗髮／護髮','F.Protect 染燙專用',['BASIC 豐盈洗髮精 補充包','RICH 滋潤洗髮精 補充包','DX 頭皮健康洗髮精 補充包'],'1000mL',800,1600);
variants(6,'洗髮／護髮','F.Protect 染燙專用',['BASIC 豐盈護髮膜','RICH 滋潤護髮膜','DX 頭皮健康護髮膜'],'200g',360,720);
variants(6,'洗髮／護髮','F.Protect 染燙專用',['BASIC 豐盈護髮膜','RICH 滋潤護髮膜'],'1000g',1440,2880);
variants(6,'洗髮／護髮','F.Protect 染燙專用',['BASIC 豐盈護髮膜 補充包','RICH 滋潤護髮膜 補充包','DX 頭皮健康護髮膜 補充包'],'1000g',1300,2600);
variants(6,'洗髮／護髮','F.Protect 染燙專用試用',['BASIC 豐盈洗護試用包','RICH 滋潤洗護試用包'],'8mL&8g',45,90);
add(6,'洗髮／護髮','FORMKEEPER','抗熱免沖洗護髮精華','200g',300,600);
add(6,'洗髮／護髮','FORMKEEPER','抗熱免沖洗護髮精華 試用包','5mL',20,40);

// Page 7 — retail and styling
variants(7,'護髮／造型','大地果油',['Level 1 艷澤 旅行包','Level 2 奢耀 旅行包'],'7g',150,300);
variants(7,'護髮／造型','大地果油',['Level 1 艷澤','Level 2 奢耀'],'100mL',700,1400);
add(7,'護髮／造型','大地果油','Level 0 經典','50g',350,700);
add(7,'護髮／造型','大地果油','Level 0 經典','140g',600,1200);
add(7,'護髮／造型','大地果油','Level 0 經典 試用包','5g',20,40);
variants(7,'洗髮／護髮','QUALUCIA COLOR',['極光紫','仙氣粉','清水灰','琥珀橘','布朗棕','奶霜棕','紫藤櫻','雪青紫'],'250mL',480,800);
variants(7,'洗髮／護髮','QUALUCIA COLOR',['極光紫','仙氣粉','清水灰','琥珀橘','布朗棕','奶霜棕'],'1L',1260,2100);
add(7,'護髮／造型','QUALUCIA COLOR','水透光感凝膠（小）','30g',250,500);
add(7,'護髮／造型','QUALUCIA COLOR','水透光感凝膠（大）','100g',460,920);
add(7,'護髮／造型','CHIARO HAIR WATER','蜂晨水水髮妝噴霧','150mL',295,590);
const modalie=[['漂漂惹人愛 免沖洗護髮油','100mL',650,1300],['亮亮惹人愛 造型髮油','50mL',440,880],['俏俏惹人愛 造型蠟','80g',440,880],['捲捲惹人愛 造型乳','80g',440,880],['噴噴惹人愛 造型噴霧','120g',385,770],['閃閃惹人愛 造型膏','25g',440,880],['泡泡惹人愛 造型慕斯','200g',440,880],['硬派惹人帥 造型蠟','58g',440,880],['輕浮惹人帥 造型髮泥','58g',440,880],['俐落惹人帥 造型膏','100g',440,880],['濕紋惹人帥 造型膠','140g',440,880],['噴噴惹人帥 造型噴霧','200g',385,770],['泡泡惹人帥 造型慕斯','200g',440,880]];
modalie.forEach(([name,spec,b,r])=>add(7,'護髮／造型','MODALIE',name,spec,b,r));

// Page 8 — Creative Design
const sprays=[['FREEZE 超強力造型','200g',400,800],['FREEZE 超強力造型 mini','70g',225,450],['MOVING HARD 強力造型','200g',400,800],['CURL BOUNCE 彈性造型（電棒前）','200g',400,800],['CURL BOUNCE 彈性造型 mini','70g',225,450],['BEACH WAVE 記憶造型（電棒後）','200g',400,800],['SILKY 光澤造型','180g',400,800],['CURL WHIP FORM 造型慕斯','230g',400,800],['NATURAL KEEP MIST 蓬鬆噴霧','150mL',400,800]];
sprays.forEach(([name,spec,b,r])=>add(8,'護髮／造型','幾何圖騰噴霧',name,spec,b,r));
variants(8,'護髮／造型','幾何圖騰髮蠟',['SUPER HARD 超強力造型','HARD 強力造型','NUANCE 空氣感造型','HARD GEL 造型髮膠','NATURAL 輕柔造型','MOIST MILK 造型乳'],'80g',475,950);

// Page 9 — Purifica
variants(9,'洗髮／護髮','F.AID Purifica 旅行',['艾得洗髮精 羽潤','艾得洗髮精 輕潤'],'100mL',200,400);
variants(9,'洗髮／護髮','F.AID Purifica 旅行',['艾得保護膜 羽潤','艾得保護膜 輕潤','艾得保護膜 極潤'],'100g',200,400);
variants(9,'洗髮／護髮','F.AID Purifica 店販',['艾得洗髮精 羽潤','艾得洗髮精 輕潤'],'400mL',575,1150);
variants(9,'洗髮／護髮','F.AID Purifica 店販',['艾得保護膜 羽潤','艾得保護膜 輕潤','艾得保護膜 極潤'],'400g',575,1150);
variants(9,'洗髮／護髮','F.AID Purifica 補充包',['艾得洗髮精 羽潤','艾得洗髮精 輕潤'],'800mL',800,1600);
variants(9,'洗髮／護髮','F.AID Purifica 補充包',['艾得保護膜 羽潤','艾得保護膜 輕潤','艾得保護膜 極潤'],'800g',800,1600);
add(9,'護髮／造型','雪透光','艾得 MiL 免沖洗護髮','150mL',550,1100);
add(9,'護髮／造型','雪透光','艾得 MiL 免沖洗護髮 旅行包','3mL',30,60);
add(9,'護髮／造型','極曜光','Purifica LiM HAIR CARE OIL 極曜光精粹油','80mL',840,1680);

// Page 10 — PurificaPRO
add(10,'護髮系統','黑曜光感','黑曜光 PRO 1','600mL',1300);
variants(10,'護髮系統','黑曜光感',['黑曜光 PRO 2S','黑曜光 PRO 2M'],'600g',1800);
add(10,'護髮系統','黑曜光感','黑曜光 PRO 3','600mL',1300);
variants(10,'護髮系統','黑曜光感',['黑曜光 PRO 4','黑曜光 PRO 4D'],'600g',1800);
add(10,'其他耗材','黑曜光感瓶材','黑曜光 PRO 1 噴瓶','200mL',150);
add(10,'其他耗材','黑曜光感瓶材','黑曜光 PRO 護髮刷','',150);
add(10,'其他耗材','黑曜光感瓶材','黑曜光 PRO 護髮碗','',130);
add(10,'其他耗材','黑曜光感瓶材','黑曜光 PRO 3 慕斯瓶','30mL',150);
add(10,'其他耗材','黑曜光感瓶材','黑曜光 PRO 4 押頭','',60);
add(10,'其他耗材','黑曜光感瓶材','黑曜光 PRO 4 支架','',250);
add(10,'其他耗材','台車','專業台車','',8000);

// Page 11 — MAD and f. 一日之計
variants(11,'洗髮／護髮','MAD 瓶裝',['MAD 鎖色修護護髮素','MAD 清爽控油洗髮精','MAD 深層淨化洗髮精'],'1000mL',450,900);
variants(11,'洗髮／護髮','MAD 桶裝',['MAD 鎖色修護護髮素','MAD 清爽控油洗髮精','MAD 深層淨化洗髮精'],'3785mL',1900);
const daily=[['初露 淨屑洗髮精',440],['花朝 護色洗髮精',440],['晨曦 控油洗髮精',440],['暮夜 蘊髮洗髮精',490],['日出花語 護髮乳',440]];
daily.forEach(([name,b])=>add(11,'洗髮／護髮','f.一日之計',name,'50mL',100,200));
daily.forEach(([name,b])=>add(11,'洗髮／護髮','f.一日之計',name,'500mL',b,b*2));
daily.forEach(([name])=>add(11,'洗髮／護髮','f.一日之計',name,'2000mL',1200));
add(11,'護髮／造型','f.一日之計','日光夢境 免沖洗護髮','30mL',245,490);

const normalized=rows.map((r,i)=>({
  id:`FIOLE-${String(i+1).padStart(4,'0')}`,
  vendor:'Fiole',
  source:`LINE_ALBUM_Fiole價目表_260804_${r.page}.jpg`,
  ...r,
  designerPrice:Math.round(r.basePrice*(r.department==='染膏'?0.7:0.75)),
  designerAllowed:r.name.startsWith('LOTION OX2 二劑')||!/(雙氧|OX\d|AC[36]%)/i.test(`${r.name} ${r.series}`),
  shopAllowed:!/(漂粉|燙髮|冷燙|柔妝燙|WAVE|二劑|一劑)/i.test(`${r.name} ${r.series}`),
}));

fs.mkdirSync('data',{recursive:true});
fs.writeFileSync('data/fiole-full-catalog.json',JSON.stringify(normalized,null,2)+'\n');
const cols=['id','page','department','series','name','spec','basePrice','designerPrice','retailPrice','designerAllowed','shopAllowed','source','notes'];
const csv=[cols.join(','),...normalized.map(r=>cols.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\n')+'\n';
fs.writeFileSync('data/fiole-full-catalog.csv',csv);
console.log(JSON.stringify({rows:normalized.length,designer:normalized.filter(x=>x.designerAllowed).length,shop:normalized.filter(x=>x.shopAllowed).length}));
