import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { publishableKey, supabaseUrl } from '../catalog';

const native = Platform.OS !== 'web';
export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    ...(native ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !native,
    flowType: 'pkce'
  }
});

export const fields = 'id,slug,nome,resumo,descricao,cor_destaque,sugestoes_drinks,imagem_path,modelo_3d_path,ordem,em_destaque,ativo,revisao';
export const blankProduct = ordem => ({
  slug: '', nome: '', resumo: '', descricao: '', cor_destaque: '#049dd6',
  sugestoes_drinks: [], imagem_path: '', modelo_3d_path: null, ordem,
  em_destaque: false, ativo: false
});

export function makeSlug(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function fetchProducts() {
  const { data, error } = await supabase.from('produtos').select(fields).order('ordem').order('slug');
  if (error) throw error;
  return data;
}

const formats = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', glb: 'model/gltf-binary' };
const maxFileSize = 6 * 1024 * 1024;

export async function pickMedia(kind) {
  const result = await DocumentPicker.getDocumentAsync({
    type: kind === 'image' ? [formats.jpg, formats.png, formats.webp] : '*/*',
    copyToCacheDirectory: true
  });
  if (result.canceled) return null;
  const file = result.assets[0];
  const extension = file.name.split('.').pop().toLowerCase().replace(/^jpeg$/, 'jpg');
  const valid = kind === 'image' ? ['jpg', 'png', 'webp'].includes(extension) : extension === 'glb';
  if (!valid) throw new Error(kind === 'image' ? 'Escolha uma imagem JPG, PNG ou WebP.' : 'Escolha um arquivo GLB.');
  if (file.size > maxFileSize) throw new Error('Escolha um arquivo de até 6 MB.');
  return {
    file, extension, name: file.name,
    path: 'catalogo/' + randomUUID() + '.' + extension,
    uploaded: false
  };
}

function matchesFormat(buffer, extension) {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 12));
  const text = (...codes) => String.fromCharCode(...codes);
  if (extension === 'jpg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (extension === 'png') return bytes[0] === 137 && text(...bytes.slice(1, 4)) === 'PNG';
  if (extension === 'webp') return text(...bytes.slice(0, 4)) === 'RIFF' && text(...bytes.slice(8, 12)) === 'WEBP';
  return text(...bytes.slice(0, 4)) === 'glTF' && bytes[4] === 2;
}

async function uploadMedia(media) {
  if (media.uploaded) return media.path;
  const content = media.file.file ? await media.file.file.arrayBuffer() : await new File(media.file.uri).arrayBuffer();
  if (content.byteLength > maxFileSize) throw new Error('Escolha um arquivo de até 6 MB.');
  if (!matchesFormat(content, media.extension)) throw new Error('O conteúdo de ' + media.name + ' não corresponde ao formato escolhido.');
  const { error } = await supabase.storage.from('produtos').upload(media.path, content, {
    contentType: formats[media.extension], cacheControl: '31536000', upsert: false
  });
  if (error && Number(error.statusCode || error.status) !== 409) throw error;
  media.uploaded = true;
  return media.path;
}

export async function saveProduct(original, input, image, model, onProgress) {
  const updated = { ...input };
  if (image) {
    onProgress('Enviando imagem…');
    updated.imagem_path = await uploadMedia(image);
  }
  if (model) {
    onProgress('Enviando modelo 3D…');
    updated.modelo_3d_path = await uploadMedia(model);
  }
  onProgress('Salvando produto…');

  const table = supabase.from('produtos');
  const write = original.id
    ? table.update(updated).eq('id', original.id).eq('revisao', original.revisao)
    : table.insert(updated);
  const { data, error } = await write.select(fields).maybeSingle();
  if (error?.code === '23505') throw new Error('Esse endereço de produto já está em uso. Escolha outro.');
  if (error) throw error;
  if (!data) throw new Error('O produto mudou em outra sessão. Volte à lista e reabra o produto antes de salvar.');
  return data;
}
