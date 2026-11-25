create table if not exists public.s360_contato_limites(
 ip_hash text primary key check (length(ip_hash)=64),
 inicio_janela timestamptz not null,
 tentativas integer not null default 1
);
alter table public.s360_contato_limites enable row level security;
revoke all on public.s360_contato_limites from public, anon, authenticated;
grant all on public.s360_contato_limites to service_role;

create or replace function public.s360_contato_permitir(p_hash text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then return false; end if;
 insert into public.s360_contato_limites(ip_hash,inicio_janela,tentativas)
 values (p_hash,now(),1)
 on conflict(ip_hash) do update
 set inicio_janela=case when s360_contato_limites.inicio_janela<now()-interval '1 hour'
                       then now() else s360_contato_limites.inicio_janela end,
     tentativas=case when s360_contato_limites.inicio_janela<now()-interval '1 hour'
                     then 1 else s360_contato_limites.tentativas+1 end;
 select tentativas into n from public.s360_contato_limites where ip_hash=p_hash;
 return n<=3;
end $$;
revoke all on function public.s360_contato_permitir(text) from public, anon, authenticated;
grant execute on function public.s360_contato_permitir(text) to service_role;
