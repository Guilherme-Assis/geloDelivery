import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Link from '../Link';
import { palette, styles } from '../styles';
import { cartHref } from '../useRoute';
import { orderCode, paymentMethods, submitOrder } from './orders';

const empty = {
  nome: '', telefone: '', documento: '', forma_pagamento: '',
  cidade: '', bairro: '', rua: '', numero: '', complemento: ''
};
const web = Platform.OS === 'web';
const status = web ? { role: 'status' } : { accessibilityLiveRegion: 'polite' };

function Field({ name, label, draft, change, ...props }) {
  return (
    <View style={view.field}>
      <Text style={view.label}>{label}</Text>
      <TextInput accessibilityLabel={label} value={draft[name]} onChangeText={value => change(name, value)}
        placeholderTextColor={palette.muted} style={view.input} {...props} />
    </View>
  );
}

export default function CheckoutScreen({ cart, flavors, wrap, wide, goCart, goCatalog }) {
  const [draft, setDraft] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const request = useRef(null);
  const sending = useRef(false);
  const names = new Map(flavors.map(flavor => [flavor.productId, flavor.name]));
  const change = (field, value) => setDraft(current => ({ ...current, [field]: value }));

  async function send() {
    const selected = request.current?.items || cart.items;
    if (sending.current || !selected?.length) return;
    const client = Object.fromEntries(Object.entries(draft).map(([field, value]) => [field, value.trim()]));
    client.telefone = client.telefone.replace(/\D/g, '');
    client.documento = client.documento.toUpperCase().replace(/[./\s-]/g, '');
    if (!client.nome || !client.cidade || !client.bairro || !client.rua || !client.numero) {
      setError('Preencha o nome, a cidade, o bairro, a rua e o número.');
      return;
    }
    if (!/^(55)?[1-9][0-9]{9,10}$/.test(client.telefone)) {
      setError('Informe um telefone brasileiro com DDD.');
      return;
    }
    if (!/^(?:[0-9]{11}|[A-Z0-9]{12}[0-9]{2})$/.test(client.documento)) {
      setError('Informe um CPF ou CNPJ com o formato válido.');
      return;
    }
    if (!client.forma_pagamento) {
      setError('Selecione a forma de pagamento.');
      return;
    }

    sending.current = true;
    setBusy(true);
    setError('');
    try {
      if (!request.current) request.current = { id: randomUUID(), items: selected };
      const { id, items } = request.current;
      const code = await submitOrder(id, client, items);
      cart.complete(items);
      setReceipt(code);
      setDraft(empty);
    } catch (failure) {
      setError(failure.message || 'Não foi possível enviar o pedido.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <View style={[styles.detail, wrap, view.page]}>
        <Text accessibilityRole="header" aria-level={1} style={styles.sectionHeading}>Pedido recebido</Text>
        <View style={[view.panel, view.receipt]}>
          <Text {...status} style={view.title}>Pedido #{orderCode(receipt)}</Text>
          <Text style={styles.bodyText}>Guarde este código para consultar o pedido com a JogGelo.</Text>
          <Link href="./#sabores" action={goCatalog} style={styles.primary}><Text style={styles.primaryText}>Voltar ao catálogo</Text></Link>
        </View>
      </View>
    );
  }

  const fields = { draft, change, editable: !busy };
  const items = request.current?.items || cart.items;
  return (
    <View style={[styles.detail, wrap, view.page]}>
      <Link href={cartHref} action={goCart} style={view.back}><Text style={styles.actionText}>Voltar ao carrinho</Text></Link>
      <Text accessibilityRole="header" aria-level={1} style={[styles.sectionHeading, !wide && styles.sectionHeadingCompact]}>Finalizar pedido</Text>
      {items === null ? <Text {...status} style={styles.bodyText}>Carregando carrinho…</Text> : !items.length ? (
        <View style={view.panel}>
          <Text style={styles.bodyText}>Adicione sabores ao carrinho para fazer um pedido.</Text>
          <Link href="./#sabores" action={goCatalog} style={styles.primary}><Text style={styles.primaryText}>Ver sabores</Text></Link>
        </View>
      ) : (
        <View style={[view.layout, wide && view.layoutWide]}>
          <View style={view.form}>
            <View style={view.panel}>
              <Text accessibilityRole="header" aria-level={2} style={view.title}>Dados do cliente</Text>
              <Field {...fields} name="nome" label="Nome" autoComplete="name" maxLength={160} />
              <View style={[view.fields, wide && view.fieldsWide]}>
                <Field {...fields} name="telefone" label="Telefone com DDD" keyboardType="phone-pad" autoComplete="tel" maxLength={24} />
                <Field {...fields} name="documento" label="CPF ou CNPJ" autoCapitalize="characters" autoCorrect={false} maxLength={24} />
              </View>
            </View>
            <View style={view.panel}>
              <Text accessibilityRole="header" aria-level={2} style={view.title}>Endereço de entrega</Text>
              <View style={[view.fields, wide && view.fieldsWide]}>
                <Field {...fields} name="cidade" label="Cidade" autoComplete="address-level2" maxLength={120} />
                <Field {...fields} name="bairro" label="Bairro" maxLength={120} />
              </View>
              <View style={[view.fields, wide && view.fieldsWide]}>
                <Field {...fields} name="rua" label="Rua" autoComplete="address-line1" maxLength={180} />
                <Field {...fields} name="numero" label="Número" maxLength={30} />
              </View>
              <Field {...fields} name="complemento" label="Complemento (opcional)" maxLength={180} />
            </View>
            <View style={view.panel}>
              <Text accessibilityRole="header" aria-level={2} style={view.title}>Forma de pagamento</Text>
              <View style={view.options}>
                {paymentMethods.map(([value, label]) => {
                  const selected = draft.forma_pagamento === value;
                  return (
                    <Pressable key={value} accessibilityRole="radio"
                      {...(web ? { 'aria-checked': selected } : { accessibilityState: { checked: selected } })}
                      disabled={busy} onPress={() => change('forma_pagamento', value)}
                      style={[view.option, selected && view.selected]}>
                      <View style={[view.radio, selected && view.radioSelected]} />
                      <Text style={view.label}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.bodyText}>O pedido registra a forma escolhida. Nenhuma cobrança é feita nesta tela.</Text>
            </View>
          </View>
          <View style={[view.panel, wide && view.summaryWide]}>
            <Text accessibilityRole="header" aria-level={2} style={view.title}>Resumo do pedido</Text>
            {items.map(item => (
              <View key={item.id} style={view.summaryLine}>
                <Text style={[styles.bodyText, view.itemName]}>{names.get(item.id) || item.name}</Text>
                <Text style={view.label}>×{item.quantity}</Text>
              </View>
            ))}
            {!!error && <Text {...status} style={view.error}>{error}</Text>}
            <Pressable accessibilityRole="button" disabled={busy} onPress={send}
              style={[styles.primary, view.submit, busy && styles.pressed]}>
              {busy && <ActivityIndicator size="small" color={palette.paper} />}
              <Text style={styles.primaryText}>{busy ? 'Enviando pedido…' : 'Enviar pedido'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const view = StyleSheet.create({
  page: { gap: 16 },
  back: { alignSelf: 'flex-start' },
  layout: { gap: 16 },
  layoutWide: { flexDirection: 'row', alignItems: 'flex-start' },
  form: { flex: 1, minWidth: 0, gap: 16 },
  panel: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 10, padding: 16, gap: 12 },
  receipt: { alignItems: 'flex-start' },
  title: { color: palette.text, fontFamily: 'BarlowExtraBold', fontSize: 28, lineHeight: 32 },
  fields: { gap: 12 },
  fieldsWide: { flexDirection: 'row' },
  field: { flex: 1, minWidth: 0, gap: 6 },
  label: { color: palette.text, fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#92b9cb', borderRadius: 6, minHeight: 44,
    paddingHorizontal: 12, color: palette.text, fontFamily: 'SpaceGrotesk', fontSize: 16 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderRadius: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: palette.line },
  selected: { borderColor: palette.blue, backgroundColor: palette.tint },
  radio: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: palette.blue },
  radioSelected: { borderWidth: 4 },
  summaryWide: { width: '32%', minWidth: 230, maxWidth: 340 },
  summaryLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemName: { flex: 1 },
  error: { color: '#842638', backgroundColor: '#fce8ec', borderRadius: 6, padding: 12, lineHeight: 20, fontSize: 14 },
  submit: { flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 8 }
});
