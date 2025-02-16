# Fire Safety AI Assistant

A sophisticated chat bot application designed for fire safety analysis, capable of integrating with various local AI models. The application provides comprehensive support for fire safety documentation, inspections, and compliance checks.

## Features

- 🤖 Support for multiple model backends:
  - Ollama (recommended)
  - LM Studio
  - Custom endpoints
- 🎨 Beautiful and responsive UI
- ⚡ Real-time chat interface
- 🛠️ Configurable model parameters
- 📝 Markdown support for rich text responses
- 📁 File upload support (up to 500GB)
- 🖥️ Available as both web and desktop application
- 🔍 Advanced fire safety features:
  - Automatic protocol generation
  - Document analysis and classification
  - Visual inspection support
  - Compliance verification
  - Report generation
  - Case study development

## Prerequisites

- Node.js 18 or higher
- One of the following local model servers:
  - [Ollama](https://ollama.ai/) (recommended)
  - [LM Studio](https://lmstudio.ai/)
  - Or any compatible local model server

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Web Version
To run the web version:
```bash
npm run dev
```

The web application will be available at:
- Development: http://localhost:5555
- Preview: http://localhost:5555

### Desktop Version
To run the desktop version in development mode:
```bash
npm run electron:dev
```

To build the desktop application:
```bash
npm run electron:build
```

The built application will be available in the `dist-electron` directory.

### Building Desktop Apps

#### Windows
```bash
npm run electron:build -- --win
```
Creates:
- Windows installer (.exe) in `dist-electron`
- Portable executable
- NSIS installer

#### macOS
```bash
npm run electron:build -- --mac
```
Creates:
- DMG installer
- App bundle (.app)
- Universal binary (Intel + Apple Silicon)

#### Linux
```bash
npm run electron:build -- --linux
```
Creates:
- AppImage
- Debian package (.deb)
- RPM package (.rpm)

## Model Setup

### Using Ollama (Recommended)

1. Install Ollama:
   - **macOS**: 
     ```bash
     brew install ollama
     ```
   - **Linux**:
     ```bash
     curl https://ollama.ai/install.sh | sh
     ```
   - **Windows**:
     - Download from [ollama.ai/download](https://ollama.ai/download)
     - Run the installer
     - Follow the setup wizard

2. Start Ollama:
   - **macOS/Linux**: Ollama starts automatically after installation
   - **Windows**: Launch Ollama from the Start Menu

3. Pull the Llava model:
   ```bash
   ollama pull llava
   ```

4. In the Fire Safety AI Assistant:
   - Set Model Type to "Ollama"
   - Endpoint will automatically be set to "http://localhost:11434"
   - Select "llava" from the model dropdown

### Using LM Studio

1. Download and install LM Studio from [lmstudio.ai](https://lmstudio.ai)
2. Launch LM Studio
3. Download your desired model
4. Start the local server (default port: 1234)
5. In the Fire Safety AI Assistant:
   - Set Model Type to "LM Studio"
   - Set Endpoint to "http://localhost:1234/v1/chat/completions"
   - Enter your model name if required

### Using Custom Endpoints

For other local model setups:
1. Ensure your model server is running and accessible
2. In the Fire Safety AI Assistant:
   - Set Model Type to "Custom"
   - Set Endpoint to your model's API endpoint
   - Configure any additional parameters as needed

## Model Configuration

### Basic Settings

- **Model Type**: Choose between Ollama, LM Studio, or Custom
- **Endpoint**: The URL where your model server is running
- **Model Name**: The name of the model to use (if applicable)

### Advanced Parameters

- **Temperature**: Controls response randomness (0.0 - 2.0)
- **Max Tokens**: Maximum length of generated responses
- **Top P**: Nucleus sampling threshold (0.0 - 1.0)
- **Frequency Penalty**: Reduces repetition (-2.0 to 2.0)
- **Presence Penalty**: Encourages new topics (-2.0 to 2.0)

## File Upload Support

The application supports file uploads for analysis:
- Drag and drop files into the chat
- Click the upload button to select files
- Maximum file size: 500GB per file
- Supports various file types for analysis

## Fire Safety Features

### 1. Protocol Generation
- Automatic maintenance protocol creation
- Fire protection report generation
- Escape route documentation
- Inspection checklists

### 2. Document Analysis
- AI-powered document classification
- Key information extraction
- Compliance requirement identification
- Summary generation

### 3. Visual Inspections
- Image analysis for safety violations
- Deficiency documentation
- Recommendation generation
- Progress tracking

### 4. Compliance Checks
- Regulation verification
- Standard compliance
- Gap analysis
- Adjustment recommendations

### 5. Report Generation
- Executive summaries
- Detailed inspection reports
- Case studies
- Presentation materials

## Development

### Project Structure

```
├── electron/
│   └── main.js              # Electron main process
├── src/
│   ├── components/
│   │   ├── Chat.tsx         # Main chat interface
│   │   └── ModelSelector.tsx # Model configuration UI
│   ├── types/
│   │   ├── index.ts         # TypeScript interfaces
│   │   └── prompts.ts       # System prompts
│   ├── lib/
│   │   └── db.ts           # Database operations
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Application entry point
└── package.json
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.