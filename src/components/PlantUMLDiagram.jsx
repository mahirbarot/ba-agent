import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import plantumlEncoder from 'plantuml-encoder';
import axios from 'axios';

const PlantUMLDiagram = ({ plantUMLCode }) => {
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const generateDiagram = async () => {
      try {
        setLoading(true);
        setError(null);

        // Clean up the PlantUML code
        let cleanCode = plantUMLCode;
        
        // Ensure proper line endings
        cleanCode = cleanCode.replace(/\\n/g, '\n');
        
        // Ensure proper start and end markers
        if (!cleanCode.includes('@startuml')) {
          cleanCode = '@startuml\n' + cleanCode;
        }
        if (!cleanCode.includes('@enduml')) {
          cleanCode = cleanCode + '\n@enduml';
        }

        // Encode the PlantUML code
        const encoded = plantumlEncoder.encode(cleanCode);
        
        // Generate the URL for the PNG format (more reliable than SVG)
        const url = `http://www.plantuml.com/plantuml/png/${encoded}`;
        
        // Fetch the image as a blob
        const response = await axios.get(url, { responseType: 'blob' });
        
        // Convert blob to data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageData(reader.result);
        };
        reader.readAsDataURL(response.data);
        
      } catch (err) {
        console.error('Error generating PlantUML diagram:', err);
        setError(`Failed to generate diagram. Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (plantUMLCode) {
      generateDiagram();
    }
  }, [plantUMLCode]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Display error if any */}
      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light' }}>
          <Typography color="error">
            {error}
          </Typography>
        </Paper>
      )}

      {/* Display the diagram */}
      {imageData && (
        <Box sx={{ 
          width: '100%', 
          overflow: 'auto',
          '& img': {
            maxWidth: '100%',
            height: 'auto'
          }
        }}>
          <img 
            src={imageData} 
            alt="PlantUML Diagram" 
            onError={(e) => {
              console.error('Image load error:', e);
              setError('Failed to load diagram. Please check the PlantUML syntax.');
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default PlantUMLDiagram; 