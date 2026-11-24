import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Link from '../Link';
import { formatCurrency } from '../money';
import ProductPrice from '../ProductPrice';
import { hasPrice, priceCart } from '../pricing';
import { palette, styles } from '../styles';
import { checkoutHref, productHref } from '../useRoute';

const status = Platform.OS === 'web' ? { role: 'status' } : { accessibilityLiveRegion: 'polite' };
const number = new Intl.NumberFormat('pt-BR');

export function AddToCart({ flavor, cart, compact = false }) {
  const disabled = cart.items === null || !flavor.productId || !hasPrice(flavor);
  const count = cart.items?.find(item => item.id === flavor.productId)?.quantity || 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Adicionar ' + flavor.name + ' ao carrinho'}
      accessibilityState={{ disabled }} disabled={disabled} onPress={() => cart.add(flavor)}
      style={({ pressed, hovered }) => [basket.add, compact && basket.addCompact,
        hovered && basket.addHover, (pressed || disabled) && styles.pressed]}>
      {count > 0 ? <Text {...status} style={basket.addCount} accessibilityLabel={count + ' no carrinho'}>
        {count > 99 ? '99+' : count}
      </Text> : <ShoppingCart size={16} strokeWidth={1.75} color={palette.paper} />}
      <Text numberOfLines={1} style={basket.addText}>{compact ? 'Adicionar' : 'Adicionar ao carrinho'}</Text>
    </Pressable>
  );
}

function QuantityButton({ icon: Icon, label, onPress, disabled = false }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      onPress={onPress} disabled={disabled}
      style={({ pressed }) => [basket.quantityButton, (disabled || pressed) && basket.disabled]}>
      <Icon size={16} strokeWidth={1.75} color={palette.blue} />
    </Pressable>
  );
}

function CartItem({ item, flavor, unavailable, cart, openProduct }) {
  const name = flavor?.name || item.name;
  const imageUrl = flavor?.imageUrl || item.imageUrl;
  const product = (
    <>
      <View style={basket.thumbnail}>
        {!!imageUrl && <Image source={{ uri: imageUrl }} resizeMode="contain" style={basket.image} />}
      </View>
      <View style={basket.itemCopy}>
        <Text style={basket.itemName}>{name}</Text>
        {unavailable && <Text style={basket.unavailable}>Indisponível no catálogo</Text>}
        {flavor && <ProductPrice flavor={flavor} />}
      </View>
    </>
  );
  return (
    <View style={basket.item}>
      {flavor ? (
        <Link href={productHref(flavor.id)} action={() => openProduct(flavor.id)} style={basket.itemProduct}>
          {product}
        </Link>
      ) : <View style={basket.itemProduct}>{product}</View>}
      <View style={basket.itemActions}>
        <View style={basket.stepper}>
          <QuantityButton icon={Minus} label={'Diminuir quantidade de ' + name} disabled={item.quantity <= 1}
            onPress={() => cart.adjust(item.id, -1)} />
          <Text {...status} accessibilityLabel={'Quantidade de ' + name + ': ' + item.quantity}
            style={basket.quantity}>{number.format(item.quantity)}</Text>
          <QuantityButton icon={Plus} label={'Aumentar quantidade de ' + name}
            disabled={unavailable || (flavor && !hasPrice(flavor)) || item.quantity >= 2147483647}
            onPress={() => cart.adjust(item.id, 1)} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={'Remover ' + name + ' do carrinho'}
          onPress={() => cart.remove(item.id)}
          style={({ pressed, hovered }) => [basket.remove, hovered && basket.removeHover, pressed && styles.pressed]}>
          <Trash2 size={18} strokeWidth={1.65} color={palette.muted} />
        </Pressable>
      </View>
    </View>
  );
}

export default function CartScreen({ cart, flavors, verified, error, retry, wrap, wide, goCatalog, openProduct, goCheckout }) {
  const current = new Map(flavors.map(flavor => [flavor.productId, flavor]));
  const hasItems = cart.items?.length > 0;
  const pricing = priceCart(cart.items, current);
  const hasUnavailable = verified && cart.items?.some(item => !hasPrice(current.get(item.id)));
  return (
    <View style={[styles.detail, basket.page, wrap]}>
      <Text accessibilityRole="header" aria-level={1} style={[styles.sectionHeading, !wide && styles.sectionHeadingCompact]}>Seu carrinho</Text>
      {cart.storageError && <Text {...status} style={basket.notice}>A seleção será mantida só enquanto esta sessão estiver aberta.</Text>}
      {cart.items === null ? <Text {...status} style={styles.bodyText}>Carregando carrinho…</Text> : hasItems ? (
        <>
          {error && (
            <View style={basket.notice}>
              <Text {...status} style={styles.bodyText}>Não foi possível verificar a disponibilidade dos sabores.</Text>
              <Pressable accessibilityRole="button" onPress={retry} style={basket.retry}>
                <Text style={styles.actionText}>Tentar novamente</Text>
              </Pressable>
            </View>
          )}
          <View style={[basket.layout, wide && basket.layoutWide]}>
            <View style={[basket.panel, basket.items]}>
              {cart.items.map(item => (
                <CartItem key={item.id} item={item} flavor={current.get(item.id)}
                  unavailable={verified && !current.has(item.id)} cart={cart} openProduct={openProduct} />
              ))}
            </View>
            <View style={[basket.panel, basket.summary, wide && basket.summaryWide]}>
              <Text accessibilityRole="header" aria-level={2} style={basket.summaryTitle}>Resumo da seleção</Text>
              <View style={basket.summaryLine}>
                <Text style={styles.bodyText}>Sabores</Text>
                <Text style={basket.summaryNumber}>{number.format(cart.items.length)}</Text>
              </View>
              <View style={basket.summaryLine}>
                <Text style={styles.bodyText}>Pacotes</Text>
                <Text {...status} style={basket.summaryNumber}>{number.format(cart.total)}</Text>
              </View>
              {pricing && (
                <>
                  {pricing.discount > 0n && (
                    <View style={basket.summaryLine}>
                      <Text style={styles.bodyText}>Desconto</Text>
                      <Text style={basket.summaryNumber}>−{formatCurrency(pricing.discount)}</Text>
                    </View>
                  )}
                  <View style={[basket.summaryLine, basket.total]}>
                    <Text style={basket.summaryNumber}>Total</Text>
                    <Text {...status} style={basket.summaryNumber}>{formatCurrency(pricing.total)}</Text>
                  </View>
                </>
              )}
              {pricing ? (
                <Link href={checkoutHref} action={goCheckout} style={[styles.primary, basket.checkout]}>
                  <Text style={styles.primaryText}>Finalizar pedido</Text>
                </Link>
              ) : verified ? (
                <Text style={styles.bodyText}>{hasUnavailable
                  ? 'Remova os sabores indisponíveis ou sem preço para finalizar.'
                  : 'Revise as quantidades para calcular o total.'}</Text>
              ) : !error ? <Text {...status} style={styles.bodyText}>Consultando preços…</Text> : null}
              <Link href="./#sabores" action={goCatalog} style={basket.continue}>
                <Text style={styles.actionText}>Continuar escolhendo</Text>
              </Link>
            </View>
          </View>
        </>
      ) : (
        <View style={[basket.panel, basket.empty]}>
          <View style={basket.emptyIcon}><ShoppingCart size={24} strokeWidth={1.5} color={palette.blue} /></View>
          <Text accessibilityRole="header" aria-level={2} style={basket.summaryTitle}>Seu carrinho está vazio</Text>
          <Link href="./#sabores" action={goCatalog} style={styles.primary}>
            <Text style={styles.primaryText}>Ver sabores</Text>
          </Link>
        </View>
      )}
    </View>
  );
}

const basket = StyleSheet.create({
  page: { gap: 20 },
  layout: { gap: 16 },
  layoutWide: { flexDirection: 'row', alignItems: 'flex-start' },
  panel: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 10 },
  items: { flex: 1, minWidth: 0, overflow: 'hidden' },
  item: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', columnGap: 12,
    rowGap: 8, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.line },
  itemProduct: { flex: 1, minWidth: 132, flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbnail: { width: 48, height: 60, borderRadius: 6, backgroundColor: palette.tint, padding: 4 },
  image: { width: '100%', height: '100%' },
  itemCopy: { flex: 1, minWidth: 0, gap: 4 },
  itemName: { color: palette.text, fontFamily: 'SpaceGrotesk', fontSize: 15, lineHeight: 21, fontWeight: '700' },
  unavailable: { color: palette.muted, fontFamily: 'SpaceGrotesk', fontSize: 13 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  stepper: { borderWidth: 1, borderColor: palette.line, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  quantityButton: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  quantity: { minWidth: 26, textAlign: 'center', color: palette.text, fontFamily: 'SpaceGrotesk', fontSize: 14,
    fontVariant: ['tabular-nums'] },
  remove: { width: 36, height: 44, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  removeHover: { backgroundColor: palette.tint },
  disabled: { opacity: 0.38 },
  summary: { padding: 16, gap: 12 },
  summaryWide: { width: '30%', minWidth: 220, maxWidth: 320 },
  summaryTitle: { color: palette.text, fontFamily: 'BarlowExtraBold', fontSize: 28, lineHeight: 32 },
  total: { paddingTop: 8, borderTopWidth: 1, borderTopColor: palette.line },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryNumber: { color: palette.text, fontFamily: 'SpaceGrotesk', fontSize: 17, fontWeight: '700',
    fontVariant: ['tabular-nums'] },
  checkout: { alignSelf: 'stretch', alignItems: 'center', marginTop: 4 },
  continue: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 12, marginTop: 4 },
  empty: { alignItems: 'center', padding: 24, gap: 16 },
  emptyIcon: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.tint },
  notice: { backgroundColor: palette.tint, color: palette.text, borderRadius: 6, padding: 12, gap: 8, fontSize: 14 },
  retry: { alignSelf: 'flex-start' },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', gap: 8,
    minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 5, backgroundColor: palette.blue },
  addCompact: { alignSelf: 'stretch', paddingHorizontal: 6, gap: 6 },
  addHover: { backgroundColor: '#00577e' },
  addCount: { color: palette.paper, fontFamily: 'SpaceGrotesk', fontSize: 12, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  addText: { color: palette.paper, fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '700' }
});
