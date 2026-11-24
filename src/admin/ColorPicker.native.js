import Slider from '@react-native-community/slider';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ink, ui } from './ui';

const sliders = [
  ['hue', 'Matiz', 360],
  ['saturation', 'Saturação', 100],
  ['lightness', 'Luminosidade', 100]
];

function hexToHsl(hex) {
  const [red, green, blue] = hex.slice(1).match(/../g).map(channel => Number.parseInt(channel, 16) / 255);
  const high = Math.max(red, green, blue);
  const low = Math.min(red, green, blue);
  const range = high - low;
  const light = (high + low) / 2;
  if (range === 0) return { hue: 0, saturation: 0, lightness: light * 100 };

  const angle = high === red ? (green - blue) / range :
    high === green ? 2 + (blue - red) / range : 4 + (red - green) / range;
  return {
    hue: (angle * 60 + 360) % 360,
    saturation: range / (1 - Math.abs(2 * light - 1)) * 100,
    lightness: light * 100
  };
}

function hslToHex({ hue, saturation, lightness }) {
  const light = lightness / 100;
  const chroma = saturation / 100 * Math.min(light, 1 - light);
  const channel = offset => {
    const angle = (offset + hue / 30) % 12;
    const value = light - chroma * Math.max(-1, Math.min(angle - 3, 9 - angle, 1));
    return Math.round(255 * value).toString(16).padStart(2, '0');
  };
  return '#' + channel(0) + channel(8) + channel(4);
}

export default function ColorPicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const channels = useRef(null);
  const initial = useRef(null);

  function toggle() {
    if (!open) {
      initial.current = hexToHsl(value);
      channels.current = { ...initial.current };
    }
    setOpen(!open);
  }

  return (
    <View style={ui.field}>
      <Text style={ui.label}>Cor de destaque</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Escolher cor de destaque"
        accessibilityState={{ expanded: open, disabled }} onPress={toggle} disabled={disabled}
        style={[picker.control, disabled && ui.dim]}>
        <View style={[picker.swatch, { backgroundColor: value }]} />
        <Text style={ui.label}>{open ? 'Fechar seletor' : 'Escolher cor'}</Text>
        <Text style={[ui.meta, picker.hex]}>{value.toUpperCase()}</Text>
      </Pressable>
      {open && (
        <View style={[ui.panel, picker.sliders]}>
          {sliders.map(([key, label, maximumValue]) => (
            <View key={key}>
              <Text style={ui.label}>{label}</Text>
              <Slider accessibilityLabel={label} minimumValue={0} maximumValue={maximumValue}
                disabled={disabled} minimumTrackTintColor={ink.accent}
                value={initial.current[key]}
                onValueChange={amount => {
                  channels.current[key] = amount;
                  onChange(hslToHex(channels.current));
                }} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const picker = StyleSheet.create({
  control: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44,
    paddingHorizontal: 12, paddingVertical: 6, borderColor: '#c0cdd4', borderWidth: 1,
    backgroundColor: ink.white, borderRadius: 8 },
  swatch: { width: 26, height: 26, borderRadius: 5, borderColor: '#172a3633', borderWidth: 1 },
  hex: { marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  sliders: { padding: 12, gap: 12 }
});
