# Task 5 Brief: Documentação de Instalação e Teste Automatizado de Integridade

## Requirements
- Diretório de trabalho: `C:\Users\03573608183\youtube-loop-extension\`
- Criar a documentação de uso e o script de validação de integridade da extensão:
  1. **Guia Completo no `README.md` (em português):**
     - Nome: **YouTube Music & Video Looper**
     - Descrição dos recursos:
       - Botão nativo na barra de controles do player do YouTube.
       - Atalho de teclado rápido: `Shift + L`.
       - Feedback visual na tela com notificação Toast.
       - Persistência automática entre faixas/vídeos subsequentes.
       - Prevenção inteligente contra acionamento acidental ao digitar na busca ou comentários.
     - Instruções detalhadas de instalação para qualquer navegador Chromium (Chrome, Brave, Edge, Opera):
       1. Abra o navegador e acesse `chrome://extensions/` (ou `edge://extensions/` no Edge, `brave://extensions/` no Brave).
       2. Ative a chave **"Modo do desenvolvedor"** no canto superior direito.
       3. Clique no botão **"Carregar sem compactação"** (Load unpacked).
       4. Selecione a pasta onde a extensão foi criada: `C:\Users\03573608183\youtube-loop-extension`.
       5. Pronto! Acesse qualquer vídeo no YouTube (`https://www.youtube.com`) e o botão de repetição estará ativo ao lado dos controles do player.
     - Guia de atalhos e solução de dúvidas (troubleshooting).
  2. **Script de Teste de Integridade da Extensão (`test-extension.js`):**
     - Script Node.js que valida todos os artefatos da extensão em conjunto:
       - Validação do `manifest.json` (campos MV3, caminhos de ícones e content scripts).
       - Validação de existência e integridade dos ícones PNG (16x16, 48x48, 128x128).
       - Validação da sintaxe e seletores do `content.css`.
       - Validação da sintaxe e das funções do `content.js` (`YouTubeLooperCore`).
     - Executar o teste via `node test-extension.js` e confirmar 100% de sucesso.
  3. **Atualização do Ledger:**
     - Marcar a Task 5 como concluída no arquivo `.superpowers\sdd\progress.md`.
  4. **Controle de Versão:**
     - Commit com a mensagem: `docs: add user guide and automated extension validation suite`.
