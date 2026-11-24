import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { orderCode, orderStatuses, paymentMethods } from '../checkout/orders';
import { supabase } from './data';
import { Button, Notice, ink, ui } from './ui';

const statuses = Object.fromEntries(orderStatuses);
const payments = Object.fromEntries(paymentMethods);
const perPage = 20;
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
});

function Badge({ status }) {
  return (
    <View style={[orderStyles.badge, status === 'entregue' && orderStyles.done,
      status === 'cancelado' && orderStyles.cancelled]}>
      <Text style={ui.tableLabel}>{statuses[status] || status}</Text>
    </View>
  );
}

function OrderDetail({ id, back }) {
  const [order, setOrder] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    supabase.from('pedidos').select('id,criado_em,nome,telefone,documento,forma_pagamento,cidade,bairro,rua,numero,complemento,itens,status')
      .eq('id', id).maybeSingle().then(({ data, error }) => {
        if (!current) return;
        if (error || !data) {
          setFeedback({ error: true, text: 'Não foi possível carregar o pedido.' });
          return;
        }
        setOrder(data);
        setNextStatus(data.status);
      }).catch(() => {
        if (current) setFeedback({ error: true, text: 'Não foi possível carregar o pedido.' });
      });
    return () => { current = false; };
  }, [id, attempt]);

  async function save() {
    if (busy || !order || nextStatus === order.status) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.from('pedidos')
        .update({ status: nextStatus }).eq('id', id).eq('status', order.status)
        .select('status').maybeSingle();
      if (error) throw error;
      if (!data) {
        setFeedback({ error: true, text: 'O status mudou em outra sessão. Atualize o pedido antes de tentar novamente.' });
        return;
      }
      setOrder(current => ({ ...current, status: data.status }));
      setFeedback({ text: 'Status atualizado.' });
    } catch {
      setFeedback({ error: true, text: 'Não foi possível salvar o status.' });
    } finally {
      setBusy(false);
    }
  }

  const reload = () => {
    setOrder(null);
    setFeedback(null);
    setAttempt(value => value + 1);
  };

  return (
    <View style={ui.spacing}>
      <View style={[ui.row, ui.between]}>
        <Text accessibilityRole="header" aria-level={1} style={ui.title}>Pedido #{orderCode(id)}</Text>
        <Button secondary icon={ClipboardList} disabled={busy} onPress={back}>Voltar aos pedidos</Button>
      </View>
      <Notice error={feedback?.error}>{feedback?.text}</Notice>
      {feedback?.error && <Button secondary disabled={busy} onPress={reload}>Atualizar pedido</Button>}
      {!order && !feedback ? <ActivityIndicator color={ink.accent} /> : null}
      {order && (
        <>
          <View style={[ui.panel, ui.section]}>
            <View style={[ui.row, ui.between]}>
              <Text accessibilityRole="header" aria-level={2} style={ui.subtitle}>Status do pedido</Text>
              <Badge status={order.status} />
            </View>
            <View style={ui.row}>
              {orderStatuses.map(([value, label]) => (
                <Button key={value} secondary={nextStatus !== value} disabled={busy} onPress={() => setNextStatus(value)}>
                  {label}
                </Button>
              ))}
            </View>
            <Button busy={busy} disabled={nextStatus === order.status} onPress={save} style={orderStyles.fit}>
              Salvar status
            </Button>
          </View>
          <View style={[ui.panel, ui.section]}>
            <Text accessibilityRole="header" aria-level={2} style={ui.subtitle}>Cliente e entrega</Text>
            <View style={orderStyles.detailGrid}>
              <Info label="Nome">{order.nome}</Info>
              <Info label="Telefone">{order.telefone}</Info>
              <Info label="CPF ou CNPJ">{order.documento}</Info>
              <Info label="Forma de pagamento">{payments[order.forma_pagamento]}</Info>
              <Info label="Endereço">{order.rua}, {order.numero} · {order.bairro}, {order.cidade}{order.complemento ? ' · ' + order.complemento : ''}</Info>
              <Info label="Recebido em">{dateFormat.format(new Date(order.criado_em))}</Info>
            </View>
          </View>
          <View style={[ui.panel, ui.section]}>
            <Text accessibilityRole="header" aria-level={2} style={ui.subtitle}>Itens do pedido</Text>
            {order.itens.map(item => (
              <View key={item.produto_id} style={[ui.row, ui.between]}>
                <Text style={ui.body}>{item.nome}</Text>
                <Text style={ui.number}>×{item.quantidade}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function Info({ label, children }) {
  return <View style={orderStyles.detailField}><Text style={ui.label}>{label}</Text><Text selectable style={ui.body}>{children}</Text></View>;
}

export default function AdminOrders({ wide, scrollTop }) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const data = result?.page === page && result?.filter === filter && result?.attempt === attempt ? result : null;
  const retry = () => setAttempt(value => value + 1);

  useEffect(() => {
    let current = true;
    let query = supabase.from('pedidos').select('id,criado_em,nome,forma_pagamento,status')
      .order('criado_em', { ascending: false }).order('id', { ascending: false })
      .range(page * perPage, page * perPage + perPage);
    if (filter) query = query.eq('status', filter);
    query.then(({ data, error }) => {
      if (current) setResult({ page, filter, attempt, rows: data || [], error });
    }).catch(() => {
      if (current) setResult({ page, filter, attempt, rows: [], error: true });
    });
    return () => { current = false; };
  }, [page, filter, attempt]);

  if (selected) return <OrderDetail key={selected} id={selected} back={() => {
    setSelected(null);
    retry();
    scrollTop();
  }} />;

  const rows = data?.rows.slice(0, perPage) || [];
  return (
    <View style={ui.spacing}>
      <View style={[ui.row, ui.between]}>
        <Text accessibilityRole="header" aria-level={1} style={ui.title}>Pedidos</Text>
        <Button secondary onPress={retry}>Atualizar lista</Button>
      </View>
      <View style={ui.row}>
        {[['', 'Todos'], ...orderStatuses].map(([value, label]) => (
          <Button key={value} secondary={filter !== value} onPress={() => { setFilter(value); setPage(0); }}>
            {label}
          </Button>
        ))}
      </View>
      {!data ? <ActivityIndicator color={ink.accent} /> : data.error ? (
        <Notice error>Não foi possível carregar os pedidos. Tente atualizar a lista.</Notice>
      ) : (
        <View style={[ui.panel, ui.list]}>
          {wide && (
            <View style={ui.tableHeader}>
              <Text style={[ui.tableLabel, orderStyles.main]}>Pedido</Text>
              <Text style={[ui.tableLabel, orderStyles.date]}>Recebido em</Text>
              <Text style={[ui.tableLabel, orderStyles.payment]}>Pagamento</Text>
              <Text style={[ui.tableLabel, orderStyles.status]}>Status</Text>
              <View style={ui.actionCol} />
            </View>
          )}
          {!rows.length ? <View style={ui.empty}><Text style={ui.body}>Nenhum pedido para este filtro.</Text></View> : rows.map((order, index) => (
            <Pressable key={order.id} accessibilityRole="button"
              accessibilityLabel={'Abrir pedido ' + orderCode(order.id) + ' de ' + order.nome}
              onPress={() => { setSelected(order.id); scrollTop(); }}
              style={({ pressed, hovered }) => [ui.listItem, index > 0 && ui.divider, (pressed || hovered) && ui.navHover]}>
              <View style={[orderStyles.main, ui.listText]}>
                <Text style={ui.label}>#{orderCode(order.id)}</Text>
                <Text numberOfLines={1} style={ui.meta}>{order.nome}</Text>
                {!wide && <Text style={ui.meta}>{dateFormat.format(new Date(order.criado_em))} · {payments[order.forma_pagamento]}</Text>}
              </View>
              {wide && <Text style={[ui.meta, orderStyles.date]}>{dateFormat.format(new Date(order.criado_em))}</Text>}
              {wide && <Text style={[ui.meta, orderStyles.payment]}>{payments[order.forma_pagamento]}</Text>}
              <View style={wide && orderStyles.status}><Badge status={order.status} /></View>
              {wide && <Text style={[ui.label, ui.actionCol]}>Ver pedido</Text>}
            </Pressable>
          ))}
        </View>
      )}
      {(page > 0 || data?.rows.length > perPage) && (
        <View style={[ui.row, ui.between]}>
          <Button secondary disabled={!page || !data} onPress={() => { setPage(page - 1); scrollTop(); }}>Anterior</Button>
          <Text style={ui.meta}>Página {page + 1}</Text>
          <Button secondary disabled={!data || data.rows.length <= perPage}
            onPress={() => { setPage(page + 1); scrollTop(); }}>Próxima</Button>
        </View>
      )}
    </View>
  );
}

const orderStyles = StyleSheet.create({
  main: { flex: 1, minWidth: 0 },
  date: { width: 126 },
  payment: { width: 92 },
  status: { width: 134 },
  badge: { alignSelf: 'flex-start', backgroundColor: ink.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  done: { backgroundColor: '#e2f5e9' },
  cancelled: { backgroundColor: '#fce8ec' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  detailField: { minWidth: 148, flexGrow: 1, flexBasis: '30%', gap: 4 },
  fit: { alignSelf: 'flex-start' }
});
