const assert = require('node:assert/strict');
const fs = require('node:fs');

const host = process.env.MAP360_TEST_URL;
const origin = process.env.MAP360_TEST_ORIGIN;
const key = process.env.MAP360_TEST_KEY;
const credentialFile = process.env.MAP360_TEST_CREDENTIALS;
if (!host || !origin || !key || !credentialFile || new URL(host).hostname === 'okvikkifrsbovbppywgp.supabase.co') {
  throw Error('Configure URL, chave, origem e contas fictícias de um projeto isolado.');
}
const [admin, editorA, editorB] = JSON.parse(fs.readFileSync(credentialFile, 'utf8'));
const companyA = '10000000-0000-4000-8000-000000000001';
const companyB = '10000000-0000-4000-8000-000000000002';

async function call(path, expected, options = {}) {
  const response = await fetch(host + path, {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers: { apikey:key, origin, 'content-type':'application/json',
      ...(options.jwt ? {authorization:'Bearer '+options.jwt} : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(30000)
  });
  const body = await response.json().catch(() => ({}));
  assert.ok([expected].flat().includes(response.status),
    `${path} ${options.body?.action || ''}: HTTP ${response.status}; esperado ${expected}: ${body.error || body.message || 'sem detalhes'}`);
  return {body, response};
}

async function main() {
  const login = async ({email,password}) =>
    (await call('/auth/v1/token?grant_type=password',200,{body:{email,password}})).body.access_token;
  const [adminJwt,aJwt,bJwt] = await Promise.all([login(admin),login(editorA),login(editorB)]);
  const edge = (action, data, status, jwt) => call('/functions/v1/map360-convites',status,{body:{action,...data},jwt});
  await edge('list',{empresa_id:companyA},403);
  await edge('list',{empresa_id:companyA},403,aJwt);
  await edge('list',{empresa_id:companyB},403,bJwt);
  const label = 'Participante fictício ' + crypto.randomUUID();
  const create = async company => {
    const {body,response} = await edge('create',{empresa_id:company,participante_nome:label,
      email:'map360-ficticio@example.com',finalidade:'desenvolvimento',
      expira_em:new Date(Date.now()+86400000).toISOString()},201,adminJwt);
    assert.equal(response.headers.get('access-control-allow-origin'),origin);
    const url = new URL(body.link);
    assert.equal(url.origin,origin);
    return {id:body.id,token:new URLSearchParams(url.hash.slice(1)).get('token')};
  };
  const first = await create(companyA);
  const revoked = await create(companyB);
  await edge('revoke',{empresa_id:companyA,id:revoked.id},404,adminJwt);
  await edge('revoke',{empresa_id:companyB,id:revoked.id},200,adminJwt);
  await edge('view',{token:revoked.token},404);
  const {body:survey} = await edge('view',{token:first.token},200);
  assert.equal(survey.perguntas.length,32);
  const answers = survey.perguntas.map(q => ({pergunta_id:q.id,nota:3}));
  await edge('submit',{token:first.token,respostas:answers.slice(1),confirmacao_privacidade:true},400);
  const data = {token:first.token,respostas:answers,confirmacao_privacidade:true};
  const submitted = await Promise.all([edge('submit',data,[200,404,409]),edge('submit',data,[200,404,409])]);
  assert.equal(submitted.filter(r => r.response.status === 200).length,1);
  await edge('view',{token:first.token},404);
  const {body:list} = await edge('list',{empresa_id:companyA},200,adminJwt);
  const finished = list.convites.find(item => item.id === first.id);
  assert.equal(finished.estado_exibicao,'concluido');
  assert.ok(!('token_hash' in finished) && !('email' in finished));
  const evaluation = finished.avaliacao_id;
  const assessments = '/rest/v1/map_avaliacoes?select=id,empresa_id&id=eq.'+evaluation;
  assert.equal((await call(assessments,200,{jwt:aJwt})).body.length,1);
  assert.equal((await call(assessments,200,{jwt:bJwt})).body.length,0);
  assert.equal((await call(assessments,200,{jwt:adminJwt})).body.length,1);
  const responses = '/rest/v1/map_respostas?select=pergunta_id,nota&avaliacao_id=eq.'+evaluation;
  assert.equal((await call(responses,200,{jwt:aJwt})).body.length,32);
  assert.equal((await call(responses,200,{jwt:bJwt})).body.length,0);
  await call('/rest/v1/map_convites?select=id',403,{jwt:aJwt});
  await call('/rest/v1/map360_devolutivas?select=id',403,{jwt:bJwt});
  const feedback = {empresa_id:companyA,avaliacao_id:evaluation,status:'realizada',
    realizado_em:'2026-11-28',proxima_revisao:'2026-12-15',compromissos:'Plano fictício de homologação'};
  await edge('save_feedback',{...feedback,empresa_id:companyB},403,adminJwt);
  await edge('get_feedback',feedback,403,bJwt);
  await edge('save_feedback',feedback,200,adminJwt);
  const {body:result} = await edge('get_feedback',feedback,200,adminJwt);
  assert.equal(result.devolutiva.compromissos,feedback.compromissos);
  const {body:updated} = await edge('list',{empresa_id:companyA},200,adminJwt);
  assert.equal(updated.convites.find(item => item.id===first.id).devolutiva_status,'realizada');
  console.log('Supabase isolado: Auth, Edge Function, concorrência, RLS entre empresas e devolutiva/PDI aprovados.');
}
main().catch(error => { console.error(error); process.exitCode=1; });
