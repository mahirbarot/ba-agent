import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3005/api';

const apiClient = {
  generateDocuments: async (requirements) => {
    try {
      console.log('Sending requirements to server:', requirements);
      const response = await axios.post(`${API_URL}/generate-documents`, { requirements });
      console.log('Server response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error generating documents:', error.response?.data || error.message);
      throw error;
    }
  },
  
  conductResearch: async (requirements) => {
    try {
      const response = await axios.post(`${API_URL}/conduct-research`, { requirements });
      return response.data;
    } catch (error) {
      console.error('Error conducting research:', error.response?.data || error.message);
      throw error;
    }
  },
  
  breakdownTasks: async (documents) => {
    try {
      if (!documents) {
        throw new Error('Documents are required');
      }

      console.log('Sending breakdown tasks request with documents:', documents);
      
      // Ensure we have a documents object with at least some content
      const documentPayload = {
        documents: {
          srs: documents.srs || '',
          frd: documents.frd || '',
          brd: documents.brd || ''
        }
      };
      
      const response = await axios.post(`${API_URL}/breakdown-tasks`, documentPayload);
      console.log('Raw response from server:', response.data);
      
      // Use a try-catch block to handle any potential errors in response processing
      try {
        // Check various possible response formats and extract tasks
        let tasks = [];
        
        if (response.data) {
          if (Array.isArray(response.data)) {
            tasks = response.data;
          } else if (response.data.tasks && Array.isArray(response.data.tasks)) {
            tasks = response.data.tasks;
          } else if (typeof response.data === 'object') {
            // Try to find any array in the response
            for (const key in response.data) {
              if (Array.isArray(response.data[key])) {
                tasks = response.data[key];
                break;
              }
            }
          }
        }
        
        // Validate tasks and ensure all required fields are present
        if (tasks.length > 0) {
          const validatedTasks = tasks.map((task, index) => ({
            id: task.id || `task_${index + 1}`,
            name: task.name || `Task ${index + 1}`,
            description: task.description || 'No description provided',
            estimatedHours: typeof task.estimatedHours === 'number' ? task.estimatedHours : 4,
            requiredSkills: Array.isArray(task.requiredSkills) ? task.requiredSkills : ['General']
          }));
          
          console.log('Validated tasks from server:', validatedTasks);
          return validatedTasks;
        } else {
          console.warn('No tasks found in the response:', response.data);
          throw new Error('No tasks found in the server response');
        }
      } catch (processingError) {
        console.error('Error processing tasks response:', processingError);
        throw new Error(`Error processing tasks: ${processingError.message}`);
      }
    } catch (error) {
      console.error('Error breaking down tasks:', error);
      
      // Extract error details from the response if available
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message;
      const errorDetails = error.response?.data?.details || 'An unexpected error occurred';
      
      // Create a more detailed error object
      const detailedError = new Error(errorMessage);
      detailedError.details = errorDetails;
      detailedError.rawResponse = error.response?.data;
      
      throw detailedError;
    }
  },
  
  assignTasks: async (tasks, teamMembers) => {
    try {
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('Tasks array is required and must not be empty');
      }
      if (!teamMembers || !Array.isArray(teamMembers) || teamMembers.length === 0) {
        throw new Error('Team members array is required and must not be empty');
      }

      console.log('Sending task assignment request:', { tasks, teamMembers });
      const response = await axios.post(`${API_URL}/assign-tasks`, { tasks, teamMembers });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from server');
      }
      
      console.log('Received task assignments:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error assigning tasks:', error);
      
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message;
      const errorDetails = error.response?.data?.details || 'An unexpected error occurred';
      
      const detailedError = new Error(errorMessage);
      detailedError.details = errorDetails;
      detailedError.rawResponse = error.response?.data;
      
      throw detailedError;
    }
  },
  
  createJiraTasks: async (assignedTasks, projectKey) => {
    try {
      const response = await axios.post(`${API_URL}/create-jira-tasks`, { assignedTasks, projectKey });
      return response.data;
    } catch (error) {
      console.error('Error creating Jira tasks:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default apiClient;