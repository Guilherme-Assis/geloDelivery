import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { palette } from '../styles';

export function Button({ children, onPress, secondary = false, disabled = false, busy = false, style }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }}
      onPress={onPress} disabled={disabled || busy}
      style={({ pressed }) => [ui.button, secondary && ui.secondary, (disabled || busy || pressed) && ui.dim, style]}>
      {busy && <ActivityIndicator color={secondary ? palette.blue : palette.paper} size="small" />}
      <Text style={[ui.buttonLabel, secondary && ui.secondaryLabel]}>{children}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, multiline, style, ...input }) {
  return (
    <View style={[ui.field, style]}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value} onChangeText={onChangeText} multiline={multiline}
        placeholderTextColor="#68818e"
        style={[ui.input, multiline && ui.multiline]}
        {...input}
      />
    </View>
  );
}

export function Notice({ children, error = false }) {
  if (!children) return null;
  return <Text accessibilityLiveRegion="polite" style={[ui.notice, error && ui.error]}>{children}</Text>;
}

export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  bar: { backgroundColor: palette.paper, borderBottomWidth: 1, borderBottomColor: palette.line },
  barInner: { minHeight: 69, paddingHorizontal: 20, maxWidth: 1120, width: '100%', alignSelf: 'center', alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  barActions: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  brand: { color: palette.text, fontFamily: 'BarlowBlackItalic', fontSize: 32 },
  main: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30, maxWidth: 1120, width: '100%', alignSelf: 'center' },
  login: { width: '100%', maxWidth: 460, alignSelf: 'center', padding: 23, gap: 14 },
  panel: { borderColor: palette.line, borderWidth: 1, borderRadius: 12, backgroundColor: palette.paper },
  title: { color: palette.text, fontFamily: 'BarlowExtraBold', fontSize: 46, lineHeight: 49, includeFontPadding: false },
  subtitle: { color: palette.text, fontFamily: 'BarlowExtraBold', fontSize: 29, lineHeight: 34 },
  body: { color: palette.muted, fontFamily: 'SpaceGrotesk', fontSize: 16, lineHeight: 23 },
  label: { color: palette.text, fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '700' },
  field: { gap: 6, marginBottom: 13 },
  input: { color: palette.text, backgroundColor: palette.paper, borderColor: '#92b9cb', borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, fontFamily: 'SpaceGrotesk', fontSize: 16 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  button: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, backgroundColor: palette.blue, borderWidth: 1, borderColor: palette.blue, borderRadius: 6, minHeight: 42, paddingVertical: 8, paddingHorizontal: 13 },
  buttonLabel: { color: palette.paper, fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '700' },
  secondary: { borderColor: '#88c7e2', backgroundColor: palette.paper },
  secondaryLabel: { color: palette.blue },
  dim: { opacity: 0.55 },
  notice: { color: '#105570', fontSize: 15, lineHeight: 22, borderRadius: 6, backgroundColor: palette.tint, padding: 12 },
  error: { color: '#852538', backgroundColor: '#fce8ec' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  between: { justifyContent: 'space-between' },
  spacing: { gap: 12 },
  list: { marginTop: 12, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  divider: { borderBottomColor: palette.line, borderBottomWidth: 1 },
  thumb: { width: 44, height: 58, backgroundColor: palette.tint, borderRadius: 4 },
  listText: { flex: 1, minWidth: 70, gap: 3 },
  tags: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag: { color: palette.muted, backgroundColor: '#edf3f7', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, fontSize: 12, fontWeight: '600' },
  activeTag: { color: '#14523a', backgroundColor: '#e2f5e9' },
  featuredTag: { color: '#00547a', backgroundColor: '#dff2fc' },
  form: { padding: 17, marginTop: 12 },
  formColumns: { gap: 16 },
  formWide: { flexDirection: 'row' },
  formLeft: { flex: 2 },
  formRight: { flex: 1 },
  preview: { height: 210, width: '100%', backgroundColor: palette.tint, borderRadius: 6 },
  media: { gap: 8, marginBottom: 15 },
  switches: { marginVertical: 12, gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }
});
