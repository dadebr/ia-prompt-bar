// popup.js - IA Prompt Bar Extension
// Implementa funcionalidades de renderização, salvamento e injeção de prompts

document.addEventListener('DOMContentLoaded', function() {
  // Elementos do DOM
  const promptList = document.getElementById('prompt-list');
  const promptTitle = document.getElementById('prompt-title');
  const promptText = document.getElementById('prompt-text');
  const saveButton = document.getElementById('save-prompt');
  const themeToggle = document.getElementById('theme-toggle');
  const searchInput = document.getElementById('search-prompts');
  const cancelEditBtn = document.getElementById('cancel-edit');
  const sortSelect = document.getElementById('sort-prompts');
  const exportBtn = document.getElementById('export-prompts');
  const importBtn = document.getElementById('import-prompts');
  const importFile = document.getElementById('import-file');

  // Estado de edição
  let isEditing = false;
  let editingPromptId = null;

  // Ícones SVG padronizados
  const ICONS = {
    copy: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"></rect><rect x="4" y="4" width="11" height="11" rx="2"></rect></svg>',
    inject: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M2 21l20-9L2 3l5 7-5 11z"></path></svg>',
    del: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path></svg>',
    edit: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>'
  };

  // Carrega e exibe prompts salvos ao inicializar
  loadPrompts();
  initTheme();

  // Event listener para salvar prompts
  saveButton.addEventListener('click', savePrompt);

  // Função para carregar prompts do storage com tratamento robusto de erros
  function loadPrompts() {
    // Verificar se chrome.storage está disponível
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.error('❌ Chrome storage API não disponível');
      showMessage('Erro: API de armazenamento não disponível.', 'error');
      return;
    }

    console.log('📂 Carregando prompts do storage...');
    
    chrome.storage.local.get(['prompts'], function(result) {
      // Verificar se houve erro na operação
      if (chrome.runtime.lastError) {
        console.error('❌ Erro ao carregar prompts:', chrome.runtime.lastError.message);
        showMessage('Erro ao carregar prompts salvos.', 'error');
        return;
      }
      
      try {
        const prompts = result.prompts || [];
        console.log(`✅ ${prompts.length} prompts carregados com sucesso`);
        renderPrompts(prompts);
      } catch (error) {
        console.error('❌ Erro ao processar prompts:', error);
        showMessage('Erro ao processar prompts salvos.', 'error');
      }
    });
  }
  // Tema claro/escuro com persistência
  function initTheme() {
    try {
      chrome.storage?.local?.get(['theme'], (res) => {
        const saved = res?.theme || 'light';
        applyTheme(saved);
      });
    } catch (_) {
      applyTheme('light');
    }

    if (themeToggle) {
      themeToggle.addEventListener('click', async () => {
        const isDark = document.documentElement.classList.toggle('dark');
        const theme = isDark ? 'dark' : 'light';
        try {
          await new Promise(r => chrome.storage?.local?.set({ theme }, r));
        } catch (_) {}
      });
    }
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  // Função para renderizar a lista de prompts
  function renderPrompts(prompts) {
    promptList.innerHTML = '';

    const term = (searchInput?.value || '').trim().toLowerCase();
    let filtered = term
      ? prompts.filter(p => (p.title || '').toLowerCase().includes(term))
      : prompts;
    const sort = sortSelect?.value || 'recent';
    filtered = [...filtered].sort((a, b) => {
      if (sort === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // recent: mais novos primeiro
      return (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0));
    });
    
    filtered.forEach((prompt, index) => {
      const promptItem = document.createElement('div');
      promptItem.className = 'prompt-item';
      
      const preview = escapeHtml(prompt.text.substring(0, 100)) + (prompt.text.length > 100 ? '...' : '');
      promptItem.innerHTML = `
        <div class="prompt-content">
          <div class="prompt-title">${escapeHtml(prompt.title)}</div>
          <div class="prompt-preview">${preview}</div>
        </div>
        <div class="prompt-actions">
          <button class="btn-copy" data-index="${index}" title="Copiar prompt">
            <span class="btn__icon" aria-hidden="true">${ICONS.copy}</span>
            <span class="btn__label">Copiar</span>
          </button>
          <button class="btn-edit" data-index="${index}" title="Editar prompt">
            <span class="btn__icon" aria-hidden="true">${ICONS.edit}</span>
            <span class="btn__label">Editar</span>
          </button>
          <button class="btn-inject" data-index="${index}" title="Injetar prompt">
            <span class="btn__icon" aria-hidden="true">${ICONS.inject}</span>
            <span class="btn__label">Injetar</span>
          </button>
          <button class="btn-delete" data-index="${index}" title="Excluir prompt">
            <span class="btn__icon" aria-hidden="true">${ICONS.del}</span>
            <span class="btn__label">Excluir</span>
          </button>
        </div>
      `;
      
      promptList.appendChild(promptItem);
    });

    // Adiciona event listeners para os botões
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        startEdit(filtered[index]);
      });
    });

    document.querySelectorAll('.btn-inject').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        injectPrompt(filtered[index]);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        const originalIdx = prompts.findIndex(p => p.id === filtered[index].id);
        deletePrompt(originalIdx >= 0 ? originalIdx : index);
      });
    });

    // Event listener para botão de cópia manual
    document.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        copyPromptToClipboard(filtered[index]);
      });
    });
  }

  // Entrar no modo de edição
  function startEdit(prompt) {
    if (!prompt) return;
    isEditing = true;
    editingPromptId = prompt.id;
    if (cancelEditBtn) cancelEditBtn.style.display = '';
    if (saveButton) saveButton.textContent = 'Atualizar';
    promptTitle.value = prompt.title || '';
    promptText.value = prompt.text || '';
    showMessage('Editando prompt. Faça as alterações e clique em Atualizar.', 'info');
  }

  // Cancelar edição
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      isEditing = false;
      editingPromptId = null;
      promptTitle.value = '';
      promptText.value = '';
      cancelEditBtn.style.display = 'none';
      if (saveButton) saveButton.textContent = 'Salvar Prompt';
      showMessage('Edição cancelada.', 'info');
    });
  }

  // Busca dinâmica
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      // Recarregar prompts e renderizar com filtro
      chrome.storage?.local?.get(['prompts'], (res) => {
        const prompts = res?.prompts || [];
        renderPrompts(prompts);
      });
    });
  }

  // Ordenação
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      chrome.storage?.local?.get(['prompts'], (res) => {
        const prompts = res?.prompts || [];
        renderPrompts(prompts);
      });
    });
  }

  // Exportar JSON
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      chrome.storage?.local?.get(['prompts'], (res) => {
        const data = JSON.stringify(res?.prompts || [], null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompts.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }

  // Importar JSON
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', () => {
      const file = importFile.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arr = JSON.parse(String(reader.result));
          if (!Array.isArray(arr)) throw new Error('JSON inválido');
          chrome.storage?.local?.get(['prompts'], (res) => {
            const existing = res?.prompts || [];
            // mescla por título evitando duplicatas
            const map = new Map(existing.map(p => [p.title, p]));
            arr.forEach(p => {
              if (p && typeof p.title === 'string' && typeof p.text === 'string') {
                if (!map.has(p.title)) {
                  map.set(p.title, {
                    id: Date.now() + Math.random(),
                    title: p.title,
                    text: p.text,
                    createdAt: p.createdAt || new Date().toISOString()
                  });
                }
              }
            });
            const merged = Array.from(map.values());
            chrome.storage?.local?.set({ prompts: merged }, () => {
              renderPrompts(merged);
            });
          });
        } catch (e) {
          alert('Falha ao importar JSON: ' + (e?.message || e));
        }
      };
      reader.readAsText(file);
      importFile.value = '';
    });
  }

  // Função para salvar um novo prompt
  function savePrompt() {
    const title = promptTitle.value.trim();
    const text = promptText.value.trim();
    
    // Validações aprimoradas
    if (!title || !text) {
      showMessage('Por favor, preencha o título e o texto do prompt.', 'error');
      return;
    }
    
    if (title.length > 100) {
      showMessage('Título deve ter no máximo 100 caracteres.', 'error');
      return;
    }
    
    if (text.length > 5000) {
      showMessage('Texto deve ter no máximo 5000 caracteres.', 'error');
      return;
    }

    // Verificar se chrome.storage está disponível
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.error('❌ Chrome storage API não disponível para salvamento');
      showMessage('Erro: API de armazenamento não disponível.', 'error');
      return;
    }

    console.log('💾 Iniciando salvamento de prompt...');
    
    // Mostrar indicador de loading
    const loadingIndicator = showLoading('Salvando prompt...');
    
    chrome.storage.local.get(['prompts'], function(result) {
      // Verificar se houve erro na operação de leitura
      if (chrome.runtime.lastError) {
        console.error('❌ Erro ao ler prompts existentes:', chrome.runtime.lastError.message);
        hideLoading(loadingIndicator);
        showMessage('Erro ao acessar prompts existentes.', 'error');
        return;
      }
      
      try {
        const prompts = result.prompts || [];

        if (isEditing && editingPromptId != null) {
          // Atualização
          const idx = prompts.findIndex(p => p.id === editingPromptId);
          if (idx === -1) {
            hideLoading(loadingIndicator);
            showMessage('Não foi possível localizar o prompt a atualizar.', 'error');
            return;
          }
          // Evitar duplicata de título em outro item
          if (prompts.some((p, i) => i !== idx && p.title === title)) {
            hideLoading(loadingIndicator);
            showMessage('Já existe um prompt com este título.', 'error');
            return;
          }
          prompts[idx] = {
            ...prompts[idx],
            title,
            text
          };
          console.log(`✏️ Atualizando prompt: "${title}" (id ${editingPromptId})`);
          saveWithRetry(prompts, 0, () => {
            isEditing = false;
            editingPromptId = null;
            if (cancelEditBtn) cancelEditBtn.style.display = 'none';
            if (saveButton) saveButton.textContent = 'Salvar Prompt';
          });
        } else {
          // Criação
          if (prompts.some(p => p.title === title)) {
            hideLoading(loadingIndicator);
            showMessage('Já existe um prompt com este título.', 'error');
            return;
          }
          const newPrompt = {
            id: Date.now(),
            title: title,
            text: text,
            createdAt: new Date().toISOString()
          };
          prompts.push(newPrompt);
          console.log(`💾 Salvando prompt: "${title}" (${prompts.length} total)`);
          saveWithRetry(prompts, 0);
        }
        
      } catch (error) {
        console.error('❌ Erro ao processar dados para salvamento:', error);
        hideLoading(loadingIndicator);
        showMessage('Erro ao processar dados do prompt.', 'error');
      }
    });
    
    // Função auxiliar para retry de salvamento
    function saveWithRetry(prompts, attempt, afterOkCb) {
      const maxAttempts = 3;
      
      chrome.storage.local.set({ prompts: prompts }, function() {
        // Verificar se houve erro na operação de escrita
        if (chrome.runtime.lastError) {
          console.error(`❌ Tentativa ${attempt + 1} falhou:`, chrome.runtime.lastError.message);
          
          if (attempt < maxAttempts - 1) {
            console.log(`🔄 Tentando novamente... (${attempt + 2}/${maxAttempts})`);
            setTimeout(() => saveWithRetry(prompts, attempt + 1), 1000);
          } else {
            hideLoading(loadingIndicator);
            showMessage('Erro ao salvar prompt após múltiplas tentativas.', 'error');
          }
          return;
        }
        
        try {
          console.log('✅ Prompt salvo com sucesso!');
          
          // Esconder loading
          hideLoading(loadingIndicator);
          
          // Limpa os campos
          promptTitle.value = '';
          promptText.value = '';
          
          // Recarrega a lista
          loadPrompts();
          if (typeof afterOkCb === 'function') afterOkCb();
          
          // Feedback visual
          showMessage('Prompt salvo com sucesso!');
          
        } catch (error) {
          console.error('❌ Erro pós-salvamento:', error);
          hideLoading(loadingIndicator);
          showMessage('Prompt salvo, mas houve erro na atualização da interface.', 'error');
        }
      });
    }
  }

  // Função para copiar prompt para clipboard
  async function copyPromptToClipboard(prompt) {
    console.log('📋 Copiando prompt para clipboard:', prompt.title);
    
    try {
      // Usar a API moderna de clipboard se disponível
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(prompt.text);
        showMessage(`Prompt "${prompt.title}" copiado para clipboard!`, 'success');
        console.log('✅ Prompt copiado com sucesso via Clipboard API');
      } else {
        // Fallback para método tradicional
        const textArea = document.createElement('textarea');
        textArea.value = prompt.text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          showMessage(`Prompt "${prompt.title}" copiado para clipboard!`, 'success');
          console.log('✅ Prompt copiado com sucesso via execCommand');
        } else {
          throw new Error('Falha ao executar comando de cópia');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao copiar prompt:', error);
      showMessage('Erro ao copiar prompt. Tente novamente.', 'error');
    }
  }

  // Função para injetar prompt na página ativa
  async function injectPrompt(prompt) {
    console.log('🚀 Iniciando injeção de prompt:', prompt.text.substring(0, 50) + '...');
    
    if (!prompt.text || prompt.text.trim() === '') {
      console.log('⚠️ Texto do prompt está vazio');
      showMessage('Texto do prompt está vazio', 'warning');
      return;
    }
    
    // Mostrar indicador de loading
    const loadingIndicator = showLoading('Injetando prompt...');
    
    try {
      // Verificar se a API de tabs está disponível
      if (!chrome || !chrome.tabs) {
        throw new Error('API chrome.tabs não está disponível');
      }
      
      console.log('🔍 Obtendo aba ativa...');
      
      // Obter aba ativa com sistema de retry
      let activeTab = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !activeTab) {
        try {
          const tabs = await new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (chrome.runtime.lastError) {
                reject(new Error(`Erro ao obter aba ativa: ${chrome.runtime.lastError.message}`));
              } else {
                resolve(tabs);
              }
            });
          });
          
          if (tabs && tabs.length > 0) {
            activeTab = tabs[0];
            console.log(`📄 Aba ativa encontrada: ${activeTab.url}`);
          } else {
            throw new Error('Nenhuma aba ativa encontrada');
          }
          
        } catch (tabError) {
          retryCount++;
          console.error(`❌ Tentativa ${retryCount} de obter aba ativa falhou:`, tabError.message);
          
          if (retryCount < maxRetries) {
            console.log(`🔄 Aguardando antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!activeTab) {
        hideLoading(loadingIndicator);
        throw new Error('Não foi possível obter a aba ativa após múltiplas tentativas');
      }
      
      // Verificar se a URL é válida para injeção
      if (activeTab.url.startsWith('chrome://') || 
          activeTab.url.startsWith('chrome-extension://') ||
          activeTab.url.startsWith('edge://') ||
          activeTab.url.startsWith('about:')) {
        hideLoading(loadingIndicator);
        throw new Error('Não é possível injetar em páginas do sistema');
      }
      
      // Verificar se a URL é suportada
      const supportedSites = [
        'chat.openai.com',
        'chatgpt.com',
        'claude.ai',
        'console.anthropic.com',
        'gemini.google.com',
        'bard.google.com',
        'aistudio.google.com'
      ];
      
      if (!supportedSites.some(site => activeTab.url.includes(site))) {
        hideLoading(loadingIndicator);
        showMessage('Site não suportado para injeção de prompts.', 'error');
        return;
      }
      
      console.log('💉 Executando script de injeção...');
      
      // Executar script de injeção com retry robusto
      retryCount = 0;
      let injectionSuccess = false;
      const retryStrategies = [
        { delay: 500, description: 'Tentativa rápida' },
        { delay: 1500, description: 'Tentativa com delay médio' },
        { delay: 3000, description: 'Tentativa com delay longo' }
      ];
      
      while (retryCount < maxRetries && !injectionSuccess) {
        try {
          const strategy = retryStrategies[retryCount] || retryStrategies[retryStrategies.length - 1];
          console.log(`💉 ${strategy.description} ${retryCount + 1}/${maxRetries}`);
          
          // Verificar se a aba ainda está ativa antes de cada tentativa
          const currentTab = await new Promise((resolve, reject) => {
            chrome.tabs.get(activeTab.id, (tab) => {
              if (chrome.runtime.lastError) {
                reject(new Error(`Aba não encontrada: ${chrome.runtime.lastError.message}`));
              } else {
                resolve(tab);
              }
            });
          });
          
          if (!currentTab || currentTab.status !== 'complete') {
            throw new Error('Aba não está pronta para injeção');
          }
          
          console.log('🔍 Executando script de injeção...');
          const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            world: 'MAIN',
            func: injectTextIntoPage,
            args: [prompt.text, activeTab.url]
          });
          
          console.log('📊 Resultado da injeção:', injectionResults);
          
          if (injectionResults && injectionResults[0]) {
            const result = injectionResults[0].result;
            
            // Verificar se o resultado é uma Promise (para compatibilidade com retornos assíncronos)
            if (result && typeof result.then === 'function') {
              try {
                const finalResult = await result;
                if (finalResult && finalResult.success) {
                  injectionSuccess = true;
                  console.log('✅ Injeção executada com sucesso!');
                  hideLoading(loadingIndicator);
                  showMessage(finalResult.message || 'Prompt injetado com sucesso!', 'success');
                } else {
                  const errorMsg = finalResult?.error || 'Erro desconhecido na injeção';
                  throw new Error(errorMsg);
                }
              } catch (promiseError) {
                throw new Error(`Erro ao processar resultado assíncrono: ${promiseError.message}`);
              }
            } else if (result === true || (result && result.success)) {
              injectionSuccess = true;
              console.log('✅ Injeção executada com sucesso!');
              hideLoading(loadingIndicator);
              showMessage(result.message || 'Prompt injetado com sucesso!', 'success');
            } else {
              const errorMsg = result && result.error ? result.error : 'Campo de entrada não encontrado';
              throw new Error(errorMsg);
            }
          } else {
            throw new Error('Resposta inválida do script de injeção');
          }
          
        } catch (injectionError) {
          retryCount++;
          const strategy = retryStrategies[retryCount - 1] || retryStrategies[retryStrategies.length - 1];
          
          console.error(`❌ ${strategy.description} falhou:`, injectionError.message);
          
          // Análise do tipo de erro para estratégias específicas
          if (injectionError.message.includes('Aba não encontrada') || 
              injectionError.message.includes('não está pronta')) {
            console.log('🔄 Erro de aba - aguardando mais tempo...');
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, strategy.delay * 2));
            }
          } else if (injectionError.message.includes('Campo de entrada não encontrado')) {
            console.log('🔄 Erro de elemento - tentando novamente...');
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, strategy.delay));
            }
          } else {
            console.log('🔄 Erro genérico - delay padrão...');
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, strategy.delay));
            }
          }
          
          if (retryCount < maxRetries) {
            console.log(`🔄 Preparando próxima tentativa em ${strategy.delay}ms...`);
          }
        }
      }
      
      if (!injectionSuccess) {
        console.warn('⚠️ Injeção via scripting falhou. Tentando fallback via content script...');
        try {
          const ok = await fallbackInjectViaContentScript(activeTab.id, prompt.text, activeTab.url);
          hideLoading(loadingIndicator);
          if (ok) {
            showMessage('Prompt injetado via fallback!', 'success');
            return;
          }
          throw new Error('Fallback também falhou');
        } catch (e) {
          hideLoading(loadingIndicator);
          throw new Error(`Falha na injeção após ${maxRetries} tentativas e fallback`);
        }
      }
      
    } catch (error) {
      console.error('❌ Erro crítico na injeção:', error);
      hideLoading(loadingIndicator);
      showMessage(`Erro ao injetar prompt: ${error.message}`, 'error');
    }
  }

  // Fallback: enviar mensagem ao content script para injetar texto localmente
  function fallbackInjectViaContentScript(tabId, text, url) {
    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, { action: 'injectPrompt', text, url }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Erro ao enviar mensagem ao content script:', chrome.runtime.lastError.message);
            resolve(false);
            return;
          }
          resolve(!!(response && response.success));
        });
      } catch (err) {
        console.error('❌ Exceção no fallback:', err);
        resolve(false);
      }
    });
  }

  // Função para excluir um prompt com tratamento robusto de erros
  function deletePrompt(index) {
    if (confirm('Tem certeza que deseja excluir este prompt?')) {
      // Verificar se chrome.storage está disponível
      if (!chrome || !chrome.storage || !chrome.storage.local) {
        console.error('❌ Chrome storage API não disponível para exclusão');
        showMessage('Erro: API de armazenamento não disponível.', 'error');
        return;
      }

      console.log(`🗑️ Excluindo prompt no índice ${index}...`);
      
      chrome.storage.local.get(['prompts'], function(result) {
        // Verificar se houve erro na operação de leitura
        if (chrome.runtime.lastError) {
          console.error('❌ Erro ao ler prompts para exclusão:', chrome.runtime.lastError.message);
          showMessage('Erro ao acessar prompts para exclusão.', 'error');
          return;
        }
        
        try {
          const prompts = result.prompts || [];
          
          if (index < 0 || index >= prompts.length) {
            console.error('❌ Índice inválido para exclusão:', index);
            showMessage('Erro: prompt não encontrado.', 'error');
            return;
          }
          
          const deletedPrompt = prompts[index];
          prompts.splice(index, 1);
          
          console.log(`🗑️ Excluindo prompt: "${deletedPrompt.title}"`);
          
          chrome.storage.local.set({ prompts: prompts }, function() {
            // Verificar se houve erro na operação de escrita
            if (chrome.runtime.lastError) {
              console.error('❌ Erro ao salvar após exclusão:', chrome.runtime.lastError.message);
              showMessage('Erro ao salvar alterações após exclusão.', 'error');
              return;
            }
            
            try {
              console.log('✅ Prompt excluído com sucesso!');
              loadPrompts();
              showMessage('Prompt excluído com sucesso!');
            } catch (error) {
              console.error('❌ Erro pós-exclusão:', error);
              showMessage('Prompt excluído, mas houve erro na atualização da interface.', 'error');
            }
          });
          
        } catch (error) {
          console.error('❌ Erro ao processar exclusão:', error);
          showMessage('Erro ao processar exclusão do prompt.', 'error');
        }
      });
    }
  }

  // Função para escapar HTML (segurança)
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Função para exibir mensagens de feedback melhorada
  function showMessage(message, type = 'success', duration = 3000, options = {}) {
    // Opções avançadas
    const { persistent = false, actionButton = null, dismissible = true } = options;
    
    // Remover mensagens anteriores do mesmo tipo (exceto se for persistente)
    if (!persistent) {
      const existingMessages = document.querySelectorAll(`.ia-prompt-message.${type}`);
      existingMessages.forEach(msg => msg.remove());
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `ia-prompt-message message ${type}`;
    
    // Adicionar ícone baseado no tipo
    const icons = {
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️',
      'loading': '⏳',
      'copy': '📋',
      'inject': '💉'
    };
    
    const icon = icons[type] || 'ℹ️';
    
    // Criar estrutura da mensagem
    let messageHTML = `<span class="icon">${icon}</span> <span class="text">${message}</span>`;
    
    // Adicionar botão de ação se especificado
    if (actionButton) {
      messageHTML += `<button class="message-action-btn" style="
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-left: 8px;
      ">${actionButton.text}</button>`;
    }
    
    // Adicionar botão de fechar se dismissível
    if (dismissible) {
      messageHTML += `<button class="message-close-btn" style="
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        opacity: 0.7;
      ">×</button>`;
    }
    
    messageDiv.innerHTML = messageHTML;
    
    // Cores baseadas no tipo
    const colors = {
      'success': '#27ae60',
      'error': '#e74c3c',
      'warning': '#f39c12',
      'info': '#3498db',
      'loading': '#9b59b6',
      'copy': '#8e44ad',
      'inject': '#2ecc71'
    };
    
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 18px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      font-size: 14px;
      z-index: 10001;
      background-color: ${colors[type] || '#3498db'};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      transform: translateX(100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 350px;
      word-wrap: break-word;
      min-width: 200px;
    `;
    
    // Event listeners para botões
    if (actionButton) {
      const actionBtn = messageDiv.querySelector('.message-action-btn');
      if (actionBtn) {
        actionBtn.addEventListener('click', actionButton.callback);
      }
    }
    
    if (dismissible) {
      const closeBtn = messageDiv.querySelector('.message-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          messageDiv.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (messageDiv.parentNode) {
              messageDiv.remove();
            }
          }, 300);
        });
      }
    }
    
    // Adicionar animação de loading se necessário
    if (type === 'loading') {
      messageDiv.style.animation = 'pulse 1.5s infinite';
      if (!document.head.querySelector('style[data-pulse]')) {
        const style = document.createElement('style');
        style.setAttribute('data-pulse', 'true');
        style.textContent = `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    document.body.appendChild(messageDiv);
    
    // Animar entrada
    setTimeout(() => {
      messageDiv.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto-remover após duração especificada (exceto loading e persistentes)
    if (type !== 'loading' && !persistent && duration > 0) {
      setTimeout(() => {
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (messageDiv.parentNode) {
            messageDiv.remove();
          }
        }, 300);
      }, duration);
    }
    
    return messageDiv;
  }

  // Função para mostrar indicador de loading
  function showLoading(message = 'Processando...') {
    return showMessage(message, 'loading', 0);
  }
  
  // Função para esconder loading específico
  function hideLoading(loadingElement) {
    if (loadingElement && loadingElement.parentNode) {
      loadingElement.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (loadingElement.parentNode) {
          loadingElement.remove();
        }
      }, 300);
    }
  }
});

// Função para criar botões de copiar/colar adjacentes
function createCopyPasteButtons(targetElement) {
    // Verificar se os botões já existem
    if (document.querySelector('.ia-prompt-bar-buttons')) {
        return;
    }
    
    console.log('🎨 Criando botões de copiar/colar adjacentes');
    
    // Criar container para os botões
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'ia-prompt-bar-buttons';
    buttonContainer.style.cssText = `
        position: absolute;
        top: -40px;
        right: 0;
        display: flex;
        gap: 8px;
        z-index: 10000;
        background: rgba(255, 255, 255, 0.95);
        padding: 4px 8px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid #e0e0e0;
    `;
    
    // Botão de copiar
    const copyButton = document.createElement('button');
    copyButton.innerHTML = '📋 Copiar';
    copyButton.className = 'ia-prompt-copy-btn';
    copyButton.style.cssText = `
        background: #4285f4;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
    `;
    
    copyButton.addEventListener('click', async () => {
        try {
            const textToCopy = getTextFromElement(targetElement);
            await navigator.clipboard.writeText(textToCopy);
            copyButton.innerHTML = '✅ Copiado!';
            setTimeout(() => {
                copyButton.innerHTML = '📋 Copiar';
            }, 2000);
            console.log('✅ Texto copiado para clipboard');
        } catch (error) {
            console.error('❌ Erro ao copiar:', error);
            copyButton.innerHTML = '❌ Erro';
            setTimeout(() => {
                copyButton.innerHTML = '📋 Copiar';
            }, 2000);
        }
    });
    
    // Botão de colar
    const pasteButton = document.createElement('button');
    pasteButton.innerHTML = '📥 Colar';
    pasteButton.className = 'ia-prompt-paste-btn';
    pasteButton.style.cssText = `
        background: #34a853;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
    `;
    
    pasteButton.addEventListener('click', async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();
            if (clipboardText) {
                setTextInElement(targetElement, clipboardText);
                pasteButton.innerHTML = '✅ Colado!';
                setTimeout(() => {
                    pasteButton.innerHTML = '📥 Colar';
                }, 2000);
                console.log('✅ Texto colado do clipboard');
            }
        } catch (error) {
            console.error('❌ Erro ao colar:', error);
            pasteButton.innerHTML = '❌ Erro';
            setTimeout(() => {
                pasteButton.innerHTML = '📥 Colar';
            }, 2000);
        }
    });
    
    // Adicionar hover effects
    [copyButton, pasteButton].forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.05)';
            btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
        });
    });
    
    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(pasteButton);
    
    // Posicionar o container próximo ao elemento de entrada
    const parentElement = targetElement.parentElement;
    if (parentElement) {
        parentElement.style.position = 'relative';
        parentElement.appendChild(buttonContainer);
        console.log('✅ Botões de copiar/colar criados e posicionados');
    }
}

// Função auxiliar para obter texto do elemento
function getTextFromElement(element) {
    if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
        return element.value;
    } else if (element.contentEditable === 'true') {
        return element.textContent || element.innerText;
    }
    return '';
}

// Função auxiliar para definir texto no elemento
function setTextInElement(element, text) {
    if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.contentEditable === 'true') {
        element.textContent = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Focar no elemento e posicionar cursor no final
    element.focus();
    if (element.setSelectionRange) {
        element.setSelectionRange(text.length, text.length);
    } else if (element.contentEditable === 'true') {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

// Sistema de logs de debug detalhado
const DebugLogger = {
  enabled: true,
  prefix: '🤖 IA Prompt Bar',
  
  log: function(level, category, message, data = null) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const emoji = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'debug': '🔍'
    }[level] || 'ℹ️';
    
    const logMessage = `${this.prefix} ${emoji} [${timestamp}] [${category}] ${message}`;
    
    switch(level) {
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'warning':
        console.warn(logMessage, data || '');
        break;
      default:
        console.log(logMessage, data || '');
    }
  },
  
  info: function(category, message, data) { this.log('info', category, message, data); },
  success: function(category, message, data) { this.log('success', category, message, data); },
  warning: function(category, message, data) { this.log('warning', category, message, data); },
  error: function(category, message, data) { this.log('error', category, message, data); },
  debug: function(category, message, data) { this.log('debug', category, message, data); }
};

// Função que será injetada na página para inserir o texto
// Esta função executa no contexto da página web
function injectTextIntoPage(text, url) {
  // Validação inicial robusta
  if (!text || typeof text !== 'string') {
    console.error('❌ Texto inválido para injeção:', text);
    return false;
  }
  
  if (!url || typeof url !== 'string') {
    console.error('❌ URL inválida para injeção:', url);
    return false;
  }
  
  // Verificar se estamos em um contexto válido
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.error('❌ Contexto de execução inválido - window ou document não disponível');
    return false;
  }
  
  console.log(`🚀 Iniciando injeção de texto (${text.length} caracteres)`);
  console.log(`📍 URL: ${url}`);
  console.log(`📝 Preview: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
  
  // Função auxiliar para obter texto do elemento (contexto da página)
  function getTextFromElement(element) {
    try {
      const tagName = element && element.tagName ? element.tagName.toLowerCase() : '';
      if (tagName === 'textarea' || tagName === 'input') {
        return element.value || '';
      }
      if (element && element.contentEditable === 'true') {
        return element.textContent || element.innerText || '';
      }
    } catch (e) {}
    return '';
  }
  
  // Função auxiliar para definir texto no elemento (movida para dentro do escopo)
  function setTextInElement(element, text) {
    try {
      console.log('📝 Aplicando texto no elemento:', {
        tagName: element.tagName,
        contentEditable: element.contentEditable,
        hasValue: 'value' in element,
        hasTextContent: 'textContent' in element
      });
      
      // Focar no elemento primeiro
      element.focus();
      
      if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
        // Limpar conteúdo existente primeiro
        element.value = '';
        
        // Aguardar um pouco e definir o novo valor
        setTimeout(() => {
          element.value = text;
          
          // Disparar eventos para garantir que a aplicação detecte a mudança
          element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }));
          element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true }));
          
          // Posicionar cursor no final
          if (element.setSelectionRange) {
            element.setSelectionRange(element.value.length, element.value.length);
          }
          
          console.log('✅ Texto aplicado em textarea/input');
        }, 10);
        
      } else if (element.contentEditable === 'true') {
        // Para elementos contenteditable, usar diferentes métodos
        
        // Método 1: Limpar e definir textContent
        element.textContent = '';
        
        setTimeout(() => {
          // Tentar diferentes métodos de injeção
          element.textContent = text;
          
          // Se textContent não funcionou, tentar innerHTML
          if (!element.textContent || element.textContent !== text) {
            element.innerHTML = text.replace(/\n/g, '<br>');
          }
          
          // Se ainda não funcionou, tentar execCommand (método legado mas funcional)
          if (!element.textContent && !element.innerHTML) {
            try {
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, text);
            } catch (e) {
              console.warn('execCommand não suportado:', e);
            }
          }
          
          // Disparar eventos
          element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }));
          element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true }));
          
          // Posicionar cursor no final para contenteditable
          try {
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(element);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (e) {
            console.warn('Erro ao posicionar cursor:', e);
          }
          
          console.log('✅ Texto aplicado em elemento contenteditable');
        }, 10);
      }
      
      // Verificação final após um delay
      setTimeout(() => {
        const finalValue = getTextFromElement(element);
        console.log('🔍 Verificação final - Texto no elemento:', finalValue ? finalValue.substring(0, 50) + '...' : 'vazio');
      }, 50);
      
    } catch (error) {
      console.error('❌ Erro ao aplicar texto:', error);
    }
  }
  
  // Função para criar botões de copiar/colar adjacentes (movida para dentro do escopo)
  function createCopyPasteButtons(targetElement) {
    // Verificar se os botões já existem
    if (document.querySelector('.ia-prompt-bar-buttons')) {
      return;
    }
    
    console.log('🎨 Criando botões de copiar/colar adjacentes');
    
    // Criar container para os botões
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'ia-prompt-bar-buttons';
    buttonContainer.style.cssText = `
      position: absolute;
      top: -40px;
      right: 0;
      display: flex;
      gap: 8px;
      z-index: 10000;
      background: white;
      padding: 4px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #ddd;
    `;
    
    // Botão de copiar
    const copyButton = document.createElement('button');
    copyButton.innerHTML = '📋 Copiar';
    copyButton.style.cssText = `
      padding: 4px 8px;
      border: none;
      background: #007bff;
      color: white;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    `;
    
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        copyButton.innerHTML = '✅ Copiado!';
        setTimeout(() => {
          copyButton.innerHTML = '📋 Copiar';
        }, 2000);
        console.log('✅ Texto copiado para clipboard');
      } catch (error) {
        console.error('❌ Erro ao copiar:', error);
        copyButton.innerHTML = '❌ Erro';
        setTimeout(() => {
          copyButton.innerHTML = '📋 Copiar';
        }, 2000);
      }
    });
    
    // Botão de colar
    const pasteButton = document.createElement('button');
    pasteButton.innerHTML = '📥 Colar';
    pasteButton.style.cssText = `
      padding: 4px 8px;
      border: none;
      background: #28a745;
      color: white;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    `;
    
    pasteButton.addEventListener('click', async () => {
      try {
        const clipboardText = await navigator.clipboard.readText();
        setTextInElement(targetElement, clipboardText);
        pasteButton.innerHTML = '✅ Colado!';
        setTimeout(() => {
          pasteButton.innerHTML = '📥 Colar';
        }, 2000);
        console.log('✅ Texto colado do clipboard');
      } catch (error) {
        console.error('❌ Erro ao colar:', error);
        pasteButton.innerHTML = '❌ Erro';
        setTimeout(() => {
          pasteButton.innerHTML = '📥 Colar';
        }, 2000);
      }
    });
    
    // Adicionar hover effects
    [copyButton, pasteButton].forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = 'none';
      });
    });
    
    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(pasteButton);
    
    // Posicionar relativamente ao elemento alvo
    const rect = targetElement.getBoundingClientRect();
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.top = (rect.top - 45) + 'px';
    buttonContainer.style.left = (rect.right - 120) + 'px';
    
    document.body.appendChild(buttonContainer);
    
    // Remover botões após 10 segundos
    setTimeout(() => {
      if (buttonContainer.parentNode) {
        buttonContainer.parentNode.removeChild(buttonContainer);
      }
    }, 10000);
  }
  
  let platform = '';
  try {
    if (url.includes('gemini.google.com') || url.includes('aistudio.google.com') || url.includes('bard.google.com')) {
      platform = 'gemini';
    } else if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
      platform = 'chatgpt';
    } else if (url.includes('claude.ai') || url.includes('console.anthropic.com')) {
      platform = 'claude';
    }
    
    console.log(`🎯 Plataforma detectada: ${platform || 'desconhecida'}`);
  } catch (error) {
    console.error('❌ Erro na detecção de plataforma:', error);
    platform = 'fallback';
  }

  let targetElement = null;

  // Seletores específicos para cada plataforma
  const platformSelectors = {
    gemini: [
      // Seletores específicos para Gemini 2024/2025 - Mais atualizados
      'rich-textarea div[contenteditable="true"]',
      'div[contenteditable="true"][data-placeholder*="Enter a prompt here"]',
      'div[contenteditable="true"][data-placeholder*="Ask Gemini"]',
      'div[contenteditable="true"][aria-label*="Message Gemini"]',
      'div[contenteditable="true"][aria-label*="Enter a prompt here"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][class*="ql-editor"]',
      'div[contenteditable="true"][class*="input-area"]',
      'div[contenteditable="true"][class*="chat-input"]',
      'textarea[placeholder*="Enter a prompt here"]',
      'textarea[placeholder*="Ask Gemini"]',
      'textarea[placeholder*="Message Gemini"]',
      'textarea[aria-label*="prompt"]',
      'textarea[aria-label*="Message"]',
      'div[data-testid*="input"]',
      'div[data-testid*="prompt"]',
      'div[data-testid*="chat-input"]',
      // Fallbacks mais específicos
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
      'textarea',
      'input[type="text"]'
    ],
    chatgpt: [
      // Seletores específicos para ChatGPT 2024/2025 - Mais atualizados
      'textarea[data-id="root"]',
      'div[contenteditable="true"][data-id="root"]',
      '#prompt-textarea',
      'textarea[placeholder*="Message ChatGPT"]',
      'textarea[placeholder*="Send a message"]',
      'div[contenteditable="true"][placeholder*="Message ChatGPT"]',
      'div[contenteditable="true"][aria-label*="Send a message"]',
      'div[contenteditable="true"][aria-label*="Message ChatGPT"]',
      'div[contenteditable="true"][data-testid="textbox"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][class*="ProseMirror"]',
      'div[contenteditable="true"][class*="composer"]',
      'div[contenteditable="true"][class*="chat-input"]',
      'textarea[id*="prompt"]',
      'textarea[class*="composer"]',
      'textarea[data-testid*="input"]',
      // Fallbacks mais específicos
      'div[contenteditable="true"][aria-label*="Message"]',
      'textarea[placeholder*="Message"]'
    ],
    claude: [
      'div[contenteditable="true"][data-testid="chat-input"]',
      'textarea[placeholder*="Talk to Claude"]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea[placeholder*="Send a message"]'
    ],
    fallback: [
      'textarea[placeholder*="prompt"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="chat"]',
      'div[contenteditable="true"][role="textbox"]',
      'input[type="text"][placeholder*="prompt"]',
      'input[type="text"][placeholder*="message"]',
      'div[contenteditable="true"]',
      'textarea:focus',
      'input[type="text"]:focus',
      'textarea',
      'input[type="text"]'
    ]
  };

  console.log('🔍 Tentando injetar texto na plataforma:', platform);
  console.log('📝 Texto a ser injetado (primeiros 100 chars):', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
  console.log('🌐 URL atual:', url);
  console.log('📊 Seletores disponíveis para', platform + ':', platformSelectors[platform] ? platformSelectors[platform].length : 0);
  
  // Sistema de detecção inteligente para Gemini
  if (platform === 'gemini') {
    console.log('🎯 Detectado Gemini - iniciando detecção inteligente');
    console.log('📋 Seletores Gemini:', platformSelectors.gemini);
    
    // Detecção inteligente de elementos DOM específicos do Gemini
    const geminiSpecificElements = [
      () => document.querySelector('rich-textarea div[contenteditable="true"]'),
      () => document.querySelector('div[contenteditable="true"][role="textbox"]'),
      () => document.querySelector('div[contenteditable="true"][data-placeholder]'),
      () => document.querySelector('textarea[placeholder*="Message"]'),
      () => document.querySelector('div[role="textbox"]')
    ];
    
    console.log('🔍 Testando elementos específicos do Gemini...');
    for (let i = 0; i < geminiSpecificElements.length; i++) {
      const element = geminiSpecificElements[i]();
      if (element) {
        console.log(`✅ Elemento Gemini encontrado (método ${i + 1}):`, element);
        console.log('📍 Tagname:', element.tagName, 'Classes:', element.className, 'ID:', element.id);
        break;
      }
    }
  }

  // Função auxiliar para validar elementos de entrada
  function isValidInputElement(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const isContentEditable = element.contentEditable === 'true';
    const isInput = tagName === 'input' || tagName === 'textarea';
    const hasRole = element.getAttribute('role') === 'textbox';
    
    return isContentEditable || isInput || hasRole;
  }
  
  // Função auxiliar para verificar visibilidade
  function isVisibleElement(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           rect.width > 0 && 
           rect.height > 0;
  }
  
  // Função auxiliar para log de elementos disponíveis
  function logAvailableElements() {
    const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
    console.log('📋 Total de elementos de entrada encontrados:', allInputs.length);
    
    allInputs.forEach((el, index) => {
      console.log(`${index + 1}. ${el.tagName} - Classes: ${el.className} - ID: ${el.id} - Visible: ${isVisibleElement(el)}`);
    });
  }

  // Sistema de detecção inteligente melhorado
  const selectors = platformSelectors[platform] || platformSelectors.fallback;
  
  console.log(`🔍 Iniciando busca de elemento para plataforma: ${platform}`);
  
  // Primeira tentativa: seletores específicos da plataforma
  if (platform === 'gemini') {
    console.log('🎯 Iniciando busca específica para Gemini');
    const geminiSelectors = [
      'rich-textarea div[contenteditable="true"]',
      'textarea[placeholder*="Message Gemini"]',
      'div[contenteditable="true"][role="textbox"]',
      '.ql-editor[contenteditable="true"]',
      'div[data-placeholder*="Message"][contenteditable="true"]',
      'textarea[aria-label*="prompt"]',
      'div[contenteditable="true"][data-testid]',
      'div[contenteditable="true"]'
    ];
    
    console.log(`🔍 Testando ${geminiSelectors.length} seletores específicos do Gemini`);
    
    for (let i = 0; i < geminiSelectors.length; i++) {
      const selector = geminiSelectors[i];
      try {
        console.log(`🔍 Testando seletor ${i + 1}/${geminiSelectors.length}: ${selector}`);
        const element = document.querySelector(selector);
        
        if (element) {
          const isValid = isValidInputElement(element);
          const isVisible = isVisibleElement(element);
          
          console.log(`📍 Elemento encontrado:`, {
            seletor: selector,
            tagName: element.tagName,
            contentEditable: element.contentEditable,
            isValid: isValid,
            isVisible: isVisible,
            className: element.className,
            id: element.id
          });
          
          if (isValid && isVisible) {
            targetElement = element;
            console.log(`✅ Elemento válido encontrado com seletor: ${selector}`);
            break;
          } else {
            console.log(`⚠️ Elemento encontrado mas não é válido ou visível`);
          }
        } else {
          console.log(`❌ Nenhum elemento encontrado para: ${selector}`);
        }
      } catch (error) {
        console.error(`❌ Erro no seletor ${selector}:`, error);
      }
    }
  } else {
    console.log(`🔍 Testando seletores para plataforma: ${platform}`);
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      try {
        console.log(`🔍 Testando seletor ${i + 1}/${selectors.length}: ${selector}`);
        const element = document.querySelector(selector);
        if (element && isValidInputElement(element) && isVisibleElement(element)) {
          targetElement = element;
          console.log(`✅ Elemento encontrado com seletor: ${selector}`);
          console.log(`📍 Elemento válido:`, element.tagName, element.className);
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao tentar seletor ${selector}:`, error);
      }
    }
  }
  
  // Sistema de fallback inteligente para todas as plataformas
  if (!targetElement) {
    console.log('🔄 Iniciando sistema de fallback inteligente');
    
    // Estratégia 1: Busca por atributos específicos
    console.log('🎯 Estratégia 1: Busca por atributos específicos');
    const attributeSelectors = [
      '[contenteditable="true"]',
      '[role="textbox"]',
      '[data-placeholder]',
      '[aria-label*="prompt"]',
      '[aria-label*="message"]',
      '[placeholder*="prompt"]',
      '[placeholder*="message"]',
      '[placeholder*="chat"]'
    ];
    
    for (let i = 0; i < attributeSelectors.length; i++) {
      const selector = attributeSelectors[i];
      try {
        console.log(`🔍 Fallback - Testando atributo ${i + 1}/${attributeSelectors.length}: ${selector}`);
        const elements = document.querySelectorAll(selector);
        
        for (let j = 0; j < elements.length; j++) {
          const element = elements[j];
          const isValid = isValidInputElement(element);
          const isVisible = isVisibleElement(element);
          
          console.log(`📍 Verificando elemento ${j + 1}/${elements.length}:`, {
            seletor: selector,
            tagName: element.tagName,
            isValid: isValid,
            isVisible: isVisible,
            className: element.className,
            id: element.id
          });
          
          if (isValid && isVisible) {
            targetElement = element;
            console.log(`✅ Elemento encontrado via atributos: ${selector}`);
            break;
          }
        }
        if (targetElement) break;
      } catch (error) {
        console.error(`❌ Erro na estratégia de atributos com seletor ${selector}:`, error);
      }
    }
     
    // Estratégia 2: Busca por posição e tamanho
    if (!targetElement) {
      console.log('🎯 Estratégia 2: Busca por posição e tamanho');
      try {
        const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
        let bestElement = null;
        let bestScore = 0;
        
        console.log(`🔍 Analisando ${allInputs.length} elementos para scoring`);
        
        for (let k = 0; k < allInputs.length; k++) {
          const element = allInputs[k];
          try {
            if (isValidInputElement(element) && isVisibleElement(element)) {
              const rect = element.getBoundingClientRect();
              const score = calculateElementScore(element, rect);
              console.log(`📊 Elemento ${k + 1}/${allInputs.length} - Score: ${score}`, {
                tagName: element.tagName,
                className: element.className,
                id: element.id,
                score: score
              });
              
              if (score > bestScore) {
                bestScore = score;
                bestElement = element;
                console.log(`🏆 Novo melhor elemento encontrado com score: ${score}`);
              }
            }
          } catch (elementError) {
            console.error(`❌ Erro ao processar elemento ${k + 1}:`, elementError);
          }
        }
        
        if (bestElement && bestScore > 50) {
          targetElement = bestElement;
          console.log(`✅ Elemento encontrado por score: ${bestScore}`);
        } else {
          console.log(`⚠️ Nenhum elemento com score suficiente encontrado. Melhor score: ${bestScore}`);
        }
      } catch (error) {
        console.error('❌ Erro na estratégia de posição e tamanho:', error);
      }
    }
     
    // Estratégia 3: Busca por estrutura DOM
    if (!targetElement) {
      console.log('🎯 Estratégia 3: Busca por estrutura DOM');
      try {
        const structureSelectors = [
          'main [contenteditable="true"]',
          'form [contenteditable="true"]',
          '[data-testid] [contenteditable="true"]',
          '.chat [contenteditable="true"]',
          '.input [contenteditable="true"]'
        ];
        
        for (let l = 0; l < structureSelectors.length; l++) {
          const selector = structureSelectors[l];
          try {
            console.log(`🔍 Testando estrutura ${l + 1}/${structureSelectors.length}: ${selector}`);
            const element = document.querySelector(selector);
            if (element && isValidInputElement(element) && isVisibleElement(element)) {
              targetElement = element;
              console.log(`✅ Elemento encontrado via estrutura DOM: ${selector}`);
              break;
            }
          } catch (error) {
            console.error(`❌ Erro no seletor de estrutura: ${selector}`, error);
          }
        }
      } catch (error) {
        console.error('❌ Erro na estratégia de estrutura DOM:', error);
      }
    }
     
    // Estratégia 4: Busca por texto placeholder
    if (!targetElement) {
      console.log('🎯 Estratégia 4: Busca por texto placeholder');
      try {
        const allElements = document.querySelectorAll('*');
        console.log(`🔍 Analisando ${allElements.length} elementos para texto relevante`);
        
        for (let m = 0; m < allElements.length; m++) {
          const element = allElements[m];
          try {
            const placeholder = element.getAttribute('placeholder') || element.getAttribute('data-placeholder') || '';
            const ariaLabel = element.getAttribute('aria-label') || '';
            const textContent = element.textContent || '';
            
            const searchTerms = ['prompt', 'message', 'ask', 'chat', 'enter', 'type'];
            const hasRelevantText = searchTerms.some(term => 
              placeholder.toLowerCase().includes(term) ||
              ariaLabel.toLowerCase().includes(term) ||
              textContent.toLowerCase().includes(term)
            );
            
            if (hasRelevantText && isValidInputElement(element) && isVisibleElement(element)) {
              targetElement = element;
              console.log('✅ Elemento encontrado via texto placeholder', {
                placeholder: placeholder,
                ariaLabel: ariaLabel,
                textContent: textContent.substring(0, 50)
              });
              break;
            }
          } catch (elementError) {
            // Silenciar erros de elementos individuais para não poluir o log
          }
        }
      } catch (error) {
        console.error('❌ Erro na estratégia de texto placeholder:', error);
      }
    }
   }
   
   // Função para calcular score de elemento baseado em posição e tamanho
   function calculateElementScore(element, rect) {
     let score = 0;
     
     // Pontuação por tamanho (elementos maiores são mais prováveis de serem campos de entrada principais)
     score += Math.min(rect.width / 10, 50);
     score += Math.min(rect.height / 2, 20);
     
     // Pontuação por posição (elementos na parte inferior são mais prováveis)
     const viewportHeight = window.innerHeight;
     const relativePosition = rect.bottom / viewportHeight;
     if (relativePosition > 0.7) score += 30; // Parte inferior da tela
     
     // Pontuação por tipo de elemento
     const tagName = element.tagName.toLowerCase();
     if (tagName === 'textarea') score += 20;
     if (element.contentEditable === 'true') score += 15;
     if (element.getAttribute('role') === 'textbox') score += 10;
     
     // Pontuação por atributos relevantes
     const placeholder = element.getAttribute('placeholder') || '';
     const ariaLabel = element.getAttribute('aria-label') || '';
     if (placeholder.toLowerCase().includes('prompt') || ariaLabel.toLowerCase().includes('prompt')) score += 25;
     if (placeholder.toLowerCase().includes('message') || ariaLabel.toLowerCase().includes('message')) score += 20;
     
     return score;
   }

  if (!targetElement) {
    console.error('❌ Nenhum elemento de entrada encontrado!');
    console.log('🔍 Elementos disponíveis na página:');
    logAvailableElements();
    return { success: false, error: 'Campo de entrada não encontrado na página' };
  }

  if (targetElement) {
    console.log('✅ Elemento alvo encontrado:', {
      tagName: targetElement.tagName,
      className: targetElement.className,
      id: targetElement.id,
      contentEditable: targetElement.contentEditable,
      rect: targetElement.getBoundingClientRect()
    });
    
    try {
      // Criar botões de copiar/colar adjacentes
      try {
        createCopyPasteButtons(targetElement);
        console.log('✅ Botões de copiar/colar criados com sucesso');
      } catch (error) {
        console.error('❌ Erro ao criar botões de copiar/colar:', error);
      }
      
      targetElement.focus();
      console.log('🎯 Foco aplicado ao elemento');
      
      // Aguardar um momento para o foco ser aplicado
      setTimeout(() => {
        try {
          console.log('🚀 Iniciando injeção de texto no elemento:', {
            tagName: targetElement.tagName,
            contentEditable: targetElement.contentEditable,
            value: targetElement.value ? 'presente' : 'ausente',
            textContent: targetElement.textContent ? 'presente' : 'ausente'
          });
          
          // Verificar estado antes da injeção
          const beforeValue = getTextFromElement(targetElement);
          console.log('📝 Texto antes da injeção:', beforeValue ? beforeValue.substring(0, 50) + '...' : 'vazio');
          
          // Injetar o texto usando a função auxiliar
          setTextInElement(targetElement, text);
          
          // Verificar estado após a injeção com delay reduzido
          setTimeout(() => {
            const afterValue = getTextFromElement(targetElement);
            const injectionSuccess = afterValue && (afterValue.includes(text.substring(0, 50)) || afterValue.includes(text));
            
            console.log('📝 Texto após a injeção:', afterValue ? afterValue.substring(0, 50) + '...' : 'vazio');
            console.log('✅ Status da injeção:', injectionSuccess ? 'SUCESSO' : 'FALHA');
            
            if (!injectionSuccess) {
              console.error('❌ FALHA NA INJEÇÃO - Texto não foi aplicado corretamente');
              console.log('🔍 Diagnóstico:', {
                textoEsperado: text.substring(0, 100),
                textoEncontrado: afterValue ? afterValue.substring(0, 100) : 'nenhum',
                elementoFocado: document.activeElement === targetElement,
                elementoVisivel: isVisibleElement(targetElement)
              });
            } else {
              console.log(`✅ Texto injetado com sucesso (${text.length} caracteres)`);
            }
          }, 100);
          
        } catch (error) {
          console.error('❌ Erro durante a injeção de texto:', error);
          console.error('🔍 Stack trace:', error.stack);
        }
      }, 50);
      
      // Retorno síncrono simplificado
      return { success: true, message: `Injeção iniciada para elemento ${targetElement.tagName}` };
      
    } catch (error) {
      console.error('❌ Erro ao injetar texto:', error);
      return { success: false, error: `Erro durante injeção: ${error.message}` };
    }
  }

  // Este código nunca deve ser alcançado devido à lógica acima
  console.error('❌ Código de fallback final alcançado - isso não deveria acontecer');
  return { success: false, error: 'Erro interno: código de fallback alcançado' };
}
