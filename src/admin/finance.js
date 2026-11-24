import { supabase } from './data';

const maximumCents = 2147483647n;
export const receiptPageSize = 20;
const fields = 'id,criado_em,nome,forma_pagamento,valor_recebido_centavos,recebimento_registrado_em';

export function parseCurrency(value) {
  const input = value.trim().replace(/^R\$\s*/, '');
  const brazilian = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/;
  const decimal = /^\d+\.\d{1,2}$/;
  if (!brazilian.test(input) && !decimal.test(input)) return null;

  const [whole, fractional = ''] = brazilian.test(input)
    ? input.replace(/\./g, '').split(',')
    : input.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fractional.padEnd(2, '0'));
  return cents <= maximumCents ? Number(cents) : null;
}

export function formatCurrency(cents) {
  return 'R$ ' + currencyInput(cents);
}

export function currencyInput(cents) {
  const digits = String(cents).padStart(3, '0');
  return digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + digits.slice(-2);
}

export async function loadReceipts(page, filter) {
  let list = supabase.from('pedidos').select(fields)
    .order('criado_em', { ascending: false }).order('id', { ascending: false })
    .range(page * receiptPageSize, (page + 1) * receiptPageSize);
  if (filter === 'registered') list = list.not('valor_recebido_centavos', 'is', null);
  if (filter === 'pending') list = list.is('valor_recebido_centavos', null);

  const [summary, orders] = await Promise.all([supabase.rpc('resumo_recebimentos').single(), list]);
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
