import { supabase } from './data';

export const receiptPageSize = 20;
const fields = 'id,criado_em,nome,forma_pagamento,total_centavos,valor_recebido_centavos,recebimento_registrado_em';

export async function loadReceipts(page, filter) {
  let list = supabase.from('pedidos').select(fields)
    .order('criado_em', { ascending: false }).order('id', { ascending: false })
    .range(page * receiptPageSize, (page + 1) * receiptPageSize);
  if (filter === 'registered') list = list.not('valor_recebido_centavos', 'is', null);
  if (filter === 'pending') list = list.is('valor_recebido_centavos', null);

  const [summary, orders] = await Promise.all([supabase.rpc('resumo_financeiro').single(), list]);
  if (summary.error) throw summary.error;
  if (orders.error) throw orders.error;
  return { summary: summary.data, rows: orders.data };
}

export async function saveReceipt(order, cents) {
  let query = supabase.from('pedidos').update({ valor_recebido_centavos: cents }).eq('id', order.id);
  query = order.valor_recebido_centavos === null
    ? query.is('valor_recebido_centavos', null)
    : query.eq('valor_recebido_centavos', order.valor_recebido_centavos);
  const { data, error } = await query.select(fields).maybeSingle();
  if (error) throw new Error('Não foi possível salvar o valor. Tente novamente.');
  if (!data) throw new Error('O valor mudou em outra sessão. Volte à lista e reabra o pedido.');
  return data;
}
