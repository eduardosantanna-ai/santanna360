const assert = require('node:assert/strict');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');

async function main() {
  const origin = 'https://homologacao.example.invalid';
  const company = '10000000-0000-4000-8000-000000000001';
  const other = '10000000-0000-4000-8000-000000000002';
  const user = '20000000-0000-4000-8000-000000000001';
  const evaluation = '30000000-0000-4000-8000-000000000001';
  const invite = '40000000-0000-4000-8000-000000000001';
  const questions = Array.from({length:32}, () => ({id:crypto.randomUUID()}));
  const answers = questions.map(q => ({pergunta_id:q.id,nota:3}));
  const tables = {
    perfis:[{id:user,ativo:true,administrador:true}],
    empresas:[{id:company},{id:other}],
    map_respostas:answers.map(row => ({...row,empresa_id:company,avaliacao_id:evaluation})),
    map_avaliacoes:[{id:evaluation,empresa_id:company,consentimento_registrado:true}],
    map_perguntas:questions.map(q => ({...q,ativa:true})),
    map_convites:[],
    map360_devolutivas:[]
  };
  let handler;
  function createClient(_url, key, options) {
    const isService = key === 'service';
    const credential = options.global?.headers.Authorization;
    return {
      auth:{getUser:async () => ({data:{user:['Bearer admin','Bearer editor'].includes(credential)?{id:user}:null}})},
      rpc:async (name, args) => {
        assert.ok(isService);
        if (name === 'map360_convite_permitir') return {data:args.p_limite >= 1 && args.p_limite <= 100};
        assert.equal(name, 'map360_concluir_convite');
        const record = tables.map_convites.find(row => row.token_hash === args.p_token_hash);
        Object.assign(record,{estado:'concluido',avaliacao_id:evaluation});
        return {data:evaluation};
      },
      from(table) {
        const serverOnly = ['map_convites','map360_devolutivas','map_perguntas'].includes(table);
        assert.ok(isService || !serverOnly);
        if (['perfis','empresas','map_avaliacoes','map_respostas'].includes(table)) assert.ok(!isService);
        let rows = tables[table], patch, fields;
        if (table === 'perfis' && credential === 'Bearer editor') rows = [{...rows[0],administrador:false}];
        const api = {
          eq(k,v) { rows = rows.filter(row => row[k] === v); return api; },
          in(k,values) { rows = rows.filter(row => values.includes(row[k])); return api; },
          select(columns) { fields=columns.split(','); return api; },
          order() { return api; },
          limit(n) { rows=rows.slice(0,n); return api; },
          insert(data) {
            const row={...data,id:invite,estado:'pendente'};
            rows.push(row); rows=[row]; return api;
          },
          update(data) { patch=data; return api; },
          upsert(data) {
            const row=tables[table].find(row => row.avaliacao_id === data.avaliacao_id);
            if (row) Object.assign(row,data); else tables[table].push(data);
            rows=[row || data]; return api;
          },
          async maybeSingle() { return {data:result()[0] || null}; },
          async single() { return {data:result()[0]}; },
          then(resolve) { return Promise.resolve({data:result()}).then(resolve); }
        };
        function result() {
          if (patch) rows.forEach(row => Object.assign(row,patch));
          return rows.map(row => Object.fromEntries(fields.map(key => [key,row[key]])));
        }
        return api;
      }
    };
  }
  const env = {SUPABASE_URL:'https://supabase.example.invalid',SUPABASE_ANON_KEY:'anon',
    SUPABASE_SERVICE_ROLE_KEY:'service',MAP360_RATE_SALT:'fixture-salt',MAP360_SITE_ORIGIN:origin};
  const source = fs.readFileSync('supabase/functions/map360-convites/index.ts','utf8')
    .replace(/^import .+?;$/m,'');
  vm.runInNewContext(stripTypeScriptTypes(source),{
    Deno:{env:{get:key=>env[key]},serve:fn=>{handler=fn;}},
    createClient, TextEncoder, TextDecoder, Uint8Array, URL, Response, crypto, btoa, console
  });
  function send(action, data={}, jwt, requestOrigin=origin) {
    const headers={origin:requestOrigin,'cf-connecting-ip':'192.0.2.1'};
    if (jwt) headers.authorization='Bearer '+jwt;
    return handler(new Request(origin,{method:'POST',headers,body:JSON.stringify({action,...data})}));
  }
  assert.equal((await send('list',{empresa_id:company})).status,403);
  assert.equal((await send('list',{empresa_id:company},'editor')).status,403);
  assert.equal((await send('list',{empresa_id:company},'admin','https://fora.example.invalid')).status,403);
  assert.equal((await send('view',{extra:'x'.repeat(21000)})).status,413);
  const input={empresa_id:company,participante_nome:'Pessoa fictícia',email:'teste@example.invalid',
    finalidade:'desenvolvimento',expira_em:new Date(Date.now()+86400000).toISOString()};
  const created=await send('create',input,'admin');
  assert.equal(created.status,201);
  const link=new URL((await created.json()).link);
  assert.equal(link.origin,origin);
  const token=new URLSearchParams(link.hash.slice(1)).get('token');
  assert.equal(tables.map_convites[0].token_hash.length,64);
  assert.ok(!JSON.stringify(tables.map_convites).includes(token));
  const list=async empresa_id=>(await (await send('list',{empresa_id},'admin')).json()).convites;
  assert.equal((await list(other)).length,0);
  assert.equal((await list(company))[0].estado_exibicao,'pendente');
  assert.ok(!Object.hasOwn((await list(company))[0],'token_hash'));
  assert.equal((await send('revoke',{empresa_id:other,id:invite},'admin')).status,404);
  const view=await send('view',{token});
  assert.equal(view.status,200);
  assert.equal((await view.json()).perguntas.length,32);
  assert.equal((await send('submit',{token,respostas:answers.slice(1),confirmacao_privacidade:true})).status,400);
  assert.equal((await send('submit',{token,respostas:answers,confirmacao_privacidade:true})).status,200);
  assert.equal((await send('view',{token})).status,404);
  assert.equal((await send('submit',{token,respostas:answers,confirmacao_privacidade:true})).status,404);
  const feedback={empresa_id:company,avaliacao_id:evaluation,status:'realizada',realizado_em:'2026-11-28',
    proxima_revisao:'2026-12-15',compromissos:'Ação de desenvolvimento'};
  assert.equal((await send('save_feedback',{...feedback,empresa_id:other},'admin')).status,403);
  assert.equal((await send('save_feedback',feedback,'admin')).status,200);
  const saved=await (await send('get_feedback',feedback,'admin')).json();
  assert.equal(saved.devolutiva.compromissos,feedback.compromissos);
  assert.equal((await list(company))[0].devolutiva_status,'realizada');
  const second=await (await send('create',input,'admin')).json();
  assert.equal((await send('revoke',{empresa_id:company,id:second.id},'admin')).status,200);
  assert.equal((await list(company)).at(-1).estado_exibicao,'revogado');
  console.log('MAP 360°: handler da Edge Function aprovado com serviços Supabase simulados.');
}
main().catch(error => { console.error(error); process.exitCode=1; });
