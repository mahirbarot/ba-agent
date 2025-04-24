// server/api.js
// With these updated imports
import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { Groq } from 'groq-sdk';

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Choose which LLM to use
const useLLM = process.env.LLM_PROVIDER || 'groq';

// Initialize the Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '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',
});

// Document Generation Chain
const documentGenerationPrompt = PromptTemplate.fromTemplate(`
  You are an expert business analyst and technical writer. Based on the following business requirements,
  create comprehensive documentation including:
  
  1. Software Requirements Specification (SRS)
  2. Functional Requirements Document (FRD)
  3. Business Requirements Document (BRD)
  4. UML Diagrams in PlantUML format
   
  Business Requirements:
  {requirements}
   
  Respond with a JSON object in this exact format:
  {
    "srs": "detailed SRS content here",
    "frd": "detailed FRD content here",
    "brd": "detailed BRD content here",
    "umlDiagrams": [
      {
        "name": "diagram name",
        "type": "diagram type",
        "content": "PlantUML content"
      }
    ]
  }
  
  Important:
  1. Use double quotes for all strings
  2. Properly escape all special characters
  3. Each document should be a single string
  4. UML diagrams must be valid PlantUML syntax
  5. Do not include any text outside the JSON object
`);
  
   
// Helper function to get Groq completion with better error handling
async function getGroqCompletion(prompt, isDocumentGeneration = false) {
  try {
    console.log('Sending request to Groq API with prompt:', prompt);
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: isDocumentGeneration 
            ? "You are a helpful assistant that always responds with a valid JSON object containing document content. Use double quotes for all keys and string values. Properly escape all special characters."
            : "You are a helpful assistant that always responds with valid JSON arrays. Always return an array of objects, even for single items."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      model: "mistral-saba-24b",
      temperature: 0.1,
      max_tokens: 4096,
      top_p: 1,
      stream: false,
      stop: null
    });
    
    if (!chatCompletion?.choices?.[0]?.message?.content) {
      throw new Error('Empty or invalid response from Groq API');
    }

    let content = chatCompletion.choices[0].message.content.trim();
    console.log('Raw content from Groq:', content);

    // Handle document generation format differently
    if (isDocumentGeneration) {
      try {
        // Try parsing as is first
        return JSON.parse(content);
      } catch (parseError) {
        // If parsing fails, try to repair the JSON
        const repaired = repairDocumentJSON(content);
        return JSON.parse(repaired);
      }
    } else {
      // Handle array responses
      if (content.startsWith('{') && content.endsWith('}')) {
        content = `[${content}]`;
      }
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch (error) {
    console.error("Detailed Groq API Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      content: error.response?.content,
    });
    throw new Error(`Groq API Error: ${error.message}`);
  }
}

// Add a specific repair function for document JSON
function repairDocumentJSON(str) {
  // Remove any non-JSON content
  str = str.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
  
  // Fix common JSON issues
  str = str
    // Fix quotes
    .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"')
    .replace(/:\s*"([^"]*)'/g, ':"$1"')
    // Fix newlines in strings
    .replace(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/g, '\\n')
    // Fix multiple spaces
    .replace(/\s+/g, ' ')
    // Remove trailing commas
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix missing quotes around string values
    .replace(/:\s*([^[{}\],\s]+)/g, ':"$1"')
    // Ensure proper escaping of backslashes
    .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
    .trim();

  return str;
}

// API Routes with Groq implementation
app.post('/api/generate-documents', async (req, res) => {
  try {
    console.log('Received generate-documents request:', req.body);
    const { requirements } = req.body;
    
    if (!requirements) {
      return res.status(400).json({ error: 'Requirements are required' });
    }

    const prompt = await documentGenerationPrompt.format({ requirements });
    console.log('Formatted prompt:', prompt);
    
    const completion = await getGroqCompletion(prompt, true); // Pass true for document generation
    console.log('Raw completion:', completion);
    
    // Validate the response structure
    const validatedResult = {
      srs: typeof completion.srs === 'string' ? completion.srs : '',
      frd: typeof completion.frd === 'string' ? completion.frd : '',
      brd: typeof completion.brd === 'string' ? completion.brd : '',
      umlDiagrams: Array.isArray(completion.umlDiagrams) ? completion.umlDiagrams : []
    };
    
    // Ensure UML diagrams have required fields
    validatedResult.umlDiagrams = validatedResult.umlDiagrams.map(diagram => ({
      name: diagram.name || 'Untitled Diagram',
      type: diagram.type || 'unknown',
      content: diagram.content || ''
    }));
    
    console.log('Validated result:', validatedResult);
    res.json(validatedResult);
  } catch (error) {
    console.error('Error generating documents:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Return a more structured error response with fallback empty document
    res.status(500).json({ 
      error: error.message,
      details: 'Error occurred while processing the request',
      errorType: 'API_ERROR',
      fallbackData: {
        srs: '',
        frd: '',
        brd: '',
        umlDiagrams: []
      }
    });
  }
});

app.post('/api/conduct-research', async (req, res) => {
  try {
    const { requirements } = req.body;
    const prompt = `
      You are an expert market researcher. Based on the following business requirements, 
      conduct a thorough competitive analysis:
      
      Business Requirements:
      ${requirements}
      
      Provide your research in a structured JSON format with the following keys:
      competitors (an array of objects with name, strengths, and weaknesses),
      marketTrends (a detailed description of current market trends),
      recommendations (strategic recommendations based on the research)
    `;
    
    const completion = await getGroqCompletion(prompt);
    
    // Parse the JSON response
    const result = JSON.parse(completion);
    res.json(result);
  } catch (error) {
    console.error('Error conducting research:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/breakdown-tasks', async (req, res) => {
  try {
    console.log('Received breakdown-tasks request:', req.body);
    const { documents } = req.body;
    
    if (!documents) {
      return res.status(400).json({ 
        error: 'Documents are required',
        details: 'The request body must contain documents object'
      });
    }

    // Create a combined document for task breakdown
    const combinedDoc = `
      ${documents.srs ? `SRS Document: ${documents.srs}` : ''}
      ${documents.frd ? `FRD Document: ${documents.frd}` : ''}
      ${documents.brd ? `BRD Document: ${documents.brd}` : ''}
    `;

    const prompt = `
      You are an expert technical project manager. Based on the following documents,
      break down the project into detailed technical tasks.
      
      ${combinedDoc}
      
      For each task, provide:
      1. A descriptive name
      2. A detailed description
      3. Estimated hours required (a numeric value)
      4. Required skills (as an array of skill names)
      
      Return your response as a JSON array of task objects, each with:
      - id (string or number)
      - name (string)
      - description (string)
      - estimatedHours (number)
      - requiredSkills (array of strings)
      
      Important:
      1. Tasks should be specific and actionable
      2. Skills should be specific technical skills (e.g., "React", "Node.js", "SQL")
      3. Time estimates should be realistic
      4. Each task should be self-contained and testable
      5. Always return an array, even if only one task
    `;
    
    console.log('Sending prompt to Groq:', prompt);
    const completion = await getGroqCompletion(prompt);
    console.log('Received completion from Groq:', completion);
    
    try {
      // Parse the JSON response
      const result = JSON.parse(completion);
      
      // Check if result is directly an array or has a tasks property
      let tasks = [];
      if (Array.isArray(result)) {
        tasks = result;
      } else if (result.tasks && Array.isArray(result.tasks)) {
        tasks = result.tasks;
      } else {
        // If neither, create a fallback task
        tasks = [{
          id: "1",
          name: "Review Requirements",
          description: "Review the provided documentation and break down into actionable tasks.",
          estimatedHours: 4,
          requiredSkills: ["Business Analysis", "Project Management"]
        }];
      }
      
      // Ensure all tasks have the required fields
      const validatedTasks = tasks.map((task, index) => ({
        id: task.id || `task_${index + 1}`,
        name: task.name || `Task ${index + 1}`,
        description: task.description || "No description provided",
        estimatedHours: typeof task.estimatedHours === 'number' ? task.estimatedHours : 4,
        requiredSkills: Array.isArray(task.requiredSkills) ? task.requiredSkills : ["General"]
      }));
      
      console.log('Successfully processed tasks:', validatedTasks);
      res.json({ tasks: validatedTasks });
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Raw completion that failed to parse:', completion);
      
      // Provide fallback tasks in case of parsing error
      const fallbackTasks = [
        {
          id: "fallback_1",
          name: "Review Project Requirements",
          description: "Review the documentation and identify key technical requirements.",
          estimatedHours: 4,
          requiredSkills: ["Business Analysis", "Technical Documentation"]
        },
        {
          id: "fallback_2",
          name: "Create Technical Implementation Plan",
          description: "Develop a technical plan based on project requirements.",
          estimatedHours: 8,
          requiredSkills: ["Project Management", "Technical Architecture"]
        }
      ];
      
      res.json({ tasks: fallbackTasks });
    }
  } catch (error) {
    console.error('Error breaking down tasks:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Provide fallback tasks even in case of general error
    const emergencyFallbackTasks = [
      {
        id: "emergency_1",
        name: "Document Review",
        description: "Review project requirements and documents.",
        estimatedHours: 4,
        requiredSkills: ["Documentation", "Analysis"]
      }
    ];
    
    res.json({ 
      tasks: emergencyFallbackTasks,
      error: error.message
    });
  }
});

app.post('/api/assign-tasks', async (req, res) => {
  try {
    const { tasks, teamMembers } = req.body;
    
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Tasks array is required and must not be empty' });
    }
    if (!teamMembers || !Array.isArray(teamMembers) || teamMembers.length === 0) {
      return res.status(400).json({ error: 'Team members array is required and must not be empty' });
    }

    const prompt = `
      You are an expert resource manager. Assign the following technical tasks to team members based on their skills:
      
      Tasks:
      ${JSON.stringify(tasks)}
      
      Team Members:
      ${JSON.stringify(teamMembers)}
      
      For each task, determine the best team member based on skill match. 
      Calculate a confidence score (0-100) based on how well the team member's skills match the required skills.
      
      Return your response as a JSON array of task objects, each with:
      - All original task fields (id, name, description, estimatedHours, requiredSkills)
      - assignedTo (the name of the assigned team member)
      - confidence (a number between 0-100 indicating the match quality)
      
      Important:
      1. Consider both technical skills and estimated hours
      2. Try to distribute work evenly among team members
      3. Assign tasks to the most qualified team member
      4. Consider task dependencies when assigning
      5. Always return an array of objects, even for a single task
    `;
    
    console.log('Sending task assignment prompt to Groq:', prompt);
    const completion = await getGroqCompletion(prompt);
    console.log('Received completion from Groq:', completion);
    
    try {
      const result = JSON.parse(completion);
      
      // Ensure we have an array of assignments
      const assignments = Array.isArray(result) ? result : [result];
      
      // Validate each assignment
      const validatedAssignments = assignments.map(assignment => ({
        ...assignment,
        assignedTo: assignment.assignedTo || 'Unassigned',
        confidence: typeof assignment.confidence === 'number' ? assignment.confidence : 0
      }));
      
      res.json(validatedAssignments);
    } catch (parseError) {
      console.error('Error parsing assignment response:', parseError);
      console.error('Raw completion that failed to parse:', completion);
      
      // Return a fallback assignment
      const fallbackAssignments = tasks.map(task => ({
        ...task,
        assignedTo: 'Unassigned',
        confidence: 0
      }));
      
      res.json(fallbackAssignments);
    }
  } catch (error) {
    console.error('Error assigning tasks:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Error occurred while processing the request'
    });
  }
});

app.post('/api/create-jira-tasks', async (req, res) => {
  try {
    const { assignedTasks, projectKey } = req.body;
    
    // In a real implementation, this would connect to the Jira API
    // For demo purposes, we're simulating the response
    const jiraTasks = assignedTasks.map(task => ({
      id: `${projectKey}-${task.id}`,
      summary: task.name,
      description: task.description,
      assignee: task.assignedTo,
      estimatedHours: task.estimatedHours,
      status: "To Do",
      created: new Date().toISOString()
    }));
    
    res.json(jiraTasks);
  } catch (error) {
    console.error('Error creating Jira tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Change the port to avoid the EADDRINUSE error
const PORT = process.env.PORT || 3005;

// Add error handling for the server
const server = app.listen(PORT, () => {
  console.log(`LangChain AI Project Management API running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

export default app;