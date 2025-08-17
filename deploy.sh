#!/bin/bash

# Script para fazer deploy da extensão IA Prompt Bar
# Execute este script na pasta do projeto

echo "🚀 Iniciando deploy da IA Prompt Bar..."

# Verificar se estamos no diretório correto
if [ ! -f "manifest.json" ]; then
    echo "❌ Erro: Execute este script na pasta raiz do projeto (onde está o manifest.json)"
    exit 1
fi

# Verificar se o Git está configurado
if ! git config user.name > /dev/null 2>&1; then
    echo "❌ Erro: Git não está configurado. Configure seu nome e email:"
    echo "git config --global user.name 'Seu Nome'"
    echo "git config --global user.email 'seu.email@exemplo.com'"
    exit 1
fi

# Verificar se o repositório remoto está configurado
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ Erro: Repositório remoto não configurado. Execute:"
    echo "git remote add origin https://github.com/dadebr/ia-prompt-bar.git"
    exit 1
fi

echo "✅ Verificações iniciais passaram"

# Adicionar todos os arquivos
echo "📁 Adicionando arquivos..."
git add .

# Verificar se há mudanças
if git diff --cached --quiet; then
    echo "ℹ️ Nenhuma mudança detectada. Todos os arquivos já estão atualizados."
    exit 0
fi

# Mostrar status
echo "📊 Status das mudanças:"
git status --short

# Fazer commit
echo "💾 Fazendo commit..."
git commit -m "feat: implementa interface melhorada com busca, edição e tema escuro

- Adiciona busca por título em tempo real
- Implementa edição inline de prompts
- Adiciona ordenação (recentes/título A-Z)
- Implementa exportar/importar JSON
- Adiciona tema escuro com persistência
- Corrige injeção de prompts no ChatGPT e Gemini
- Melhora layout responsivo e UX dos botões
- Adiciona ícones SVG padronizados"

# Fazer push
echo "🚀 Enviando para o GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Deploy concluído com sucesso!"
    echo "🌐 Acesse: https://github.com/dadebr/ia-prompt-bar"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Verifique se as mudanças apareceram no GitHub"
    echo "2. Considere criar uma Release para facilitar o download"
    echo "3. Teste a extensão após o deploy"
else
    echo "❌ Erro ao fazer push. Verifique suas credenciais do GitHub."
    echo "💡 Dica: Use um token de acesso pessoal se necessário"
fi
