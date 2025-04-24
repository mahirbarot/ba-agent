// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  List,
  ListItem, 
  ListItemText, 
  Grid, 
  Tabs, 
  Tab, 
  CircularProgress,
  Chip,
  Divider,
  Avatar,
  IconButton,
  useMediaQuery,
  CssBaseline,
  Badge,
  AppBar
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import apiClient from './services/api';
import AIVideoInterface from './components/AIVideoInterface';
import NaturalTextToSpeech from './components/NaturalTextToSpeech';
import PlantUMLDiagram from './components/PlantUMLDiagram';

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#2563eb' : '#60a5fa',
      light: mode === 'light' ? '#60a5fa' : '#93c5fd',
      dark: mode === 'light' ? '#1d4ed8' : '#3b82f6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: mode === 'light' ? '#7c3aed' : '#a78bfa',
      light: mode === 'light' ? '#a78bfa' : '#c4b5fd',
      dark: mode === 'light' ? '#6d28d9' : '#8b5cf6',
      contrastText: '#ffffff',
    },
    background: {
      default: mode === 'light' ? '#f8fafc' : '#0f172a',
      paper: mode === 'light' ? '#ffffff' : '#1e293b',
    },
    text: {
      primary: mode === 'light' ? '#1e293b' : '#f8fafc',
      secondary: mode === 'light' ? '#475569' : '#cbd5e1',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
  },
});

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(prefersDarkMode ? 'dark' : 'light');
  const theme = React.useMemo(() => createTheme(getDesignTokens(mode)), [mode]);
  
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [businessRequirements, setBusinessRequirements] = useState('');
  const [documents, setDocuments] = useState(null);
  const [researchResults, setResearchResults] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Alice Johnson", skills: ["Frontend Development", "UI/UX Design", "React"] },
    { id: 2, name: "Bob Smith", skills: ["Backend Development", "Database Design", "API Design", "Node.js"] },
    { id: 3, name: "Charlie Brown", skills: ["QA", "Testing", "Automation"] },
    { id: 4, name: "Diana Miller", skills: ["Project Management", "Business Analysis", "Documentation"] }
  ]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [jiraTasks, setJiraTasks] = useState([]);
  const [jiraProjectKey, setJiraProjectKey] = useState('PROJ');
  const [newTeamMember, setNewTeamMember] = useState({ name: '', skills: '' });
  const [editingMember, setEditingMember] = useState(null);
  const [videoCall, setVideoCall] = useState(false);
  const [projectContext, setProjectContext] = useState(null);
  const [error, setError] = useState(null);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const generatePlaceholderTasks = () => {
    const placeholderTasks = [
      {
        id: "placeholder_1",
        name: "Review Requirements Documentation",
        description: "Review the generated SRS, FRD, and BRD documents to understand project requirements.",
        estimatedHours: 4,
        requiredSkills: ["Business Analysis", "Documentation"]
      },
      {
        id: "placeholder_2",
        name: "Create Technical Architecture",
        description: "Design the technical architecture based on the requirements specifications.",
        estimatedHours: 16,
        requiredSkills: ["System Architecture", "Technical Design"]
      },
      {
        id: "placeholder_3",
        name: "Develop Implementation Plan",
        description: "Create a detailed implementation plan with timeline and resource allocation.",
        estimatedHours: 8,
        requiredSkills: ["Project Management", "Planning"]
      },
      {
        id: "placeholder_4",
        name: "Set Up Development Environment",
        description: "Configure development tools and environments for the project.",
        estimatedHours: 6,
        requiredSkills: ["DevOps", "Configuration Management"]
      },
      {
        id: "placeholder_5",
        name: "Create User Interface Mockups",
        description: "Design UI mockups and prototypes based on requirements.",
        estimatedHours: 12,
        requiredSkills: ["UI/UX Design", "Frontend Development"]
      }
    ];
    return placeholderTasks;
  };

  const handleRequirementsSubmit = async () => {
    if (!businessRequirements.trim()) return;
    
    setLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      // Step 1: Generate documents
      const docs = await apiClient.generateDocuments(businessRequirements);
      setDocuments({ ...docs, selectedDocType: 0 });
      console.log('Documents generated successfully:', docs);
      
      // Step 2: Conduct research
      const research = await apiClient.conductResearch(businessRequirements);
      setResearchResults(research);
      console.log('Research completed successfully:', research);
      
      // Step 3: Break down tasks from generated documents
      let taskBreakdown = [];
      let taskError = null;

      try {
        console.log('Breaking down tasks from documents...');
        // Ensure we have valid documents to work with
        if (!docs || (!docs.srs && !docs.frd && !docs.brd)) {
          throw new Error('No valid documents found to break down into tasks');
        }
        
        // Try to get tasks
        taskBreakdown = await apiClient.breakdownTasks(docs);
        
        // Validate the tasks
        if (!taskBreakdown || !Array.isArray(taskBreakdown) || taskBreakdown.length === 0) {
          throw new Error('No valid tasks were generated from the documents');
        }
        
        console.log('Tasks broken down successfully:', taskBreakdown);
      } catch (error) {
        console.error('Error breaking down tasks:', error);
        taskError = error;
        // Use placeholder tasks instead
        taskBreakdown = generatePlaceholderTasks();
        setError(`We've generated placeholder tasks since we couldn't break down the documents: ${error.message}`);
      }
      
      // Always set tasks, whether they're from the API or placeholders
      setTasks(taskBreakdown);
      
      // Step 4: Assign tasks to team members
      let assignmentResults = [];
      if (taskBreakdown.length > 0 && teamMembers.length > 0) {
        try {
          console.log('Assigning tasks to team members...');
          assignmentResults = await apiClient.assignTasks(taskBreakdown, teamMembers);
          console.log('Tasks assigned successfully:', assignmentResults);
          
          // Validate assignments
          if (Array.isArray(assignmentResults) && assignmentResults.length > 0) {
            const validAssignments = assignmentResults.map(task => ({
              ...task,
              assignedTo: task.assignedTo || 'Unassigned',
              confidence: task.confidence || 0
            }));
            
            setAssignedTasks(validAssignments);
          }
        } catch (assignError) {
          console.error('Error assigning tasks:', assignError);
          // We'll continue even if assignment fails
        }
      }
      
      setCurrentTab(1); // Switch to Documents tab
    } catch (error) {
      console.error("Error processing requirements:", error);
      // Show error message to user
      setError(error.message || "An error occurred while processing your requirements");
      
      // Ensure we always have some tasks to work with
      setTasks(generatePlaceholderTasks());
    } finally {
      setLoading(false);
    }
  };

  const handleTeamMemberAdd = () => {
    if (!newTeamMember.name || !newTeamMember.skills) return;
    
    const skills = newTeamMember.skills.split(',').map(skill => skill.trim());
    const newMember = {
      id: teamMembers.length + 1,
      name: newTeamMember.name,
      skills: skills
    };
    
    setTeamMembers([...teamMembers, newMember]);
    setNewTeamMember({ name: '', skills: '' });
  };

  const handleTeamMemberEdit = (member) => {
    setEditingMember({
      ...member,
      skills: member.skills.join(', ')
    });
    setNewTeamMember({
      name: member.name,
      skills: member.skills.join(', ')
    });
  };

  const handleTeamMemberUpdate = () => {
    if (!newTeamMember.name || !newTeamMember.skills) return;
    
    const skills = newTeamMember.skills.split(',').map(skill => skill.trim());
    const updatedMembers = teamMembers.map(member => 
      member.id === editingMember.id 
        ? { ...member, name: newTeamMember.name, skills: skills }
        : member
    );
    
    setTeamMembers(updatedMembers);
    setNewTeamMember({ name: '', skills: '' });
    setEditingMember(null);
  };

  const handleTeamMemberDelete = (memberId) => {
    const updatedMembers = teamMembers.filter(member => member.id !== memberId);
    setTeamMembers(updatedMembers);
  };

  const handleTaskAssignment = async () => {
    if (tasks.length === 0 || teamMembers.length === 0) {
      setError("Please ensure you have both tasks and team members before assigning");
      return;
    }
    
    setLoading(true);
    try {
      console.log('Assigning tasks to team members...');
      console.log('Tasks:', tasks);
      console.log('Team members:', teamMembers);
      
      const assignments = await apiClient.assignTasks(tasks, teamMembers);
      console.log('Received assignments:', assignments);
      
      if (Array.isArray(assignments) && assignments.length > 0) {
        // Ensure all assignments have the required fields
        const validAssignments = assignments.map(task => ({
          ...task,
          assignedTo: task.assignedTo || 'Unassigned',
          confidence: task.confidence || 0
        }));
        
        setAssignedTasks(validAssignments);
        setCurrentTab(3); // Switch to Assignments tab
        console.log('Assignments set and navigating to Assignments tab');
      } else {
        throw new Error('No valid assignments returned from server');
      }
    } catch (error) {
      console.error("Error assigning tasks:", error);
      setError(error.message || "An error occurred while assigning tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleJiraTaskCreation = async () => {
    if (!tasks.length) {
      setError("No tasks available to add to Jira");
      return;
    }
    
    // Use tasks directly if no assigned tasks yet
    const tasksToSend = assignedTasks.length > 0 ? assignedTasks : tasks;
    
    setLoading(true);
    try {
      console.log('Creating Jira tasks for:', tasksToSend);
      
      const response = await apiClient.createJiraTasks(tasksToSend);
      
      if (response.success) {
        // Show success message with count information
        setError(null);
        alert(`Successfully created ${response.createdCount} tasks in Jira${response.failedCount > 0 ? ` (${response.failedCount} failed)` : ''}`);
        
        // Save the created tasks info
        setJiraTasks(response.createdTasks || []);
        
        // Log any errors that occurred
        if (response.errors && response.errors.length > 0) {
          console.warn('Some tasks failed to create in Jira:', response.errors);
        }
      } else {
        throw new Error(response.error || 'Failed to create Jira tasks');
      }
    } catch (error) {
      console.error("Error creating Jira tasks:", error);
      setError(`Failed to create Jira tasks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageFromAI = (message) => {
    // Handle messages received from AI Video Interface
    console.log('Message from AI:', message);
  };

  const toggleVideoCall = () => {
    setVideoCall(!videoCall);
    // Update project context when video call is started
    if (!videoCall) {
      setProjectContext({
        projectName,
        businessRequirements,
        teamMembers,
        tasks: assignedTasks
      });
    }
  };

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      <Box 
        sx={{ 
          minHeight: '100vh',
          bgcolor: 'background.default',
          transition: 'background-color 0.3s ease'
        }}
      >
        <Container maxWidth="lg" sx={{ py: 4, position: "static", top: 0, left: 0, width: "100%" }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 4 
          }}>
            <Typography 
              variant="h5" 
              component="h1" 
              sx={{ 
                background: theme.palette.mode === 'dark' 
                  ? 'linear-gradient(45deg, #60a5fa 30%, #a78bfa 90%)'
                  : 'linear-gradient(45deg, #2563eb 30%, #7c3aed 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontWeight: 700,
                letterSpacing: '-0.02em'
              }}
            >
              Business Analyst AI-Agent
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<VideoCallIcon />}
                onClick={toggleVideoCall}
                sx={{
                  borderRadius: '12px',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: theme.shadows[2],
                  },
                }}
              >
                {videoCall ? "End Video Call" : "Start AI Video Call"}
              </Button>
              
              <IconButton 
                onClick={toggleColorMode} 
                sx={{
                  bgcolor: 'background.paper',
                  boxShadow: theme.shadows[2],
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  },
                }}
              >
                {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Box>
          </Box>
          
          {videoCall && (
            <AIVideoInterface
              isActive={videoCall}
              projectContext={projectContext}
              onMessageReceived={handleMessageFromAI}
            />
          )}
          
          <AppBar position="static">
            <Tabs
              value={currentTab}
              onChange={(e, newValue) => setCurrentTab(newValue)}
              indicatorColor="secondary"
              textColor="inherit"
              variant="fullWidth"
            >
              <Tab label="Requirements" />
              <Tab label="Documents" />
              <Tab label="Team" />
              <Tab label="Assignments" />
            </Tabs>
          </AppBar>
          
          {currentTab === 0 && (
            <Paper 
              sx={{ 
                p: 3, 
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              <Typography variant="h6" gutterBottom>
                Business Requirements Analysis
              </Typography>
              <TextField
                fullWidth
                label="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                margin="normal"
              />
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Enter Business Requirements"
                value={businessRequirements}
                onChange={(e) => setBusinessRequirements(e.target.value)}
                margin="normal"
                placeholder="Describe your project requirements in detail. The AI will analyze them to generate documentation and technical tasks."
              />
              
              {error && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1, color: 'error.dark' }}>
                  <Typography variant="body2" component="span">{error}</Typography>
                  <Button 
                    variant="text" 
                    color="error" 
                    onClick={() => setError(null)} 
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    Dismiss
                  </Button>
                </Box>
              )}
              
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleRequirementsSubmit}
                disabled={loading || !businessRequirements.trim()}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : "Process Requirements"}
              </Button>
            </Paper>
          )}
          
          {currentTab === 1 && (
            <Paper 
              sx={{ 
                p: 3, 
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              <Typography variant="h6" gutterBottom>
                Generated Documents
              </Typography>
              
              {documents ? (
                <Box>
                  <Tabs 
                    value={documents.selectedDocType || 0} 
                    onChange={(e, newValue) => setDocuments({...documents, selectedDocType: newValue})} 
                    indicatorColor="secondary" 
                    textColor="secondary"
                    sx={{
                      '& .MuiTab-root': {
                        minHeight: '48px',
                        py: 1,
                        px: 2
                      }
                    }}
                  >
                    <Tab 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Badge 
                            color="primary" 
                            variant="dot" 
                            invisible={!documents.srs}
                          >
                            Software Requirements Specification
                          </Badge>
                        </Box>
                      } 
                    />
                    <Tab 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Badge 
                            color="primary" 
                            variant="dot" 
                            invisible={!documents.frd}
                          >
                            Functional Requirements
                          </Badge>
                        </Box>
                      } 
                    />
                    <Tab 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Badge 
                            color="primary" 
                            variant="dot" 
                            invisible={!documents.brd}
                          >
                            Business Requirements
                          </Badge>
                        </Box>
                      } 
                    />
                    <Tab 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Badge 
                            color="primary" 
                            badgeContent={documents.umlDiagrams?.length || 0}
                            max={99}
                            showZero
                          >
                            UML Diagrams
                          </Badge>
                        </Box>
                      } 
                    />
                  </Tabs>
                  
                  <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5', borderRadius: 1 }}>
                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <>
                        {documents.selectedDocType === 0 && (
                          <Typography variant="body1" component="pre" sx={{ 
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            lineHeight: 1.6
                          }}>
                            {documents.srs || 'No SRS document available'}
                          </Typography>
                        )}
                        {documents.selectedDocType === 1 && (
                          <Typography variant="body1" component="pre" sx={{ 
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            lineHeight: 1.6
                          }}>
                            {documents.frd || 'No Functional Requirements document available'}
                          </Typography>
                        )}
                        {documents.selectedDocType === 2 && (
                          <Typography variant="body1" component="pre" sx={{ 
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            lineHeight: 1.6
                          }}>
                            {documents.brd || 'No Business Requirements document available'}
                          </Typography>
                        )}
                        {documents.selectedDocType === 3 && (
                          <Box>
                            {documents.umlDiagrams && documents.umlDiagrams.length > 0 ? (
                              documents.umlDiagrams.map((diagram, index) => (
                                <Box key={index} sx={{ 
                                  mb: 3,
                                  p: 2,
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'white',
                                  borderRadius: 1,
                                  border: `1px solid ${theme.palette.divider}`
                                }}>
                                  <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
                                    {diagram.name}
                                  </Typography>
                                  <PlantUMLDiagram plantUMLCode={diagram.content} />
                                </Box>
                              ))
                            ) : (
                              <Typography variant="body1" component="span" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
                                No UML diagrams available
                              </Typography>
                            )}
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                  
                  <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                    Competitive Research
                  </Typography>
                  
                  {researchResults && (
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>
                          Market Analysis:
                        </Typography>
                        <Typography variant="body2" component="span">
                          {typeof researchResults.marketTrends === 'string' 
                            ? researchResults.marketTrends 
                            : JSON.stringify(researchResults.marketTrends, null, 2)}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>
                          Competitor Analysis:
                        </Typography>
                        <List>
                          {Array.isArray(researchResults.competitors) && researchResults.competitors.map((competitor, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={competitor.name}
                                secondary={
                                  <>
                                    <b>Strengths:</b> {Array.isArray(competitor.strengths) 
                                      ? competitor.strengths.join(', ') 
                                      : competitor.strengths}<br />
                                    <b>Weaknesses:</b> {Array.isArray(competitor.weaknesses) 
                                      ? competitor.weaknesses.join(', ') 
                                      : competitor.weaknesses}
                                  </>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>
                          Recommendations:
                        </Typography>
                        {typeof researchResults.recommendations === 'string' ? (
                          <Typography variant="body2" component="span">
                            {researchResults.recommendations}
                          </Typography>
                        ) : (
                          <Box>
                            {researchResults.recommendations.strategicInitiatives && (
                              <>
                                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                                  Strategic Initiatives:
                                </Typography>
                                <List dense>
                                  {Array.isArray(researchResults.recommendations.strategicInitiatives) && 
                                    researchResults.recommendations.strategicInitiatives.map((initiative, idx) => (
                                      <ListItem key={idx}>
                                        <ListItemText primary={initiative} />
                                      </ListItem>
                                    ))
                                  }
                                </List>
                              </>
                            )}
                            
                            {researchResults.recommendations.marketPositioning && (
                              <>
                                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                                  Market Positioning:
                                </Typography>
                                <Typography variant="body2" component="span">
                                  {researchResults.recommendations.marketPositioning}
                                </Typography>
                              </>
                            )}
                            
                            {/* Handle any other properties in the recommendations object */}
                            {Object.entries(researchResults.recommendations || {})
                              .filter(([key]) => !['strategicInitiatives', 'marketPositioning'].includes(key))
                              .map(([key, value]) => (
                                <Box key={key} sx={{ mt: 2 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                                  </Typography>
                                  <Typography variant="body2" component="span">
                                    {typeof value === 'string' 
                                      ? value 
                                      : Array.isArray(value) 
                                        ? value.join(', ') 
                                        : JSON.stringify(value, null, 2)}
                                  </Typography>
                                </Box>
                              ))}
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  )}
                  
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => setCurrentTab(2)}
                    sx={{ mt: 3 }}
                  >
                    Continue to Team Setup
                  </Button>
                </Box>
              ) : (
                <Typography variant="body1" component="span" color="textSecondary">
                  Process your requirements to generate documents.
                </Typography>
              )}
            </Paper>
          )}
          
          {currentTab === 2 && (
            <Paper 
              sx={{ 
                p: 3, 
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              <Typography variant="h6" gutterBottom>
                Team Members and Skills
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={5}>
                  <Typography variant="subtitle1" gutterBottom>
                    {editingMember ? 'Edit Team Member:' : 'Add Team Member:'}
                  </Typography>
                  <TextField
                    fullWidth
                    label="Name"
                    value={newTeamMember.name}
                    onChange={(e) => setNewTeamMember({...newTeamMember, name: e.target.value})}
                    margin="normal"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Skills (comma separated)"
                    value={newTeamMember.skills}
                    onChange={(e) => setNewTeamMember({...newTeamMember, skills: e.target.value})}
                    margin="normal"
                    size="small"
                    placeholder="e.g. JavaScript, React, UI Design"
                  />
                  {editingMember ? (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleTeamMemberUpdate}
                        disabled={!newTeamMember.name || !newTeamMember.skills}
                      >
                        Update Member
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="secondary" 
                        onClick={() => {
                          setEditingMember(null);
                          setNewTeamMember({ name: '', skills: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  ) : (
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleTeamMemberAdd}
                      disabled={!newTeamMember.name || !newTeamMember.skills}
                      sx={{ mt: 1 }}
                    >
                      Add Member
                    </Button>
                  )}
                </Grid>
                
                <Grid item xs={12} md={7}>
                  <Typography variant="subtitle1" gutterBottom>
                    Team Members:
                  </Typography>
                  <List>
                    {teamMembers.map((member) => (
                      <ListItem 
                        key={member.id} 
                        divider
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255,255,255,0.05)' 
                              : 'rgba(0,0,0,0.02)',
                          },
                        }}
                      >
                        <ListItemText
                          primary={member.name}
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              {member.skills.map((skill) => (
                                <Chip 
                                  key={skill} 
                                  label={skill} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ mr: 0.5, mb: 0.5 }} 
                                />
                              ))}
                            </Box>
                          }
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleTeamMemberEdit(member)}
                            disabled={editingMember !== null}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleTeamMemberDelete(member.id)}
                            disabled={editingMember !== null}
                          >
                            Delete
                          </Button>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleTaskAssignment}
                      disabled={loading || !tasks.length || !teamMembers.length}
                    >
                      {loading ? <CircularProgress size={24} /> : "Assign Tasks"}
                    </Button>

                    {/* Add new Jira button */}
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleJiraTaskCreation}
                      disabled={loading || !tasks.length}
                      startIcon={<AssignmentIcon />}
                    >
                      Add Tasks to Jira
                    </Button>
                  </Box>
                  
                  {error && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1, color: 'error.dark' }}>
                      <Typography variant="body2" component="span">{error}</Typography>
                      <Button 
                        variant="text" 
                        color="error" 
                        onClick={() => setError(null)} 
                        size="small"
                        sx={{ mt: 1 }}
                      >
                        Dismiss
                      </Button>
                    </Box>
                  )}
                  
                  {(!tasks.length || !teamMembers.length) && (
                    <Typography variant="body2" component="span" color="error" sx={{ mt: 1 }}>
                      {!tasks.length ? "No tasks available. Please generate tasks first." : ""}
                      {!teamMembers.length ? "No team members available. Please add team members first." : ""}
                    </Typography>
                  )}
                  
                  {tasks.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Available Tasks:
                      </Typography>
                      <List>
                        {tasks.map((task) => (
                          <ListItem key={task.id}>
                            <ListItemText
                              primary={task.name}
                              secondary={
                                <>
                                  <Typography component="span" variant="body2">
                                    Description: {task.description}
                                  </Typography>
                                  <br />
                                  <Typography component="span" variant="body2">
                                    Estimated Hours: {task.estimatedHours}
                                  </Typography>
                                  <br />
                                  <Typography component="span" variant="body2">
                                    Required Skills: {task.requiredSkills.join(', ')}
                                  </Typography>
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Paper>
          )}
          
          {currentTab === 3 && (
            <Paper 
              sx={{ 
                p: 3, 
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              <Typography variant="h6" gutterBottom>
                Task Assignments
              </Typography>
              
              {assignedTasks.length > 0 ? (
                <Box>
                  {/* Group tasks by team member */}
                  {teamMembers.map(member => {
                    // Find tasks assigned to this team member
                    const memberTasks = assignedTasks.filter(task => 
                      task.assignedTo === member.name
                    );
                    
                    return (
                      <Box key={member.id} sx={{ mb: 4 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 2,
                          pb: 1,
                          borderBottom: `1px solid ${theme.palette.divider}`
                        }}>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                            {member.name.charAt(0)}
                          </Avatar>
                          <Typography variant="h6">
                            {member.name}
                          </Typography>
                          <Chip 
                            label={`${memberTasks.length} tasks`} 
                            size="small" 
                            color={memberTasks.length > 0 ? "primary" : "default"}
                            variant="outlined"
                            sx={{ ml: 2 }}
                          />
                        </Box>
                        
                        {memberTasks.length > 0 ? (
                          <List>
                            {memberTasks.map(task => (
                              <ListItem 
                                key={task.id} 
                                sx={{ 
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                  borderRadius: 1,
                                  mb: 1
                                }}
                              >
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Typography variant="subtitle1">{task.name}</Typography>
                                      <Chip 
                                        label={`${task.confidence}% match`}
                                        size="small"
                                        color={task.confidence > 75 ? "success" : task.confidence > 50 ? "primary" : "warning"}
                                        variant="outlined"
                                      />
                                    </Box>
                                  }
                                  secondary={
                                    <>
                                      <Typography component="span" variant="body2">
                                        {task.description}
                                      </Typography>
                                      <Box sx={{ display: 'flex', mt: 1, flexWrap: 'wrap' }}>
                                        <Chip 
                                          size="small" 
                                          icon={<AssignmentIcon fontSize="small" />} 
                                          label={`${task.estimatedHours} hours`} 
                                          sx={{ mr: 1, mb: 1 }}
                                        />
                                        {task.requiredSkills.map(skill => (
                                          <Chip 
                                            key={skill} 
                                            size="small"
                                            label={skill}
                                            variant="outlined"
                                            sx={{ mr: 1, mb: 1 }}
                                          />
                                        ))}
                                      </Box>
                                    </>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                            <Typography variant="body2" component="span">No tasks assigned to this team member</Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                  
                  {/* Display total number of assigned tasks and workload summary */}
                  <Box sx={{ mt: 4, p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Assignment Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          Total tasks assigned: {assignedTasks.length}
                        </Typography>
                        <Typography variant="body2">
                          Total estimated hours: {assignedTasks.reduce((total, task) => total + task.estimatedHours, 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          Team members with tasks: {teamMembers.filter(member => 
                            assignedTasks.some(task => task.assignedTo === member.name)
                          ).length} / {teamMembers.length}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body1" component="span" color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
                  No tasks have been assigned yet. Go to the Team tab and click "Assign Tasks" to assign tasks to team members.
                </Typography>
              )}
            </Paper>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;