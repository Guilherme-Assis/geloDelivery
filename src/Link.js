import { Linking, Platform, Pressable } from 'react-native';
import { styles } from './styles';

const web = Platform.OS === 'web';

export default function Link({ href, action, style, children, ...props }) {
  return (
    <Pressable
      {...props}
      {...(web ? { href } : {})}
      accessibilityRole="link"
      onPress={event => {
        if (web && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
        event.preventDefault?.();
        if (action) action();
        else Linking.openURL(href).catch(() => {});
      }}
      style={state => [style, state.pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}
