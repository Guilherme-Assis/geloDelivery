export const supabaseUrl = 'https://ziacmlaeuzsolillqkka.supabase.co';
export const publishableKey = 'sb_publishable_BpvDosVttxtm5UPXepQ6lw_sKBKjXUj';
export const mediaUrl = `${supabaseUrl}/storage/v1/object/public/produtos/`;

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function encodePath(path) {
  if (!path) return '';
  const parts = path.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) return '';
  return parts.map(encodeURIComponent).join('/');
}

export async function loadFlavors(slug, signal) {
  const fields = 'id,slug,nome,resumo,descricao,cor_destaque,sugestoes_drinks,imagem_path,modelo_3d_path,em_destaque,preco_centavos,preco_final_centavos';
  const selection = slug ? 'slug=eq.' + encodeURIComponent(slug) : 'order=ordem.asc,slug.asc';
  const response = await fetch(supabaseUrl + '/rest/v1/produtos?select=' + fields + '&ativo=eq.true&' + selection, {
    headers: { apikey: publishableKey },
    signal
  });
  if (!response.ok) throw new Error('Supabase respondeu com HTTP ' + response.status);

  return (await response.json()).map(record => {
    const image = encodePath(record.imagem_path);
    return {
      id: record.slug,
      productId: record.id,
      name: record.nome,
      summary: record.resumo,
      description: record.descricao,
      color: /^#[0-9a-f]{6}$/i.test(record.cor_destaque) ? record.cor_destaque : '#049dd6',
      pairings: record.sugestoes_drinks.filter(pairing => typeof pairing === 'string' && pairing.trim()),
      imageUrl: image ? mediaUrl + image : '',
      modelPath: encodePath(record.modelo_3d_path),
      featured: record.em_destaque,
      originalPriceCents: record.preco_centavos ?? null,
      priceCents: record.preco_final_centavos ?? null
    };
  });
}
