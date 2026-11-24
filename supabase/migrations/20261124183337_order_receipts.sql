alter table public.pedidos
  add column valor_recebido_centavos integer check (valor_recebido_centavos >= 0),
  add column recebimento_registrado_em timestamptz,
  add constraint pedidos_recebimento_com_data
    check ((valor_recebido_centavos is null) = (recebimento_registrado_em is null));

grant update (valor_recebido_centavos) on table public.pedidos to authenticated;

create function joggelo_private.registrar_data_recebimento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.valor_recebido_centavos is distinct from old.valor_recebido_centavos then
    new.recebimento_registrado_em := case
      when new.valor_recebido_centavos is not null then now()
      else null
    end;
  end if;
  return new;
end;
$$;

revoke all on function joggelo_private.registrar_data_recebimento() from public, anon, authenticated;

create trigger pedidos_registrar_data_recebimento
before update of valor_recebido_centavos on public.pedidos
for each row execute function joggelo_private.registrar_data_recebimento();

create function public.resumo_recebimentos()
returns table (total_centavos text, com_registro bigint, sem_registro bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(valor_recebido_centavos), 0)::text,
    count(valor_recebido_centavos),
    count(*) filter (where valor_recebido_centavos is null)
  from public.pedidos;
$$;

revoke all on function public.resumo_recebimentos() from public, anon;
grant execute on function public.resumo_recebimentos() to authenticated;
