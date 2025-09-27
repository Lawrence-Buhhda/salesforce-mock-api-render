const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

const https = require('https');
const dns = require('dns');

app.use(cors());

// 模拟用户数据（备用数据）
const mockUsers = [
  {
    "id": 1,
    "email": "john@gmail.com",
    "username": "johndoe",
    "password": "m38rmF$",
    "name": {"firstname": "john", "lastname": "doe"},
    "address": {
      "city": "kilcoole",
      "street": "7835 new road",
      "number": 3,
      "zipcode": "12926-3874",
      "geolocation": {"lat": "-37.3159", "long": "81.1496"}
    },
    "phone": "1-570-236-7033"
  },
  {
    "id": 2,
    "email": "morrison@gmail.com", 
    "username": "mor_2314", 
    "password": "83r5^_", 
    "name": {"firstname": "david", "lastname": "morrison"},
    "address": {
      "city": "Cullman",
      "street": "Lovers Ln",
      "number": 7267,
      "zipcode": "29576-7874",
      "geolocation": {"lat": "40.3467", "long": "-30.1310"}
    },
    "phone": "1-853-854-6666"
  }
];

// 代理到 fakestoreapi.com
app.use('/users', createProxyMiddleware({
  target: 'https://fakestoreapi.com',
  changeOrigin: true,
  logLevel: 'silent',
  timeout: 5000,
  onError: (err, req, res) => {
    console.log('⚠️ fakestoreapi.com unavailable, serving mock user data');
    res.json(mockUsers);
  }
}));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Proxy Server is running',
    port: PORT
  });
});

// 根端点
app.get('/', (req, res) => {
  res.json({
    message: 'Salesforce Mock API Proxy Server',
    endpoints: {
      '/users': 'GET - User data from fakestoreapi.com (with fallback)',
      '/health': 'GET - Health check status',
      '/*': 'Other endpoints from your Mockoon API'
    }
  });
});

// 诊断端点
app.get('/diagnose', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  // 测试1: DNS 解析
  try {
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4('fakestoreapi.com', (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    results.tests.push({
      test: 'DNS Resolution',
      status: 'success',
      addresses: addresses
    });
  } catch (error) {
    results.tests.push({
      test: 'DNS Resolution',
      status: 'failed',
      error: error.message
    });
  }
  // 测试2: TCP 连接测试
  try {
    const tcpResult = await new Promise((resolve) => {
      const req = https.request({
        hostname: 'fakestoreapi.com',
        port: 443,
        method: 'HEAD',
        timeout: 5000
      }, (response) => {
        resolve({
          status: 'success',
          statusCode: response.statusCode,
          headers: response.headers
        });
      });
      req.on('error', (error) => {
        resolve({
          status: 'failed',
          error: error.message
        });
      });
      req.on('timeout', () => {
        resolve({
          status: 'failed',
          error: 'Connection timeout'
        });
      });
      req.end();
    });
    results.tests.push({
      test: 'TCP Connection',
      status: tcpResult.status,
      ...tcpResult
    });
  } catch (error) {
    results.tests.push({
      test: 'TCP Connection',
      status: 'failed',
      error: error.message
    });
  }
  res.json(results);
});



// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`👥 Users endpoint: http://localhost:${PORT}/users`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
