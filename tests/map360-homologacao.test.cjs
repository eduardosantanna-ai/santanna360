const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { PGlite } = require('@electric-sql/pglite');
const read = path => fs.readFileSync(path, 'utf8');

async function verifyDatabase() {
  const db = new PGlite();
  try {
    await db.exec(read('tests/map360-schema-homologacao.sql'));
    for (const file of fs.readdirSync('supabase/migrations').sort()) {
      await db.exec(read('supabase/migrations/' + file));
    }
    const a = '10000000-0000-4000-8000-000000000001';
    const b = '10000000-0000-4000-8000-000000000002';
    const admin = '20000000-0000-4000-8000-000000000001';
    const editor = '20000000-0000-4000-8000-000000000002';
    const editorB = '20000000-0000-4000-8000-000000000003';
    await db.exec(`
      insert into empresas(id,razao_social) values ('${a}','Empresa A'),('${b}','Empresa B');
      insert into auth.users values ('${admin}'),('${editor}'),('${editorB}');
      insert into perfis(id,nome,administrador) values
        ('${admin}','Admin',true),('${editor}','Editor A',false),('${editorB}','Editor B',false);
      insert into usuarios_empresas(usuario_id,empresa_id,papel) values
        ('${editor}','${a}','editor'),('${editorB}','${b}','editor');
      insert into map_perguntas(codigo,dimensao,enunciado,ordem)
        select prefix || lpad(n::text,2,'0'), dimension, 'Pergunta fictícia', idx*8+n
        from (values ('C','constancia',0),('A','acao',1),('E','estrutura',2),('X','conexao',3))
          as d(prefix,dimension,idx) cross join generate_series(1,8) n;
    `);
    const seedInvite = (hash, company, state = 'pendente', expiry = '1 day') => db.query(
      `insert into map_convites(empresa_id,criado_por,participante_nome,email,finalidade,token_hash,estado,criado_em,expira_em)
       values($1,$2,'Pessoa fictícia','teste@example.invalid','desenvolvimento',$3,$4,now()-interval '3 days',now()+$5::interval)`,
      [company, admin, hash, state, expiry]
    );
    const tokenA = 'a'.repeat(64), tokenB = 'b'.repeat(64), revoked = 'c'.repeat(64), expired = 'd'.repeat(64);
    await seedInvite(tokenA, a);
    await seedInvite(tokenB, b);
    await seedInvite(revoked, a, 'revogado');
    await seedInvite(expired, a, 'pendente', '-1 day');
    const questions = (await db.query('select id from map_perguntas order by ordem')).rows;
    const answers = questions.map(q => ({ pergunta_id: q.id, nota: 3 }));
    const submit = (token, values = answers, privacy = true) =>
      db.query('select map360_concluir_convite($1,$2::jsonb,$3) as id', [token, JSON.stringify(values), privacy]);
    await db.exec('set role service_role');
    await assert.rejects(submit(tokenA, answers.slice(1)), /32 respostas/);
    await assert.rejects(submit(tokenA, answers, false), /privacidade/);
    await assert.rejects(submit(tokenA, [...answers.slice(1), answers[1]]), /duplicadas/);
    await assert.rejects(submit(tokenA, [{ ...answers[0], nota: null }, ...answers.slice(1)]), /inválidas/);
    await assert.rejects(submit(revoked), /indisponível/);
    await assert.rejects(submit(expired), /indisponível/);
    assert.equal((await db.query('select count(*)::int as n from map_avaliacoes')).rows[0].n, 0);
    const completed = await Promise.allSettled([submit(tokenA), submit(tokenA)]);
    assert.equal(completed.filter(x => x.status === 'fulfilled').length, 1);
    const evaluationA = completed.find(x => x.status === 'fulfilled').value.rows[0].id;
    const evaluationB = (await submit(tokenB)).rows[0].id;
    assert.deepEqual((await db.query('select count(*)::int as n from map_respostas group by avaliacao_id')).rows, [{n:32},{n:32}]);
    assert.equal((await db.query('select avaliacao_id from map_convites where token_hash=$1 and estado=\'concluido\'', [tokenA])).rows[0].avaliacao_id, evaluationA);
    await assert.rejects(db.query('insert into map360_devolutivas(empresa_id,avaliacao_id,atualizado_por) values($1,$2,$3)', [b,evaluationA,admin]), /foreign key/);
    await db.query(
      `insert into map360_devolutivas(empresa_id,avaliacao_id,atualizado_por,status,realizado_em,sintese,compromissos)
       values($1,$2,$3,'realizada',current_date,'Síntese fictícia','Plano de ação fictício')`,
      [a,evaluationA,admin]
    );
    assert.equal((await db.query('select compromissos from map360_devolutivas')).rows[0].compromissos, 'Plano de ação fictício');
    const rate = async () => (await db.query('select map360_convite_permitir($1,2) as ok', ['e'.repeat(64)])).rows[0].ok;
    assert.deepEqual([await rate(), await rate(), await rate()], [true,true,false]);
    await db.exec('reset role; set role authenticated');
    for (const [subject, permitted, forbidden] of [[editor,evaluationA,evaluationB],[editorB,evaluationB,evaluationA]]) {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [subject]);
      assert.deepEqual((await db.query('select id from map_avaliacoes')).rows, [{id:permitted}]);
      assert.equal((await db.query('select * from map_respostas where avaliacao_id=$1', [forbidden])).rows.length, 0);
      assert.equal((await db.query('update map_avaliacoes set participante_nome=\'Alteração\' where id=$1 returning id', [forbidden])).rows.length, 0);
      await assert.rejects(submit(tokenA), /permission denied/);
      await assert.rejects(db.query('select * from map_convites'), /permission denied/);
      await assert.rejects(db.query('select * from map360_devolutivas'), /permission denied/);
    }
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
    assert.equal((await db.query('select id from map_avaliacoes')).rows.length, 2);
    await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon");
    assert.equal((await db.query('select id from map_avaliacoes')).rows.length, 0);
    await assert.rejects(submit(tokenA), /permission denied/);
    await assert.rejects(db.query('select * from map_convites'), /permission denied/);
    await assert.rejects(db.query('select * from map360_aplicar_retencao()'), /permission denied/);
    await db.exec('reset role; set role service_role');
    await db.query("update map_convites set concluido_em=now()-interval '13 months' where avaliacao_id in ($1,$2)", [evaluationA,evaluationB]);
    await db.query("update map_convites set criado_em=now()-interval '35 days', expira_em=now()-interval '32 days' where token_hash=$1", [expired]);
    await db.query("update map_convites set estado='revogado' where token_hash=$1", [expired]);
    assert.ok((await db.query('select revogado_em from map_convites where token_hash=$1', [expired])).rows[0].revogado_em);
    const retention = async () => (await db.query('select * from map360_aplicar_retencao()')).rows[0];
    assert.deepEqual(await retention(), {contatos_descartados:2,devolutivas_excluidas:0,avaliacoes_excluidas:1});
    assert.equal((await db.query('select count(*)::int as n from map_respostas where avaliacao_id=$1',[evaluationA])).rows[0].n,32);
    assert.equal((await db.query('select email from map_convites where token_hash=$1',[tokenA])).rows[0].email,null);
    assert.notEqual((await db.query('select email from map_convites where token_hash=$1',[expired])).rows[0].email,null);
    await db.query("update map360_devolutivas set realizado_em=current_date-interval '14 months', encerrado_em=current_date-interval '13 months' where avaliacao_id=$1", [evaluationA]);
    assert.deepEqual(await retention(), {contatos_descartados:0,devolutivas_excluidas:1,avaliacoes_excluidas:1});
    assert.deepEqual(await retention(), {contatos_descartados:0,devolutivas_excluidas:0,avaliacoes_excluidas:0});
  } finally {
    await db.close();
  }
}

async function main() {
  await verifyDatabase();
  const { parseHTML } = require('linkedom');
  const { document } = parseHTML('<main id="report"></main>');
  const context = vm.createContext({window:{},document});
  for (const file of ['js/map360-motor-v1_3.js','js/map360-relatorio-analitico-v1_6.js']) {
    vm.runInContext(read(file), context);
  }
  const {MAP360Motor,MAP360Analitico} = context.window;
  const answers = {};
  for (const code of 'CAEX') for (let n=1;n<=8;n++) answers[code+'0'+n] = n<=6 ? 5 : 1;
  const report = document.getElementById('report');
  MAP360Analitico.render(report, {calculo:MAP360Motor.calcular(answers),respostas:answers});
  const headings = [...report.querySelectorAll('.map-analytic-section > h2')]
    .map(heading => heading.textContent.split(' ')[0]);
  assert.deepEqual(headings, ['1.','2.','3.','4.1','4.2','4.3','4.4','5.','6.','7.','8.','9.','10.']);
  for (const name of ['Constância','Ação','Estrutura','Conexão','Plano de Desenvolvimento Individual','devolutiva']) {
    assert.ok(report.textContent.includes(name), name);
  }
  console.log('MAP 360°: migrações, 32 respostas, isolamento, devolutiva/PDI e dez seções do relatório aprovados localmente.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
