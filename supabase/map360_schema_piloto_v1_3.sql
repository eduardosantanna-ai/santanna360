-- SANT'ANNA 360 / MAP 360° — esquema piloto v1.3
-- EXECUÇÃO MANUAL após revisão. Não executado automaticamente.
-- Não guardar service_role no front-end. As políticas usam auth.uid().
create extension if not exists pgcrypto;

create table if not exists public.map360_empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 2 and 180),
  criado_em timestamptz not null default now()
);

create table if not exists public.map360_acessos (
  empresa_id uuid not null references public.map360_empresas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  papel text not null check (papel in ('admin','leitura')),
  criado_em timestamptz not null default now(),
  primary key (empresa_id,usuario_id)
);

create table if not exists public.map360_participantes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.map360_empresas(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 2 and 180),
  email text,
  cargo text,
  consentimento_registrado boolean not null default false check (consentimento_registrado = false),
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id)
);
create index if not exists map360_participantes_empresa_idx on public.map360_participantes(empresa_id);

create table if not exists public.map360_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.map360_empresas(id) on delete cascade,
  participante_id uuid not null references public.map360_participantes(id) on delete cascade,
  versao_instrumento text not null default '1.2-piloto',
  status text not null default 'rascunho' check (status in ('rascunho','em_andamento','concluida','cancelada')),
  respostas jsonb,
  pontuacoes jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- Nesta fase não armazenar respostas individuais nem interpretações.
  constraint map360_piloto_sem_respostas check (respostas is null and pontuacoes is null),
  constraint map360_piloto_somente_rascunho check (status in ('rascunho','cancelada'))
);
create index if not exists map360_avaliacoes_empresa_idx on public.map360_avaliacoes(empresa_id);

-- Participantes não podem ser vinculados a empresa diferente da avaliação.
create unique index if not exists map360_participante_empresa_unico on public.map360_participantes(id,empresa_id);
alter table public.map360_avaliacoes drop constraint if exists map360_avaliacoes_participante_empresa_fk;
alter table public.map360_avaliacoes add constraint map360_avaliacoes_participante_empresa_fk
  foreign key (participante_id,empresa_id) references public.map360_participantes(id,empresa_id);

alter table public.map360_empresas enable row level security;
alter table public.map360_acessos enable row level security;
alter table public.map360_participantes enable row level security;
alter table public.map360_avaliacoes enable row level security;

-- Função com SECURITY DEFINER para verificar associação sem recursão nas políticas.
-- schema public existente recebe grants padrão: limitar explicitamente execução.
create or replace function public.map360_tem_acesso(p_empresa uuid, p_admin boolean default false)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.map360_acessos a
    where a.empresa_id = p_empresa and a.usuario_id = (select auth.uid())
    and (not p_admin or a.papel = 'admin')
  );
$$;
revoke all on function public.map360_tem_acesso(uuid,boolean) from public;
grant execute on function public.map360_tem_acesso(uuid,boolean) to authenticated;

drop policy if exists map360_empresas_ler on public.map360_empresas;
create policy map360_empresas_ler on public.map360_empresas
for select to authenticated using (public.map360_tem_acesso(id,false));
drop policy if exists map360_acessos_ler on public.map360_acessos;
create policy map360_acessos_ler on public.map360_acessos
for select to authenticated using (usuario_id = (select auth.uid()));
drop policy if exists map360_participantes_ler on public.map360_participantes;
create policy map360_participantes_ler on public.map360_participantes
for select to authenticated using (public.map360_tem_acesso(empresa_id,false));
drop policy if exists map360_participantes_criar on public.map360_participantes;
create policy map360_participantes_criar on public.map360_participantes
for insert to authenticated with check (public.map360_tem_acesso(empresa_id,true) and criado_por = (select auth.uid()));
drop policy if exists map360_participantes_editar on public.map360_participantes;
create policy map360_participantes_editar on public.map360_participantes
for update to authenticated using (public.map360_tem_acesso(empresa_id,true))
with check (public.map360_tem_acesso(empresa_id,true));
drop policy if exists map360_avaliacoes_ler on public.map360_avaliacoes;
create policy map360_avaliacoes_ler on public.map360_avaliacoes
for select to authenticated using (public.map360_tem_acesso(empresa_id,false));
drop policy if exists map360_avaliacoes_criar on public.map360_avaliacoes;
create policy map360_avaliacoes_criar on public.map360_avaliacoes
for insert to authenticated with check (public.map360_tem_acesso(empresa_id,true));
drop policy if exists map360_avaliacoes_editar on public.map360_avaliacoes;
create policy map360_avaliacoes_editar on public.map360_avaliacoes
for update to authenticated using (public.map360_tem_acesso(empresa_id,true))
with check (public.map360_tem_acesso(empresa_id,true));

-- Endurecimento: a API não deve dar acesso de escrita em empresas, vínculos ou função de autorização.
-- Cadastros iniciais feitos apenas por operador autorizado, no SQL Editor, com IDs conferidos.
revoke insert, update, delete on public.map360_empresas from anon, authenticated;
revoke insert, update, delete on public.map360_acessos from anon, authenticated;
revoke all on public.map360_empresas, public.map360_acessos, public.map360_participantes, public.map360_avaliacoes from anon;
grant select on public.map360_empresas, public.map360_acessos to authenticated;
grant select, insert, update on public.map360_participantes, public.map360_avaliacoes to authenticated;

-- Bootstrap, usando SOMENTE o painel SQL do Supabase após consultar IDs reais:
-- insert into public.map360_empresas(nome) values ('EMPRESA DE TESTE') returning id;
-- insert into public.map360_acessos(empresa_id,usuario_id,papel)
-- values ('UUID_DA_EMPRESA','UUID_DO_USUARIO_AUTH','admin');
-- NÃO execute as duas instruções de exemplo com UUIDs fictícios.
