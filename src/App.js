import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, AppState, Image, Platform, Pressable,
  ScrollView, Text, View, useWindowDimensions
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import AdminScreen from './admin/AdminScreen';
import CartScreen, { AddToCart } from './cart/CartScreen';
import { useCart } from './cart/useCart';
import CheckoutScreen from './checkout/CheckoutScreen';
import Link from './Link';
import { loadFlavors, slugPattern } from './catalog';
import ModelPreview from './ModelPreview';
import { palette, styles } from './styles';
import { cartHref, productHref, useRoute } from './useRoute';

const logo = require('../assets/joggelo-logo.webp');
const web = Platform.OS === 'web';
const instagram = 'https://www.instagram.com/joggelo/';
const homeTitle = 'JogGelo — Gelo para drinks';
const statusProps = web ? { role: 'status' } : { accessibilityLiveRegion: 'polite' };

function Brand({ goHome, footer = false }) {
  return (
    <Link href="./" action={goHome} style={styles.brand} accessibilityLabel="JogGelo, início">
      <Image source={logo} style={footer ? styles.footerLogo : styles.logo} />
      <Text style={[styles.wordmark, footer && styles.footerWordmark]}>JogGelo</Text>
    </Link>
  );
}

function Header({ wide, wrap, route, cart, goHome, goCatalog, goCart }) {
  const countLabel = cart.total === 1 ? '1 pacote' : cart.total + ' pacotes';

  return (
    <View style={styles.header}>
      <View style={[styles.headerRow, !wide && styles.headerCompact, wrap]}>
        <Brand goHome={goHome} />
        <View accessibilityLabel="Menu principal" style={styles.navigation}>
          {wide && (
            <Link href="./" action={goHome} style={[styles.navLink, !route.slug && !route.catalog && !route.cart && !route.checkout && styles.navActive]}>
              <Text style={styles.navText}>Início</Text>
            </Link>
          )}
          <Link href="./#sabores" action={goCatalog} style={[styles.navLink, (route.slug || route.catalog) && styles.navActive]}>
            <Text style={styles.navText}>Sabores</Text>
          </Link>
        </View>
        <Link href={cartHref} action={goCart}
          accessibilityLabel={'Carrinho, ' + countLabel}
          aria-current={web && (route.cart || route.checkout) ? 'page' : undefined}
          style={[styles.headerCart, (route.cart || route.checkout) && styles.headerCartActive]}>
          <ShoppingCart size={18} strokeWidth={1.75} color={palette.blue} />
          {wide && <Text style={styles.actionText}>Carrinho</Text>}
          <Text {...statusProps} style={styles.cartBadge} numberOfLines={1}>{cart.total > 99 ? '99+' : cart.total}</Text>
        </Link>
      </View>
    </View>
  );
}

function Eyebrow({ children }) {
  return (
    <View style={styles.eyebrowRow}>
      <View style={styles.eyebrowRule} />
      <Text style={styles.eyebrow}>{children}</Text>
    </View>
  );
}

function Hero({ featured, goCatalog, wide, width, wrap }) {
  const titleSize = wide ? Math.min(144, Math.max(80, width * (width > 1050 ? 0.094 : 0.105))) : Math.min(115, Math.max(62, width * 0.15));
  return (
    <View nativeID="hero" style={styles.hero}>
      {!web && <LinearGradient colors={['#f6fcff', '#a8e7fb', '#66d0f4']} style={styles.fill} />}
      <View style={[styles.heroLayout, wrap, wide && styles.heroWide]}>
        <View style={[styles.heroCopy, wide && styles.heroCopyWide]}>
          <Eyebrow>GELO SABORIZADO PARA DRINKS</Eyebrow>
          <Text accessibilityRole="header" aria-level={1} style={[styles.heroTitle, { fontSize: titleSize, lineHeight: titleSize * 0.84 }]}>
            GELO COM{'\n'}<Text style={styles.accent}>ATITUDE.</Text>
          </Text>
          <Text style={styles.heroDescription}>Gelo saborizado em pacote para dar cor e sabor ao seu drink, da primeira à última gota.</Text>
          <Link href="./#sabores" action={goCatalog} style={styles.primary}>
            <Text style={styles.primaryText}>Conhecer os sabores  ✳</Text>
          </Link>
        </View>
        <Showcase
          key={featured.map(flavor => flavor.id).join(',')}
          featured={featured}
          height={wide ? (width > 1050 ? 564 : 500) : Math.min(465, Math.max(315, width * 0.77))}
          wide={wide}
        />
      </View>
    </View>
  );
}

function Showcase({ featured, height, wide }) {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => web && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [started, setStarted] = useState(false);
  const [foreground, setForeground] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const previous = useRef(0);
  const showcase = useRef(null);

  useEffect(() => {
    if (web) {
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const changeMotion = () => setReduced(motion.matches);
      const updateVisibility = () => setForeground(!document.hidden && showcase.current?.getBoundingClientRect().bottom > 0);
      const observer = new IntersectionObserver(([entry]) => setForeground(!document.hidden && entry.isIntersecting));
      if (showcase.current) observer.observe(showcase.current);
      motion.addEventListener('change', changeMotion);
      document.addEventListener('visibilitychange', updateVisibility);
      return () => {
        observer.disconnect();
        motion.removeEventListener('change', changeMotion);
        document.removeEventListener('visibilitychange', updateVisibility);
      };
    }
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => mounted && setReduced(value)).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const visibility = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => {
      mounted = false;
      motion.remove();
      visibility.remove();
    };
  }, []);

  const select = useCallback(index => {
    if (index === selected) return;
    previous.current = selected;
    opacity.setValue(reduced ? 1 : 0);
    setSelected(index);
  }, [opacity, reduced, selected]);

  useEffect(() => {
    const transition = Animated.timing(opacity, { toValue: 1, duration: reduced ? 0 : 550, useNativeDriver: !web });
    transition.start();
    return () => transition.stop();
  }, [opacity, selected, reduced]);

  const isPaused = paused || (reduced && !started);
  useEffect(() => {
    if (isPaused || !foreground || featured.length < 2) return;
    const timer = setTimeout(() => select((selected + 1) % featured.length), 5300);
    return () => clearTimeout(timer);
  }, [featured.length, foreground, isPaused, select, selected]);

  const flavor = featured[selected];
  function packages(index) {
    return [styles.packageMain, styles.packageLeft, styles.packageRight].map((style, offset) => {
      if (offset >= featured.length) return null;
      const photo = featured[(index + offset) % featured.length].imageUrl;
      return photo ? <Image key={offset} source={{ uri: photo }} style={[styles.package, style]} resizeMode="contain" /> : null;
    });
  }

  return (
    <View ref={showcase} style={[styles.showcase, wide && styles.showcaseWide, { height }]}>
      <View style={[styles.orbit, styles.orbitOuter]} />
      <View style={[styles.orbit, styles.orbitInner]} />
      <Text style={[styles.spark, styles.sparkTop]}>✦</Text>
      <Text style={[styles.spark, styles.sparkBottom]}>✧</Text>
      {!!flavor && (
        <>
          <Animated.View aria-hidden style={[styles.fill, { opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
            {packages(previous.current)}
          </Animated.View>
          <Animated.View aria-hidden style={[styles.fill, { opacity }]}>
            {packages(selected)}
          </Animated.View>
          <View style={styles.controls}>
            <View style={[styles.currentDot, { backgroundColor: flavor.color }]} />
            <Text style={styles.currentName}>{flavor.name.toLocaleUpperCase('pt-BR')}</Text>
            {featured.length > 1 && (
              <>
                <View style={styles.selectors} accessibilityLabel="Selecionar sabor em destaque">
                  {featured.map((item, index) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={'Destacar ' + item.name}
                      {...(web ? { 'aria-pressed': selected === index } : { accessibilityState: { selected: selected === index } })}
                      onPress={() => select(index)}
                      style={styles.selector}
                    >
                      <View style={[styles.dot, selected === index && styles.activeDot]} />
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isPaused ? 'Retomar troca de sabores' : 'Pausar troca de sabores'}
                  onPress={() => { setStarted(true); setPaused(!isPaused); }}
                  style={styles.pause}
                >
                  <Text style={styles.pauseText}>{isPaused ? '▶' : 'Ⅱ'}</Text>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

function FlavorCard({ flavor, cardWidth, wide, open, cart }) {
  return (
    <View style={[styles.card, { width: cardWidth }]} {...(web ? { dataSet: { flavorCard: 'true' } } : {})}>
      <Link href={productHref(flavor.id)} action={open} style={styles.cardDetails}>
        <View style={[styles.cardArt, { height: wide ? 185 : Math.min(210, Math.max(110, cardWidth * 0.72)) }]}>
          <View style={[styles.cardOrbit, { borderColor: flavor.color }]} />
          {flavor.imageUrl && <Image source={{ uri: flavor.imageUrl }} style={styles.cardPackage} resizeMode="contain" />}
        </View>
        <View style={styles.cardContent}>
          <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>{flavor.name}</Text>
          <Text style={styles.cardSummary}>{flavor.summary}</Text>
          <Text style={styles.cardLink}>Ver detalhes</Text>
        </View>
      </Link>
      <View style={styles.cardActions}>
        <AddToCart flavor={flavor} cart={cart} compact={cardWidth < 195} />
      </View>
    </View>
  );
}

function Detail({ flavor, goCatalog, loading, error, retry, wide, width, wrap, cart }) {
  const [showModel, setShowModel] = useState(false);
  const [modelError, setModelError] = useState(false);
  const handleModelError = useCallback(() => {
    setShowModel(false);
    setModelError(true);
  }, []);
  const artHeight = wide ? 355 : Math.min(370, Math.max(250, width * 0.7));

  return (
    <View style={[styles.detail, wrap]}>
      <Link href="./#sabores" action={goCatalog} style={styles.back}><Text style={styles.actionText}>Todos os sabores</Text></Link>
      {loading ? <Text {...statusProps} style={styles.bodyText}>Carregando sabor…</Text> :
        error ? <LoadError detail retry={retry} /> :
        !flavor ? <Text accessibilityRole="header" aria-level={1} style={styles.sectionHeading}>Sabor não encontrado</Text> : (
          <View style={[styles.detailLayout, wide && styles.detailWide]}>
            <View style={[styles.detailArt, wide && styles.detailArtWide]}>
              <View style={[styles.detailOrbit, { borderColor: flavor.color }]} />
              {showModel ? <ModelPreview flavor={flavor} height={artHeight} onError={handleModelError} /> :
                flavor.imageUrl ? (
                  <Image
                    accessibilityLabel={'Embalagem de gelo sabor ' + flavor.name}
                    source={{ uri: flavor.imageUrl }}
                    style={[styles.detailImage, { height: artHeight }]}
                    resizeMode="contain"
                  />
                ) : null}
              {!!flavor.modelPath && (
                <Pressable accessibilityRole="button" aria-expanded={showModel} style={styles.modelToggle} onPress={() => {
                  setModelError(false);
                  setShowModel(!showModel);
                }}>
                  <Text style={styles.actionText}>{showModel ? 'Voltar à imagem' : 'Ver em 3D'}</Text>
                </Pressable>
              )}
              {modelError && <Text {...statusProps} style={styles.modelStatus}>Não foi possível carregar a visualização 3D.</Text>}
            </View>
            <View style={[styles.detailCopy, wide && styles.detailCopyWide]}>
              <Eyebrow>GELO SABORIZADO</Eyebrow>
              <Text accessibilityRole="header" aria-level={1} style={styles.sectionHeading}>{flavor.name}</Text>
              <Text style={styles.detailDescription}>{flavor.description}</Text>
              <AddToCart flavor={flavor} cart={cart} />
              {flavor.pairings.length > 0 && (
                <View style={styles.pairings}>
                  <Text accessibilityRole="header" aria-level={2} style={styles.pairingsHeading}>Experimente com</Text>
                  <View style={styles.tags}>
                    {flavor.pairings.map((drink, index) => <Text key={index} style={styles.tag}>{drink}</Text>)}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
    </View>
  );
}

function LoadError({ detail = false, retry }) {
  return (
    <View style={styles.loadError}>
      <Text {...statusProps} style={styles.bodyText}>
        {detail ? 'Não foi possível carregar este sabor.' : 'Não foi possível carregar os sabores.'}
      </Text>
      <Pressable accessibilityRole="button" onPress={retry}><Text style={styles.actionText}>Tentar novamente</Text></Pressable>
    </View>
  );
}

function Storefront() {
  const { width } = useWindowDimensions();
  const { route, navigate } = useRoute();
  const cart = useCart();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [catalogTop, setCatalogTop] = useState(null);
  const scroll = useRef(null);
  const wide = width > 760;
  const wrapWidth = Math.min(1232, width - (width > 1050 ? 112 : wide ? 72 : 40));
  const wrap = { width: wrapWidth, alignSelf: 'center' };
  const columns = width > 1050 ? 5 : wide ? 3 : 2;
  const gap = wide ? 16 : 10;
  const cardWidth = (wrapWidth - gap * (columns - 1)) / columns;
  const retry = () => setAttempt(value => value + 1);
  const data = result?.slug === route.slug && result?.view === route.view && result?.attempt === attempt ? result : null;

  useEffect(() => {
    if (route.admin) return;
    const { slug, view } = route;
    if (slug && !slugPattern.test(slug)) {
      setResult({ slug, view, attempt, flavors: [] });
      return;
    }
    const controller = new AbortController();
    let current = true;
    const timeout = setTimeout(() => controller.abort(), 10000);
    loadFlavors(slug, controller.signal)
      .then(flavors => { if (current) setResult({ slug, view, attempt, flavors }); })
      .catch(() => { if (current) setResult({ slug, view, attempt, error: true }); })
      .finally(() => clearTimeout(timeout));
    return () => {
      current = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [route.slug, route.admin, route.view, attempt]);

  useEffect(() => {
    if (!web) return;
    if (route.admin) {
      document.title = route.finance ? 'Financeiro — JogGelo' : route.orders ? 'Pedidos — JogGelo' : 'Administração — JogGelo';
      return;
    }
    if (route.cart || route.checkout) {
      document.title = route.checkout ? 'Checkout — JogGelo' : 'Carrinho — JogGelo';
      return;
    }
    const name = data?.flavors?.[0]?.name;
    document.title = route.slug && data && !data.error ? (name || 'Sabor não encontrado') + ' — JogGelo' : homeTitle;
  }, [route, data]);

  useEffect(() => {
    if (route.admin) return;
    if (!route.slug && route.catalog && catalogTop === null) return;
    const frame = requestAnimationFrame(() => {
      const y = !route.slug && route.catalog ? Math.max(0, catalogTop - (wide ? 76 : 63)) : 0;
      scroll.current?.scrollTo({ y, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [route, catalogTop, wide]);

  const goHome = () => navigate('home');
  const goCatalog = () => navigate('catalog');
  const goCart = () => navigate('cart');
  const goCheckout = () => navigate('checkout');
  if (route.admin) return <AdminScreen goHome={goHome} orders={route.orders} finance={route.finance}
    goOrders={() => navigate('orders')} goFinance={() => navigate('finance')} goProducts={() => navigate('admin')} />;
  const flavors = data?.flavors || [];
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]} style={styles.page} contentContainerStyle={styles.pageContent}>
        <Header wide={wide} wrap={wrap} route={route} cart={cart} goHome={goHome} goCatalog={goCatalog} goCart={goCart} />
        {route.checkout ? (
          <CheckoutScreen cart={cart} flavors={flavors} wrap={wrap} wide={wide} goCart={goCart} goCatalog={goCatalog} />
        ) : route.cart ? (
          <CartScreen cart={cart} flavors={flavors} verified={Boolean(data && !data.error)} error={data?.error}
            retry={retry} wrap={wrap} wide={wide} goCatalog={goCatalog} openProduct={slug => navigate('product', slug)} goCheckout={goCheckout} />
        ) : route.slug ? (
          <Detail key={route.slug} flavor={flavors[0]} goCatalog={goCatalog} loading={!data} error={data?.error} retry={retry} wide={wide} width={width} wrap={wrap} cart={cart} />
        ) : (
          <>
            <Hero featured={flavors.filter(flavor => flavor.featured).slice(0, 5)} goCatalog={goCatalog} wide={wide} width={width} wrap={wrap} />
            <View nativeID="sabores" onLayout={event => setCatalogTop(event.nativeEvent.layout.y)} style={[styles.catalog, !wide && styles.catalogCompact, wrap]}>
              <Eyebrow>ENCONTRE SEU FAVORITO</Eyebrow>
              <View style={[styles.catalogHeading, wide && styles.catalogHeadingWide]}>
                <Text accessibilityRole="header" aria-level={2} style={[styles.sectionHeading, !wide && styles.sectionHeadingCompact]}>
                  Escolha seu sabor<Text style={styles.accent}>.</Text>
                </Text>
                <Text style={styles.bodyText}>Conheça os sabores e escolha o próximo drink.</Text>
              </View>
              {!data ? <Text {...statusProps} style={styles.bodyText}>Carregando sabores…</Text> :
                data.error ? <LoadError retry={retry} /> :
                !flavors.length ? <Text {...statusProps} style={styles.bodyText}>Nenhum sabor disponível no momento.</Text> : (
                  <View style={[styles.grid, { gap }]}>
                    {flavors.map(flavor => <FlavorCard key={flavor.id} flavor={flavor} cardWidth={cardWidth} wide={wide} cart={cart} open={() => navigate('product', flavor.id)} />)}
                  </View>
                )}
            </View>
          </>
        )}
        <View style={styles.footer}>
          <View style={[styles.footerRow, wrap]}>
            <Brand goHome={goHome} footer />
            <Link href={instagram} accessibilityLabel="JogGelo no Instagram"><Text style={styles.actionText}>@joggelo</Text></Link>
            <Link href="./#sabores" action={goCatalog}><Text style={styles.navText}>Todos os sabores</Text></Link>
            <Link href="./?admin=1" action={() => navigate('admin')}><Text style={styles.navText}>Administração</Text></Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsReady, fontError] = useFonts({
    BarlowBlack: require('../assets/fonts/BarlowCondensed-Black.ttf'),
    BarlowExtraBold: require('../assets/fonts/BarlowCondensed-ExtraBold.ttf'),
    BarlowBlackItalic: require('../assets/fonts/BarlowCondensed-BlackItalic.ttf'),
    SpaceGrotesk: require('../assets/fonts/SpaceGrotesk.ttf')
  });
  if (!fontsReady && !fontError) return <View style={styles.safeArea} />;
  return <SafeAreaProvider style={{ backgroundColor: palette.bg }}><Storefront /></SafeAreaProvider>;
}
