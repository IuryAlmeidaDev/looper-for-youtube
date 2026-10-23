# Task 3 Brief: Content Script - Detecção do Player, Estado e Injeção do Botão (content.js - Core)

## Requirements
- Diretório de trabalho: `C:\Users\03573608183\youtube-loop-extension\`
- Criar `content.js` com as funções estruturais do content script:
  1. **Gerenciamento de Estado:**
     - Variável interna `isLoopActive` (booleano, padrão `false`).
     - Função assíncrona `loadLoopState()`: lê `chrome.storage.local.get(['ytLoopActive'])` com fallback seguro para `localStorage.getItem('ytLoopActive')`.
     - Função assíncrona `saveLoopState(state)`: grava em `chrome.storage.local.set({ ytLoopActive: state })` (e no fallback).
  2. **Criação do Botão DOM com Ícone SVG:**
     - Função `createLoopButton()`:
       - Cria elemento `<button class="ytp-button ytp-loop-button" title="Repetir (Shift+L)" aria-label="Repetir (Shift+L)" data-title-no-tooltip="Repetir (Shift+L)">`.
       - Insere o SVG de repetição (com viewBox="0 0 36 36", classe `ytp-svg-fill`, duas setas circulares que representam loop contínuo).
       - Se `isLoopActive === true`, adiciona classe `active`.
  3. **Injeção do Botão na Barra de Controles:**
     - Função `injectLoopButton()`:
       - Procura o container de controles à esquerda `.ytp-left-controls`.
       - Se já existir `.ytp-loop-button`, não duplicar (retornar o botão existente).
       - Injeta o botão logo após o botão de próximo vídeo (`.ytp-next-button`), ou após o botão de play/pause (`.ytp-play-button`), ou como filho de `.ytp-left-controls`.
       - Atualiza a classe `active` e os atributos `aria-pressed` / `title` conforme o estado atual.
  4. **Atualização Visual:**
     - Função `updateButtonVisual(button, active)`:
       - Se `active`, adiciona classe `active`, define `aria-pressed="true"`, e atualiza `title="Repetir (Ativado) (Shift+L)"`.
       - Se inativo, remove classe `active`, define `aria-pressed="false"`, e atualiza `title="Repetir (Shift+L)"`.
  5. **Exportação / Estrutura Modular:**
     - Código modular, limpo, sem variáveis globais desnecessárias (usar IIFE ou objeto de namespace interno se aplicável, mantendo funções testáveis).
- Fazer commit no git: `git add content.js` e `git commit -m "feat: implement core player detection, state management and loop button injection"`
- Validar a sintaxe JavaScript com Node.js (`node -c content.js`).
