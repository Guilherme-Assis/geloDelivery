import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { palette } from '../styles';

export const ink = {
  page: '#f5f7f8', white: '#ffffff', surface: '#edf1f3', line: '#dfe5e9',
  text: '#172a36', secondary: '#425866', muted: '#536b79',
  accent: palette.blue, selected: '#e7f2f8', dark: '#152b38'
};

export function Button({ children, onPress, secondary = false, quiet = false, disabled = false, busy = false, icon: Icon, style }) {
  const light = secondary || quiet;
  const color = light ? ink.text : ink.white;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }}
      onPress={onPress} disabled={disabled || busy}
      style={({ pressed, hovered }) => [ui.button, secondary && ui.secondary, quiet && ui.quiet,
        hovered && (light ? ui.hoverLight : ui.hoverPrimary), (disabled || busy || pressed) && ui.dim, style]}>
      {busy ? <ActivityIndicator color={color} size="small" /> :
        Icon ? <Icon size={16} strokeWidth={1.5} color={color} /> : null}
      <Text style={[ui.buttonLabel, light && ui.secondaryLabel]}>{children}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, multiline, hideLabel = false, icon: Icon, style, ...input }) {
  const [inputStyle, wrapperStyle] = Icon ? [ui.inputInGroup, ui.inputGroup] : [ui.input, null];
  const control = (
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} multiline={multiline}
      placeholderTextColor={ink.muted} style={[inputStyle, multiline && ui.multiline]} {...input} />
  );
  return (
    <View style={[ui.field, style]}>
      {!hideLabel && <Text style={ui.label}>{label}</Text>}
      {Icon ? <View style={wrapperStyle}><Icon size={16} strokeWidth={1.5} color={ink.muted} />{control}</View> : control}
    </View>
  );
}

export function Notice({ children, error = false }) {
  if (!children) return null;
  return <Text accessibilityLiveRegion="polite" style={[ui.notice, error && ui.error]}>{children}</Text>;
}

const font = { color: ink.text, fontFamily: 'SpaceGrotesk' };

export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ink.page },
  shell: { flex: 1, flexDirection: 'row' },
  workspace: { flex: 1, minWidth: 0 },
  scroll: { flex: 1 },
  bar: { backgroundColor: ink.white, borderBottomWidth: 1, borderBottomColor: ink.line },
  barInner: { minHeight: 60, paddingHorizontal: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  barCompact: { paddingHorizontal: 12 },
  barActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breadcrumbText: { ...font, color: ink.muted, fontSize: 14, lineHeight: 20 },
  breadcrumbCurrent: { ...font, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  sidebar: { width: 232, backgroundColor: ink.white, borderRightWidth: 1, borderRightColor: ink.line, paddingHorizontal: 16, paddingVertical: 24 },
  sidebarBrand: { paddingHorizontal: 8, marginBottom: 36 },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 48, height: 28, borderRadius: 4, backgroundColor: ink.white },
  brand: { ...font, fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.6 },
  brandOnDark: { color: ink.white },
  navLabel: { ...font, fontSize: 13, lineHeight: 20, color: ink.muted, marginLeft: 8, marginBottom: 8 },
  navRow: { minHeight: 40, borderRadius: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  navActive: { backgroundColor: ink.selected },
  navHover: { backgroundColor: ink.surface },
  navText: { ...font, fontSize: 14, lineHeight: 20, color: ink.secondary },
  navTextActive: { color: ink.accent, fontWeight: '600' },
  sidebarBottom: { marginTop: 'auto', paddingTop: 16, borderTopWidth: 1, borderTopColor: ink.line },
  accountEmail: { ...font, fontSize: 13, lineHeight: 20, color: ink.muted, marginHorizontal: 8, marginBottom: 8 },
  main: { flexGrow: 1, padding: 20, maxWidth: 1440, width: '100%', alignSelf: 'center' },
  mainWide: { paddingHorizontal: 32, paddingVertical: 32 },
  authShell: { flex: 1, flexDirection: 'row' },
  authSide: { width: '44%', maxWidth: 680, backgroundColor: ink.dark, padding: 32, justifyContent: 'space-between' },
  authVisual: { minHeight: 300, flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  authPack: { position: 'absolute', width: '41%', height: '56%', maxHeight: 330 },
  authPackLeft: { left: '5%', transform: [{ rotate: '-12deg' }] },
  authPackRight: { right: '5%', transform: [{ rotate: '17deg' }] },
  authPackMain: { width: '53%', height: '70%', maxHeight: 430 },
  authMain: { flex: 1, minWidth: 0 },
  authContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  authTop: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: ink.line },
  authTopInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, gap: 8 },
  login: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 },
  loginHeading: { marginBottom: 8, gap: 8 },
  panel: { borderColor: ink.line, borderWidth: 1, borderRadius: 14, backgroundColor: ink.white },
  title: { ...font, fontSize: 36, lineHeight: 44, fontWeight: '500', includeFontPadding: false, letterSpacing: -1.2 },
  subtitle: { ...font, fontSize: 19, lineHeight: 24, fontWeight: '600' },
  body: { ...font, color: ink.secondary, fontSize: 15, lineHeight: 22 },
  meta: { ...font, color: ink.muted, fontSize: 13, lineHeight: 20 },
  label: { ...font, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  field: { gap: 8 },
  input: { ...font, backgroundColor: ink.white, borderColor: '#c0cdd4', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, fontSize: 16 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderColor: '#c0cdd4', borderWidth: 1, borderRadius: 8, backgroundColor: ink.white },
  inputInGroup: { ...font, flex: 1, minWidth: 0, minHeight: 42, fontSize: 15, paddingVertical: 8 },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  button: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: ink.accent, borderWidth: 1, borderColor: ink.accent, borderRadius: 8, minHeight: 40, paddingVertical: 8, paddingHorizontal: 12 },
  buttonLabel: { ...font, color: ink.white, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  secondary: { borderColor: '#cbd6dc', backgroundColor: ink.white },
  quiet: { borderColor: 'transparent', backgroundColor: 'transparent' },
  secondaryLabel: { color: ink.text },
  hoverLight: { backgroundColor: ink.surface },
  hoverPrimary: { backgroundColor: '#00577e', borderColor: '#00577e' },
  dim: { opacity: 0.6 },
  notice: { ...font, color: '#105570', fontSize: 15, lineHeight: 22, borderRadius: 8, backgroundColor: ink.selected, padding: 12 },
  error: { color: '#852538', backgroundColor: '#fce8ec' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  between: { justifyContent: 'space-between' },
  spacing: { gap: 24 },
  summary: { flexDirection: 'row', alignItems: 'stretch' },
  metric: { flex: 1, gap: 4, padding: 16, minWidth: 0 },
  metricBorder: { borderRightWidth: 1, borderRightColor: ink.line },
  metricValue: { ...font, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'], fontWeight: '500' },
  metricLabel: { ...font, fontSize: 13, lineHeight: 18, color: ink.secondary },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: 12 },
  tabs: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ink.surface, padding: 4, borderRadius: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, minHeight: 36, justifyContent: 'center' },
  tabSelected: { backgroundColor: ink.white },
  tabText: { ...font, color: ink.secondary, fontSize: 14, lineHeight: 20 },
  tabTextSelected: { color: ink.accent, fontWeight: '600' },
  search: { flex: 1, minWidth: 196, maxWidth: 300 },
  searchCompact: { width: '100%' },
  list: { overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 16, minHeight: 44, borderTopWidth: 1, borderTopColor: ink.line, backgroundColor: ink.surface },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 8, minHeight: 68 },
  divider: { borderTopColor: ink.line, borderTopWidth: 1 },
  productCell: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 48, height: 48, backgroundColor: ink.surface, borderRadius: 6, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  flavorStripe: { position: 'absolute', width: 3, height: 16, left: 0, top: 16, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  listText: { flex: 1, minWidth: 0, gap: 3 },
  statusCol: { width: 88 },
  featuredCol: { width: 88 },
  orderCol: { width: 56 },
  actionCol: { width: 92, alignItems: 'flex-end' },
  tableLabel: { ...font, fontSize: 13, lineHeight: 20, color: ink.secondary, fontWeight: '600' },
  number: { ...font, fontSize: 14, lineHeight: 20, color: ink.secondary, fontVariant: ['tabular-nums'] },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: '#6b7d86' },
  activeDot: { backgroundColor: '#247954' },
  empty: { paddingHorizontal: 16, paddingVertical: 24, borderTopWidth: 1, borderTopColor: ink.line },
  formColumns: { gap: 16, marginTop: 16 },
  formWide: { flexDirection: 'row', alignItems: 'flex-start' },
  formLeft: { flex: 5, minWidth: 0 },
  formRight: { flex: 3, minWidth: 0 },
  fieldStack: { gap: 16 },
  section: { padding: 20, gap: 16 },
  preview: { height: 200, width: '100%', backgroundColor: ink.surface, borderRadius: 8 },
  media: { gap: 8 },
  switches: { gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  formFooter: { gap: 12, marginTop: 16 }
});
