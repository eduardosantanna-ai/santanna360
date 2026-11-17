-- Verificacao de integracao MAP 360° com tabelas EXISTENTES
-- SOMENTE LEITURA. Execute no SQL Editor se quiser conferir o ambiente.
select table_name from information_schema.tables
where table_schema='public' and table_name in
('empresas','colaboradores','map_avaliacoes','map_perguntas','map_respostas')
order by table_name;

select dimensao, count(*) as quantidade
from public.map_perguntas
where ativa is true
group by dimensao
order by dimensao;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname='public' and tablename in
('map_avaliacoes','map_perguntas','map_respostas')
order by tablename, policyname;
