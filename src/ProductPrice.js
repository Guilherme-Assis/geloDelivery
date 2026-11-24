import { StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from './money';
import { hasPrice, isOnOffer } from './pricing';
import { palette } from './styles';

export function OfferTag() {
  return <Text style={price.tag}>Oferta</Text>;
}

export default function ProductPrice({ flavor, featured = false }) {
  if (!hasPrice(flavor)) return <Text style={price.unavailable}>Preço indisponível</Text>;
  const offer = isOnOffer(flavor);
  return (
    <View style={price.group}>
      {featured && offer && <OfferTag />}
      {offer && <Text style={price.original} accessibilityLabel={'Preço original: ' + formatCurrency(flavor.originalPriceCents)}>
        {formatCurrency(flavor.originalPriceCents)}
      </Text>}
      <View style={price.current}>
        <Text style={[price.amount, featured && price.large, offer && price.discounted]}>
          {formatCurrency(flavor.priceCents)}
        </Text>
        <Text style={price.unit}>/ pacote</Text>
      </View>
    </View>
  );
}

const price = StyleSheet.create({
  group: { alignItems: 'flex-start', gap: 2 },
  original: { color: palette.muted, fontFamily: 'SpaceGrotesk', fontSize: 13, lineHeight: 18,
    textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  current: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 5 },
  amount: { color: palette.text, fontFamily: 'SpaceGrotesk', fontSize: 17, lineHeight: 22,
    fontWeight: '700', fontVariant: ['tabular-nums'] },
  large: { fontSize: 24, lineHeight: 30 },
  discounted: { color: '#00613d' },
  unit: { color: palette.muted, fontFamily: 'SpaceGrotesk', fontSize: 12, lineHeight: 18 },
  tag: { alignSelf: 'flex-start', color: '#075338', backgroundColor: '#e0f4e8', borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 3, fontFamily: 'SpaceGrotesk', fontSize: 12, fontWeight: '700' },
  unavailable: { color: palette.muted, fontFamily: 'SpaceGrotesk', fontSize: 13, lineHeight: 18 }
});
