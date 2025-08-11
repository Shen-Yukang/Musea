# 🌸 Musea /ˈmjuː-zi-ə/ - Intelligent Focus Time Management Assistant

<div align="center">

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow.svg)
![React](https://img.shields.io/badge/React-19.0.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.1-blue.svg)
![MCP](https://img.shields.io/badge/MCP-Enabled-purple.svg)

*A powerful Chrome extension that combines AI virtual characters and MCP architecture to help you stay focused and boost productivity*

---

**🌍 Language / 语言**

[![English](https://img.shields.io/badge/English-README-blue?style=for-the-badge&logo=readme)](./README_EN.md) | [![中文](https://img.shields.io/badge/中文-README-red?style=for-the-badge&logo=readme)](./README.md)

---

</div>

## 🎯 Target Audience

- **📚 Students** - Need focused environment for exam preparation, thesis writing, and online learning
- **💼 Professionals** - Remote work, project development, and document writing without web distractions
- **🎨 Creators** - Deep focus required for writing, design, programming, and other creative work
- **📖 Lifelong Learners** - Focus management for skill development, knowledge acquisition, and personal growth
- **🧘 Focus Trainers** - Anyone looking to cultivate focus habits and improve work efficiency

## 🧠 The Right Philosophy for Focus Training

### 💡 Understanding Addiction Mechanisms
Modern social media and entertainment platforms hijack our dopamine system through **instant feedback** and **random reward** mechanisms, creating strong psychological dependencies. This dependency makes our brain instinctively seek these "pleasure stimuli" when we need to focus.

### 🎯 Why Detox is Necessary
- **Attention Fragmentation** - Frequent information switching destroys deep thinking abilities
- **Instant Gratification Trap** - Reduces patience and persistence for long-term goals
- **Cognitive Overload** - Brain exhausted from processing irrelevant information, affecting work efficiency

### 🛠️ Why Tool Assistance is Essential
**Pure willpower detox often fails** because:
- Willpower is a limited resource that gets depleted
- Environmental temptations are everywhere, resistance costs are too high
- Lack of external structure support makes it easy to relapse

**Tool's Role**: Provide **external constraints** and **buffer period** to help the brain gradually adapt to new behavior patterns.

### ⚠️ Avoiding Permanent Dependency
**Risks of Tool Dependency**:
- Focus ability immediately regresses once tool is lost
- Develops "learned helplessness," believing self-control is impossible
- Stronger rebound when tools fail

### 🌱 Path to Cultivating Positive Cycles

#### Phase 1: Tool-Assisted Period (1-3 months)
- Use tools like Musea to establish basic focus habits
- Gradually extend focus time from 25 minutes to 90 minutes
- Record focus achievements to build sense of accomplishment

#### Phase 2: Active Management Period (3-6 months)
- **Time Planning**: Create detailed schedules, fill time gaps with plans
- **Interest Substitution**: Cultivate healthy hobbies (exercise, reading, creating)
- **Environment Optimization**: Remove physical distractions, create focused atmosphere

#### Phase 3: Autonomous Focus Period (6+ months)
- **Intrinsic Motivation**: Deeply connect focus with personal values and long-term goals
- **Positive Feedback**: Gain inner satisfaction through completing meaningful tasks
- **Habit Solidification**: Focus becomes a natural behavior pattern

### 🎯 Core Principle
> **Tools are crutches, not wheelchairs**  
> Use them to help you relearn how to "walk," not to sit forever

**Remember**: True focus comes from inner **sense of purpose**, **achievement**, and **self-efficacy**. Tools are just bridges to help you rebuild these abilities.

## 📖 Project Overview

Musea is a modern Chrome browser extension designed to enhance work and study efficiency. It combines traditional Pomodoro Technique with modern AI technology, providing personalized focus experiences and intelligent work assistance through AI virtual characters and MCP (Model Context Protocol) architecture.

### 🎯 Core Features

#### 🕐 Focus Time Management
- **Smart Focus Timer** - Customizable focus time management (1-120 minutes)
- **Real-time Badge Display** - Dynamic remaining time display with color changes
- **Automatic State Management** - Fully automated start, pause, and stop for focus mode

#### 🚫 Website Blocking System
- **Complete Blocking Mode** - Completely block access to specified websites
- **Study Mode** - Hide distracting elements while preserving core learning content
- **Site-Specific Handling** - Preset support for popular sites like Baidu, Bilibili, Zhihu

#### 🔊 Diverse Notification System
- **Sound Alerts** - Built-in notification sounds with adjustable volume
- **TTS Voice Synthesis** - Integrated ByteDance TTS API with multiple voice types
- **AI Personalized Notifications** - LLM-generated warm and encouraging break reminders

#### 🤖 AI Virtual Character Assistant
- **Interactive Virtual Character** - Cute AI assistant with click-to-chat functionality
- **Voice Conversation** - Support for voice input and TTS voice replies
- **Animation System** - Rich character animations (idle, thinking, greeting, etc.)
- **Conversation Persistence** - Save conversation history across sessions

#### 🔗 MCP Intelligent Work Assistant
- **Three-Layer Architecture** - Chrome Extension ↔ Native Messaging Host ↔ MCP Client
- **Academic Research Assistant** - Integrated arxiv paper search functionality
- **System Control** - Music playback, app launching, system information retrieval
- **Chrome Search** - Intelligent search and web operations
- **Modular Extension** - Support for adding more MCP services

#### 🎨 Modern Interface
- **Responsive Design** - Adapts to different screen sizes
- **Dark Mode Support** - Eye-friendly dark theme
- **Animation Effects** - Smooth transitions and interaction feedback
- **Highly Customizable** - Rich personalization settings

## 🚀 Quick Start

### Installation Methods

#### Method 1: Developer Mode Installation (Recommended) ✅

1. **Enable Developer Mode**
   - Open [Chrome Extensions Management Page](chrome://extensions/)
   - Turn on "Developer mode" in the top right corner

2. **Load Extension**
   - Click "Load unpacked"
   - Select the project's `dist` folder

3. **Pin Extension Icon**
   - Click the extensions icon in Chrome toolbar
   - Find "Musea" and click pin

4. **Start Using**
   - Click the extension icon to open settings panel
   - Configure your focus time and preferences

#### Method 2: Chrome Web Store ⌛️

> **Note**: For security reasons, we don't plan to publish to Chrome Web Store. We stick to open-source transparency principles and encourage users to install directly from source code!

### Development Environment Setup

#### System Requirements

- **Node.js**: >= 22.12.0
- **Package Manager**: pnpm 9.15.1
- **Browser**: Chrome 109+ or Firefox 109+

#### Build Steps

```bash
# Clone project
git clone <repository-url>
cd Musea

# Install dependencies
pnpm install

# Development build
pnpm dev

# Production build
pnpm build

# Package extension
pnpm zip
```

## 📋 Feature Details

### 🕐 Focus Time Management
- **Flexible Time Settings**: Support for 1-120 minute custom focus durations
- **Smart Badge Display**: Real-time remaining focus time with color changes
- **Automatic State Management**: Fully automated start, pause, stop for focus mode

### 🚫 Website Blocking System

#### Complete Blocking Mode
- Completely block access to specified websites
- Display friendly reminder pages
- Support domain and full URL matching

#### Study Mode
- Hide distracting elements (recommendations, comments, etc.)
- Preserve core learning content
- Preset support: Baidu, Bilibili, and other popular sites
- Custom CSS selector support (Use case: hiding control bars, buttons when taking screenshots, especially for video screenshots)

### 🔊 Diverse Notification System

#### Sound Notifications
- Built-in notification sounds
- Adjustable volume (0-100%)
- Test playback functionality

#### TTS Voice Synthesis
- Integrated ByteDance TTS API
- Multiple voice type selections (male/female)
- Adjustable speech rate (0.5x - 2.0x)
- Smart caching mechanism to save API calls

#### AI Personalized Notifications
- LLM-generated personalized break reminders
- Custom system prompts and user templates
- Smart pre-generation to reduce wait time
- Warm and encouraging language style

### 🤖 AI Virtual Character System

#### Character Interaction Features
- **Intelligent Conversation** - Natural language dialogue based on LLM
- **Voice Interaction** - Support for voice input recording and TTS voice replies
- **Animation Performance** - Rich character animation system (idle, thinking, greeting, speaking, etc.)
- **Context Awareness** - Adjust behavior based on focus state and website environment

#### MCP Integration Features
- **Research Assistant** - Call arxiv paper search through MCP protocol
- **System Control** - Music playback, app launching, system information queries
- **Intelligent Search** - Chrome search and web operations
- **Task Execution** - Automated workflows and task management

## 🛠️ Technical Architecture

### Frontend Tech Stack
- **React 19.0.0**: Modern UI framework
- **TypeScript 5.8.1**: Type-safe development experience
- **Tailwind CSS**: Utility-first CSS framework
- **Vite 6.1.0**: Fast build tool

### Chrome Extension Architecture
- **Manifest V3**: Latest Chrome extension standard
- **Service Worker**: Background script management, focus time control
- **Content Scripts**: Page content manipulation, website blocking and virtual character injection
- **Offscreen Documents**: Audio playback support, TTS voice synthesis
- **Native Messaging**: Communication with local MCP services

### MCP Three-Layer Architecture
```
Chrome Extension (Frontend) ↔ Native Messaging Host ↔ MCP Client Service ↔ MCP Servers
        │                           │                        │                │
   UI Interface              Protocol Bridge           MCP Client Impl    Service Impl
```

## 🔧 Configuration Guide

### TTS Voice Synthesis Configuration

1. **Get API Key**
   - Visit [ByteDance Speech Open Platform](https://openspeech.bytedance.com/)
   - Register account and create application
   - Obtain AppID and access token

2. **Configuration Steps**
   - Enable voice notifications in extension settings
   - Input AppID and Token
   - Select voice type and speech rate
   - Test voice synthesis functionality

### AI Virtual Character Configuration

1. **Enable Character Assistant**
   - Turn on "Character Assistant" in popup settings
   - Character will appear on all web pages
   - Support focus mode adaptation

2. **Character Interaction Settings**
   - Click character to start conversation
   - Support text and voice input
   - Conversation history automatically saved

3. **MCP Function Configuration**
   - Character supports intelligent task detection
   - Can directly call MCP services
   - Support arxiv search, system control, etc.

### MCP Backend Service Configuration

1. **Install MCP Service**
   ```bash
   # Enter MCP directory
   cd MCP

   # Install dependencies
   cd native-host && npm install && cd ..
   cd client && npm install && cd ..

   # Configure Native Messaging
   ./scripts/install.sh
   ```

2. **Start MCP Service**
   ```bash
   # Start all services
   ./scripts/start-all.sh

   # Or start separately
   cd native-host && npm start &
   cd client && npm start &
   ```

3. **Verify MCP Connection**
   - Input "play music" or "search papers" in character dialogue
   - Check MCP service logs
   - Confirm functionality works properly

## 🚀 Usage Guide

### Basic Usage Flow

1. **Set Focus Time**
   - Open extension popup
   - Set focus duration (recommended 25 minutes)
   - Click "Start Focus"

2. **Configure Blocked Websites**
   - Add easily distracting websites
   - Choose blocking mode (complete blocking/study mode)
   - Test blocking effectiveness

3. **Enable AI Virtual Character**
   - Turn on "Character Assistant" in popup
   - Character will appear in bottom right of web pages
   - Click character to start conversation

4. **Personalization Settings**
   - Configure notification methods (sound/TTS/AI)
   - Adjust interface theme
   - Customize AI prompts

### Virtual Character Usage

#### Basic Conversation
- **Text Chat**: Click character, input text in dialogue box
- **Voice Conversation**: Click microphone icon, record voice message
- **Voice Reply**: Character responds with TTS voice (requires TTS configuration)

#### MCP Intelligent Functions
- **Academic Search**: "Help me search machine learning papers"
- **System Control**: "Play music" / "Open application"
- **Chrome Search**: "Help me search Python tutorials"
- **System Information**: "Show system information"

## 📈 Update History

### v1.2.1 (2025-06-11) 🎉
- **Major Update**: Bug fixes
- **New**: Voice input and TTS voice reply
- **Optimized**: User interface and interaction experience
- **Improved**: Interface responsiveness
- **Fixed**: Multiple stability issues and memory leaks

### v1.2.0 (2025-04-15) 🎉
- **Major Update**: Complete refactoring for more stable functionality and interaction
- **New**: AI virtual character system with voice conversation and animation
- **New**: MCP architecture integration with arxiv search and system control
- **New**: TTS voice synthesis with ByteDance API support
- **New**: AI personalized notification system and custom prompts
- **Optimized**: User interface and interaction experience with dark mode support
- **Fixed**: Multiple stability issues and memory leaks

### v1.0.0 (2025-02-21)
- **Fixed**: Critical bug fixes
- **Optimized**: Enhanced notification experience
- **Improved**: Interface responsiveness

### v0.0.1 (2025-02-05) 🌱
- **Initial Release**: Basic focus time management functionality
- **Core Features**: Website blocking, time tracking, notification reminders

## 🚀 Future Roadmap

### 🔮 Planned Features

#### 1. 👁️ Visual Monitoring System
> **Status**: 🔄 Planning | **Expected Release**: v1.3.0

- **Fatigue Detection** - Camera-based eye fatigue detection with smart rest reminders
- **Distraction Monitoring** - Detect attention wandering with timely focus reminders
- **Posture Monitoring** - Monitor sitting posture and head position
- **Privacy-First** - All visual data processed locally, never uploaded

#### 2. 🎭 Dynamic Character System
> **Status**: 🔄 Planning | **Expected Release**: v1.4.0

- **One-Click Character Generation** - AI-based appearance, personality, voice customization
- **Dynamic Expression System** - Rich facial expressions and emotional displays
- **3D Character Models** - Support for 3D virtual characters for more realistic interaction
- **Character Store** - Community-shared character templates

#### 3. 🤖 MCP-Powered AI Assistant
> **Status**: 🔄 Planning | **Expected Release**: v1.5.0

- **Academic Research Assistant** - Deep integration with arxiv, Google Scholar, PubMed
- **Code Development Assistant** - GitHub integration, code search, PR management
- **System Automation** - Local app control, file management, system monitoring
- **Workflow Automation** - Custom task chains, intelligent workflow orchestration

#### 4. 🎭 AI Learning Companion System
> **Status**: 🔄 Planning | **Expected Release**: v1.6.0

- **🏃‍♂️ Fitness Coach** - Personalized workout plans, movement guidance, progress tracking
- **👨‍🍳 Culinary Master** - Recipe recommendations, cooking guidance, nutrition pairing
- **🗣️ Language Partner** - Multi-language conversation practice, pronunciation correction
- **📚 Subject Tutor** - Math, physics, programming, design professional guidance

### 🎯 Release Roadmap

| Version | Feature | Status | Expected Time |
|---------|---------|--------|---------------|
| v1.2.1 | ✅ Virtual Character Basic | Released | 2025-01 |
| v1.3.0 | 👁️ Visual Monitoring | Planning | 2025-03 |
| v1.4.0 | 🎭 Dynamic Character | Planning | 2025-05 |
| v1.5.0 | 🤖 MCP AI Assistant | Planning | 2025-07 |
| v1.6.0 | 🎭 AI Learning Companion | Planning | 2025-09 |
| v2.0.0 | 🌟 Complete Ecosystem | Planning | 2025-11 |

## 🤝 Contributing

We welcome community contributions! Please follow these steps:

1. **Fork the project** and create a feature branch
2. **Write code** and ensure tests pass
3. **Submit PR** with detailed description of changes
4. **Code review** - will be merged to main branch after approval

### Development Standards
- Use TypeScript for type-safe development
- Follow ESLint and Prettier code standards
- Write unit tests covering new features
- Update relevant documentation

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Chrome Extension Boilerplate](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite) - Project scaffolding
- [ByteDance TTS](https://openspeech.bytedance.com/) - Voice synthesis service
- [DeepSeek](https://www.deepseek.com/) - AI model service
- [MCP (Model Context Protocol)](https://github.com/modelcontextprotocol) - Intelligent assistant architecture
- [arxiv-mcp-server](https://github.com/blazickjp/arxiv-mcp-server) - Academic search service
- [Manus](https://github.com/manus-ai/manus) - MCP intelligent assistant inspiration
- All contributors and users for their support

## 💝 Support the Project

If this project helps you, welcome to:

- ⭐ Star the project
- 🐛 Report bugs and suggestions
- 🔀 Submit Pull Requests
- 📢 Recommend to friends

> **Open Source Commitment**: This project commits to being permanently open source and free, sticking to the original intention of transparent development! ✅🍃🎉

---

<div align="center">

**Focus on the present, live in the moment** 🧘‍♂️

*Dedicated focus, mindful living*

</div>
