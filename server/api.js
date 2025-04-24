// server/api.js
// With these updated imports
import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { Groq } from 'groq-sdk';
import axios from 'axios';

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
   
  You must respond with ONLY a valid JSON object using the following structure (replace the placeholder values with actual content):
   
  RESPONSE FORMAT:
  
  {{
  
    "srs": "<detailed SRS document content>",
  
    "frd": "<detailed FRD document content>",
  
    "brd": "<detailed BRD document content>",
  
    "umlDiagrams": [
  
      {{
  
        "name": "User Management Class Diagram",
  
        "type": "class",
  
        "content": "@startuml\\npackage \\"User Management\\" {{\\n  class User {{\\n    -id: UUID\\n    -username: String\\n    -email: String\\n    -password: String\\n    +login()\\n    +logout()\\n    +updateProfile()\\n  }}\\n  class UserProfile {{\\n    -userId: UUID\\n    -firstName: String\\n    -lastName: String\\n    +getFullName()\\n  }}\\n  User -- UserProfile\\n}}\\n@enduml"
  
      }},
  
      {{
  
        "name": "Login Sequence Diagram",
  
        "type": "sequence",
  
        "content": "@startuml\\nactor User\\nparticipant Frontend\\nparticipant AuthService\\nparticipant Database\\n\\nUser -> Frontend: Enter credentials\\nFrontend -> AuthService: login(username, password)\\nAuthService -> Database: validateCredentials()\\nDatabase --> AuthService: validation result\\nAuthService --> Frontend: authentication token\\nFrontend --> User: Show dashboard\\n@enduml"
  
      }}
  
    ]
  
  }}
   
  Important:
  
  1. Do not include any text outside the JSON object
  
  2. Ensure all strings are properly escaped
  
  3. Use double quotes for all keys and string values
  
  4. Make the response a single, valid JSON object
  
  5. For PlantUML diagrams:
  
     - Always start with @startuml and end with @enduml
  
     - Use proper PlantUML syntax for the specified diagram type
  
     - Include all necessary relationships and elements
  
     - Use proper indentation and spacing
  
     - Escape special characters properly (use \\n for newlines)
  
     - Do not include any markdown or other formatting
  
     - The content should be directly compilable by a PlantUML processor
  
     - Follow the example format shown above
  
  6. Replace all placeholder text (including < and > characters) with actual content
  
  `);
  
   
// Helper function to repair common JSON issues
function repairJSON(str) {
  // Remove any XML-like or markdown tags
  str = str.replace(/<[^>]+>/g, '');
  str = str.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Find the first { and last } to extract just the JSON part
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    str = str.slice(firstBrace, lastBrace + 1);
  }
  
  // Fix common JSON issues
  str = str
    // Fix quotes
    .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":') // Ensure property names are properly quoted
    .replace(/:\s*'([^']*)'/g, ':"$1"') // Replace single quotes with double quotes for values
    .replace(/:\s*"([^"]*)'/g, ':"$1"') // Fix mismatched quotes
    .replace(/:\s*'([^"]*)/g, ':"$1"') // Fix single quotes
    // Fix common structural issues
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .replace(/([}\]])\s*,\s*$/g, '$1') // Remove trailing commas at end
    .replace(/}\s*{/g, '},{') // Fix missing commas between objects
    .replace(/]\s*{/g, ',{') // Fix missing commas between array and object
    .replace(/}\s*\[/g, ',[') // Fix missing commas between object and array
    .replace(/]\s*\[/g, ',[') // Fix missing commas between arrays
    // Clean whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return str;
}

// Helper function to use Groq for completions
async function getGroqCompletion(prompt) {
  try {
    console.log('Sending request to Groq API with prompt:', prompt);
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that always responds with valid JSON. Never include any text outside the JSON structure. Never include XML-like tags. Always use double quotes for keys and string values. Never include markdown formatting. Never include any text after the closing brace of the JSON object. Never include any explanations or additional text."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      model: "mistral-saba-24b",
      temperature: 0.0, // Reduce temperature to get more consistent JSON
      max_tokens: 4096,
      top_p: 1,
      stream: false,
      stop: null
    });
    
    console.log('Received raw response from Groq:', chatCompletion);
    let content = chatCompletion.choices[0]?.message?.content || '';
    
    // Log the raw content before cleaning
    console.log('Raw content before cleaning:', content);
    
    // First pass: Basic cleaning
    content = content.trim();
    
    // Try parsing the raw content first
    try {
      return JSON.stringify(JSON.parse(content));
    } catch (initialParseError) {
      console.log('Initial parse failed, attempting repair...');
      
      // Second pass: Repair and try again
      const repairedContent = repairJSON(content);
      console.log('Repaired content:', repairedContent);
      
      try {
        return JSON.stringify(JSON.parse(repairedContent));
      } catch (repairParseError) {
        console.log('Repair parse failed, attempting final fallback...');
        
        // Final attempt: Try to extract any valid JSON object
        const jsonRegex = /\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/g;
        const matches = repairedContent.match(jsonRegex);
        
        if (matches && matches.length > 0) {
          for (const match of matches) {
            try {
              return JSON.stringify(JSON.parse(match));
            } catch (e) {
              continue;
            }
          }
        }
        
        throw new Error(`Failed to parse JSON after all repair attempts: ${repairParseError.message}`);
      }
    }
  } catch (error) {
    console.error("Error with Groq API:", error.message);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    throw new Error(`Groq API Error: ${error.message}`);
  }
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
    
    const completion = await getGroqCompletion(prompt);
    console.log('Raw completion:', completion);
    
    try {
      // Parse the JSON response
      const result = JSON.parse(completion);
      
      // Validate the response structure
      if (!result.srs || !result.frd || !result.brd || !Array.isArray(result.umlDiagrams)) {
        throw new Error('Invalid response structure from AI');
      }
      
      console.log('Parsed result:', result);
      res.json(result);
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Raw completion that failed to parse:', completion);
      res.status(500).json({ 
        error: 'Failed to parse AI response',
        details: parseError.message,
        rawResponse: completion
      });
    }
  } catch (error) {
    console.error('Error generating documents:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      details: 'Error occurred while processing the request'
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
    `;
    
    console.log('Sending task assignment prompt to Groq:', prompt);
    const completion = await getGroqCompletion(prompt);
    console.log('Received completion from Groq:', completion);
    
    try {
      const result = JSON.parse(completion);
      const assignments = Array.isArray(result) ? result : result.assignments;
      
      // Validate assignments
      assignments.forEach(assignment => {
        if (!assignment.assignedTo || typeof assignment.confidence !== 'number') {
          throw new Error(`Invalid assignment structure: ${JSON.stringify(assignment)}`);
        }
      });
      
      res.json(assignments);
    } catch (parseError) {
      console.error('Error parsing assignment response:', parseError);
      console.error('Raw completion that failed to parse:', completion);
      res.status(500).json({ 
        error: 'Failed to parse AI response',
        details: parseError.message,
        rawResponse: completion
      });
    }
  } catch (error) {
    console.error('Error assigning tasks:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Error occurred while processing the request'
    });
  }
});

// Add Jira configuration
// const JIRA_CONFIG = {
//   domain: process.env.JIRA_DOMAIN || "https://mahir-barot.atlassian.net",
//   email: process.env.JIRA_EMAIL || "mahircodes@gmail.com",
//   apiToken: process.env.JIRA_API_TOKEN || "ATATT3xFfGF0R-NRGLPmZWXoiyZTVpGSq20ImKa0KvsU1rwh_x1eQW7QPuFbMW_pPqNA8eYlfsXagoIuVpt1R9PauOla4CmXCsk1h5yR5EE4ytQAZxgvkQTGVJ_7z6mdk3rpCTMm41rMJBvyj0qm4BWkAVNmBmlGK3qV-LAbQ=88DE829A",
//   projectKey: process.env.JIRA_PROJECT_KEY || "SCRUM"
// };

// Update the create-jira-tasks endpoint to be simpler
// app.post('/api/create-jira-tasks', async (req, res) => {
//   try {
//     const { tasks } = req.body;
    
//     if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Valid tasks array is required' 
//       });
//     }

//     console.log(`Attempting to create ${tasks.length} Jira tasks`);
    
//     const createdTasks = [];
//     const errors = [];

//     // Create tasks in Jira (one by one to handle individual failures)
//     for (const task of tasks) {
//       try {
//         const taskName = task.name || "Unnamed Task";
//         console.log(`Creating Jira task: ${taskName}`);
        
//         // Simple description
//         const description = {
//           "version": 1,
//           "type": "doc",
//           "content": [
//             {
//               "type": "paragraph",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Auto-created task from BA Agent"
//                 }
//               ]
//             }
//           ]
//         };
        
//         // Simplified payload with just the task name/summary
//         const payload = {
//           fields: {
//             project: { key: JIRA_CONFIG.projectKey },
//             summary: taskName,
//             description: description,
//             issuetype: { name: "Task" }
//           }
//         };
        
//         console.log('Request payload:', JSON.stringify(payload, null, 2));
        
//         const response = await axios.post(
//           `${JIRA_CONFIG.domain}/rest/api/3/issue`,
//           payload,
//           {
//             auth: {
//               username: JIRA_CONFIG.email,
//               password: JIRA_CONFIG.apiToken
//             },
//             headers: {
//               "Accept": "application/json",
//               "Content-Type": "application/json"
//             }
//           }
//         );

//         console.log(`Task created successfully: ${taskName}`);
        
//         createdTasks.push({
//           name: taskName,
//           jiraId: response.data.id,
//           jiraKey: response.data.key,
//           self: response.data.self
//         });
//       } catch (error) {
//         console.error(`Error creating Jira task for "${task.name}":`, error.message);
//         if (error.response) {
//           console.error('Response status:', error.response.status);
//           console.error('Response data:', JSON.stringify(error.response.data, null, 2));
//         }
        
//         errors.push({
//           taskName: task.name,
//           error: error.message
//         });
//       }
//     }

//     // Return success even if some tasks failed
//     res.json({
//       success: true,
//       createdCount: createdTasks.length,
//       failedCount: errors.length,
//       createdTasks,
//       errors: errors.length > 0 ? errors : []
//     });
//   } catch (error) {
//     console.error('Error creating Jira tasks:', error.message);
//     res.status(500).json({ 
//       success: false,
//       error: error.message 
//     });
//   }
// });

// Jira API credentials - hardcoded for debugging
const jiraDomain = "https://mahir-barot.atlassian.net";
const email = "mahircodes@gmail.com";
const apiToken = "ATATT3xFfGF0R-NRGLPmZWXoiyZTVpGSPjmF3ehCnBVPqSq20ImKa0KvsU1rwh_x1eQW7QPuFbMW_pPqNA8eYlfsXagoIuVpt1R9PauOla4CmXCsk1h5yR5EE4ytQAZxgvkQTGVJ_7z6mdk3rpCTMm41rMJBvyj0qm4BWkAVNmBmlGK3qV-LAbQ=88DE829A";
const projectKey = "SCRUM";

// Create Jira task endpoint
app.post('/api/create-jira-tasks', async (req, res) => {
  try {
    const { tasks } = req.body;
    
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid tasks array is required' 
      });
    }

    console.log(`Attempting to create ${tasks.length} Jira tasks`);
    
    const createdTasks = [];
    const errors = [];

    // Create tasks in Jira (one by one to handle individual failures)
    for (const task of tasks) {
      try {
        const taskName = task.name || "Unnamed Task";
        console.log(`Creating Jira task: ${taskName}`);
        
        // Simple description
        const description = {
          "version": 1,
          "type": "doc",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": task.description || "Auto-created task from BA Agent"
                }
              ]
            }
          ]
        };
        
        // Simplified payload with task name/summary
        const payload = {
          fields: {
            project: { key: projectKey },
            summary: taskName,
            description: description,
            issuetype: { name: "Task" }
          }
        };
        
        console.log('Request payload:', JSON.stringify(payload, null, 2));
        
        const response = await axios.post(
          `${jiraDomain}/rest/api/3/issue`,
          payload,
          {
            auth: {
              username: email,
              password: apiToken
            },
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
            }
          }
        );

        console.log(`Task created successfully: ${taskName}`);
        
        createdTasks.push({
          name: taskName,
          jiraId: response.data.id,
          jiraKey: response.data.key,
          self: response.data.self
        });
      } catch (error) {
        console.error(`Error creating Jira task for "${task.name}":`, error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        errors.push({
          taskName: task.name,
          error: error.message
        });
      }
    }

    // Return success even if some tasks failed
    res.json({
      success: true,
      createdCount: createdTasks.length,
      failedCount: errors.length,
      createdTasks,
      errors: errors.length > 0 ? errors : []
    });
  } catch (error) {
    console.error('Error creating Jira tasks:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
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