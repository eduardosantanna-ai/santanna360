const {chromium}=require('playwright');
const path=require('node:path');const fs=require('node:fs');const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto(pathToFileURL(path.resolve('map360-demo.html')).href);
 await page.locator('#ack').check();await page.locator('#begin').click();
 for(let i=0;i<32;i++){await page.locator('#choices input[value="'+(i*7%5+1)+'"]').check();await page.locator('#next').click();}
 fs.mkdirSync('visual-review',{recursive:true});
 await page.pdf({path:'visual-review/executivo.pdf',format:'A4',printBackground:true});
 await page.locator('#show-analitico').click();
 let state=await page.evaluate(()=>({ready:document.body.classList.contains('map-report-ready'),analytic:document.body.classList.contains('map-print-analytic'),visible:getComputedStyle(document.querySelector('#map-analitico')).display}));
 if(!state.ready||!state.analytic||state.visible==='none')throw Error('Analítico oculto '+JSON.stringify(state));
 await page.pdf({path:'visual-review/analitico.pdf',format:'A4',printBackground:true});
 await page.locator('#back-executivo').click();
 await page.pdf({path:'visual-review/executivo-volta.pdf',format:'A4',printBackground:true});
 console.log('REPORTS_PRINTED');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
