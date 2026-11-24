import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { mediaUrl } from './catalog';
import { bundledModels, modelViewerScript } from './modelAssets';

export default function ModelPreview({ flavor, height, onError }) {
  const view = useRef(null);
  const triedLocal = useRef(false);
  const source = useMemo(() => ({
    html: `<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Embalagem 3D</title><style>
        html,body,model-viewer{width:100%;height:100%;padding:0;margin:0;display:block;background:transparent}
        model-viewer{--poster-color:transparent}
      </style>
      <model-viewer alt="Modelo 3D da embalagem" camera-controls touch-action="pan-y"
        camera-orbit="13deg 84deg auto" interaction-prompt="none"></model-viewer>
      <script>
        const viewer = document.querySelector('model-viewer');
        const chunks = [];
        window.addModelChunk = chunk => chunks.push(chunk);
        window.showBundledModel = () => {
          const bytes = Uint8Array.from(atob(chunks.join('')), char => char.charCodeAt(0));
          chunks.length = 0;
          const url = URL.createObjectURL(new Blob([bytes], {type:'model/gltf-binary'}));
          viewer.setAttribute('src', url);
        };
        viewer.addEventListener('error', () => ReactNativeWebView.postMessage('model-error'));
        viewer.setAttribute('src', ${JSON.stringify(mediaUrl + flavor.modelPath)});
        viewer.setAttribute('poster', ${JSON.stringify(flavor.imageUrl)});
      </script>
      <script type="module" src="${modelViewerScript}" onerror="ReactNativeWebView.postMessage('script-error')"></script>
    </html>`
  }), [flavor]);

  async function onMessage(event) {
    const message = event.nativeEvent.data;
    if (message === 'script-error') return onError();
    if (message !== 'model-error') return;
    const localModel = bundledModels[flavor.modelPath];
    if (triedLocal.current || !localModel) return onError();
    triedLocal.current = true;
    try {
      const [asset] = await Asset.loadAsync(localModel);
      const base64 = await new File(asset.localUri).base64();
      const size = 32000;
      for (let offset = 0; offset < base64.length; offset += size) {
        view.current?.injectJavaScript(`window.addModelChunk(${JSON.stringify(base64.slice(offset, offset + size))});true;`);
      }
      view.current?.injectJavaScript('window.showBundledModel();true;');
    } catch {
      onError();
    }
  }

  return (
    <WebView
      ref={view}
      originWhitelist={['*']}
      source={source}
      style={{ height, backgroundColor: 'transparent' }}
      containerStyle={{ flex: 0, width: '100%' }}
      scrollEnabled={false}
      onMessage={onMessage}
      onError={onError}
    />
  );
}
