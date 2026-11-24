import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { encodePath, mediaUrl } from '../catalog';
import { palette } from '../styles';
import { blankProduct, fetchProducts, supabase } from './data';
import ProductEditor from './ProductEditor';
import { Button, Field, Notice, ui } from './ui';

const adminUrl = 'https://bravio-gelo.devguilhermeassis.chatgpt.site/?admin=1';

function SignIn() {
  const [firstAccess, setFirstAccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function submit() {
    if (busy) return;
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || !password) {
      setFeedback({ error: true, text: 'Informe um e-mail válido e a senha.' });
      return;
    }
    if (firstAccess && password.length < 8) {
      setFeedback({ error: true, text: 'Use uma senha com pelo menos 8 caracteres.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const credentials = { email: address, password };
      const { error } = firstAccess
        ? await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: adminUrl } })
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (firstAccess) {
        setFeedback({ text: 'Confira seu e-mail para confirmar o cadastro. Depois, volte aqui para entrar.' });
        setPassword('');
        setFirstAccess(false);
      }
    } catch (error) {
      const messages = {
        invalid_credentials: 'E-mail ou senha inválidos.',
        email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
        over_email_send_rate_limit: 'Aguarde um minuto antes de solicitar outro e-mail.'
      };
      setFeedback({ error: true, text: messages[error.code] || 'Não foi possível concluir o acesso. Tente novamente.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[ui.panel, ui.login]}>
      <Text accessibilityRole="header" aria-level={1} style={ui.title}>Administração</Text>
      <Text style={ui.body}>Entre com o e-mail autorizado da JogGelo para gerenciar os produtos.</Text>
      <Field label="E-mail" value={email} onChangeText={setEmail} editable={!busy}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" />
      <Field label="Senha" value={password} onChangeText={setPassword} editable={!busy}
        secureTextEntry autoComplete={firstAccess ? 'new-password' : 'current-password'} onSubmitEditing={submit} />
      <Notice error={feedback?.error}>{feedback?.text}</Notice>
      <Button busy={busy} onPress={submit}>{firstAccess ? 'Criar conta' : 'Entrar'}</Button>
      <Button secondary disabled={busy} onPress={() => { setFirstAccess(!firstAccess); setFeedback(null); }}>
        {firstAccess ? 'Já tenho uma conta' : 'Primeiro acesso'}
      </Button>
    </View>
  );
}

function Products({ editor, setEditor }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt(value => value + 1);

  useEffect(() => {
    let mounted = true;
    setError('');
    fetchProducts().then(data => { if (mounted) setItems(data); }).catch(() => {
      if (mounted) setError('Não foi possível atualizar a lista de produtos.');
    });
    return () => { mounted = false; };
  }, [attempt]);

  function saved(row) {
    setItems(items => [...(items || []).filter(item => item.id !== row.id), row]
      .sort((a, b) => a.ordem - b.ordem || a.slug.localeCompare(b.slug)));
    setEditor(null);
    setNotice('Produto salvo.');
    retry();
  }

  if (editor) return <ProductEditor key={editor.id || 'new'} product={editor} cancel={() => { setEditor(null); retry(); }} saved={saved} />;

  const visible = (items || []).filter(item => {
    const matchesStatus = filter === 'all' || item.ativo === (filter === 'active');
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return matchesStatus && (item.nome.toLocaleLowerCase('pt-BR').includes(query) || item.slug.includes(query));
  });

  return (
    <View style={ui.spacing}>
      <View style={[ui.row, ui.between]}>
        <View>
          <Text accessibilityRole="header" aria-level={1} style={ui.title}>Produtos</Text>
          {!!items && <Text style={ui.body}>{items.length} no catálogo · {items.filter(item => item.ativo).length} ativos</Text>}
        </View>
        <Button disabled={!items} onPress={() => {
          setNotice('');
          const nextOrder = items.reduce((highest, item) => Math.max(highest, item.ordem), 0) + 1;
          setEditor(blankProduct(nextOrder));
        }}>Novo produto</Button>
      </View>
      <Field label="Buscar produto" value={search} onChangeText={setSearch} placeholder="Nome ou endereço" />
      <View style={ui.row}>
        {[['all', 'Todos'], ['active', 'Ativos'], ['inactive', 'Inativos']].map(([value, label]) => (
          <Button key={value} secondary={filter !== value} onPress={() => setFilter(value)}>{label}</Button>
        ))}
      </View>
      <Notice>{notice}</Notice>
      {error && <><Notice error>{error}</Notice><Button secondary onPress={retry}>Atualizar lista</Button></>}
      {!items && !error ? <ActivityIndicator color={palette.blue} /> : null}
      {items && !visible.length ? <Text style={ui.body}>Nenhum produto para este filtro.</Text> : null}
      {visible.length > 0 && (
        <View style={[ui.panel, ui.list]}>
          {visible.map((item, index) => {
            const photo = encodePath(item.imagem_path);
            return (
              <View key={item.id} style={[ui.listItem, index + 1 < visible.length && ui.divider]}>
                {photo && <Image source={{ uri: mediaUrl + photo }} resizeMode="contain" style={ui.thumb} />}
                <View style={ui.listText}>
                  <Text style={ui.label}>{item.nome}</Text>
                  <View style={ui.tags}>
                    <Text style={[ui.tag, item.ativo && ui.activeTag]}>{item.ativo ? 'Ativo' : 'Inativo'}</Text>
                    {item.em_destaque && <Text style={[ui.tag, ui.featuredTag]}>Destaque</Text>}
                    <Text style={ui.tag}>Ordem {item.ordem}</Text>
                  </View>
                </View>
                <Button secondary onPress={() => { setNotice(''); setEditor(item); }}>Editar</Button>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function AdminScreen({ goHome }) {
  const [session, setSession] = useState(undefined);
  const [editor, setEditor] = useState(null);
  const [access, setAccess] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const scroll = useRef(null);
  const account = session?.user?.id;
  const permission = access?.account === account ? access?.permission : null;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    if (Platform.OS === 'web') return () => subscription.unsubscribe();
    const visibility = AppState.addEventListener('change', state => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      visibility.remove();
      subscription.unsubscribe();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    if (!account) { setAccess(null); setEditor(null); return; }
    let mounted = true;
    supabase.rpc('pode_gerenciar_catalogo').then(({ data, error }) => {
      if (mounted) setAccess({ account, permission: error ? 'error' : data ? 'allowed' : 'denied' });
    }).catch(() => {
      if (mounted) setAccess({ account, permission: 'error' });
    });
    return () => { mounted = false; };
  }, [account, attempt]);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [editor]);

  return (
    <SafeAreaView style={ui.safe}>
      <StatusBar style="dark" />
      <View style={ui.bar}>
        <View style={ui.barInner}>
          <Text style={ui.brand}>JogGelo</Text>
          <View style={ui.barActions}>
            <Button secondary onPress={goHome}>Ver vitrine</Button>
            {!!session && <Button secondary onPress={() => supabase.auth.signOut({ scope: 'local' })}>Sair</Button>}
          </View>
        </View>
      </View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.main}>
        {session === undefined ? <ActivityIndicator color={palette.blue} /> :
          !session ? <SignIn /> :
          permission === 'allowed' ? <Products editor={editor} setEditor={setEditor} /> :
          permission === 'denied' ? <Notice error>Este e-mail ainda não tem acesso à administração do catálogo.</Notice> :
          permission === 'error' ? <>
            <Notice error>Não foi possível verificar seu acesso ao painel.</Notice>
            <Button secondary onPress={() => setAttempt(value => value + 1)}>Tentar novamente</Button>
          </> : <ActivityIndicator color={palette.blue} />}
      </ScrollView>
    </SafeAreaView>
  );
}
