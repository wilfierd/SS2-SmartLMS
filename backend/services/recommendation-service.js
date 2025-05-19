// recommendation-service.js
// Simple service to integrate Python recommendation model with Express

const { spawn } = require('child_process');
const path = require('path');

/**
 * Get course recommendations for a student by calling the Python script
 * @param {number} studentId - The student's ID
 * @param {number} limit - Maximum number of recommendations
 * @returns {Promise<Array>} - Array of recommended courses
 */
function getRecommendations(studentId, limit = 3) {
  return new Promise((resolve, reject) => {
    // Path to Python script (adjust as needed)
    const scriptPath = path.join(__dirname, '..', 'ai', 'recommend.py');
    
    // Spawn Python process
    const pythonProcess = spawn('python3', [scriptPath, studentId, limit]);
    
    let output = '';
    let errorOutput = '';
    
    // Collect output
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    // Collect error output
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(`Error output: ${errorOutput}`);
        return reject(new Error(`Failed to get recommendations: ${errorOutput}`));
      }
      
      try {
        // Try to parse the output as JSON
        // Note: This assumes the Python script writes JSON to stdout
        // If your script doesn't do this, you'll need to modify the output parsing
        const recommendations = parseRecommendationsFromOutput(output);
        resolve(recommendations);
      } catch (error) {
        console.error('Error parsing recommendations:', error);
        console.error('Raw output:', output);
        reject(new Error('Failed to parse recommendations'));
      }
    });
  });
}

/**
 * Parse recommendations from Python script output
 * This is a simple implementation - adjust based on your Python script's output format
 */
function parseRecommendationsFromOutput(output) {
  // If the Python script outputs proper JSON, use this
  // return JSON.parse(output);
  
  // For the current implementation, we'll parse the formatted text output
  // This is a very basic parser - you may need to improve it
  const recommendations = [];
  const lines = output.split('\n');
  
  let currentRec = null;
  
  for (const line of lines) {
    if (line.match(/^\d+\.\s/)) {
      // New recommendation item
      if (currentRec) {
        recommendations.push(currentRec);
      }
      
      // Extract course title and ID
      const match = line.match(/^(\d+)\.\s(.+)\s\(ID:\s(\d+),\sScore:\s([\d.]+)/);
      if (match) {
        currentRec = {
          course_id: parseInt(match[3]),
          title: match[2],
          score: parseFloat(match[4])
        };
      }
    } else if (line.match(/^\s+Reason:/)) {
      // Extract reason
      if (currentRec) {
        currentRec.reason = line.replace(/^\s+Reason:\s/, '');
      }
    } else if (line.match(/^\s+Description:/)) {
      // Extract description
      if (currentRec) {
        currentRec.description = line.replace(/^\s+Description:\s/, '');
      }
    }
  }
  
  // Add the last recommendation if any
  if (currentRec) {
    recommendations.push(currentRec);
  }
  
  return recommendations;
}

module.exports = {
  getRecommendations
};