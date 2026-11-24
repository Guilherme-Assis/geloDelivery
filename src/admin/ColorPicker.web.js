import { Text, View } from 'react-native';
import { ink, ui } from './ui';

export default function ColorPicker({ value, onChange, disabled }) {
  return (
    <View style={ui.field}>
      <Text style={ui.label}>Cor de destaque</Text>
      <label className="admin-accent-picker" style={{ ...picker.control, opacity: disabled ? 0.6 : 1 }}>
        <span aria-hidden style={{ ...picker.swatch, backgroundColor: value }} />
        <span>Escolher cor</span>
        <span aria-hidden style={picker.hex}>{value.toUpperCase()}</span>
        <input type="color" aria-label="Cor de destaque" value={value} disabled={disabled}
          onInput={event => onChange(event.currentTarget.value)}
          style={{ ...picker.input, cursor: disabled ? 'default' : 'pointer' }} />
      </label>
    </View>
  );
}

const picker = {
  control: {
    position: 'relative', display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
    boxSizing: 'border-box', padding: '6px 12px', border: '1px solid #c0cdd4', borderRadius: 8,
    background: ink.white, color: ink.text, font: '600 14px SpaceGrotesk, sans-serif'
  },
  swatch: { width: 26, height: 26, flexShrink: 0, borderRadius: 5, border: '1px solid rgba(23, 42, 54, .2)' },
  hex: { marginLeft: 'auto', color: ink.muted, fontSize: 13, fontVariantNumeric: 'tabular-nums' },
  input: { position: 'absolute', inset: 0, height: '100%', width: '100%', opacity: 0 }
};
