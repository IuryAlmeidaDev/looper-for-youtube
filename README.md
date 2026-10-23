# 🔁 Looper for YouTube - Music & Video Repeat

> **Extensão leve, elegante e de alta performance para repetição contínua, Mini Player flutuante sempre no topo (*Document Picture-in-Picture*) e reprodução sem anúncios no YouTube.**

![Manifest V3](https://img.shields.io/badge/Manifest-V3-success?style=flat-square)
![Versão](https://img.shields.io/badge/Versão-1.1.0-brightgreen?style=flat-square)
![Plataforma](https://img.shields.io/badge/Plataforma-Chromium-blue?style=flat-square)
![Privacidade](https://img.shields.io/badge/Privacidade-100%25%20Local-brightgreen?style=flat-square)
![Sem Dependências](https://img.shields.io/badge/Dependências-Zero-blueviolet?style=flat-square)

---

## 📖 Visão Geral

O **Looper for YouTube** transforma a sua experiência no YouTube (`https://www.youtube.com`), integrando três pilares essenciais diretamente na interface nativa do player:

1. **Repetição Contínua Automática**: Botão de loop integrado e atalho de teclado para ouvir músicas, batidas lo-fi de estudo ou tutoriais em repetição contínua sem interrupções.
2. **Mini Player Flutuante (*Document Picture-in-Picture*)**: Janela flutuante real mantida sempre no topo pelo sistema operacional (estilo "Always-on-Top"), com sincronização bidirecional de reprodução em tempo real e alternância entre os modos **Pílula** e **Expandido**.
3. **Motor Ad Destroyer**: Detecção e aceleração ultrarrápida (16x + mudo instantâneo) de propagandas e fechamento automático de banners, garantindo foco total nas suas faixas.

Projetada rigorosamente no modelo **Manifest V3**, a extensão é 100% client-side, opera com zero dependências externas e tem impacto residual imperceptível na CPU e na memória.

---

## ✨ Recursos Principais

### 🔁 Repetição de Áudio e Vídeo
- 🔘 **Botão Nativo Integrado**: Inserido na barra inferior esquerda (`.ytp-left-controls`), ao lado dos botões de reprodução e volume, com ícone vetorial SVG e ponto luminoso de estado ativo.
- ⚡ **Atalho Rápido (`Shift + L`)**: Ative ou desative o modo de repetição instantaneamente em qualquer aba ou modo de tela cheia.
- 💬 **Feedback com Notificação Toast**: Aviso flutuante elegante na área do vídeo informando `"Repetição ativada (Shift+L)"` ou `"Repetição desativada (Shift+L)"`.
- 🚀 **Redundância Dupla de Repetição**: Sincroniza a propriedade nativa `video.loop = true` do HTML5 e conta com um listener de fallback para o evento `ended`, garantindo que streams com buffers DASH/HLS nunca congelem no final da faixa.

### 🪟 Mini Player Flutuante (*Document Picture-in-Picture*)
- 📌 **Always on Top Real**: Abre uma janela flutuante independente mantida no topo de qualquer outro software ou aplicativo aberto no seu computador através da API `documentPictureInPicture`.
- ⚡ **Atalho Dedicado (`Shift + P`)**: Abra ou foque a janela PiP instantaneamente, ou use o botão flutuante integrado ao player do YouTube.
- 💊 **Modo Pílula (~54px de altura, 340px de largura)**: Interface ultra-compacta inspirada em tocadores modernos de podcast/música. Exibe o título da faixa em reprodução, botão de voltar/início, play/pause, avançar, alternar repetição contínua, botão para expandir e botão de fechar.
- 🖼️ **Modo Expandido (~180px de altura, 340px de largura)**: Visão completa com capa/miniatura (*thumbnail*), título, nome do canal, barra de progresso interativa para avanço rápido (*seek/scrubbing* com proteção contra descarte durante arraste), tempo decorrido e total.
- 🔄 **Sincronização Bidirecional Contínua**: Alterações feitas no Mini Player (play, pause, avanço, loop) refletem imediatamente no player da aba principal e vice-versa.
- 💾 **Memória de Modo**: Lembra se você prefere o modo Pílula ou Expandido entre as sessões.

### 🛡️ Motor Ad Destroyer
- ⚡ **Detecção em Tempo Real**: Monitora dinamicamente a reprodução de blocos de anúncios (`.ad-interrupting`, `.html5-video-player.ad-showing`).
- ⏩ **Aceleração 16x & Mute Automático**: Silencia instantaneamente o áudio da propaganda e avança a velocidade para 16x, saltando direto para o final em milissegundos.
- 🎯 **Clique Automático em "Pular Anúncio"**: Pressiona imediatamente os botões `.ytp-ad-skip-button`, `.ytp-ad-skip-button-modern` e fecha sobreposições de banners.
- 🔊 **Restauração Transparente**: Retorna o volume e a velocidade originais do seu vídeo imediatamente quando o conteúdo principal é retomado.

### 🛡️ Segurança e Usabilidade
- 🛡️ **Prevenção contra Digitação Acidental**: Atalhos `Shift + L` e `Shift + P` são ignorados quando o cursor estiver em caixas de comentários, barra de pesquisa ou áreas de texto editáveis (`contenteditable`).
- 🔄 **Compatibilidade com YouTube SPA**: Gerencia mudanças de rota sem recarregamento (`yt-navigate-finish`), mantendo os botões injetados e metadados sincronizados.
- 🔒 **Privacidade Absoluta**: Sem telemetria, sem coleta de dados e sem conexão com servidores de terceiros.

---

## 📥 Como Instalar (Navegadores Chromium)

Compatível com **Google Chrome**, **Microsoft Edge**, **Brave Browser**, **Opera / Opera GX**, **Vivaldi** e outros navegadores Chromium.

### Passo 1: Abrir a Central de Extensões

Digite o endereço correspondente na barra de endereços do seu navegador e pressione `Enter`:

| Navegador | URL de Acesso Direto |
| :--- | :--- |
| **Google Chrome** | `chrome://extensions/` |
| **Microsoft Edge** | `edge://extensions/` |
| **Brave Browser** | `brave://extensions/` |
| **Opera / Opera GX** | `opera://extensions` |
| **Vivaldi** | `vivaldi://extensions/` |

---

### Passo 2: Ativar o Modo do Desenvolvedor

No canto superior direito da página de extensões, ative a chave seletora **"Modo do desenvolvedor"** (*Developer mode*).

---

### Passo 3: Carregar a Extensão sem Compactação

1. Clique no botão **"Carregar sem compactação"** (*Load unpacked*).
2. Selecione a pasta da extensão:
   ```text
   C:\Users\03573608183\youtube-loop-extension
   ```
3. Clique em **"Selecionar pasta"**.

---

### Passo 4: Pronto!

O card **Looper for YouTube** (v1.1.0) estará ativo. Abra o [YouTube](https://www.youtube.com), reproduza qualquer vídeo e aproveite todos os controles!

---

## 🎮 Como Usar

### 1. Repetição Contínua (Loop)
- **Pelo Botão**: Clique no ícone de repetição na barra de controles do vídeo (ele ficará vermelho vívido `#ff0000`).
- **Pelo Atalho**: Pressione `Shift + L` a qualquer momento.

### 2. Mini Player Flutuante (Picture-in-Picture)
- **Pelo Botão**: Clique no ícone do Mini Player flutuante posicionado logo após o botão de loop.
- **Pelo Atalho**: Pressione `Shift + P` para abrir a janela flutuante sempre no topo.
- **Alternar Modos**: Clique no botão central de alternância (`▲` para expandir ou `▼` para recolher em pílula).
- **Controle de Faixa**:
  - `⏮`: Se o vídeo tiver passado de 3 segundos, volta ao início; caso contrário, vai para o vídeo anterior da playlist/histórico.
  - `⏯`: Alterna entre Play e Pause.
  - `⏭`: Pula para o próximo vídeo da fila ou recomendação.
  - `🔁`: Alterna a repetição contínua em tempo real.
  - Barra de Progresso (no Modo Expandido): Clique ou arraste para navegar no vídeo.

---

## ⌨️ Tabela de Atalhos e Controles

| Ação | Método | Descrição |
| :--- | :---: | :--- |
| **Alternar Repetição** | `Shift + L` | Alterna entre loop ativado e desativado instantaneamente. |
| **Abrir/Focar Mini Player** | `Shift + P` | Abre a janela flutuante Always-on-Top ou traz o foco para ela. |
| **Controles pelo Mouse** | Botões no Player | Botões dedicados de Loop e Mini Player na barra inferior do vídeo. |
| **Alternar Modo do Mini Player** | Botão `▲ / ▼` | Alterna entre o Modo Pílula (~54px) e o Modo Expandido (~180px). |
| **Digitação Segura** | Automático | Atalhos são ignorados durante a escrita de comentários ou pesquisas. |
| **Persistência de Preferências** | Automático | Salva estado do loop e último modo do Mini Player para vídeos futuros. |
| **Ad Destroyer** | Automático | Acelera anúncios para 16x com mute automático e pula no primeiro instante possível. |

---

## ❓ Solução de Dúvidas (Troubleshooting)

### A janela do Mini Player não abre
- Certifique-se de estar usando uma versão moderna do navegador baseada em Chromium que suporte `documentPictureInPicture` (disponível por padrão no Chrome/Edge modernos).
- Se a janela já estiver aberta em segundo plano, pressionar `Shift + P` ou clicar no botão PiP trará a janela imediatamente para o foco.

### O botão não apareceu imediatamente no vídeo
- Se a página do YouTube já estava aberta antes de instalar a extensão, pressione `F5` ou `Ctrl + F5` para atualizar o content script.

### Pressionei `Shift + L` ou `Shift + P` e nada aconteceu
- Verifique se o foco do cursor não está em um campo de formulário (busca ou comentários). Clique fora do campo e pressione o atalho novamente.

### Como recarregar a extensão após atualizações?
- Acesse `chrome://extensions/` e clique no ícone de atualização circular (🔄) no card da extensão.

---

## 🧪 Testes Automatizados de Integridade

O projeto conta com uma suíte abrangente de testes automatizados com cobertura estática, sintática, DOM e testes funcionais assíncronos.

Para executar a validação completa:

```bash
cd C:\Users\03573608183\youtube-loop-extension
node test-extension.js
```

### O que a suíte valida:
1. **Manifest V3**: Validação rigorosa do JSON, versão `1.1.0`, permissões (`storage`, `host_permissions`), content scripts e declaração de `web_accessible_resources` (`miniplayer.css`).
2. **Ícones PNG**: Existência física, tamanho em bytes, cabeçalho de assinatura PNG (`89 50 4E 47 0D 0A 1A 0A`) e resoluções exatas (16x16, 48x48, 128x128).
3. **Folhas de Estilo (`content.css` & `miniplayer.css`)**: Integridade sintática, balanceamento exato de chaves, seletores do botão de loop, botão PiP, Toast flutuante, animações `@keyframes` e seletores responsivos dos modos Pílula e Expandido.
4. **Script de Conteúdo (`content.js`)**: Análise sintática JavaScript no compilador do Node.js, exportações modulares e existência de todos os métodos das classes de controle (`AdDestroyer`, `MiniPlayerController`, `renderMiniPlayerHTML`).
5. **Runtime & Integração**: Simulação de eventos DOM, alternância de classes, controle do elemento `<video>`, despacho de eventos `ended`, Toast feedback e prevenção de foco em inputs.
6. **Suítes Filhas Especializadas**:
   - `test-ad-destroyer.js`: Validação do motor de detecção e aceleração de propagandas.
   - `test-miniplayer-dom.js`: Geração de markup HTML, modos Pílula/Expandido e sanitização XSS.
   - `test-pip-manager.js`: Gerenciador da janela PiP, controle de ciclo de vida e persistência de modo.
   - `test-playback-sync.js`: Sincronização bidirecional de eventos de reprodução, progresso e atalhos.
   - `test-pip-trigger.js`: Injeção de botão PiP, posicionamento na barra de controles e atalho `Shift + P`.

---

## 📦 Como Gerar o Pacote para a Chrome Web Store

Para publicar a extensão na [Chrome Web Store](https://chrome.google.com/webstore/devconsole), execute o script de empacotamento:

```powershell
# Na raiz do projeto:
powershell -ExecutionPolicy Bypass -File .\package-extension.ps1
```

O arquivo compactado pronto para envio será gerado em:
```text
dist/looper-for-youtube-v1.1.0.zip
```

> **Nota de Conformidade:** O pacote inclui estritamente os 5 arquivos de produção exigidos pelo Google (`manifest.json`, `content.js`, `content.css`, `miniplayer.css` e pasta `icons/`), ignorando testes, documentações e arquivos de desenvolvimento.

---

## 📁 Estrutura de Arquivos

```text
looper-for-youtube/
├── manifest.json            # Configuração oficial do Manifest V3 da extensão (v1.1.0)
├── content.js               # Script central: Loop, Mini Player Controller e Ad Destroyer
├── content.css              # Estilos do botão de loop, botão PiP e notificação Toast
├── miniplayer.css           # Estilos dedicados da janela PiP (Modos Pílula e Expandido)
├── icons/                   # Ícones oficiais da extensão
│   ├── icon16.png           # Favicon / Toolbar (16x16)
│   ├── icon48.png           # Gerenciador de extensões (48x48)
│   └── icon128.png          # Chrome Web Store / Alta resolução (128x128)
├── dist/                    # Pacote .zip gerado para publicação (ignorado no git)
│   └── looper-for-youtube-v1.1.0.zip
├── package-extension.ps1    # Script para empacotamento do pacote de produção .zip
├── generate-icons.ps1       # Script utilitário para regeneração dos ícones PNG
├── test-extension.js        # Suíte principal que integra todas as baterias de testes
├── test-ad-destroyer.js     # Testes do motor de mitigação de anúncios
├── test-miniplayer-dom.js   # Testes de geração DOM e estilos do Mini Player
├── test-pip-manager.js      # Testes de ciclo de vida da janela Document PiP
├── test-playback-sync.js    # Testes de sincronização de reprodução e eventos
├── test-pip-trigger.js      # Testes do botão de acionamento e atalho Shift+P
└── README.md                # Guia completo de instalação, uso e documentação técnica
```

---

## 📄 Licença

Este projeto é disponibilizado sob a licença **MIT**. Sinta-se livre para utilizar, modificar e distribuir.
