-- Estruturas e políticas locais baseadas no esquema consultado. Sem registros de produção.
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
create table public.colaboradores (id uuid primary key);
create table public.empresas (
 id uuid default gen_random_uuid() not null,
 razao_social text not null,
 nome_fantasia text,
 cnpj character varying,
 email text,
 telefone character varying,
 cidade text,
 estado character varying,
 ativo boolean default true not null,
 criado_em timestamp with time zone default now() not null
);
alter table public.empresas add PRIMARY KEY (id);
alter table public.empresas add UNIQUE (cnpj);
create table public.perfis (
 id uuid not null,
 nome text not null,
 email text,
 administrador boolean default false not null,
 ativo boolean default true not null,
 criado_em timestamp with time zone default now() not null
);
alter table public.perfis add FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.perfis add PRIMARY KEY (id);
create table public.usuarios_empresas (
 id uuid default gen_random_uuid() not null,
 usuario_id uuid not null,
 empresa_id uuid not null,
 papel text default 'leitor'::text not null,
 ativo boolean default true not null,
 criado_em timestamp with time zone default now() not null
);
alter table public.usuarios_empresas add CHECK ((papel = ANY (ARRAY['gestor'::text, 'editor'::text, 'leitor'::text])));
alter table public.usuarios_empresas add FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
alter table public.usuarios_empresas add FOREIGN KEY (usuario_id) REFERENCES perfis(id) ON DELETE CASCADE;
alter table public.usuarios_empresas add PRIMARY KEY (id);
alter table public.usuarios_empresas add UNIQUE (usuario_id, empresa_id);
create table public.map_avaliacoes (
 id uuid default gen_random_uuid() not null,
 empresa_id uuid not null,
 colaborador_id uuid,
 participante_nome text,
 finalidade text default 'autoconhecimento'::text not null,
 consentimento_registrado boolean default false not null,
 criado_por uuid,
 criado_em timestamp with time zone default now() not null
);
alter table public.map_avaliacoes add FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL;
alter table public.map_avaliacoes add FOREIGN KEY (criado_por) REFERENCES auth.users(id);
alter table public.map_avaliacoes add FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
alter table public.map_avaliacoes add PRIMARY KEY (id);
alter table public.map_avaliacoes add UNIQUE (id, empresa_id);
create table public.map_perguntas (
 id uuid default gen_random_uuid() not null,
 codigo text not null,
 dimensao text not null,
 enunciado text not null,
 ordem integer not null,
 ativa boolean default true not null
);
alter table public.map_perguntas add CHECK ((dimensao = ANY (ARRAY['acao'::text, 'conexao'::text, 'constancia'::text, 'estrutura'::text])));
alter table public.map_perguntas add PRIMARY KEY (id);
alter table public.map_perguntas add UNIQUE (codigo);
create table public.map_respostas (
 id uuid default gen_random_uuid() not null,
 empresa_id uuid not null,
 avaliacao_id uuid not null,
 pergunta_id uuid not null,
 nota integer not null
);
alter table public.map_respostas add CHECK (((nota >= 1) AND (nota <= 5)));
alter table public.map_respostas add FOREIGN KEY (avaliacao_id, empresa_id) REFERENCES map_avaliacoes(id, empresa_id) ON DELETE CASCADE;
alter table public.map_respostas add FOREIGN KEY (pergunta_id) REFERENCES map_perguntas(id);
alter table public.map_respostas add PRIMARY KEY (id);
alter table public.map_respostas add UNIQUE (avaliacao_id, pergunta_id);
CREATE OR REPLACE FUNCTION public.s360_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.perfis p
        WHERE p.id = (SELECT auth.uid())
          AND p.administrador = true
          AND p.ativo = true
    );
$function$
;
CREATE OR REPLACE FUNCTION public.s360_acesso(eid uuid, editar boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT public.s360_admin() OR EXISTS (
   SELECT 1 FROM public.usuarios_empresas ue
   JOIN public.perfis p ON p.id = ue.usuario_id
   JOIN public.empresas e ON e.id = ue.empresa_id
   WHERE ue.usuario_id = (SELECT auth.uid())
     AND ue.empresa_id = eid AND ue.ativo = true
     AND p.ativo = true AND e.ativo = true
     AND (NOT editar OR ue.papel IN ('gestor','editor'))
 );
$function$
;
alter table public.empresas enable row level security;
grant select,insert,update,delete on public.empresas to anon,authenticated,service_role;
create policy s360_empresas_delete on public.empresas for delete to authenticated using (s360_admin());
create policy s360_empresas_update on public.empresas for update to authenticated using (s360_admin()) with check (s360_admin());
create policy s360_empresas_select on public.empresas for select to authenticated using (s360_acesso(id, false));
create policy s360_empresas_insert on public.empresas for insert to authenticated with check (s360_admin());
alter table public.perfis enable row level security;
grant select,insert,update,delete on public.perfis to anon,authenticated,service_role;
create policy s360_perfis_update on public.perfis for update to authenticated using (s360_admin()) with check (s360_admin());
create policy s360_perfis_select on public.perfis for select to authenticated using (((id = ( SELECT auth.uid() AS uid)) OR s360_admin()));
create policy s360_perfis_insert on public.perfis for insert to authenticated with check (s360_admin());
create policy s360_perfis_delete on public.perfis for delete to authenticated using (s360_admin());
alter table public.usuarios_empresas enable row level security;
grant select,insert,update,delete on public.usuarios_empresas to anon,authenticated,service_role;
create policy s360_vinculos_update on public.usuarios_empresas for update to authenticated using (s360_admin()) with check (s360_admin());
create policy s360_vinculos_delete on public.usuarios_empresas for delete to authenticated using (s360_admin());
create policy s360_vinculos_insert on public.usuarios_empresas for insert to authenticated with check (s360_admin());
create policy s360_vinculos_select on public.usuarios_empresas for select to authenticated using (((usuario_id = ( SELECT auth.uid() AS uid)) OR s360_admin()));
alter table public.map_avaliacoes enable row level security;
grant select,insert,update,delete on public.map_avaliacoes to anon,authenticated,service_role;
create policy s360_leitura on public.map_avaliacoes for select to authenticated using (s360_acesso(empresa_id, false));
create policy s360_alteracao on public.map_avaliacoes for update to authenticated using (s360_acesso(empresa_id, true)) with check (s360_acesso(empresa_id, true));
create policy s360_exclusao on public.map_avaliacoes for delete to authenticated using (s360_acesso(empresa_id, true));
create policy s360_insercao on public.map_avaliacoes for insert to authenticated with check (s360_acesso(empresa_id, true));
alter table public.map_perguntas enable row level security;
grant select,insert,update,delete on public.map_perguntas to anon,authenticated,service_role;
create policy s360_map_perguntas_delete on public.map_perguntas for delete to authenticated using (s360_admin());
create policy s360_map_perguntas_update on public.map_perguntas for update to authenticated using (s360_admin()) with check (s360_admin());
create policy s360_map_perguntas_select on public.map_perguntas for select to authenticated using (true);
create policy s360_map_perguntas_insert on public.map_perguntas for insert to authenticated with check (s360_admin());
alter table public.map_respostas enable row level security;
grant select,insert,update,delete on public.map_respostas to anon,authenticated,service_role;
create policy s360_alteracao on public.map_respostas for update to authenticated using (s360_acesso(empresa_id, true)) with check (s360_acesso(empresa_id, true));
create policy s360_exclusao on public.map_respostas for delete to authenticated using (s360_acesso(empresa_id, true));
create policy s360_insercao on public.map_respostas for insert to authenticated with check (s360_acesso(empresa_id, true));
create policy s360_leitura on public.map_respostas for select to authenticated using (s360_acesso(empresa_id, false));
