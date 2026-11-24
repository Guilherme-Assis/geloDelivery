import { publishableKey, supabaseUrl } from '../catalog';

export const paymentMethods = [
  ['credito', 'Crédito'],
  ['debito', 'Débito'],
  ['pix', 'PIX']
];

export const orderStatuses = [
  ['recebido', 'Recebido'],
  ['em_preparo', 'Em preparo'],
  ['saiu_para_entrega', 'Saiu para entrega'],
  ['entregue', 'Entregue'],
  ['cancelado', 'Cancelado']
];

export function orderCode(id) {
  return id.slice(0, 8).toUpperCase();
}

export async function submitOrder(id, client, items) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let body;
  try {
    const response = await fetch(supabaseUrl + '/rest/v1/rpc/finalizar_pedido', {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        p_chave: id,
        p_cliente: client,
        p_itens: items.map(item => ({ produto_id: item.id, quantidade: item.quantity }))
      })
    });
    body = await response.json();
    if (response.ok && body === id) return id;
  } catch {
    // The server may have committed before the connection closed.
  } finally {
    clearTimeout(timeout);
  }
  if (body?.message === 'ITENS_INDISPONIVEIS') {
    throw new Error('Algum sabor do carrinho ficou indisponível. Volte ao carrinho para revisar.');
  }
  if (body?.message === 'DADOS_INVALIDOS') {
    throw new Error('Confira os dados de contato e entrega antes de enviar.');
  }
  throw new Error('Não foi possível confirmar o envio. Tente novamente nesta tela para evitar duplicidade.');
}
