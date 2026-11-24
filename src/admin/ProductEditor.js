import { useEffect, useState } from 'react';
import { Image, Switch, Text, View, useWindowDimensions } from 'react-native';
import { encodePath, mediaUrl, slugPattern } from '../catalog';
import { palette } from '../styles';
import { makeSlug, pickMedia, saveProduct } from './data';
import { Button, Field, Notice, ui } from './ui';

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

  return (
    <>
      <View style={[ui.row, ui.between]}>
        <Text accessibilityRole="header" aria-level={1} style={ui.title}>{product.id ? 'Editar produto' : 'Novo produto'}</Text>
        <Button secondary disabled={busy} onPress={cancel}>Voltar à lista</Button>
      </View>
      <View style={[ui.panel, ui.form]}>
        <View style={[ui.formColumns, width > 780 && ui.formWide]}>
          <View style={width > 780 && ui.formLeft}>
            <Field label="Nome do sabor" value={draft.nome} editable={!busy} onChangeText={changeName} />
            <Field label="Endereço do produto (slug)" value={draft.slug} editable={!busy} autoCapitalize="none" autoCorrect={false}
              onChangeText={value => { setCustomSlug(true); change('slug', value); }} />
            <Field label="Resumo do catálogo" value={draft.resumo} editable={!busy} onChangeText={value => change('resumo', value)} />
            <Field label="Descrição" value={draft.descricao} multiline editable={!busy} onChangeText={value => change('descricao', value)} />
            <Field label="Sugestões de drinks (uma por linha)" value={draft.sugestoes_drinks} multiline editable={!busy}
              onChangeText={value => change('sugestoes_drinks', value)} />
            <Field label="Ordem no catálogo" value={draft.ordem} keyboardType="number-pad" editable={!busy} onChangeText={value => change('ordem', value)} />
            <Field label="Cor de destaque" value={draft.cor_destaque} autoCapitalize="none" editable={!busy} onChangeText={value => change('cor_destaque', value)} />
          </View>
          <View style={width > 780 && ui.formRight}>
            <View style={ui.media}>
              <Text style={ui.subtitle}>Embalagem</Text>
              {!!preview && <Image accessibilityLabel="Prévia da embalagem" source={{ uri: preview }} style={ui.preview} resizeMode="contain" />}
              <Button secondary disabled={busy} onPress={() => choose('image')}>{preview ? 'Trocar imagem' : 'Escolher imagem'}</Button>
              {!!image && <Text style={ui.body}>{image.name}</Text>}
              <Text style={ui.body}>JPG, PNG ou WebP, até 6 MB.</Text>
            </View>
            <View style={ui.media}>
              <Text style={ui.subtitle}>Modelo 3D</Text>
              <Text style={ui.body}>{model?.name || draft.modelo_3d_path?.split('/').pop() || 'Nenhum modelo selecionado.'}</Text>
              <Button secondary disabled={busy} onPress={() => choose('model')}>Escolher GLB</Button>
              {(model || draft.modelo_3d_path) && (
                <Button secondary disabled={busy} onPress={() => { setModel(null); change('modelo_3d_path', null); }}>Remover do produto</Button>
              )}
            </View>
            <View style={ui.switches}>
              <View style={ui.switchRow}>
                <Text style={ui.label}>Produto ativo</Text>
                <Switch accessibilityLabel="Produto ativo" disabled={busy} value={draft.ativo}
                  onValueChange={value => change('ativo', value)} trackColor={{ true: palette.cyan }} />
              </View>
              <View style={ui.switchRow}>
                <Text style={ui.label}>Em destaque na home</Text>
                <Switch accessibilityLabel="Em destaque na home" disabled={busy} value={draft.em_destaque}
                  onValueChange={value => change('em_destaque', value)} trackColor={{ true: palette.cyan }} />
              </View>
              <Text style={ui.body}>A home mostra até cinco produtos ativos em destaque, pela ordem do catálogo.</Text>
            </View>
          </View>
        </View>
        <Notice error>{error}</Notice>
        <Button busy={Boolean(progress)} disabled={picking} onPress={save} style={{ alignSelf: 'flex-start', marginTop: 14 }}>
          {progress || 'Salvar produto'}
        </Button>
      </View>
    </>
  );
}
