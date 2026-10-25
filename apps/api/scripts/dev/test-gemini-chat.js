const axios = require('axios');

async function testModel(model) {
  const apiKey = process.env.GEMINI_API_KEY || 'your-gemini-api-key';
  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      { model, messages: [{ role: 'user', content: 'Say hi' }] },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    console.log(`[${model}] SUCCESS!`);
  } catch (err) {
    console.log(`[${model}] FAILED: ${err.response ? err.response.status : err.message}`);
  }
}

async function main() {
  await testModel('gemini-3.5-flash');
}

main();
