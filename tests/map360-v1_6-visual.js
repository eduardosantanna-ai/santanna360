const { chromium } = require('playwright');
const fs = require('node:fs');
const { pathToFileURL }=require('node:url');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
    page.on('pageerror',error=>{throw error});
    await page.goto(pathToFileURL(path.resolve('map360-demo.html')).href);
    await page.locator('#ack').check();
    await page.locator('#begin').click();
    for(let i=0;i<32;i++){
      // Variação determinística nas respostas: permite verificar os quatro eixos.
      const value=(i*7%5)+1;
      await page.locator('#choices input[value="'+value+'"]').check();
      await page.locator('#next').click();
    }
    await page.locator('#show-analitico').click();
    await page.locator('#map-analitico.active').waitFor();
    const checks=await page.evaluate(()=>{
      const analytic=document.querySelector('#map-analitico');
      const paragraphs=[...analytic.querySelectorAll('p.map-justificado')];
      return {sections:analytic.querySelectorAll('section.map-analytic-section').length,
       paragraphs:paragraphs.length,
       justified:paragraphs.every(x=>getComputedStyle(x).textAlign==='justify'),
       textLength:analytic.innerText.length,
       hasPdi:analytic.innerText.includes('Plano de Desenvolvimento Individual'),
       hasLimits:analytic.innerText.includes('Critérios técnicos e limites')};
    });
    if(checks.sections!==13 || !checks.justified || !checks.hasPdi || !checks.hasLimits)throw Error('Visual structure invalid: '+JSON.stringify(checks));
    fs.mkdirSync('visual-review',{recursive:true});
    await page.screenshot({path:'visual-review/map360-v1_6-analitico.png',fullPage:true});
    await page.pdf({path:'visual-review/map360-v1_6-analitico.pdf',format:'A4',printBackground:true});
    console.log('VISUAL_CHECKS='+JSON.stringify(checks));
    console.log('PDF_CREATED=visual-review/map360-v1_6-analitico.pdf');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
