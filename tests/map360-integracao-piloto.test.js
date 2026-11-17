// Teste estatico seguro: sem conexão à internet nem ao Supabase.
// Execução: node tests/map360-integracao-piloto.test.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('map360-integrado-piloto.html','utf8');
const admin=fs.readFileSync('map360-admin.html','utf8');
const motor=fs.readFileSync('js/map360-motor-v1_3.js','utf8');
for(const [label,check] of Object.entries({
 'HTML em portugues':html.includes('lang="pt-BR"'),
 'motor central referenciado':html.includes('js/map360-motor-v1_3.js'),
 'motor central com calculo':motor.includes('calcular(respostas)'),
 'Supabase Auth getUser':html.includes('client.auth.getUser()'),
 'fonte perguntas existente':html.includes("from('map_perguntas')"),
 '32 perguntas exigidas':html.includes('questions.length!==32'),
 'valida dimensoes':html.includes('constancia')&&html.includes('estrutura')&&html.includes('conexao')&&html.includes('acao'),
 'resultado calculado':html.includes('MAP360Motor.calcular(answers)'),
 'impressao de relatorio':html.includes('window.print()'),
 'formulario sem insert':!/(?:\.insert|\.upsert|\.update|\.delete|\.rpc)\s*\(/.test(html),
 'formulario sem localStorage':!html.includes('localStorage'),
 'administrativo sem gravacao':!/(?:\.insert|\.upsert|\.update|\.delete|\.rpc)\s*\(/.test(admin),
 'administrativo consulta empresas':admin.includes("from('empresas')"),
 'administrativo consulta avaliacoes':admin.includes("from('map_avaliacoes')"),
 'aviso de piloto':html.includes('somente leitura')
})){assert.ok(check,label);}
const expected=['start','quiz','result','status','begin','previous','next','classification','bars','readings','summary','print','restart'];
for(const id of expected){assert.ok(html.includes('id="'+id+'"'),'ID ausente: '+id);}
console.log('MAP 360: verificações estáticas do piloto autenticado aprovadas.');
