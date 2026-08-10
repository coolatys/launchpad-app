const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        // Remove quotes if present
        if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1);
        process.env[key] = val;
      }
    });
  }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key present:', !!apiKey);
if (apiKey) {
  console.log('API Key length:', apiKey.length);
}

async function testGemini() {
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found. Please add it to your .env.local file.');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We will test both gemini-2.5-flash and gemini-1.5-flash
    const modelsToTest = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    
    for (const modelName of modelsToTest) {
      console.log(`Testing model: ${modelName}...`);
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 200,
          }
        });
        
        const result = await model.generateContent(
          'Tell me if you are working by returning this JSON: {"status": "ok", "model": "' + modelName + '"}'
        );
        
        console.log(`Success with ${modelName}:`, result.response.text());
        return; // Exit if one succeeds
      } catch (err) {
        console.error(`Failed with ${modelName}:`, err.message);
      }
    }
  } catch (globalErr) {
    console.error('Global error during Gemini test:', globalErr);
  }
}

testGemini();
