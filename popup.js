// popup.js - Lógica da interface popup da extensão IA Prompt Bar

// Elementos da interface
let prompts = [];
let categories = new Set(['Geral']);

// Inicialização quando o popup é carregado
document.addEventListener('DOMContentLoaded', function() {
  console.log('IA Prompt Bar: Popup carregado');
  
  // Carrega dados salvos no storage local
  loadPromptsFromStorage();
  
  // Configura os event listeners
  setupEventListeners();
  
  // Renderiza a interface inicial
  renderInterface();
});

// Configuração dos event listeners
function setupEventListeners() {
  // Botão para adicionar novo prompt
  const addButton = document.getElementById('add-prompt-btn');
  if (addButton) {
    addButton.addEventListener('click', showAddPromptForm);
  }
  
  // Botão para salvar prompt
  const saveButton = document.getElementById('save-prompt-btn');
  if (saveButton) {
    saveButton.addEventListener('click', saveNewPrompt);
  }
  
  // Botão para cancelar adição
  const cancelButton = document.getElementById('cancel-prompt-btn');
  if (cancelButton) {
    cancelButton.addEventListener('click', hideAddPromptForm);
  }
  
  // Campo de busca
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', filterPrompts);
  }
  
  // Filtro de categoria
  const categorySelect = document.getElementById('category-filter');
  if (categorySelect) {
    categorySelect.addEventListener('change', filterPrompts);
  }
}

// Carrega prompts do storage local do Chrome
function loadPromptsFromStorage() {
  chrome.storage.local.get(['promptBarData'], function(result) {
    if (result.promptBarData) {
      prompts = result.promptBarData.prompts || [];
      categories = new Set(result.promptBarData.categories || ['Geral']);
    }
    renderInterface();
  });
}

// Salva prompts no storage local
function savePromptsToStorage() {
  const data = {
    prompts: prompts,
    categories: Array.from(categories)
  };
  
  chrome.storage.local.set({ promptBarData: data }, function() {
    console.log('Prompts salvos no storage local');
  });
}

// Renderiza a interface principal
function renderInterface() {
  renderPromptsList();
  renderCategoryFilter();
  updateStats();
}

// Renderiza a lista de prompts
function renderPromptsList() {
  const promptsList = document.getElementById('prompts-list');
  if (!promptsList) return;
  
  promptsList.innerHTML = '';
  
  if (prompts.length === 0) {
    promptsList.innerHTML = '<div class="empty-state">Nenhum prompt salvo ainda. Clique em "Adicionar Prompt" para começar.</div>';
    return;
  }
  
  prompts.forEach((prompt, index) => {
    const promptElement = createPromptElement(prompt, index);
    promptsList.appendChild(promptElement);
  });
}

// Cria elemento HTML para um prompt
function createPromptElement(prompt, index) {
  const div = document.createElement('div');
  div.className = 'prompt-item';
  div.innerHTML = `
    <div class="prompt-header">
      <h3 class="prompt-title">${escapeHtml(prompt.title)}</h3>
      <span class="prompt-category">${escapeHtml(prompt.category || 'Geral')}</span>
    </div>
    <div class="prompt-content">${escapeHtml(prompt.content).substring(0, 100)}${prompt.content.length > 100 ? '...' : ''}</div>
    <div class="prompt-actions">
      <button class="btn-use" data-index="${index}">Usar</button>
      <button class="btn-edit" data-index="${index}">Editar</button>
      <button class="btn-delete" data-index="${index}">Excluir</button>
    </div>
  `;
  
  // Adiciona event listeners para os botões
  div.querySelector('.btn-use').addEventListener('click', () => usePrompt(index));
  div.querySelector('.btn-edit').addEventListener('click', () => editPrompt(index));
  div.querySelector('.btn-delete').addEventListener('click', () => deletePrompt(index));
  
  return div;
}

// Renderiza o filtro de categorias
function renderCategoryFilter() {
  const categorySelect = document.getElementById('category-filter');
  if (!categorySelect) return;
  
  categorySelect.innerHTML = '<option value="">Todas as categorias</option>';
  
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

// Mostra o formulário de adicionar prompt
function showAddPromptForm() {
  const form = document.getElementById('add-prompt-form');
  const overlay = document.getElementById('form-overlay');
  
  if (form && overlay) {
    form.style.display = 'block';
    overlay.style.display = 'block';
    
    // Limpa os campos
    document.getElementById('prompt-title').value = '';
    document.getElementById('prompt-content').value = '';
    document.getElementById('prompt-category').value = 'Geral';
    
    // Foca no campo título
    document.getElementById('prompt-title').focus();
  }
}

// Esconde o formulário de adicionar prompt
function hideAddPromptForm() {
  const form = document.getElementById('add-prompt-form');
  const overlay = document.getElementById('form-overlay');
  
  if (form && overlay) {
    form.style.display = 'none';
    overlay.style.display = 'none';
  }
}

// Salva novo prompt
function saveNewPrompt() {
  const title = document.getElementById('prompt-title').value.trim();
  const content = document.getElementById('prompt-content').value.trim();
  const category = document.getElementById('prompt-category').value.trim() || 'Geral';
  
  // Validação
  if (!title || !content) {
    alert('Por favor, preencha o título e o conteúdo do prompt.');
    return;
  }
  
  // Cria novo prompt
  const newPrompt = {
    id: Date.now().toString(),
    title: title,
    content: content,
    category: category,
    createdAt: new Date().toISOString(),
    usageCount: 0
  };
  
  // Adiciona à lista
  prompts.push(newPrompt);
  categories.add(category);
  
  // Salva no storage
  savePromptsToStorage();
  
  // Atualiza interface
  renderInterface();
  
  // Esconde formulário
  hideAddPromptForm();
  
  console.log('Novo prompt salvo:', newPrompt);
}

// Usa um prompt (injeta no campo de chat)
function usePrompt(index) {
  const prompt = prompts[index];
  if (!prompt) return;
  
  // Incrementa contador de uso
  prompt.usageCount = (prompt.usageCount || 0) + 1;
  prompt.lastUsed = new Date().toISOString();
  
  // Salva no storage
  savePromptsToStorage();
  
  // Envia mensagem para o content script injetar o texto
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'injectPrompt',
      text: prompt.content
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.log('Erro ao injetar prompt:', chrome.runtime.lastError.message);
        // Fallback: copia para clipboard
        copyToClipboard(prompt.content);
        showNotification('Prompt copiado para a área de transferência!');
      } else {
        console.log('Prompt injetado com sucesso');
        showNotification('Prompt inserido no campo de chat!');
      }
    });
  });
}

// Edita um prompt
function editPrompt(index) {
  const prompt = prompts[index];
  if (!prompt) return;
  
  // Preenche o formulário com os dados do prompt
  document.getElementById('prompt-title').value = prompt.title;
  document.getElementById('prompt-content').value = prompt.content;
  document.getElementById('prompt-category').value = prompt.category;
  
  // Modifica o comportamento do botão salvar para edição
  const saveButton = document.getElementById('save-prompt-btn');
  saveButton.textContent = 'Atualizar';
  saveButton.onclick = () => updatePrompt(index);
  
  showAddPromptForm();
}

// Atualiza um prompt existente
function updatePrompt(index) {
  const title = document.getElementById('prompt-title').value.trim();
  const content = document.getElementById('prompt-content').value.trim();
  const category = document.getElementById('prompt-category').value.trim() || 'Geral';
  
  if (!title || !content) {
    alert('Por favor, preencha o título e o conteúdo do prompt.');
    return;
  }
  
  // Atualiza o prompt
  prompts[index].title = title;
  prompts[index].content = content;
  prompts[index].category = category;
  prompts[index].updatedAt = new Date().toISOString();
  
  categories.add(category);
  
  // Salva no storage
  savePromptsToStorage();
  
  // Atualiza interface
  renderInterface();
  
  // Restaura botão salvar
  const saveButton = document.getElementById('save-prompt-btn');
  saveButton.textContent = 'Salvar';
  saveButton.onclick = saveNewPrompt;
  
  // Esconde formulário
  hideAddPromptForm();
}

// Exclui um prompt
function deletePrompt(index) {
  const prompt = prompts[index];
  if (!prompt) return;
  
  if (confirm(`Tem certeza que deseja excluir o prompt "${prompt.title}"?`)) {
    prompts.splice(index, 1);
    savePromptsToStorage();
    renderInterface();
    console.log('Prompt excluído:', prompt);
  }
}

// Filtra prompts por busca e categoria
function filterPrompts() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const selectedCategory = document.getElementById('category-filter').value;
  
  const promptItems = document.querySelectorAll('.prompt-item');
  
  prompts.forEach((prompt, index) => {
    const matchesSearch = !searchTerm || 
      prompt.title.toLowerCase().includes(searchTerm) ||
      prompt.content.toLowerCase().includes(searchTerm);
    
    const matchesCategory = !selectedCategory || prompt.category === selectedCategory;
    
    const shouldShow = matchesSearch && matchesCategory;
    
    if (promptItems[index]) {
      promptItems[index].style.display = shouldShow ? 'block' : 'none';
    }
  });
}

// Copia texto para clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Erro ao copiar para clipboard:', err);
    // Fallback método antigo
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  });
}

// Mostra notificação temporária
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Atualiza estatísticas
function updateStats() {
  const statsElement = document.getElementById('stats');
  if (statsElement) {
    const totalPrompts = prompts.length;
    const totalCategories = categories.size;
    statsElement.textContent = `${totalPrompts} prompts em ${totalCategories} categorias`;
  }
}

// Função utilitária para escapar HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
