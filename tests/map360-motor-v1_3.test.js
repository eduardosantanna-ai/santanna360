// Execução: node tests/map360-motor-v1_3.test.js
// Nenhuma conexão ao Supabase e nenhum dado pessoal.
const assert=require('node:assert/strict');
const {calcular}=require('../js/map360-motor-v1_3.js');
const codes=['C','A','E','X'].flatMap(p=>Array.from({length:8},(_,i)=>p+String(i+1).padStart(2,'0')));
const input=(v=3)=>Object.fromEntries(codes.map(k=>[k,v]));
const at=(r,id)=>r.dimensoes.find(d=>d.id===id);
{
  const r=calcular(input());
  assert.equal(r.dimensoes.length,4);
  assert.equal(r.tipo,'multidimensional');
  assert.equal(r.predominancias.length,4);
  r.dimensoes.forEach(d=>{assert.equal(d.pontosBrutos,24);assert.equal(d.indice,50);});
}
{
  const x=input();
  for(const code of codes.filter(k=>k.startsWith('A')))x[code]=code.endsWith('07')||code.endsWith('08')?1:5;
  const r=calcular(x);
  assert.equal(at(r,'acao').pontosBrutos,40);
  assert.equal(at(r,'acao').indice,100);
  assert.equal(r.tipo,'predominante');
  assert.deepEqual(r.predominancias,['Ação']);
}
{
  const x=input();
  for(const code of codes.filter(k=>k.startsWith('E')||k.startsWith('X')))x[code]=code.endsWith('07')||code.endsWith('08')?1:5;
  const r=calcular(x);
  assert.equal(r.tipo,'combinado');
  assert.deepEqual(r.predominancias,['Estrutura','Conexão']);
}
{
  const x=input();x.C07=1;x.C08=5;
  const r=calcular(x);
  assert.equal(at(r,'constancia').itens[6].notaCorrigida,5);
  assert.equal(at(r,'constancia').itens[7].notaCorrigida,1);
}
for(const invalid of [0,6,2.5,'3',null]){
  const x=input();x.X02=invalid;
  assert.throws(()=>calcular(x));
}
{
 const x=input();delete x.C01;assert.throws(()=>calcular(x));
}
{
 const x=input();x.Z99=2;assert.throws(()=>calcular(x));
}
console.log('MAP 360: testes unitários concluídos com sucesso.');
