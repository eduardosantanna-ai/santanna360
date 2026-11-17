const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto(pathToFileURL(path.resolve('map360-demo.html')).href);
  await page.locator('#ack').check();await page.locator('#begin').click();
  for(let i=0;i<32;i++){const val=(i*7%5)+1;await page.locator('#choices input[value="'+val+'"]').check();await page.locator('#next').click();}
  await page.locator('#show-analitico').click();
  const check=await page.evaluate(()=>{
   const root=document.querySelector('#map-analitico');
   const p=[...root.querySelectorAll('p.map-justificado')];
   return {sections:root.querySelectorAll('section.map-analytic-section').length,
    justified:p.every(x=>getComputedStyle(x).textAlign==='justify'),
    version:root.innerText.includes('V1.6.4'),
    numbered:['4.1 Leitura','4.2 Leitura','4.3 Leitura','4.4 Leitura'].every(x=>root.innerText.includes(x)),
    pdi:root.querySelector('table.map-pdi-table')!==null};
  });
  console.log('REVIEW='+JSON.stringify(check));
  if(!check.justified||!check.version||!check.numbered||!check.pdi||check.sections!==13)throw Error('Falha de integridade');
  fs.mkdirSync('visual-review',{recursive:true});
  await page.pdf({path:'visual-review/map360-1-6-4.pdf',format:'A4',printBackground:true});
  await page.screenshot({path:'visual-review/map360-1-6-4.png',fullPage:true});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
