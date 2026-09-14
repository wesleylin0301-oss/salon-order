import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';

const rows=JSON.parse(await fs.readFile('data/fiole-full-catalog.json','utf8'));
const wb=Workbook.create();
const settings=wb.worksheets.add('設定');
const products=wb.worksheets.add('商品主檔');
const summary=wb.worksheets.add('匯入摘要');
settings.showGridLines=false;products.showGridLines=false;summary.showGridLines=false;

settings.getRange('A1:B1').values=[['參數','數值']];
settings.getRange('A2:B2').values=[['設計師領貨折數',0.75]];
settings.getRange('B2').format.numberFormat='0%';
settings.getRange('A1:B1').format={fill:'#111111',font:{bold:true,color:'#FFFFFF'},borders:{preset:'outside',style:'thin',color:'#111111'}};
settings.getRange('A1:B2').format.columnWidth=22;

const headers=['ID','頁次','大分類','系列','品名','規格','廠商定價','設計師領貨價','價目表定價','設計師端','店用端','來源圖片','備註'];
products.getRange('A1:M1').values=[headers];
products.getRange(`A2:M${rows.length+1}`).values=rows.map(r=>[r.id,r.page,r.department,r.series,r.name,r.spec,r.basePrice,null,r.retailPrice||null,r.designerAllowed?'顯示':'排除',r.shopAllowed?'顯示':'排除',r.source,r.notes]);
products.getRange('H2').formulas=[[`=ROUND(G2*'設定'!$B$2,0)`]];
products.getRange(`H2:H${rows.length+1}`).fillDown();
products.getRange('A1:M1').format={fill:'#111111',font:{bold:true,color:'#FFFFFF'},rowHeight:28,borders:{preset:'outside',style:'thin',color:'#111111'}};
products.getRange(`A2:M${rows.length+1}`).format.borders={insideHorizontal:{style:'thin',color:'#E5E5E5'}};
products.getRange(`G2:I${rows.length+1}`).format.numberFormat='#,##0';
products.getRange(`B2:B${rows.length+1}`).format.numberFormat='0';
products.getRange(`J2:K${rows.length+1}`).conditionalFormats.add('containsText',{text:'排除',format:{fill:'#FDECEC',font:{color:'#9C1C1C',bold:true}}});
products.freezePanes.freezeRows(1);
const widths={A:14,B:7,C:16,D:28,E:40,F:15,G:14,H:16,I:14,J:12,K:12,L:38,M:24};
for(const [c,w] of Object.entries(widths))products.getRange(`${c}:${c}`).format.columnWidth=w;
products.getRange(`C2:F${rows.length+1}`).format.wrapText=true;
products.tables.add(`A1:M${rows.length+1}`,true,'FioleCatalog');

summary.getRange('A1:D1').merge();summary.getRange('A1').values=[['FIOLE 2026-08-04 價目表匯入摘要']];
summary.getRange('A1:D1').format={fill:'#111111',font:{bold:true,color:'#FFFFFF',size:16},rowHeight:34};
summary.getRange('A3:B8').values=[['指標','數量'],['價目表商品列數',rows.length],['設計師端顯示',null],['設計師端排除',null],['店用端顯示',null],['店用端排除',null]];
summary.getRange('B5').formulas=[[`=COUNTIF('商品主檔'!J2:J${rows.length+1},"顯示")`]];
summary.getRange('B6').formulas=[[`=COUNTIF('商品主檔'!J2:J${rows.length+1},"排除")`]];
summary.getRange('B7').formulas=[[`=COUNTIF('商品主檔'!K2:K${rows.length+1},"顯示")`]];
summary.getRange('B8').formulas=[[`=COUNTIF('商品主檔'!K2:K${rows.length+1},"排除")`]];
summary.getRange('A3:B3').format={fill:'#D9D9D9',font:{bold:true,color:'#111111'}};
summary.getRange('A3:B8').format.borders={preset:'outside',style:'thin',color:'#999999'};
summary.getRange('A:A').format.columnWidth=24;summary.getRange('B:B').format.columnWidth=16;
summary.getRange('A9:D12').values=[['整合規則','','',''],['1','設計師端排除染膏用雙氧、OX 與 AC3%／AC6%；保留燙髮 LOTION OX2 二劑','',''],['2','漂粉歸類於染膏；店用端依既有規則排除漂粉與燙髮藥水','',''],['3','廠商定價保留；設計師領貨價由設定頁折數公式計算','','']];
summary.getRange('A9:D9').merge();summary.getRange('A9').format={fill:'#333333',font:{bold:true,color:'#FFFFFF'}};
summary.getRange('B10:D12').merge(true);summary.getRange('A9:D12').format.wrapText=true;
summary.getRange('A:A').format.columnWidth=8;summary.getRange('B:D').format.columnWidth=28;

await fs.mkdir('data',{recursive:true});
const out=await SpreadsheetFile.exportXlsx(wb);await out.save('data/FIOLE商品主檔_2026-08-04.xlsx');
const preview=await wb.render({sheetName:'商品主檔',range:'A1:M22',scale:1.3,format:'png'});
await fs.writeFile('data/FIOLE商品主檔_2026-08-04-preview.png',new Uint8Array(await preview.arrayBuffer()));
console.log((await wb.inspect({kind:'table',range:'匯入摘要!A1:D12',include:'values,formulas',tableMaxRows:15,tableMaxCols:6})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',options:{useRegex:true,maxResults:50},summary:'formula error scan'})).ndjson);
