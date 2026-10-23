# Task 2 Brief: Estilos da Extensão (content.css)

## Requirements
- Diretório de trabalho: `C:\Users\03573608183\youtube-loop-extension\`
- Criar o arquivo `content.css` para estilização dos componentes injetados no YouTube:
  1. **Botão no Player (`.ytp-button.ytp-loop-button`):**
     - Integrado aos botões nativos do player do YouTube (`.ytp-button`).
     - Alinhamento vertical centralizado, display flex/inline-flex.
     - Ícone SVG dimensionado proporcionalmente (ex: 20x20 ou viewBox 36x36 como os demais botões do player).
     - Estado padrão (inativo): SVG com preenchimento branco (`#ffffff`), opacidade `0.85` e transição suave de cor/opacidade (`transition: all 0.2s ease`).
     - Estado hover: opacidade `1.0`.
     - Estado ativo (`.ytp-loop-button.active`):
       - SVG com preenchimento destacado (vermelho YouTube `#ff0000` ou `#f03` ou azul destaque `#3ea6ff`).
       - Opacidade `1.0`.
       - Opcional: pequeno ponto/badge indicador no canto inferior ou brilho sutil.
  2. **Notificação Toast Flutuante (`.ytp-loop-toast`):**
     - Exibida centralizada no terço superior do player (`.html5-video-player`).
     - Fundo translúcido escuro (`rgba(20, 20, 20, 0.88)`), cantos arredondados (`border-radius: 8px`), borda sutil (`1px solid rgba(255, 255, 255, 0.15)`), sombra suave.
     - Tipografia: fonte padrão do YouTube (`Roboto, "YouTube Noto", sans-serif`), tamanho 14px-15px, cor `#ffffff`, peso 500, padding de 10px 18px.
     - `pointer-events: none` para nunca atrapalhar cliques no player.
     - `z-index: 9999`.
     - Animação CSS suave de fade-in (`opacity: 0 -> 1`, `transform: translateY(-8px) -> translateY(0)`) e fade-out (`opacity: 1 -> 0`).
  3. **Compatibilidade com Modo Teatro e Tela Cheia:**
     - Garantir que estilos não sejam sobrescritos em modo fullscreen ou miniplayer.
- Fazer commit no git: `git add content.css` e `git commit -m "feat: add styling for player loop button and toast notifications"`
- Validar a sintaxe CSS (sem seletores inválidos).
