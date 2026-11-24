create schema joggelo_checkout;
revoke all on schema joggelo_checkout from public;
grant usage on schema joggelo_checkout to anon, authenticated;

create table public.pedidos (
  id uuid primary key,
  criado_em timestamptz not null default now(),
  nome text not null,
  telefone text not null,
  documento text not null,
  forma_pagamento text not null check (forma_pagamento in ('credito', 'debito', 'pix')),
  cidade text not null,
  bairro text not null,
  rua text not null,
  numero text not null,
  complemento text,
  itens jsonb not null check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) > 0),
  status text not null default 'recebido'
    check (status in ('recebido', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado'))
);

create index pedidos_criado_em_idx on public.pedidos (criado_em desc, id desc);
alter table public.pedidos enable row level security;
revoke all on table public.pedidos from public, anon, authenticated;
grant select, update (status) on table public.pedidos to authenticated;

create policy pedidos_admin_leitura on public.pedidos for select to authenticated
  using ((select joggelo_private.is_catalog_admin()));
create policy pedidos_admin_status on public.pedidos for update to authenticated
  using ((select joggelo_private.is_catalog_admin()))
  with check ((select joggelo_private.is_catalog_admin()));

create function joggelo_checkout.finalizar_pedido(p_chave uuid, p_cliente jsonb, p_itens jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := btrim(p_cliente->>'nome');
  v_telefone text := regexp_replace(p_cliente->>'telefone', '[^0-9]', '', 'g');
  v_documento text := regexp_replace(upper(p_cliente->>'documento'), '[./[:space:]-]', '', 'g');
  v_pagamento text := p_cliente->>'forma_pagamento';
  v_cidade text := btrim(p_cliente->>'cidade');
  v_bairro text := btrim(p_cliente->>'bairro');
  v_rua text := btrim(p_cliente->>'rua');
  v_numero text := btrim(p_cliente->>'numero');
  v_complemento text := nullif(btrim(p_cliente->>'complemento'), '');
  v_itens jsonb;
  v_total integer;
  v_distintos integer;
begin
  if p_chave is null then
    raise exception 'PEDIDO_INVALIDO';
  end if;

  if exists (select from public.pedidos where id = p_chave) then
    return p_chave;
  end if;

  if not coalesce(
    length(v_nome) between 1 and 160
    and v_telefone ~ '^(55)?[1-9][0-9]{9,10}$'
    and v_documento ~ '^([0-9]{11}|[A-Z0-9]{12}[0-9]{2})$'
    and v_pagamento in ('credito', 'debito', 'pix')
    and length(v_cidade) between 1 and 120
    and length(v_bairro) between 1 and 120
    and length(v_rua) between 1 and 180
    and length(v_numero) between 1 and 30
    and coalesce(length(v_complemento), 0) <= 180,
    false
  ) then
    raise exception 'DADOS_INVALIDOS';
  end if;

  if jsonb_typeof(p_itens) is distinct from 'array' then
    raise exception 'CARRINHO_INVALIDO';
  end if;
  if jsonb_array_length(p_itens) = 0 then
    raise exception 'CARRINHO_INVALIDO';
  end if;

  select jsonb_agg(jsonb_build_object(
    'produto_id', p.id, 'nome', p.nome, 'quantidade', item.quantidade
  ) order by p.ordem, p.id), count(*), count(distinct p.id)
    into v_itens, v_total, v_distintos
    from jsonb_to_recordset(p_itens) as item(produto_id uuid, quantidade integer)
    join public.produtos p on p.id = item.produto_id and p.ativo
    where item.quantidade > 0;

  if v_total <> jsonb_array_length(p_itens) or v_total <> v_distintos then
    raise exception 'ITENS_INDISPONIVEIS';
  end if;

  insert into public.pedidos (
    id, nome, telefone, documento, forma_pagamento, cidade, bairro, rua, numero, complemento, itens
  ) values (
    p_chave, v_nome, v_telefone, v_documento, v_pagamento, v_cidade, v_bairro, v_rua, v_numero, v_complemento, v_itens
  ) on conflict (id) do nothing;

  return p_chave;
end;
$$;

revoke all on function joggelo_checkout.finalizar_pedido(uuid, jsonb, jsonb) from public;
grant execute on function joggelo_checkout.finalizar_pedido(uuid, jsonb, jsonb) to anon, authenticated;

create function public.finalizar_pedido(p_chave uuid, p_cliente jsonb, p_itens jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select joggelo_checkout.finalizar_pedido(p_chave, p_cliente, p_itens);
$$;

revoke all on function public.finalizar_pedido(uuid, jsonb, jsonb) from public;
grant execute on function public.finalizar_pedido(uuid, jsonb, jsonb) to anon, authenticated;
