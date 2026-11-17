const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('map360-demo.html','utf8');
const analytic=fs.readFileSync('js/map360-relatorio-analitico-v1_6.js','utf8');
const motor=fs.readFileSync('js/map360-motor-v1_3.js','utf8');
for(const [label,cond] of Object.entries({
 'Opção analítica':html.includes('id="show-analitico"'),
 'Documento analítico':html.includes('id="map-analitico"'),
 'Impressão dedicada':html.includes('id="print-analitico"'),
 'Link script analítico':html.includes('js/map360-relatorio-analitico-v1_6.js'),
 'Texto justificado':html.includes('text-align:justify')&&html.includes('hyphens:auto'),
 'Relatório sem gravação remota':!/\.(insert|upsert|update|delete)\s*\(/.test(html),
 'Biblioteca de perfis':analytic.includes('const combination='),
 'PDI baseado em respostas':analytic.includes('const actions='),
 '10 seções':analytic.includes("'10. Critérios técnicos e limites'"),
 '32 questões no motor':motor.includes('recebidas.length!==32')
})){assert.ok(cond,label)}
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'JavaScript inline não encontrado');
new vm.Script(match[1]);new vm.Script(analytic);new vm.Script(motor);
const document={
 createElement(tag){return {tag,children:[],style:{},className:'',textContent:'',append(...x){this.children.push(...x)},replaceChildren(...x){this.children=[...x]}}}
};
const context={document,window:{}};vm.runInNewContext(analytic,context);
const codes=['C','A','E','X'].flatMap(p=>Array.from({length:8},(_,i)=>p+String(i+1).padStart(2,'0')));
const respostas=Object.fromEntries(codes.map(k=>[k,3]));
const calcCtx={window:{}};vm.runInNewContext(motor,calcCtx);
const calculo=calcCtx.window.MAP360Motor.calcular(respostas);
const root=document.createElement('main');context.window.MAP360Analitico.render(root,{calculo,respostas});
assert.ok(root.children.length>=11,'Seções do relatório não renderizadas');
const titles=root.children.filter(x=>x.tag==='section').map(x=>x.children[0].textContent);
assert.equal(titles.length,13,'Esperadas 13 seções (4 dimensões separadas)');
assert.ok(titles.includes('8. Plano de Desenvolvimento Individual (PDI)'));
console.log('MAP 360 v1.6: sintaxe, integridade e renderização simulada aprovadas.');
