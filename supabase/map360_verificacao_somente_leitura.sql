-- MAP 360 - verificacao SOMENTE LEITURA (executar apos instalar esquema)
select tablename, rowsecurity from pg_tables where schemaname='public' and tablename like 'map360_%' order by tablename;
select tablename, policyname, roles, cmd, qual, with_check from pg_policies where schemaname='public' and tablename like 'map360_%' order by tablename, policyname;
select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name like 'map360_%' and grantee in ('anon','authenticated') order by table_name, grantee, privilege_type;
select count(*) as avaliacoes_com_respostas from public.map360_avaliacoes where respostas is not null or pontuacoes is not null;
select count(*) as avaliacoes_fora_do_piloto from public.map360_avaliacoes where status not in ('rascunho','cancelada');
select count(*) as participantes_sem_empresa from public.map360_participantes p left join public.map360_empresas e on e.id=p.empresa_id where e.id is null;
