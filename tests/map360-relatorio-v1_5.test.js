const fs=require('node:fs'); const assert=require('node:assert/strict'); const vm=require('node:vm');
const html=fs.readFileSync('map360-demo.html','utf8');
assert.ok(html.includes('interfaceVersion:\'1.5\''),'Versão 1.5 no payload');
for(const id of ['executive','management','dimension-readings','pdi','profile-heading','bars','integration','results']){
  assert.ok(html.includes('id="'+id+'"'),'Ausente: '+id);
}
for(const term of ['combinedInterpretations','developmentActions','buildTailoredPlan','page-break-before','@page']){
  assert.ok(html.includes(term),'Ausente: '+term);
}
const blocks=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.ok(blocks.length===1,'Esperado exatamente um script inline');
new vm.Script(blocks[0][1],{filename:'map360-v1_5-inline.js'});
assert.ok(!/\.from\(['"]map_respostas['"]\)/.test(html),'Não inserir gravação remota no piloto');
const motor=fs.readFileSync('js/map360-motor-v1_3.js','utf8');
new vm.Script(motor,{filename:'map360-motor.js'});
console.log('MAP 360° v1.5: sintaxe JS e verificações estruturais aprovadas.');
