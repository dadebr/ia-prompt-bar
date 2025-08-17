// popup.js - IA Prompt Bar Extension
// Implementa funcionalidades de renderização, salvamento e injeção de prompts

document.addEventListener('DOMContentLoaded', function() {
  // Elementos do DOM
  const promptList = document.getElementById('prompt-list');
  const promptTitle = document.getElementById('prompt-title');
  const promptText = document.getElementById('prompt-text');
  const saveButton = document.getElementById('save-prompt');

  // Carrega e exibe prompts salvos ao inicializar
  loadPrompts();

  // Event listener para salvar prompts
  saveButton.addEventListener('click', savePrompt);

  // Função para carregar prompts do storage
  function loadPrompts() {
    chrome.storage.local.get(['prompts'], function(result) {
      const prompts = result.prompts || [];
      renderPrompts(prompts);
    });
  }

  // Função para renderizar a lista de prompts
  function renderPrompts(prompts) {
    promptList.innerHTML = '';
    
    prompts.forEach((prompt, index) => {
      const promptItem = document.createElement('div');
      promptItem.className = 'prompt-item';
      
      promptItem.innerHTML = `
        <div class="prompt-header">
          <h3 class="prompt-title">${escapeHtml(prompt.title)}</h3>
          <div class="prompt-actions">
            <button class="inject-btn" data-index="${index}" title="Injetar prompt">📋</button>
            <button class="delete-btn" data-index="${index}" title="Excluir prompt">🗑️</button>
          </div>
        </div>
        <p class="prompt-content">${escapeHtml(prompt.text)}</p>
      `;
      
      promptList.appendChild(promptItem);
    });

    // Adiciona event listeners para os botões
    document.querySelectorAll('.inject-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        injectPrompt(prompts[index]);
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        deletePrompt(index);
      });
    });
  }

  // Função para salvar um novo prompt
  function savePrompt() {
    const title = promptTitle.value.trim();
    const text = promptText.value.trim();
    
    if (!title || !text) {
      alert('Por favor, preencha o título e o texto do prompt.');
      return;
    }

    chrome.storage.local.get(['prompts'], function(result) {
      const prompts = result.prompts || [];
      
      const newPrompt = {
        id: Date.now(),
        title: title,
        text: text,
        createdAt: new Date().toISOString()
      };
      
      prompts.push(newPrompt);
      
      chrome.storage.local.set({ prompts: prompts }, function() {
        // Limpa os campos
        promptTitle.value = '';
        promptText.value = '';
        
        // Recarrega a lista
        loadPrompts();
        
        // Feedback visual
        showMessage('Prompt salvo com sucesso!');
      });
    });
  }

  // Função para injetar prompt na página ativa
  function injectPrompt(prompt) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: injectTextIntoPage,
          args: [prompt.text]
        }, function() {
          if (chrome.runtime.lastError) {
            console.error('Erro ao injetar prompt:', chrome.runtime.lastError);
            showMessage('Erro ao injetar prompt. Verifique as permissões.', 'error');
          } else {
            showMessage('Prompt injetado com sucesso!');
            window.close(); // Fecha o popup após injetar
          }
        });
      }
    });
  }

  // Função para excluir um prompt
  function deletePrompt(index) {
    if (confirm('Tem certeza que deseja excluir este prompt?')) {
      chrome.storage.local.get(['prompts'], function(result) {
        const prompts = result.prompts || [];
        prompts.splice(index, 1);
        
        chrome.storage.local.set({ prompts: prompts }, function() {
          loadPrompts();
          showMessage('Prompt excluído com sucesso!');
        });
      });
    }
  }

  // Função para escapar HTML (segurança)
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Função para exibir mensagens de feedback
  function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px 15px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      background-color: ${type === 'error' ? '#e74c3c' : '#27ae60'};
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }
});

// Função que será injetada na página para inserir o texto
// Esta função executa no contexto da página web
function injectTextIntoPage(text) {
  // Procura por campos de texto comuns onde inserir o prompt
  const selectors = [
    'textarea[placeholder*="prompt"]',
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="chat"]',
    'input[type="text"][placeholder*="prompt"]',
    'input[type="text"][placeholder*="message"]',
    'div[contenteditable="true"]',
    'textarea:focus',
    'input[type="text"]:focus',
    'textarea',
    'input[type="text"]'
  ];
  
  let targetElement = null;
  
  // Tenta encontrar um elemento focado primeiro
  const activeElement = document.activeElement;
  if (activeElement && 
      (activeElement.tagName === 'TEXTAREA' || 
       (activeElement.tagName === 'INPUT' && activeElement.type === 'text') ||
       activeElement.contentEditable === 'true')) {
    targetElement = activeElement;
  }
  
  // Se não encontrou elemento focado, procura pelos seletores
  if (!targetElement) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) { // Elemento visível
        targetElement = element;
        break;
      }
    }
  }
  
  if (targetElement) {
    // Foca no elemento
    targetElement.focus();
    
    // Insere o texto
    if (targetElement.contentEditable === 'true') {
      // Para elementos contenteditable
      targetElement.textContent = text;
      
      // Dispara eventos para notificar frameworks como React/Vue
      targetElement.dispatchEvent(new Event('input', { bubbles: true }));
      targetElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Para input e textarea
      targetElement.value = text;
      
      // Dispara eventos
      targetElement.dispatchEvent(new Event('input', { bubbles: true }));
      targetElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Move o cursor para o final
    if (targetElement.setSelectionRange) {
      targetElement.setSelectionRange(text.length, text.length);
    }
    
    return true; // Sucesso
  }
  
  return false; // Não encontrou elemento apropriado
}
