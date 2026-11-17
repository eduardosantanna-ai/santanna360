const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('map360-restrito.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(js,'JavaScript inline presente');
new vm.Script(js[1],{filename:'map360-restrito.html'});
const required=[
 "client.auth.getUser()",
 "from('empresas')",
 "from('map_perguntas')",
 "from('map_avaliacoes')",
 "from('map_respostas')",
 ".eq('empresa_id',companyId).eq('avaliacao_id',assessmentId)",
 "MAP360Motor.calcular(respostas)",
 "MAP360Analitico.render(byId('report'),{calculo:resultado,respostas})",
 "rows.length!==32",
 "questions.length!==32",
 "text-align:justify",
 "body:not(.ready) main{visibility:hidden}"
];
for(const term of required)assert.ok(html.includes(term),'Falta: '+term);
for(const id of ['empresa','avaliacoes','summary','report','status','refresh','logout'])assert.ok(html.includes('id="'+id+'"'),'ID faltante '+id);
assert.ok(!/\.(insert|upsert|update|delete)\s*\(/.test(html),'Não deve incluir escrita');
assert.ok(!/localStorage|sessionStorage|service_role|secret_key/i.test(html),'Não deve guardar dados no navegador nem usar chave secreta');
assert.ok(html.includes("!companies.some(c=>c.id===id)"),'Checagem da empresa selecionada');
assert.ok(html.includes("e.empresa_id===companyId"),'Checagem do vínculo de avaliação');
console.log('MAP 360° v1.7: testes estáticos e sintaxe aprovados.');
