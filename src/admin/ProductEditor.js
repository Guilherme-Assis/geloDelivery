import ImagePlus from 'lucide-react-native/icons/image-plus';
import List from 'lucide-react-native/icons/list';
import Save from 'lucide-react-native/icons/save';
import Upload from 'lucide-react-native/icons/upload';
import { useEffect, useState } from 'react';
import { Image, Switch, Text, View, useWindowDimensions } from 'react-native';
import { encodePath, mediaUrl, slugPattern } from '../catalog';
import { makeSlug, pickMedia, saveProduct } from './data';
import { Button, Field, Notice, ink, ui } from './ui';

export default function ProductEditor({ product, cancel, saved }) {
  const { width } = useWindowDimensions();
  const [draft, setDraft] = useState({
    ...product,
    ordem: String(product.ordem),
    sugestoes_drinks: product.sugestoes_drinks.join('\n')
  });
  const [customSlug, setCustomSlug] = useState(Boolean(product.id));
  const [image, setImage] = useState(null);
  const [model, setModel] = useState(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const busy = Boolean(progress) || picking;
  const change = (field, value) => setDraft(current => ({ ...current, [field]: value }));
  const originalImage = encodePath(draft.imagem_path);
  const preview = image?.file.uri || (originalImage ? mediaUrl + originalImage : null);

  useEffect(() => () => {
    if (image?.file.uri.startsWith('blob:')) URL.revokeObjectURL(image.file.uri);
  }, [image]);
  useEffect(() => () => {
    if (model?.file.uri.startsWith('blob:')) URL.revokeObjectURL(model.file.uri);
  }, [model]);

  function changeName(value) {
    setDraft(current => ({ ...current, nome: value, slug: customSlug ? current.slug : makeSlug(value) }));
  }

  async function choose(kind) {
    setError('');
    setPicking(true);
    try {
      const media = await pickMedia(kind);
      if (media) (kind === 'image' ? setImage : setModel)(media);
    } catch (failure) {
      setError(failure.message || 'Não foi possível selecionar o arquivo.');
    } finally {
      setPicking(false);
    }
  }

  async function save() {
    if (busy) return;
    setError('');
    const input = {
      slug: draft.slug.trim(),
      nome: draft.nome.trim(),
      resumo: draft.resumo.trim(),
      descricao: draft.descricao.trim(),
      cor_destaque: draft.cor_destaque.trim(),
      sugestoes_drinks: draft.sugestoes_drinks.split('\n').map(value => value.trim()).filter(Boolean),
      imagem_path: draft.imagem_path,
      modelo_3d_path: draft.modelo_3d_path,
      ordem: Number(draft.ordem),
      em_destaque: draft.em_destaque,
      ativo: draft.ativo
    };
    if (!input.nome || !input.resumo || !input.descricao) return setError('Preencha nome, resumo e descrição.');
    if (!slugPattern.test(input.slug)) return setError('Use letras minúsculas, números e hífens no endereço do produto.');
    if (!/^#[0-9a-f]{6}$/i.test(input.cor_destaque)) return setError('Use uma cor no formato #049dd6.');
    if (!/^\d+$/.test(draft.ordem) || input.ordem > 2147483647) return setError('Informe uma posição válida, começando por zero.');
    if (!input.imagem_path && !image) return setError('Selecione uma imagem da embalagem.');

    setProgress('Salvando produto…');
    try {
      const row = await saveProduct(product, input, image, model, setProgress);
      saved(row);
    } catch (failure) {
      setError(failure.message || 'Não foi possível salvar o produto.');
    } finally {
      setProgress('');
    }
  }

  const wide = width >= 1120;
  const saveButton = (
    <Button icon={Save} busy={Boolean(progress)} disabled={picking} onPress={save}>
      {progress || 'Salvar produto'}
    </Button>
  );

  return (
    <>
      <View style={[ui.row, ui.between]}>
        <View>
          <Text accessibilityRole="header" aria-level={1} style={ui.title}>{product.id ? 'Editar produto' : 'Novo produto'}</Text>
          {product.id ? <Text style={ui.meta}>{product.nome}</Text> : null}
        </View>
        <View style={ui.row}>
          <Button secondary icon={List} disabled={busy} onPress={cancel}>Voltar à lista</Button>
          {wide && saveButton}
        </View>
      </View>
      {wide && error ? <View style={ui.formFooter}><Notice error>{error}</Notice></View> : null}
      <View style={[ui.formColumns, wide && ui.formWide]}>
        <View style={[ui.fieldStack, wide && ui.formLeft]}>
          <View style={[ui.panel, ui.section]}>
            <Text accessibilityRole="header" aria-level={2} style={ui.subtitle}>Informações do sabor</Text>
            <Field label="Nome do sabor" value={draft.nome} editable={!busy} onChangeText={changeName} />
            <Field label="Endereço do produto (slug)" value={draft.slug} editable={!busy} autoCapitalize="none" autoCorrect={false}
              onChangeText={value => { setCustomSlug(true); change('slug', value); }} />
            <Field label="Resumo do catálogo" value={draft.resumo} editable={!busy} onChangeText={value => change('resumo', value)} />
            <Field label="Descrição" value={draft.descricao} multiline editable={!busy} onChangeText={value => change('descricao', value)} />
            <Field label="Sugestões de drinks (uma por linha)" value={draft.sugestoes_drinks} multiline editable={!busy}
              onChangeText={value => change('sugestoes_drinks', value)} />
          </View>
          <View style={[ui.panel, ui.section]}>
            <Text accessibilityRole="header" aria-level={2} style={ui.subtitle}>Apresentação na vitrine</Text>
            <Field label="Ordem no catálogo" value={draft.ordem} keyboardType="number-pad" editable={!busy}
              onChangeText={value => change('ordem', value)} />
            <Field label="Cor de destaque" value={draft.cor_destaque} autoCapitalize="none" editable={!busy}
              onChangeText={value => change('cor_destaque', value)} />
          </View>
        </View>
        <View style={[ui.fieldStack, wide && ui.formRight]}>
          <View style={[ui.panel, ui.section]}>
            <Text accessibilityRole="header" aria-level={2} style={ui.subtitle}>Embalagem</Text>
            {!!preview && <Image accessibilityLabel="Prévia da embalagem" source={{ uri: preview }} style={ui.preview} resizeMode="contain" />}
            <View style={ui.media}>
              <Button secondary icon={ImagePlus} disabled={busy} onPress={() => choose('image')}>{preview ? 'Trocar imagem' : 'Escolher imagem'}</Button>
              {!!image && <Text style={ui.body}>{image.name}</Text>}
              <Text style={ui.meta}>JPG, PNG ou WebP, até 6 MB</Text>
            </View>
            <View style={ui.media}>
              <Text style={ui.label}>Modelo 3D</Text>
              <Text style={ui.meta}>{model?.name || draft.modelo_3d_path?.split('/').pop() || 'Sem modelo 3D'}</Text>
              <Button secondary icon={Upload} disabled={busy} onPress={() => choose('model')}>Escolher GLB</Button>
              {(model || draft.modelo_3d_path) && (
                <Button quiet disabled={busy} onPress={() => { setModel(null); change('modelo_3d_path', null); }}>Remover do produto</Button>
              )}
            </View>
          </View>
          <View style={[ui.panel, ui.section]}>
            <Text accessibilityRole="header" aria-level={2} style={ui.subtitle}>Publicação</Text>
            <View style={ui.switches}>
              <View style={ui.switchRow}>
                <Text style={ui.label}>Produto ativo</Text>
                <Switch accessibilityLabel="Produto ativo" disabled={busy} value={draft.ativo}
                  onValueChange={value => change('ativo', value)} trackColor={{ true: ink.accent }} />
              </View>
              <View style={ui.switchRow}>
                <Text style={ui.label}>Em destaque na home</Text>
                <Switch accessibilityLabel="Em destaque na home" disabled={busy} value={draft.em_destaque}
                  onValueChange={value => change('em_destaque', value)} trackColor={{ true: ink.accent }} />
              </View>
              <Text style={ui.meta}>A home mostra até cinco produtos ativos em destaque, pela ordem do catálogo.</Text>
            </View>
          </View>
        </View>
      </View>
      {!wide ? (
        <View style={ui.formFooter}>
          <Notice error>{error}</Notice>
          {saveButton}
        </View>
      ) : null}
    </>
  );
}
