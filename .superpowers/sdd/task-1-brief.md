# Task 1 Brief: Scaffolding, Manifest V3 e Geração de Ícones

## Requirements
- Diretório de trabalho: `C:\Users\03573608183\youtube-loop-extension\`
- Criar `manifest.json` com Manifest V3:
  - `manifest_version`: 3
  - `name`: "YouTube Music & Video Looper"
  - `version`: "1.0.0"
  - `description`: "Repita músicas e vídeos do YouTube automaticamente com botão integrado e atalho Shift+L."
  - `permissions`: `["storage"]`
  - `host_permissions`: `["https://www.youtube.com/*"]`
  - `action`: ícones apontando para `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
  - `icons`: ícones apontando para `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
  - `content_scripts`:
    - `matches`: `["https://www.youtube.com/*"]`
    - `js`: `["content.js"]`
    - `css`: `["content.css"]`
    - `run_at`: `"document_idle"`
- Gerar os ícones PNG nas três resoluções (16x16, 48x48, 128x128) dentro da pasta `icons/`.
  - Usar PowerShell com `System.Drawing` para desenhar um ícone vermelho/escuro com setas de loop circulares em branco.
- Validar se o `manifest.json` é um JSON bem formatado e se os arquivos PNG existem e são válidos.
- Fazer o commit inicial no repositório git: `git add .` e `git commit -m "feat: setup manifest v3 and extension icons"`
