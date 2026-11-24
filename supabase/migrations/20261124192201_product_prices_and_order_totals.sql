alter table public.produtos
  add column preco_centavos integer check (preco_centavos >= 0),
  add column desconto_percentual_bp integer check (desconto_percentual_bp between 1 and 10000),
  add column desconto_fixo_centavos integer check (desconto_fixo_centavos > 0),
  add column preco_final_centavos integer generated always as (
    preco_centavos - coalesce(desconto_fixo_centavos,
      ((preco_centavos::bigint * desconto_percentual_bp + 5000) / 10000)::integer, 0)
  ) stored,
  add constraint produtos_desconto_valido check (
    num_nonnulls(desconto_percentual_bp, desconto_fixo_centavos) = 0
    or (num_nonnulls(desconto_percentual_bp, desconto_fixo_centavos) = 1
      and preco_centavos is not null and preco_centavos > 0
      and (desconto_fixo_centavos is null or desconto_fixo_centavos <= preco_centavos))
  );

comment on column public.produtos.desconto_percentual_bp is
  'Centésimos de ponto percentual: 1250 representa 12,50%.';

alter table public.pedidos
  add column total_centavos bigint check (total_centavos between 0 and 9007199254740991);

create or replace function joggelo_checkout.finalizar_pedido(p_chave uuid, p_cliente jsonb, p_itens jsonb)
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
  v_sem_preco integer;
  v_preco_alterado integer;
  v_valor numeric;
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
    'produto_id', p.id, 'nome', p.nome, 'quantidade', item.quantidade,
    'preco_original_centavos', p.preco_centavos, 'preco_unitario_centavos', p.preco_final_centavos,
    'total_centavos', p.preco_final_centavos::bigint * item.quantidade
  ) order by p.ordem, p.id),
    count(*), count(distinct p.id),
    count(*) filter (where p.preco_final_centavos is null),
    count(*) filter (where p.preco_final_centavos is distinct from item.preco_unitario_centavos),
    sum(p.preco_final_centavos::numeric * item.quantidade)
    into v_itens, v_total, v_distintos, v_sem_preco, v_preco_alterado, v_valor
    from jsonb_to_recordset(p_itens) as item(produto_id uuid, quantidade integer, preco_unitario_centavos integer)
    join public.produtos p on p.id = item.produto_id and p.ativo
    where item.quantidade > 0;

  if v_total <> jsonb_array_length(p_itens) or v_total <> v_distintos then
    raise exception 'ITENS_INDISPONIVEIS';
  end if;

  if v_sem_preco > 0 then
    raise exception 'ITENS_SEM_PRECO';
  end if;
  if v_preco_alterado > 0 then
    raise exception 'PRECO_ALTERADO';
  end if;
  if v_valor > 9007199254740991 then
    raise exception 'TOTAL_INVALIDO';
  end if;

  insert into public.pedidos (
    id, nome, telefone, documento, forma_pagamento, cidade, bairro, rua, numero, complemento, itens, total_centavos
  ) values (
    p_chave, v_nome, v_telefone, v_documento, v_pagamento, v_cidade, v_bairro, v_rua, v_numero, v_complemento, v_itens, v_valor
  ) on conflict (id) do nothing;

  return p_chave;
end;
$$;

create function public.resumo_financeiro()
returns table (total_pedidos_centavos text, total_recebido_centavos text, com_registro bigint, sem_registro bigint, sem_total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(total_centavos), 0)::text,
    coalesce(sum(valor_recebido_centavos), 0)::text,
    count(valor_recebido_centavos),
    count(*) filter (where valor_recebido_centavos is null),
    count(*) filter (where total_centavos is null)
  from public.pedidos;
$$;

revoke all on function public.resumo_financeiro() from public, anon;
grant execute on function public.resumo_financeiro() to authenticated;
