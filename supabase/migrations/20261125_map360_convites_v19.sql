-- MAP 360° v1.9 — convites individuais (aplicar somente após revisão e teste em homologação).
create extension if not exists pgcrypto;

create table if not exists public.map_convites (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null,
 criado_por uuid not null,
 participante_nome text not null check (length(trim(participante_nome)) between 1 and 120),
 email text,
 telefone text,
 finalidade text not null check (finalidade in ('desenvolvimento','autoconhecimento','formacao')),
 token_hash text not null unique check (length(token_hash)=64),
 expira_em timestamptz not null,
 estado text not null default 'pendente' check (estado in ('pendente','concluido','revogado')),
 avaliacao_id uuid,
 criado_em timestamptz not null default now(),
 concluido_em timestamptz,
 constraint map_convites_contact check ((email is not null and trim(email)<>'') or (telefone is not null and trim(telefone)<>'')),
 constraint map_convites_expiration check (expira_em > criado_em)
);
create index if not exists map_convites_empresa_criado_idx on public.map_convites(empresa_id, criado_em desc);
create index if not exists map_convites_expira_idx on public.map_convites(expira_em) where estado='pendente';
alter table public.map_convites enable row level security;
-- Nenhum acesso direto à tabela por anon/authenticated. Somente backend seguro.
revoke all on public.map_convites from anon, authenticated;
grant all on public.map_convites to service_role;

-- Inserção transacional da avaliação e das 32 respostas. Executável somente pela função Edge autenticada com service_role.
create or replace function public.map360_concluir_convite(
  p_token_hash text, p_respostas jsonb, p_confirmacao_privacidade boolean
) returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_convite public.map_convites%rowtype;
  v_avaliacao uuid;
  v_count int;
begin
  if p_confirmacao_privacidade is distinct from true then
    raise exception 'É necessário confirmar a leitura do aviso de privacidade';
  end if;
  if p_token_hash is null or length(p_token_hash)<>64 then
    raise exception 'Convite inválido';
  end if;
  select * into v_convite from public.map_convites
    where token_hash=p_token_hash for update;
  if not found or v_convite.estado<>'pendente' or v_convite.expira_em<=now() then
    raise exception 'Convite indisponível ou expirado';
  end if;
  if jsonb_typeof(p_respostas)<>'array' or jsonb_array_length(p_respostas)<>32 then
    raise exception 'A avaliação exige exatamente 32 respostas';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_respostas) a
    where jsonb_typeof(a)<>'object'
      or not (a ? 'pergunta_id' and a ? 'nota')
      or a->>'nota' not in ('1','2','3','4','5')
      or not ((a->>'pergunta_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  ) then raise exception 'Há respostas inválidas'; end if;
  select count(distinct a->>'pergunta_id') into v_count from jsonb_array_elements(p_respostas) a;
  if v_count<>32 then raise exception 'Perguntas duplicadas'; end if;
  select count(*) into v_count
  from public.map_perguntas q
  join jsonb_array_elements(p_respostas) a on q.id::text=a->>'pergunta_id'
  where q.ativa=true;
  if v_count<>32 then raise exception 'Questionário incompatível com perguntas ativas'; end if;
  select count(*) into v_count from public.map_perguntas where ativa=true;
  if v_count<>32 then raise exception 'O conjunto de perguntas ativas não é exatamente 32'; end if;

  insert into public.map_avaliacoes
    (empresa_id, participante_nome, finalidade, consentimento_registrado, criado_por)
  values (v_convite.empresa_id, v_convite.participante_nome, v_convite.finalidade, true, v_convite.criado_por)
  returning id into v_avaliacao;

  insert into public.map_respostas(empresa_id, avaliacao_id, pergunta_id, nota)
  select v_convite.empresa_id, v_avaliacao, (a->>'pergunta_id')::uuid, (a->>'nota')::int
  from jsonb_array_elements(p_respostas) a;

  update public.map_convites set estado='concluido', concluido_em=now(), avaliacao_id=v_avaliacao
  where id=v_convite.id;
  return v_avaliacao;
end $$;
revoke all on function public.map360_concluir_convite(text,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.map360_concluir_convite(text,jsonb,boolean) to service_role;
comment on function public.map360_concluir_convite(text,jsonb,boolean)
is 'Consome convite único e grava avaliação/respostas em uma transação; somente service_role deve chamar.';

-- Limite básico de solicitações por origem/ação, adicional a proteções de borda.
create table if not exists public.map360_convite_limites (
 chave text primary key check (length(chave)=64),
 janela_inicio timestamptz not null default now(),
 tentativas integer not null default 1 check (tentativas>=1)
);
alter table public.map360_convite_limites enable row level security;
revoke all on public.map360_convite_limites from public, anon, authenticated;
grant all on public.map360_convite_limites to service_role;

create or replace function public.map360_convite_permitir(
 p_chave text, p_limite integer
) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_tentativas integer;
begin
 if p_chave is null or p_chave !~ '^[0-9a-f]{64}$' or p_limite not between 1 and 100 then
   return false;
 end if;
 insert into public.map360_convite_limites(chave,janela_inicio,tentativas)
 values(p_chave,now(),1)
 on conflict(chave) do update
 set janela_inicio=case
   when map360_convite_limites.janela_inicio < now()-interval '1 hour'
   then now() else map360_convite_limites.janela_inicio end,
 tentativas=case
   when map360_convite_limites.janela_inicio < now()-interval '1 hour'
   then 1 else map360_convite_limites.tentativas+1 end
 returning tentativas into v_tentativas;
 return v_tentativas<=p_limite;
end $$;
revoke all on function public.map360_convite_permitir(text,integer) from public,anon,authenticated;
grant execute on function public.map360_convite_permitir(text,integer) to service_role;
