import { StatusBar } from 'expo-status-bar';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import LogIn from 'lucide-react-native/icons/log-in';
import LogOut from 'lucide-react-native/icons/log-out';
import Package from 'lucide-react-native/icons/package';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import Store from 'lucide-react-native/icons/store';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { encodePath, mediaUrl } from '../catalog';
import { blankProduct, fetchProducts, supabase } from './data';
import ProductEditor from './ProductEditor';
import { Button, Field, Notice, ink, ui } from './ui';

const adminUrl = 'https://bravio-gelo.devguilhermeassis.chatgpt.site/?admin=1';
const logo = require('../../assets/joggelo-logo.webp');
const loginPackages = [
  require('../../assets/catalog/pacote-mirtilo.webp'),
  require('../../assets/catalog/pacote-morango.webp'),
  require('../../assets/catalog/pacote-maca-verde.webp')
];
const filters = [['all', 'Todos'], ['active', 'Ativos'], ['inactive', 'Inativos']];
const web = Platform.OS === 'web';

function Brand({ dark = false }) {
  return (
    <View style={ui.brandWrap}>
      <Image source={logo} style={ui.brandLogo} resizeMode="contain" />
      <Text style={[ui.brand, dark && ui.brandOnDark]}>JogGelo</Text>
    </View>
  );
}

function NavItem({ icon: Icon, active = false, onPress, children }) {
  return (
    <Pressable accessibilityRole="button" aria-current={web && active ? 'page' : undefined} onPress={onPress}
      style={({ hovered, pressed }) => [ui.navRow, active && ui.navActive, !active && (hovered || pressed) && ui.navHover]}>
      <Icon size={16} strokeWidth={1.5} color={active ? ink.accent : ink.muted} />
      <Text style={[ui.navText, active && ui.navTextActive]}>{children}</Text>
    </Pressable>
  );
}

function LoginLayout({ wide, goHome, children }) {
  return (
    <View style={ui.authShell}>
      {wide && (
        <View style={ui.authSide}>
          <Brand dark />
          <View style={ui.authVisual} aria-hidden>
            <Image source={loginPackages[0]} style={[ui.authPack, ui.authPackLeft]} resizeMode="contain" />
            <Image source={loginPackages[1]} style={[ui.authPack, ui.authPackRight]} resizeMode="contain" />
            <Image source={loginPackages[2]} style={ui.authPackMain} resizeMode="contain" />
          </View>
        </View>
      )}
      <View style={ui.authMain}>
        <View style={ui.authTop}>
          <View style={ui.authTopInner}>
            {wide ? <Text style={ui.meta}>Administração do catálogo</Text> : <Brand />}
            <Button quiet icon={Store} onPress={goHome}>Ver vitrine</Button>
          </View>
        </View>
        <ScrollView style={ui.scroll} contentContainerStyle={ui.authContent} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

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
    <View style={ui.login}>
      <View style={ui.loginHeading}>
        <Text accessibilityRole="header" aria-level={1} style={ui.title}>{firstAccess ? 'Primeiro acesso' : 'Entrar no painel'}</Text>
        <Text style={ui.body}>{firstAccess ? 'Cadastre-se com o e-mail autorizado da JogGelo.' : 'Use seu e-mail autorizado para gerenciar o catálogo.'}</Text>
      </View>
      <Field label="E-mail" value={email} onChangeText={setEmail} editable={!busy}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" />
      <Field label="Senha" value={password} onChangeText={setPassword} editable={!busy}
        secureTextEntry autoComplete={firstAccess ? 'new-password' : 'current-password'} onSubmitEditing={submit} />
      <Notice error={feedback?.error}>{feedback?.text}</Notice>
      <Button icon={LogIn} busy={busy} onPress={submit}>{firstAccess ? 'Criar conta' : 'Entrar'}</Button>
      <Button quiet disabled={busy} onPress={() => { setFirstAccess(!firstAccess); setFeedback(null); }}>
        {firstAccess ? 'Já tenho uma conta' : 'Primeiro acesso'}
      </Button>
    </View>
  );
}

function Products({ editor, setEditor, wide }) {
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

  const metricValues = items ? [
    ['Produtos cadastrados', items.length],
    ['Visíveis na vitrine', items.filter(item => item.ativo).length],
    ['Destaques na home', Math.min(5, items.filter(item => item.ativo && item.em_destaque).length)]
  ] : [];

  return (
    <View style={ui.spacing}>
      <View style={[ui.row, ui.between]}>
        <Text accessibilityRole="header" aria-level={1} style={ui.title}>Produtos</Text>
        <Button icon={Plus} disabled={!items} onPress={() => {
          setNotice('');
          const nextOrder = items.reduce((highest, item) => Math.max(highest, item.ordem), 0) + 1;
          setEditor(blankProduct(nextOrder));
        }}>Novo produto</Button>
      </View>
      {items && (
        <View style={[ui.panel, ui.summary]}>
          {metricValues.map(([label, value], index) => (
            <View key={label} style={[ui.metric, index < metricValues.length - 1 && ui.metricBorder]}>
              <Text style={ui.metricLabel}>{label}</Text>
              <Text style={ui.metricValue}>{value}</Text>
            </View>
          ))}
        </View>
      )}
      <Notice>{notice}</Notice>
      {error ? <View style={ui.fieldStack}><Notice error>{error}</Notice><Button secondary onPress={retry}>Atualizar lista</Button></View> : null}
      {!items && !error ? <ActivityIndicator color={ink.accent} /> : null}
      {items && (
        <View style={[ui.panel, ui.list]}>
          <View style={ui.toolbar}>
            <View style={ui.tabs} accessibilityLabel="Filtrar por status">
              {filters.map(([value, label]) => (
                <Pressable key={value} accessibilityRole="button"
                  {...(web ? { 'aria-pressed': filter === value } : { accessibilityState: { selected: filter === value } })}
                  onPress={() => setFilter(value)} style={[ui.tab, filter === value && ui.tabSelected]}>
                  <Text style={[ui.tabText, filter === value && ui.tabTextSelected]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Field label="Buscar produto" hideLabel icon={Search} style={wide ? ui.search : ui.searchCompact}
              value={search} onChangeText={setSearch} placeholder="Buscar produto" />
          </View>
          {wide && (
            <View style={ui.tableHeader}>
              <Text style={[ui.tableLabel, { flex: 1 }]}>Produto</Text>
              <Text style={[ui.tableLabel, ui.statusCol]}>Status</Text>
              <Text style={[ui.tableLabel, ui.featuredCol]}>Destaque</Text>
              <Text style={[ui.tableLabel, ui.orderCol]}>Ordem</Text>
              <View style={ui.actionCol} />
            </View>
          )}
          {visible.length === 0 ? (
            <View style={ui.empty}><Text style={ui.body}>Nenhum produto para este filtro.</Text></View>
          ) : visible.map((item, index) => {
            const photo = encodePath(item.imagem_path);
            const status = (
              <View style={ui.status}>
                <View style={[ui.statusDot, item.ativo && ui.activeDot]} />
                <Text style={ui.meta}>{item.ativo ? 'Ativo' : 'Inativo'}</Text>
              </View>
            );
            return (
              <View key={item.id} style={[ui.listItem, (!wide || index > 0) && ui.divider]}>
                <View style={ui.productCell}>
                  <View style={ui.thumb}>
                    {photo ? <Image source={{ uri: mediaUrl + photo }} resizeMode="contain" style={ui.thumbImage} /> : null}
                    <View style={[ui.flavorStripe, { backgroundColor: item.cor_destaque }]} />
                  </View>
                  <View style={ui.listText}>
                    <Text numberOfLines={1} style={ui.label}>{item.nome}</Text>
                    {wide ? <Text numberOfLines={1} style={ui.meta}>{item.slug}</Text> : (
                      <View style={ui.tags}>
                        {status}
                        {item.em_destaque && <Text style={ui.meta}>Destaque</Text>}
                        <Text style={ui.meta}>Ordem {item.ordem}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {wide && (
                  <>
                    <View style={ui.statusCol}>{status}</View>
                    <Text style={[ui.meta, ui.featuredCol]}>{item.em_destaque ? 'Sim' : '—'}</Text>
                    <Text style={[ui.number, ui.orderCol]}>{item.ordem}</Text>
                  </>
                )}
                <View style={wide ? ui.actionCol : undefined}>
                  <Button quiet icon={Pencil} onPress={() => { setNotice(''); setEditor(item); }}>Editar</Button>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function AdminScreen({ goHome }) {
  const { width } = useWindowDimensions();
  const wide = width >= 960;
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

  const signOut = () => supabase.auth.signOut({ scope: 'local' });
  const openProducts = () => setEditor(null);
  return (
    <SafeAreaView style={ui.safe}>
      <StatusBar style="dark" />
      {!session ? (
        <LoginLayout wide={wide} goHome={goHome}>
          {session === undefined ? <ActivityIndicator color={ink.accent} /> : <SignIn />}
        </LoginLayout>
      ) : (
        <View style={ui.shell}>
          {wide && (
            <View style={ui.sidebar} accessibilityLabel="Navegação da administração">
              <View style={ui.sidebarBrand}><Brand /></View>
              <Text style={ui.navLabel}>Catálogo</Text>
              <NavItem icon={Package} active onPress={openProducts}>Produtos</NavItem>
              <NavItem icon={Store} onPress={goHome}>Ver vitrine</NavItem>
              <View style={ui.sidebarBottom}>
                <Text style={ui.accountEmail} numberOfLines={1}>{session.user.email}</Text>
                <NavItem icon={LogOut} onPress={signOut}>Sair</NavItem>
              </View>
            </View>
          )}
          <View style={ui.workspace}>
            <View style={ui.bar}>
              <View style={[ui.barInner, !wide && ui.barCompact]}>
                {wide ? (
                  <View style={ui.breadcrumb}>
                    <Text style={ui.breadcrumbText}>Catálogo</Text>
                    <ChevronRight size={16} strokeWidth={1.5} color={ink.muted} />
                    <Text style={ui.breadcrumbCurrent}>{editor ? (editor.id ? 'Editar produto' : 'Novo produto') : 'Produtos'}</Text>
                  </View>
                ) : (
                  <>
                    <Brand />
                    <View style={ui.barActions}>
                      <Button quiet icon={Store} onPress={goHome}>Vitrine</Button>
                      <Button quiet icon={LogOut} onPress={signOut}>Sair</Button>
                    </View>
                  </>
                )}
              </View>
            </View>
            <ScrollView ref={scroll} style={ui.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[ui.main, wide && ui.mainWide]}>
              {permission === 'allowed' ? <Products editor={editor} setEditor={setEditor} wide={wide} /> :
                permission === 'denied' ? <Notice error>Este e-mail ainda não tem acesso à administração do catálogo.</Notice> :
                permission === 'error' ? <View style={ui.fieldStack}>
                  <Notice error>Não foi possível verificar seu acesso ao painel.</Notice>
                  <Button secondary onPress={() => setAttempt(value => value + 1)}>Tentar novamente</Button>
                </View> : <ActivityIndicator color={ink.accent} />}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
