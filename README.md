# Business Analyst AI Agent

This application uses LangChain and AI to automate business analysis tasks. It helps you generate documentation, conduct market research, break down tasks, assign team members, and create Jira tickets based on business requirements.

## Features

- **Requirements Analysis**: Input your business requirements and get comprehensive documentation
- **Document Generation**: Automatically generate SRS, FRD, BRD, and UML diagrams
- **Market Research**: Get competitive analysis and market trends
- **Task Breakdown**: Break down the project into detailed technical tasks
- **Team Assignment**: Assign tasks to team members based on their skills
- **Jira Integration**: Create Jira tickets for your project

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies for both frontend and backend:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

3. Create a `.env` file in the root directory with the following content:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
LLM_PROVIDER=anthropic
PORT=3001
```

Replace `your_anthropic_api_key` with your actual Anthropic API key.

### Running the Application

To start both the frontend and backend together:

```bash
npm start
```

This will start:
- Backend server on http://localhost:3001
- Frontend development server on http://localhost:5173

## Usage

1. Enter your project name and business requirements
2. Click "Generate Documents" to start the process
3. Navigate through the tabs to view generated documents, tasks, and team assignments
4. Add team members if needed
5. Assign tasks to team members
6. Create Jira tickets for your project

## Technology Stack

- **Frontend**: React, Material-UI
- **Backend**: Express.js
- **AI**: LangChain, Claude (Anthropic)
