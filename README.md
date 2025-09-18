# ComplainSG 🇸🇬

Bridging the gap between citizens and policymakers through AI-powered feedback collection.

ComplainSG helps you complain better through intelligent, guided conversations that ensure your concerns are heard and addressed effectively. Our platform combines AI-facilitated conversations with community insights to create a comprehensive view of Singapore's concerns.

## Stack

- **Frontend**: Vite + React + shadcn/ui + Tailwind CSS + TypeScript
- **Backend**: FastAPI + PocketFlow (Minimal agentic framework)
- **Database**: PostgreSQL
- **Infrastructure**: Docker Compose

## Quick Start

Getting started with ComplainSG is easy:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd complainsg-v2
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Add your API key to .env**
   ```
   # Get your API key from https://platform.publicai.co
   OPENAI_API_KEY=your_api_key_here
   ```

4. **Start the application**
   ```bash
   docker compose up
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Features

- 🤖 **AI-Facilitated Conversations**: Our AI helps you refine and structure your complaint to maximize its impact and clarity
- 📚 **Relevant Information**: Get directed to resources, policies, and contacts that can help address your specific issue
- 🤝 **Connect with Others**: Find and connect with others facing similar problems through our PulseSG community platform
- 📊 **PulseSG Analytics**: Complaint aggregation and interactive map view to visualize problems across Singapore
- 🔐 Complete authentication system (login/registration)
- 🎨 Modern UI components with shadcn/ui
- 🐳 Production-ready Docker setup
- 📱 Responsive design with Tailwind CSS
- 🔧 TypeScript throughout

## What Problem Does ComplainSG Solve?

- **Long Queues**: Traditional Meet-the-People sessions have long queues and limited accessibility
- **Pre-defined Agendas**: REACH consultations are pre-defined, missing organic community concerns
- **Hard to Find Channels**: Citizens struggle to find appropriate channels for their feedback

ComplainSG bridges these gaps by providing an accessible, AI-powered platform for intelligent feedback collection.