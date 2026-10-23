# 🔁 YouTube Music & Video Looper

> **Extensão leve, elegante e de alta performance para repetição contínua e automática de vídeos e músicas no YouTube.**

![Manifest V3](https://img.shields.io/badge/Manifest-V3-success?style=flat-square)
![Plataforma](https://img.shields.io/badge/Plataforma-Chromium-blue?style=flat-square)
![Privacidade](https://img.shields.io/badge/Privacidade-100%25%20Local-brightgreen?style=flat-square)
![Sem Dependências](https://img.shields.io/badge/Dependências-Zero-blueviolet?style=flat-square)

---

## 📖 Visão Geral

O **YouTube Music & Video Looper** adiciona um botão nativo de repetição diretamente à barra de controles do player do YouTube (`https://www.youtube.com`), permitindo que você ouça suas músicas, batidas de estudo, tutoriais ou qualquer vídeo em looping infinito sem precisar clicar com o botão direito a cada nova reprodução.

Projetada seguindo as diretrizes modernas do **Manifest V3**, a extensão opera de forma **100% client-side**, sem rastreamento, sem coleta de dados e sem bibliotecas externas pesadas, garantindo inicialização instantânea e baixíssimo consumo de memória.

---

## ✨ Recursos Principais

- 🔘 **Botão Nativo Integrado**: Inserido diretamente nos controles inferiores esquerdos do player do YouTube (`.ytp-left-controls`), ao lado dos botões de reprodução e volume, com ícone vetorial SVG e ponto indicador luminoso de status.
- ⚡ **Atalho de Teclado Rápido (`Shift + L`)**: Ative ou desative o modo de repetição instantaneamente em qualquer tela cheia ou janela sem precisar mover o cursor do mouse.
- 💬 **Feedback Visual com Notificação Toast**: Exibe um aviso flutuante elegante na parte superior do vídeo informando `"Repetição ativada (Shift+L)"` ou `"Repetição desativada (Shift+L)"`.
- 💾 **Persistência Inteligente de Estado**: Sua preferência de repetição fica gravada no armazenamento do navegador (`chrome.storage.local` com fallback transparente para `localStorage`). Se você ativar a repetição, ela continuará ativa para os próximos vídeos que você abrir.
- 🛡️ **Prevenção contra Digitação Acidental**: O atalho `Shift + L` é suspenso de forma inteligente quando você está digitando na barra de pesquisa do YouTube, na caixa de comentários ou em qualquer elemento editável (`contenteditable`).
- 🔄 **Compatibilidade com YouTube SPA (Single Page Application)**: Gerencia transições de páginas sem recarregamento (`yt-navigate-finish`) e recriações dinâmicas de interface (`MutationObserver`), garantindo que o botão permaneça ativo mesmo após horas de navegação ininterrupta.
- 🚀 **Redundância Dupla de Repetição**: Sincroniza a propriedade nativa `video.loop = true` do HTML5 e conta com um listener de fallback para o evento `ended`, garantindo que streams com buffers DASH/HLS nunca congelem no final da faixa.
- 📱 **Compatibilidade com Modos do Player**: Design totalmente adaptável ao modo padrão, modo teatro, tela cheia (*fullscreen*) e miniplayer.
- 🔒 **Privacidade Absoluta**: Zero telemetria, zero anúncios, zero conexões externas.

---

## 📥 Como Instalar (Navegadores Chromium)

A extensão é compatível com **todos** os navegadores modernos baseados no motor Chromium: **Google Chrome**, **Microsoft Edge**, **Brave Browser**, **Opera / Opera GX**, **Vivaldi**, entre outros.

### Passo 1: Abrir a Central de Extensões do seu Navegador

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

No canto superior direito da página de extensões, localize e ative a chave seletora **"Modo do desenvolvedor"** (ou *Developer mode*).

---

### Passo 3: Carregar a Extensão sem Compactação

1. No canto superior esquerdo que acabou de surgir, clique no botão **"Carregar sem compactação"** (ou *Load unpacked*).
2. Na janela de seleção de pastas, navegue até a pasta da extensão e selecione-a:
   ```text
   C:\Users\03573608183\youtube-loop-extension
   ```
3. Clique em **"Selecionar pasta"**.

---

### Passo 4: Pronto!

O card **YouTube Music & Video Looper** aparecerá ativo na lista de extensões instaladas. 

Abra o [YouTube](https://www.youtube.com), reproduza qualquer vídeo e observe o novo botão de loop integrado logo ao lado do controle de volume!

---

## 🎮 Como Usar

### 1. Pelo Botão do Player
1. Posicione o mouse sobre o player de vídeo do YouTube para exibir os controles.
2. Localize o ícone de repetição (duas setas em círculo) localizado na barra inferior esquerda.
3. Clique no botão:
   - **Ativado**: O ícone fica vermelho vívido (`#ff0000`), um ponto luminoso surge na base do botão e o Toast confirma *"Repetição ativada (Shift+L)"*.
   - **Desativado**: O ícone retorna ao tom branco semitransparente padrão e o Toast confirma *"Repetição desativada (Shift+L)"*.

### 2. Pelo Atalho de Teclado
- A qualquer momento durante a reprodução, pressione `Shift + L` no teclado.
- O loop será alternado imediatamente com o mesmo feedback visual instantâneo na tela.

---

## ⌨️ Tabela de Atalhos e Controles

| Ação | Método | Descrição |
| :--- | :---: | :--- |
| **Alternar Repetição** | `Shift + L` | Alterna entre loop ativado e desativado instantaneamente. |
| **Alternar via Mouse** | Clique no botão | Alterna o loop e atualiza o estado persistido. |
| **Digitação Segura** | Automático | O atalho `Shift + L` é ignorado quando você estiver escrevendo comentários ou pesquisando vídeos. |
| **Persistência** | Automático | O estado configurado é salvo e mantido para os próximos vídeos reproduzidos na sessão. |

---

## ❓ Solução de Dúvidas (Troubleshooting)

### O botão não apareceu imediatamente no vídeo
- **Causa**: O YouTube pode já estar aberto em abas antigas antes do carregamento da extensão.
- **Solução**: Atualize a página do YouTube pressionando `F5` ou `Ctrl + F5`. O content script será injetado automaticamente.

### Pressionei `Shift + L` e nada aconteceu
- **Causa**: O foco do cursor pode estar dentro de um campo de texto (barra de busca do YouTube, caixa de comentários ou resposta rápida).
- **Solução**: Por segurança contra acionamentos acidentais ao digitar palavras que contenham a letra "L" maiúscula, a extensão desativa o atalho em campos de formulário. Basta clicar fora da caixa de texto (no vídeo ou no fundo da página) e pressionar `Shift + L` novamente.

### Como atualizar a extensão após modificar os arquivos?
- Acesse `chrome://extensions/` (ou a página de extensões do seu navegador) e clique no ícone de atualização circular (🔄) presente no card do **YouTube Music & Video Looper**.

### A repetição parou após muitas horas ininterruptas
- **Causa**: O próprio YouTube possui um mecanismo nativo de proteção contra inatividade ("O vídeo foi pausado. Continuar assistindo?").
- **Solução**: Basta clicar na tela para confirmar que você ainda está assistindo. O loop continuará normalmente a partir desse ponto.

---

## 🧪 Testes Automatizados de Integridade

O projeto conta com uma suíte de testes automatizados que verifica todos os componentes da extensão (Manifest V3, ícones PNG, sintaxe CSS e runtime JS).

Para executar os testes:

```bash
# Navegue até a pasta da extensão
cd C:\Users\03573608183\youtube-loop-extension

# Execute a suíte de integridade
node test-extension.js
```

### O que a suíte valida:
1. **Manifest V3**: Validade do JSON, versão do manifest, permissões de armazenamento, permissões de host e caminhos de arquivos.
2. **Ícones PNG**: Existência física, tamanho de bytes, assinatura mágica PNG (`89 50 4E 47 0D 0A 1A 0A`) e resolução exata de cada ícone (16x16, 48x48, 128x128).
3. **Folha de Estilos (`content.css`)**: Integridade sintática, balanceamento de chaves, classes do botão, classes do Toast, animações `@keyframes` e seletores responsivos.
4. **Script de Conteúdo (`content.js`)**: Análise sintática JavaScript, exportações do `YouTubeLooperCore` e todas as funções do ciclo de vida.
5. **Runtime e Integração**: Simulação de injeção de DOM, alternância de classes, controle do elemento `<video>`, despacho de eventos `ended`, Toast feedback e prevenção de foco em inputs.

---

## 📁 Estrutura de Arquivos

```text
youtube-loop-extension/
├── manifest.json         # Configuração oficial do Manifest V3 da extensão
├── content.js            # Content script com lógica de controle do player e atalhos
├── content.css           # Estilos visuais do botão, estados ativos e Toast flutuante
├── icons/                # Ícones da extensão nos formatos padrão
│   ├── icon16.png        # Favicon / Toolbar (16x16)
│   ├── icon48.png        # Gerenciador de extensões (48x48)
│   └── icon128.png       # Chrome Web Store / Alta resolução (128x128)
├── test-extension.js     # Suíte automatizada de validação estática e runtime
├── generate-icons.ps1    # Script utilitário para regeneração dos ícones
└── README.md             # Guia completo de instalação e documentação
```

---

## 📄 Licença

Este projeto é disponibilizado sob a licença **MIT**. Sinta-se livre para utilizar, modificar e distribuir.
