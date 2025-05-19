// backend/services/recommendation-service.js
// Service để gọi script Python và xử lý kết quả

const { spawn } = require('child_process');
const path = require('path');

/**
 * Lấy gợi ý khóa học cho sinh viên bằng cách gọi script Python
 * @param {number} studentId - ID của sinh viên
 * @param {number} limit - Số lượng gợi ý tối đa
 * @returns {Promise<Array>} - Mảng các khóa học được gợi ý
 */
function getRecommendations(studentId, limit = 3) {
  return new Promise((resolve, reject) => {
    // Đường dẫn đến script Python
    const scriptPath = path.join(__dirname, '..', '..', 'ai', 'recommend.py');
    
    // Đường dẫn đến file model
    const modelPath = path.join(__dirname, '..', '..', 'ai', 'recommendation_model.pkl');
    
    console.log(`Getting recommendations for student: ${studentId}`);
    console.log(`Script path: ${scriptPath}`);
    console.log(`Model path: ${modelPath}`);
    
    // Chạy script Python
    const pythonProcess = spawn('python3', [scriptPath, studentId, limit, modelPath]);
    
    let output = '';
    let errorOutput = '';
    
    // Thu thập output
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    // Thu thập lỗi
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Python error: ${data.toString()}`);
    });
    
    // Xử lý khi process kết thúc
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(`Error output: ${errorOutput}`);
        // Trả về object lỗi để frontend có thể hiển thị
        return resolve([{ error: `Failed to get recommendations: ${errorOutput}` }]);
      }
      
      try {
        // Phân tích output thành JSON
        const recommendations = parseRecommendationsFromOutput(output);
        resolve(recommendations);
      } catch (error) {
        console.error('Error parsing recommendations:', error);
        console.error('Raw output:', output);
        resolve([{ error: 'Failed to parse recommendations' }]);
      }
    });
  });
}

/**
 * Phân tích kết quả từ script Python
 * Hàm này tìm kiếm JSON đánh dấu bằng các marker
 */
function parseRecommendationsFromOutput(output) {
  try {
    // Tìm JSON giữa các marker
    const startMarker = 'RECOMMENDATION_START_JSON';
    const endMarker = 'RECOMMENDATION_END_JSON';
    
    const startIndex = output.indexOf(startMarker) + startMarker.length;
    const endIndex = output.indexOf(endMarker);
    
    if (startIndex > 0 && endIndex > startIndex) {
      const jsonString = output.substring(startIndex, endIndex).trim();
      return JSON.parse(jsonString);
    }
    
    // Nếu không tìm thấy marker, sử dụng phương pháp phân tích text cũ
    return parseTextRecommendations(output);
  } catch (error) {
    console.error('Error parsing JSON recommendations:', error);
    // Fallback sang phân tích text
    return parseTextRecommendations(output);
  }
}

/**
 * Phương pháp phân tích text dự phòng
 */
function parseTextRecommendations(output) {
  // Phân tích output định dạng text
  const recommendations = [];
  const lines = output.split('\n');
  
  let currentRec = null;
  
  for (const line of lines) {
    if (line.match(/^\d+\.\s/)) {
      // Mục gợi ý mới
      if (currentRec) {
        recommendations.push(currentRec);
      }
      
      // Trích xuất tiêu đề và ID khóa học
      const match = line.match(/^(\d+)\.\s(.+)\s\(ID:\s(\d+),\sScore:\s([\d.]+)/);
      if (match) {
        currentRec = {
          course_id: parseInt(match[3]),
          title: match[2],
          score: parseFloat(match[4])
        };
      }
    } else if (line.match(/^\s+Reason:/)) {
      // Trích xuất lý do
      if (currentRec) {
        currentRec.reason = line.replace(/^\s+Reason:\s/, '');
      }
    } else if (line.match(/^\s+Description:/)) {
      // Trích xuất mô tả
      if (currentRec) {
        currentRec.description = line.replace(/^\s+Description:\s/, '');
      }
    }
  }
  
  // Thêm gợi ý cuối cùng nếu có
  if (currentRec) {
    recommendations.push(currentRec);
  }
  
  return recommendations.length > 0 ? recommendations : [{ error: 'No recommendations found' }];
}

module.exports = {
  getRecommendations
};