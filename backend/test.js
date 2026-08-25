const http = require('http');

// ডাটা পাঠিয়ে নতুন একটি বোর্ড তৈরি করার রিকোয়েস্ট
const data = JSON.stringify({
  title: 'My First Test Board',
  description: 'Testing the backend APIs'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/boards',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log('API Response Status:', res.statusCode);
    console.log('API Response Body:', responseBody);
  });
});

req.on('error', (error) => {
  console.error('Error testing API:', error);
});

req.write(data);
req.end();
