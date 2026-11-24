import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { orderCode, paymentMethods } from '../checkout/orders';
import { currencyInput, formatCurrency, parseCurrency } from '../money';
import { loadReceipts, receiptPageSize, saveReceipt } from './finance';
import { Button, Field, Notice, ink, ui } from './ui';

const filters = [['all', 'Todos'], ['registered', 'Registrados'], ['pending', 'A registrar']];
const payments = Object.fromEntries(paymentMethods);
const dates = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
});
const formatDate = timestamp => dates.format(new Date(timestamp));

function ReceiptEditor({ initial, back }) {
  const [order, setOrder] = useState(initial);
  const [amount, setAmount] = useState(() => initial.valor_recebido_centavos === null ? '' : currencyInput(initial.valor_recebido_centavos));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const saving = useRef(false);

  async function save() {
    if (saving.current) return;
    const cents = parseCurrency(amount);
    if (cents === null) {
      setNotice({ error: true, text: 'Informe um valor válido em reais, por exemplo R$ 50,00.' });
      return;
    }
    if (cents === order.valor_recebido_centavos) return;
    saving.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const updated = await saveReceipt(order, cents);
      setOrder(updated);
      setAmount(currencyInput(updated.valor_recebido_centavos));
      setNotice({ text: 'Valor recebido registrado.' });
    } catch (error) {
      setNotice({ error: true, text: error.message });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={ui.spacing}>
      <View style={[ui.row, ui.between]}>
        <View>
          <Text accessibilityRole="header" aria-level={1} style={ui.title}>Recebimento do pedido</Text>
          <Text style={ui.body}>#{orderCode(order.id)} · {order.nome}</Text>
        </View>
        <Button secondary disabled={busy} onPress={back}>Voltar ao financeiro</Button>
      </View>
      <View style={[ui.panel, ui.section, finance.editor]}>
        <Text style={ui.number}>Total do pedido · {formatCurrency(order.total_centavos) || 'Total indisponível'}</Text>
        <Text style={ui.meta}>Forma escolhida no checkout · {payments[order.forma_pagamento]}</Text>
        {order.recebimento_registrado_em && (
          <Text style={ui.meta}>Registro atualizado em {formatDate(order.recebimento_registrado_em)}</Text>
        )}
        <Field label="Valor recebido (R$)" value={amount} onChangeText={setAmount}
          keyboardType="decimal-pad" maxLength={22} editable={!busy} placeholder="0,00" onSubmitEditing={save} />
        <Notice error={notice?.error}>{notice?.text}</Notice>
        <Button busy={busy} onPress={save} style={finance.fit}
          disabled={order.valor_recebido_centavos !== null && parseCurrency(amount) === order.valor_recebido_centavos}>
          Salvar valor
        </Button>
      </View>
    </View>
  );
}

export default function AdminFinance({ wide, scrollTop }) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('all');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const data = result?.page === page && result?.filter === filter && result?.attempt === attempt ? result : null;
  const retry = () => setAttempt(value => value + 1);

  useEffect(() => {
    let current = true;
    loadReceipts(page, filter).then(receipts => {
      if (current) setResult({ page, filter, attempt, ...receipts });
    }).catch(() => {
      if (current) setResult({ page, filter, attempt, error: true });
    });
    return () => { current = false; };
  }, [page, filter, attempt]);

  if (selected) return <ReceiptEditor key={selected.id} initial={selected} back={() => {
    setSelected(null);
    retry();
    scrollTop();
  }} />;

  const summary = data?.summary;
  const metrics = summary ? [
    ['Total dos pedidos', formatCurrency(summary.total_pedidos_centavos)],
    ['Total recebido', formatCurrency(summary.total_recebido_centavos)],
    ['Pedidos com registro', String(summary.com_registro)],
    ['Pedidos a registrar', String(summary.sem_registro)]
  ] : [];
  const rows = data?.rows?.slice(0, receiptPageSize) || [];

  return (
    <View style={ui.spacing}>
      <View style={[ui.row, ui.between]}>
        <View>
          <Text accessibilityRole="header" aria-level={1} style={ui.title}>Financeiro</Text>
          <Text style={ui.body}>Totais e recebimentos por pedido</Text>
        </View>
        <Button secondary onPress={retry}>Atualizar</Button>
      </View>
      {summary && (
        <View style={[ui.panel, ui.summary, !wide && finance.summaryCompact]}>
          {metrics.map(([label, value], index) => (
            <View key={label} style={[ui.metric, wide && index < metrics.length - 1 && ui.metricBorder,
              !wide && index < 2 && finance.mainMetric]}>
              <Text style={ui.metricLabel}>{label}</Text>
              <Text style={[ui.metricValue, index === 0 && finance.total]}>{value}</Text>
            </View>
          ))}
        </View>
      )}
      {Number(summary?.sem_total) > 0 && (
        <Text style={ui.meta}>Pedidos sem valor histórico · {summary.sem_total}</Text>
      )}
      <View style={ui.row}>
        {filters.map(([key, label]) => (
          <Button key={key} secondary={filter !== key} onPress={() => { setFilter(key); setPage(0); }}>
            {label}
          </Button>
        ))}
      </View>
      {!data ? <ActivityIndicator color={ink.accent} /> : data.error ? (
        <Notice error>Não foi possível carregar os recebimentos. Tente atualizar a lista.</Notice>
      ) : (
        <View style={[ui.panel, ui.list]}>
          {wide && (
            <View style={ui.tableHeader}>
              <Text style={[ui.tableLabel, finance.order]}>Pedido</Text>
              <Text style={[ui.tableLabel, finance.method]}>Forma escolhida</Text>
              <Text style={[ui.tableLabel, finance.amount]}>Valor recebido</Text>
              <View style={finance.action} />
            </View>
          )}
          {rows.length === 0 ? <View style={ui.empty}><Text style={ui.body}>Nenhum pedido para este filtro.</Text></View> :
            rows.map((order, index) => {
              const registered = order.valor_recebido_centavos !== null;
              const amount = registered ? formatCurrency(order.valor_recebido_centavos) : 'A registrar';
              return (
                <View key={order.id} style={[ui.listItem, !wide && finance.listItemCompact, index > 0 && ui.divider]}>
                  <View style={finance.order}>
                    <Text style={ui.label}>#{orderCode(order.id)} · {order.nome}</Text>
                    <Text style={ui.meta}>{formatDate(order.criado_em)}</Text>
                    <Text style={ui.meta}>{order.total_centavos == null ? 'Total indisponível' : 'Total · ' + formatCurrency(order.total_centavos)}</Text>
                    {!wide && <Text style={ui.meta}>{payments[order.forma_pagamento]}</Text>}
                  </View>
                  {wide && <Text style={[ui.meta, finance.method]}>{payments[order.forma_pagamento]}</Text>}
                  <Text style={[registered ? ui.number : ui.meta, wide && finance.amount]}>
                    {!wide && 'Recebido · '}{amount}
                  </Text>
                  <View style={wide && finance.action}>
                    <Button secondary onPress={() => { setSelected(order); scrollTop(); }}>
                      {registered ? 'Editar valor' : 'Registrar valor'}
                    </Button>
                  </View>
                </View>
              );
            })}
        </View>
      )}
      {(page > 0 || (data?.rows?.length || 0) > receiptPageSize) && (
        <View style={[ui.row, ui.between]}>
          <Button secondary disabled={page === 0 || !data} onPress={() => { setPage(page - 1); scrollTop(); }}>Anterior</Button>
          <Text style={ui.meta}>Página {page + 1}</Text>
          <Button secondary disabled={(data?.rows?.length || 0) <= receiptPageSize}
            onPress={() => { setPage(page + 1); scrollTop(); }}>Próxima</Button>
        </View>
      )}
    </View>
  );
}

const finance = StyleSheet.create({
  summaryCompact: { flexWrap: 'wrap' },
  mainMetric: { flexBasis: '100%', borderBottomWidth: 1, borderBottomColor: ink.line },
  total: { color: ink.accent },
  order: { flex: 1, minWidth: 144, gap: 4 },
  method: { width: 112 },
  amount: { width: 112 },
  action: { width: 124, alignItems: 'flex-end' },
  listItemCompact: { flexWrap: 'wrap', columnGap: 12, rowGap: 8 },
  editor: { width: '100%', maxWidth: 520 },
  fit: { alignSelf: 'flex-start' }
});
