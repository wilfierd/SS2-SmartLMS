
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const baseUrl = apiUrl.replace(/\/api$/, '');

const config = {
  apiUrl,
  baseUrl,
  googleClientId: '312655720270-prcea14eek4i0abj09acomparvsipsq6.apps.googleusercontent.com',
  projectName: 'SS2-LMSHub'
};

export default config;  