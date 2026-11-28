alter table public.map_convites
  add column revogado_em timestamptz,
  add column contato_descartado_em timestamptz,
  drop constraint map_convites_contact,
  add constraint map_convites_contact check (
    (contato_descartado_em is null and
      ((email is not null and trim(email)<>'') or (telefone is not null and trim(telefone)<>'')))
    or (contato_descartado_em is not null and email is null and telefone is null)
  );

create function public.map360_registrar_revogacao() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.estado = 'revogado' and old.estado <> 'revogado' then
    new.revogado_em := now();
  end if;
  return new;
end $$;

revoke all on function public.map360_registrar_revogacao() from public, anon, authenticated;
create trigger map360_registrar_revogacao
before update of estado on public.map_convites
for each row execute function public.map360_registrar_revogacao();

alter table public.map360_devolutivas
  add column encerrado_em date,
  add constraint map360_devolutivas_encerramento check (
    encerrado_em is null or
    (status = 'realizada' and realizado_em is not null and encerrado_em >= realizado_em)
  );

create function public.map360_aplicar_retencao()
returns table (contatos_descartados integer, devolutivas_excluidas integer, avaliacoes_excluidas integer)
language plpgsql security invoker set search_path = '' as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  limite_anual timestamptz :=
    ((now() at time zone 'America/Sao_Paulo') - interval '12 months') at time zone 'America/Sao_Paulo';
begin
  update public.map_convites c
  set email = null, telefone = null, contato_descartado_em = now(),
      participante_nome = case when c.estado = 'concluido' then c.participante_nome else 'Participante removido' end
  where c.contato_descartado_em is null
    and case c.estado
      when 'concluido' then c.concluido_em
      when 'revogado' then coalesce(c.revogado_em, c.expira_em)
      else c.expira_em
    end <= now() - interval '30 days';
  get diagnostics contatos_descartados = row_count;

  delete from public.map360_devolutivas d
  where d.encerrado_em <= (hoje - interval '12 months')::date;
  get diagnostics devolutivas_excluidas = row_count;

  -- A ficha depende da avaliação. Preserve ambas até o fim da retenção do PDI.
  -- Avaliações anteriores ao fluxo de convites ficam fora desta rotina.
  delete from public.map_avaliacoes a
  where exists (
    select 1 from public.map_convites c
    where c.avaliacao_id = a.id and c.empresa_id = a.empresa_id
      and c.estado = 'concluido' and c.concluido_em <= limite_anual
  ) and not exists (
    select 1 from public.map360_devolutivas d where d.avaliacao_id = a.id
  );
  get diagnostics avaliacoes_excluidas = row_count;

  return next;
end $$;

revoke all on function public.map360_aplicar_retencao() from public, anon, authenticated;
grant execute on function public.map360_aplicar_retencao() to service_role;
