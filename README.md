# JogGelo

Vitrine de gelos saborizados em React Native com Expo para web, Android e iOS.

Use Node.js 22.13+ (22.x) ou 24.3+ (24.x), ou uma versão compatível mais recente, e instale as dependências com `npm ci`.

- `npm run web` inicia a versão web.
- `npm run android` e `npm run ios` abrem a vitrine no ambiente móvel configurado.
- `npm run build:web` gera o site estático em `dist/`.

O catálogo lê os produtos ativos de `public.produtos` e carrega as fotos do bucket público `produtos` do Supabase. Os arquivos GLB incluídos no app servem de alternativa quando o modelo correspondente ainda está fora do Storage.

## Painel administrativo

Abra **Administração** no rodapé da vitrine ou acesse `/?admin=1` na web. No primeiro acesso, cadastre a conta com um e-mail autorizado, confirme o endereço e entre com a senha escolhida.

O painel permite cadastrar, editar e desativar produtos, controlar ordem e destaque e enviar imagens ou modelos GLB. As permissões são verificadas no Supabase. Os e-mails autorizados ficam em `joggelo_private.catalog_admin_emails` e são definidos pelo responsável pelo banco. A confirmação por e-mail deve permanecer ativa no Supabase Auth.

O desenho do painel segue o [Unslop](https://github.com/heydamir/unslop), de Damir Sokolovsky (CC BY 4.0).
