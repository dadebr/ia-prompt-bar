# IA Prompt Bar

Extensão Chrome que abre uma barra lateral para salvar e injetar prompts automaticamente em interfaces de chat de IA.

## Descrição

A IA Prompt Bar é uma extensão para Google Chrome que permite aos usuários:

- Salvar prompts frequentemente utilizados
- Injetar prompts rapidamente em interfaces de chat de IA
- Organizar prompts em categorias
- Acessar prompts através de uma barra lateral conveniente
- Editar prompts existentes inline
- Buscar e filtrar prompts por título
- Exportar e importar prompts em formato JSON
- Alternar entre tema claro e escuro

## Recursos

- 🚀 Injeção rápida de prompts
- 📁 Organização por categorias
- 🔍 Busca rápida de prompts
- ✏️ Edição inline de prompts
- 📊 Ordenação por data/título
- 💾 Exportar/importar JSON
- 🌙 Tema escuro/claro
- 💾 Salvamento local dos dados
- 🎨 Interface intuitiva e responsiva
- 🤖 Suporte a ChatGPT, Gemini, Claude e outros

## Instalação

1. Clone este repositório:
   ```bash
   git clone https://github.com/dadebr/ia-prompt-bar.git
   ```

2. Abra o Chrome e acesse `chrome://extensions/`

3. Ative o "Modo do desenvolvedor" no canto superior direito

4. Clique em "Carregar extensão sem pacote" e selecione a pasta do projeto

## Como Usar

### Adicionando Prompts

1. Clique no ícone da extensão na barra de ferramentas do Chrome
2. Digite o título e o conteúdo do prompt
3. Clique em "Salvar Prompt"

### Usando Prompts

1. Abra qualquer interface de chat de IA (ChatGPT, Claude, etc.)
2. Clique no ícone da extensão para abrir a barra lateral
3. Navegue pelos prompts salvos ou use a busca
4. Clique em "Injetar" para inserir o prompt no campo de texto

### Editando Prompts

1. Clique no botão "Editar" em qualquer prompt
2. Modifique o título ou conteúdo
3. Clique em "Atualizar" para salvar as mudanças
4. Use "Cancelar" para descartar as alterações

### Organizando Prompts

- Use a busca para encontrar rapidamente prompts específicos
- Ordene por "Mais recentes" ou "Título A-Z"
- Exporte seus prompts para backup
- Importe prompts de outros usuários ou backups

## Desenvolvimento

### Estrutura do Projeto

```
ia-prompt-bar/
├── manifest.json          # Manifesto da extensão
├── popup.html             # Interface principal
├── popup.js               # Lógica da popup
├── content.js             # Script de conteúdo
├── background.js          # Script de background
├── deploy.sh              # Script de deploy
└── styles/
    └── popup.css          # Estilos da interface
```

### Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- Chrome Extension APIs

## Deploy

Para fazer deploy das mudanças:

```bash
# Dar permissão de execução ao script
chmod +x deploy.sh

# Executar o deploy
./deploy.sh
```

O script irá:
- Verificar se o Git está configurado
- Adicionar todos os arquivos modificados
- Fazer commit com mensagem descritiva
- Fazer push para o repositório GitHub

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## Contato

Se você tiver alguma dúvida ou sugestão, sinta-se à vontade para abrir uma issue neste repositório.

---

**Desenvolvido com ❤️ para facilitar o uso de IAs**
