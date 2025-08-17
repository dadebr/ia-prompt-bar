// content.js - IA Prompt Bar Floating Button

(function() {
  'use strict';
  
  // Verificar se o botão já existe para evitar duplicatas
  if (document.getElementById('ia-prompt-button')) {
    return;
  }

  // Criar o botão flutuante
  const button = document.createElement('button');
  button.id = 'ia-prompt-button';
  button.innerHTML = '🤖';
  button.title = 'Abrir IA Prompt Bar';
  
  // Estilos do botão
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    zIndex: '999999',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    userSelect: 'none',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)'
  });

  // Adicionar animação CSS
  const style = document.createElement('style');
  style.textContent = `
    #ia-prompt-button {
      animation: ia-prompt-pulse 2s infinite;
    }
    
    #ia-prompt-button:hover {
      transform: scale(1.1) rotate(5deg);
      box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
    }
    
    #ia-prompt-button:active {
      transform: scale(0.95);
    }
    
    #ia-prompt-button.clicked {
      animation: ia-prompt-click 0.3s ease;
    }
    
    @keyframes ia-prompt-pulse {
      0%, 100% {
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      }
      50% {
        box-shadow: 0 4px 25px rgba(102, 126, 234, 0.6);
      }
    }
    
    @keyframes ia-prompt-click {
      0% { transform: scale(1); }
      50% { transform: scale(0.9); }
      100% { transform: scale(1); }
    }
    
    #ia-prompt-tooltip {
      position: fixed;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 999998;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
      white-space: nowrap;
    }
  `;
  
  document.head.appendChild(style);

  // Criar tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'ia-prompt-tooltip';
  tooltip.textContent = 'Clique para abrir a barra de prompts';
  document.body.appendChild(tooltip);

  // Event listeners
  button.addEventListener('click', function() {
    // Adicionar animação de clique
    this.classList.add('clicked');
    setTimeout(() => this.classList.remove('clicked'), 300);
    
    // Enviar mensagem para abrir sidebar
    try {
      chrome.runtime.sendMessage({ action: 'openSidebar' });
    } catch (error) {
      console.error('Erro ao abrir sidebar:', error);
      showNotification('Erro ao abrir a barra de prompts', 'error');
    }
  });

  // Mostrar tooltip no hover
  button.addEventListener('mouseenter', function(e) {
    const rect = this.getBoundingClientRect();
    tooltip.style.right = (window.innerWidth - rect.left + 10) + 'px';
    tooltip.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
    tooltip.style.opacity = '1';
  });

  button.addEventListener('mouseleave', function() {
    tooltip.style.opacity = '0';
  });

  // Função para mostrar notificações
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: slideInRight 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Adicionar animações para notificações
  const notificationStyle = document.createElement('style');
  notificationStyle.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  
  document.head.appendChild(notificationStyle);

  // Adicionar o botão à página
  document.body.appendChild(button);
  
  // Mostrar notificação de carregamento
  setTimeout(() => {
    showNotification('IA Prompt Bar carregado com sucesso!');
  }, 1000);

})();

// Listener para fallback de injeção a partir do painel (popup/side panel)
try {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.action !== 'injectPrompt' || typeof message.text !== 'string') {
      return false;
    }

    (async () => {
      try {
        const url = message.url || window.location.href;
        const text = message.text;

        // Funções auxiliares
        const isVisible = (el) => {
          if (!el) return false;
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };

        const getTextFromElement = (el) => {
          try {
            const tag = el.tagName ? el.tagName.toLowerCase() : '';
            if (tag === 'textarea' || tag === 'input') return el.value || '';
            if (el && el.contentEditable === 'true') return el.textContent || el.innerText || '';
          } catch (_) {}
          return '';
        };

        const setTextInElement = (el, value) => {
          try {
            el.focus();
            const tag = el.tagName ? el.tagName.toLowerCase() : '';
            if (tag === 'textarea' || tag === 'input') {
              el.value = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (el.contentEditable === 'true') {
              el.textContent = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } catch (e) {}
        };

        // Busca alvo: ChatGPT
        const findChatGPT = () => {
          const selectors = [
            '#prompt-textarea',
            'textarea[data-id="root"]',
            'div[contenteditable="true"][data-testid="textbox"]',
            'div[contenteditable="true"][role="textbox"]',
            'textarea[placeholder*="Message ChatGPT"]',
            'textarea[placeholder*="Send a message"]'
          ];
          for (const s of selectors) {
            const el = document.querySelector(s);
            if (el && isVisible(el)) return el;
          }
          return null;
        };

        // Busca alvo: Gemini (através de Shadow DOM do rich-textarea)
        const findGemini = () => {
          // Tentar pelo rich-textarea
          const hosts = Array.from(document.querySelectorAll('rich-textarea'));
          for (const host of hosts) {
            const root = host.shadowRoot || null;
            if (!root) continue;
            const cand = root.querySelector('div[contenteditable="true"], [role="textbox"], textarea');
            if (cand && isVisible(cand)) return cand;
          }
          // Fallback genérico
          const generic = document.querySelector('div[contenteditable="true"],[role="textbox"],textarea');
          return generic && isVisible(generic) ? generic : null;
        };

        const isGemini = /gemini\.google\.com|aistudio\.google\.com|bard\.google\.com/.test(url);
        const isChatGPT = /chatgpt\.com|chat\.openai\.com/.test(url);

        let target = null;
        if (isChatGPT) target = findChatGPT();
        if (!target && isGemini) target = findGemini();
        if (!target) {
          // Fallback geral
          const fallbacks = [
            'textarea',
            'input[type="text"]',
            'div[contenteditable="true"]',
            '[role="textbox"]'
          ];
          for (const s of fallbacks) {
            const el = document.querySelector(s);
            if (el && isVisible(el)) { target = el; break; }
          }
        }

        if (!target) {
          sendResponse({ success: false, error: 'Campo de entrada não encontrado (fallback)' });
          return;
        }

        const before = getTextFromElement(target);
        setTextInElement(target, text);
        setTimeout(() => {
          const after = getTextFromElement(target);
          const ok = !!after && (after.includes(text) || after.includes(text.slice(0, Math.min(30, text.length))));
          sendResponse({ success: ok, message: ok ? 'Injetado via content script' : 'Falha ao aplicar texto (fallback)' });
        }, 60);
      } catch (err) {
        sendResponse({ success: false, error: err?.message || String(err) });
      }
    })();

    return true; // manter canal aberto para resposta assíncrona
  });
} catch (_) {}
