# JogGelo

Vitrine de gelos saborizados em React Native com Expo para web, Android e iOS.

Use Node.js 22.13+ (22.x) ou 24.3+ (24.x), ou uma versão compatível mais recente, e instale as dependências com `npm ci`.

- `npm run web` inicia a versão web.
- `npm run android` e `npm run ios` abrem a vitrine no ambiente móvel configurado.
- `npm run build:web` gera o site estático em `dist/`.

O catálogo lê os produtos ativos de `public.produtos` e carrega as fotos do bucket público `produtos` do Supabase. Os arquivos GLB incluídos no app servem de alternativa quando o modelo correspondente ainda está fora do Storage.
