begin;

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome text not null check (btrim(nome) <> ''),
  resumo text not null check (btrim(resumo) <> ''),
  descricao text not null check (btrim(descricao) <> ''),
  cor_destaque text not null default '#049dd6'
    check (cor_destaque ~ '^#[0-9a-fA-F]{6}$'),
  sugestoes_drinks text[] not null default '{}',
  imagem_path text not null check (btrim(imagem_path) <> ''),
  modelo_3d_path text check (btrim(modelo_3d_path) <> ''),
  ordem integer not null default 0 check (ordem >= 0),
  em_destaque boolean not null default false,
  ativo boolean not null default false
);

comment on column public.produtos.imagem_path is
  'Caminho do arquivo da embalagem no bucket de mídia do catálogo.';
comment on column public.produtos.modelo_3d_path is
  'Caminho opcional do modelo GLB no mesmo bucket da imagem.';
comment on column public.produtos.em_destaque is
  'Inclui o produto na seleção de sabores em destaque na home.';

alter table public.produtos enable row level security;

revoke all on table public.produtos from public, anon, authenticated;
grant select on table public.produtos to anon, authenticated;

create policy produtos_ativos_visiveis
  on public.produtos
  for select
  to anon, authenticated
  using (ativo);

commit;
