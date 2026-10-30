# OpenGeoaltitude — Roadmap de Aplicativos (multiplataforma)

> Como o mesmo código vira **web, Android (Play Store), Windows, macOS, Linux** e — no futuro — iOS.
> Princípios: **a web é a fonte da verdade** (o site em `ils15.github.io/geoaltitude` é o produto),
> os empacotadores só o embrulham; **zero servidor**; **versionamento SemVer** com releases por tag.

## Visão geral e status

| # | Alvo | Empacotamento | Status | Pré-requisito externo |
|---|---|---|---|---|
| D1 | **Web + GitHub Releases** | Build estático zippado por tag | ✅ **ativo** (`release.yml`) | — |
| D2 | **Android — APK local** | TWA (Bubblewrap) ou Capacitor; alternativa sem SDK: **PWABuilder.com** | 🔜 pronto para executar | JDK 17 + Android SDK (só se buildar localmente) |
| D3 | **Android — Play Store** | O mesmo APK/AAB da D2 (AAB exigido pela Play) | ⏳ aguardando conta | Conta Play (US$ 25 única) + D-U-N-S (organização) ou teste fechado 20×14d (pessoal) |
| D4 | **Windows** | 1º: PWA na **Microsoft Store**; 2º: **Tauri** (.msi/.exe) | 🔜 planejado | Conta MS Store (US$ 19 única) |
| D5 | **macOS / Linux** | Tauri (dmg/AppImage, build no CI) | ⏳ futuro | Certificados de assinatura (opcional) |
| D6 | **iOS** | Capacitor/Tauri mobile | ⏳ futuro | Conta Apple (US$ 99/**ano**) + Mac para build |

**Custo total das lojas principais**: US$ 25 (Google, única) + US$ 19 (Microsoft, única) = **US$ 44**.
D-U-N-S: **gratuito** na D&B (`dnb.com.br`) — só necessário para conta de organização no Google.

---

## Versionamento e releases

- **SemVer**: `MAJOR.MINOR.PATCH` — muda o MAJOR só se quebrar compatibilidade de arquivos `.geoalt.json`/DXF;
- **Tags** `vX.Y.Z` disparam o workflow `release.yml` → cria a **GitHub Release** com notas automáticas e anexa o `opengeoaltitude-selfhost-vX.Y.Z.zip` (build web para self-host);
- **`CHANGELOG.md`** registra o que mudou em cada versão (atualizar junto com a tag);
- O número de versão exibido no app deve acompanhar o `package.json` (`version`).

### Checklist de release (a cada versão)
1. Atualizar `CHANGELOG.md` (seção `[não lançado]` → versão nova);
2. `npm version patch|minor|major` (sobe o `package.json` e cria o commit);
3. `git push origin main --tags`;
4. Conferir a Release gerada em `github.com/ils15/geoaltitude/actions`;
5. O deploy do site acontece pelo CI normal (todo push em `main`).

---

## D2 — Android: gerar o APK **local** (sem loja, sem D-U-N-S)

Dois caminhos; o **B** não exige instalar nada no computador.

### Caminho A — PWABuilder (recomendado, zero SDK)
1. Acesse `pwabuilder.com` e informe `https://ils15.github.io/geoaltitude/`;
2. O serviço valida o manifest (já aprovado no Lighthouse) → aba **Android** → **Download**;
3. Você recebe um pacote com **APK assinado de teste + AAB** e o conteúdo do `assetlinks.json`;
4. Instalar o APK no celular: habilitar "fontes desconhecidas" e abrir o arquivo.

### Caminho B — Bubblewrap local (controle total)
1. Instalar JDK 17 + Android SDK cmdline-tools (+ `sdkmanager "platforms;android-35" "build-tools;35.0.0"`);
2. `npm i -g @bubblewrap/cli`;
3. `bubblewrap init --manifest https://ils15.github.io/geoaltitude/manifest.webmanifest`
   (gera `twa-manifest.json` e keystore — **guardar o keystore e as senhas**);
4. `bubblewrap build` → gera `app-release-signed.apk` e `app-release-bundle.aab`.

### Vincular o site ao app (Digital Asset Links)
- Pegar o **SHA-256 do certificado**: `keytool -list -printcert -jarfile app-release-signed.apk`;
- Preencher `docs/android/assetlinks.example.json` (pacote sugerido: `io.github.ils15.opengeoaltitude`) e publicar como
  `.well-known/assetlinks.json` na raiz do site (o CI copia `public/` → basta colocar em `public/.well-known/`);
- Sem esse arquivo o app funciona, mas mostra a barra de URL do navegador.

---

## D3 — Google Play Store

| Requisito | Detalhe |
|---|---|
| Conta | US$ 25 **única**, apps ilimitados |
| Organização | exige **D-U-N-S** (grátis na D&B, `dnb.com.br`, ~2–4 semanas) e **dispensa** o teste fechado |
| Pessoal | sem D-U-N-S, mas exige **teste fechado com 20 testadores por 14 dias** antes de produção |
| Formato | **AAB** (não APK) |
| Privacidade | URL pública: `https://ils15.github.io/geoaltitude/privacidade.html` ✅ (já publicada) |
| Segurança de dados | "Não coletamos dados" + declarar serviços de terceiros (IBGE/OSM/Open-Meteo) conforme `privacidade.html` |
| Listagem | Ícones PNG 512 (converter do `favicon.svg`), 2+ screenshots de celular, descrição curta/completa, categoria Ferramentas |
| Risco de revisão | TWA de site pode ser questionado (política 10.2) — defesa: uso offline real, PWA quality, ferramenta técnica |

**Ordem sugerida**: D2 (APK local já) → criar conta (pessoal ou organização p/ D-U-N-S) → teste fechado (se pessoal) → produção.

---

## D4 — Windows

1. **Microsoft Store via PWA** (caminho mais barato): submeter a URL em `partner.microsoft.com` (conta MS US$ 19 única) — a Store hospeda o PWA e o instalador é transparente;
2. **Tauri v2** (instalador próprio ~10 MB):
   - `npm i -D @tauri-apps/cli && npx tauri init` (frontend dist = `../dist`, sem dev server em produção);
   - Build no CI em runner `windows-latest` → anexar `.msi`/`.exe` à mesma Release da tag;
   - Sem assinatura de código, o SmartScreen avisa — assinar (certificado próprio) ou usar a Store.

## D5 — macOS / Linux (Tauri)
- Mesmos comandos do Tauri em runners `macos-latest` / `ubuntu-latest` → `.dmg` / `.AppImage` anexados à Release;
- Notarização do macOS exige conta Apple — opcional para distribuição via GitHub.

## D6 — iOS (futuro)
- Capacitor ou Tauri mobile; exige conta Apple Developer (US$ 99/ano) e Mac para build.
- Enquanto isso: o PWA instala em iPhone via "Adicionar à Tela de Início" (já funciona).

---

## Custos consolidados

| Item | Valor | Frequência |
|---|---|---|
| Google Play Console | US$ 25 | única |
| Microsoft Store | US$ 19 | única |
| D-U-N-S (D&B) | R$ 0 | única |
| Apple (só se iOS) | US$ 99 | **anual** |
| GitHub Releases/CI | R$ 0 (repositório público) | — |

## Pendências vivas
- [ ] D2: gerar o primeiro APK (PWABuilder — 10 min, sem instalar nada);
- [ ] D2: publicar `.well-known/assetlinks.json` após ter o SHA-256 do certificado;
- [ ] D3: criar conta Play (pessoal agora / organização quando o D-U-N-S chegar);
- [ ] D4: submeter o PWA à Microsoft Store;
- [ ] Ícones PNG 192/512 derivados do `favicon.svg` (exigência da Play — SVG não serve lá).
