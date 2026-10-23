### Task 2: Folha de Estilos e Template do Mini Player (`miniplayer.css` + Scaffolding)

**Files:**
- Create: `C:\Users\03573608183\youtube-loop-extension\miniplayer.css`
- Modify: `C:\Users\03573608183\youtube-loop-extension\content.js`
- Test: `C:\Users\03573608183\youtube-loop-extension\test-miniplayer-dom.js`

**Interfaces:**
- Produces: `renderMiniPlayerHTML(params)`:
  - Parâmetros: `{ isPill, title, channel, thumbnail, isLoopActive, isPlaying, currentTimeStr, durationStr, progressPercent }`
  - Retorna a string HTML completa estruturada para a janela Document PiP.
  - Exportado em `YouTubeLooperCore.renderMiniPlayerHTML`.

- [ ] **Step 1: Escrever teste de unidade para geração do DOM do Mini Player**

Criar arquivo `C:\Users\03573608183\youtube-loop-extension\test-miniplayer-dom.js`:
Validar:
1. Em modo Pílula (`isPill = true`):
   - Contém container `.miniplayer-container.pill`
   - Contém botões de navegação: `.btn-prev`, `.btn-play`, `.btn-next`, `.btn-loop`
   - Contém botão de alternância de modo com ícone/ação expandir: `.btn-toggle-mode[data-mode="pill"]` ou `.btn-expand`
   - Contém botão fechar: `.btn-close`
   - Contém título da faixa: `.track-title`
   - Quando `isPlaying = true`, o botão de play exibe o estado correspondente (ou classe `.playing`)
   - Quando `isLoopActive = true`, o botão de loop possui a classe `.active`
2. Em modo Expandido (`isPill = false`):
   - Contém container `.miniplayer-container.expanded`
   - Contém capa do vídeo / miniatura: `.track-thumbnail`
   - Contém título: `.track-title`
   - Contém canal: `.track-channel`
   - Contém barra de progresso interativa: `input.progress-bar[type="range"]` com `min="0"`, `max="100"` e `value` correspondente
   - Contém exibição de tempo decorrido e total: `.time-current` e `.time-total`
   - Contém botão de alternância com ação recolher: `.btn-toggle-mode[data-mode="expanded"]` ou `.btn-collapse`
   - Contém controles de reprodução completos (`.btn-prev`, `.btn-play`, `.btn-next`, `.btn-loop`)
3. Verificar integridade da folha de estilos `miniplayer.css`:
   - Arquivo existe fisicamente
   - Contém seletores para `.miniplayer-container`, `.pill`, `.expanded`, `.track-title`, `.btn-play`, `.progress-bar`, etc.

- [ ] **Step 2: Executar teste e verificar falha (TDD RED)**

Run: `node C:\Users\03573608183\youtube-loop-extension\test-miniplayer-dom.js`
Expected: FAIL com erro de arquivo inexistente ou função não definida.

- [ ] **Step 3: Criar `miniplayer.css`**

Criar `C:\Users\03573608183\youtube-loop-extension\miniplayer.css` com:
- Reset global limpo (`* { box-sizing: border-box; margin: 0; padding: 0; }`).
- Background estilo YouTube Dark (`#0f0f0f`), texto `#ffffff`, destaque vermelho `#ff0000`.
- `.miniplayer-container.pill`:
  - Altura: 54px, display flex, alinhamento centralizado, preenchimento lateral suave, sem scrollbar (`overflow: hidden; user-select: none;`).
  - Botões compactos de 28x28px, bordas arredondadas, hover com fundo `rgba(255, 255, 255, 0.1)`.
  - Título com truncamento / ellipsis ou marquee rolante elegante.
- `.miniplayer-container.expanded`:
  - Altura: 180px, layout vertical em seções (header com thumbnail 48x48px + títulos + botões de janela, seção de progresso com slider e tempos, seção inferior de controles de mídia centralizados).
  - Barra de progresso: estilização moderna de `input[type="range"]` com trilha cinza/vermelha e thumb estilizado.
- Botão de loop com estado `.active`: ícone em `#ff0000` e ponto indicador brilhante.

- [ ] **Step 4: Implementar `renderMiniPlayerHTML` em `content.js`**

Implementar a função utilitária com escape seguro de caracteres para títulos (`escapeHtml`) e exportá-la no `YouTubeLooperCore`.

- [ ] **Step 5: Executar teste unitário (TDD GREEN)**

Run: `node C:\Users\03573608183\youtube-loop-extension\test-miniplayer-dom.js`
Expected: PASS

- [ ] **Step 6: Executar testes de regressão**

Run: `node C:\Users\03573608183\youtube-loop-extension\test-extension.js`
Expected: 31/31 PASS

- [ ] **Step 7: Commit das alterações**

```bash
git add miniplayer.css content.js test-miniplayer-dom.js
git commit -m "feat(miniplayer): add styling and DOM scaffolding for pill and expanded modes"
```
