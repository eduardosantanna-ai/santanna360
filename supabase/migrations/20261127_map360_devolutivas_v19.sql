-- Registro administrativo de devolutiva e PDI, uma ficha por avaliação.
-- Aplicar em ambiente de homologação depois de revisar as tabelas existentes.
create table if not exists public.map360_devolutivas (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null,
 avaliacao_id uuid not null unique,
 realizado_em date,
 status text not null default 'pendente' check (status in ('pendente','realizada','acompanhamento')),
 sintese text not null default '' check (length(sintese)<=4000),
 compromissos text not null default '' check (length(compromissos)<=4000),
 responsavel text not null default '' check (length(responsavel)<=160),
 proxima_revisao date,
 atualizado_por uuid not null,
 atualizado_em timestamptz not null default now(),
 constraint map360_devolutivas_avaliacao_empresa foreign key (avaliacao_id, empresa_id)
  references public.map_avaliacoes(id, empresa_id) on delete cascade,
 constraint map360_devolutivas_datas check (
  (status='pendente' or realizado_em is not null)
  and (proxima_revisao is null or realizado_em is null or proxima_revisao>=realizado_em)
 )
);
create index if not exists map360_devolutivas_empresa_idx on public.map360_devolutivas(empresa_id,atualizado_em desc);
alter table public.map360_devolutivas enable row level security;
revoke all on public.map360_devolutivas from public,anon,authenticated;
grant all on public.map360_devolutivas to service_role;
-- Somente Edge Function autorizada acessa as devolutivas.
