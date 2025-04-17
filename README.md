# SS2-LMSHub

Trong backend, đây là lệnh cài đặt các thư viện expressJS
cd backend
npm init -y
=> npm install express@4.18.2 mysql2 bcrypt jsonwebtoken cors google-auth-library nodemailer dotenv

cd ..
cd frontend
npx create-react-app frontend
npm install react-router-dom axios @react-oauth/google

Để chạy hãy mở 2 terminal. 
Terminal 1: Trong thư mục backend chạy node setupdb.js
Sau đó chạy node server.js

Terminal 2: trong thư mục frontend gõ npm start
