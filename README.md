# AI Prompt Bar

Chrome extension that opens a sidebar to save and inject prompts automatically into AI chat interfaces.

## Description

AI Prompt Bar is a Google Chrome extension that allows users to:

- Save frequently used prompts
- Inject prompts quickly into AI chat interfaces
- Organize prompts into categories
- Access prompts through a convenient sidebar
- Edit existing prompts inline
- Search and filter prompts by title
- Export and import prompts in JSON format
- Switch between light and dark themes

## Features

- 🚀 Fast prompt injection
- 📁 Organization by categories
- 🔍 Quick prompt search
- ✏️ Inline prompt editing
- 📊 Sort by date/title
- 💾 Export/import JSON
- 🌙 Dark/light theme
- 💾 Local data storage
- 🎨 Intuitive and responsive interface
- 🤖 Support for ChatGPT, Gemini, Claude and others

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/dadebr/ia-prompt-bar.git
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked extension" and select the project folder

## How to Use

### Adding Prompts

1. Click on the extension icon in Chrome's toolbar
2. Enter the title and content of the prompt
3. Click "Save Prompt"

### Using Prompts

1. Open any AI chat interface (ChatGPT, Claude, etc.)
2. Click on the extension icon to open the sidebar
3. Browse through saved prompts or use search
4. Click "Inject" to insert the prompt into the text field

### Editing Prompts

1. Click the "Edit" button on any prompt
2. Modify the title or content
3. Click "Update" to save changes
4. Use "Cancel" to discard changes

### Organizing Prompts

- Use search to quickly find specific prompts
- Sort by "Most recent" or "Title A-Z"
- Export your prompts for backup
- Import prompts from other users or backups

## Development

### Project Structure

```
ia-prompt-bar/
├── manifest.json          # Extension manifest
├── popup.html             # Main interface
├── popup.js               # Popup logic
├── content.js             # Content script
├── background.js          # Background script
├── deploy.sh              # Deploy script
└── styles/
    └── popup.css          # Interface styles
```

### Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Chrome Extension APIs

## Deploy

To deploy changes:

```bash
# Give execution permission to the script
chmod +x deploy.sh

# Run the deploy
./deploy.sh
```

The script will:

- Check if Git is configured
- Add all modified files
- Commit with descriptive message
- Push to GitHub repository

## Contributing

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/NewFeature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

## License

This project is under the MIT license. See the LICENSE file for more details.

## Contact

If you have any questions or suggestions, feel free to open an issue in this repository.

Developed with ❤️ to facilitate AI usage
