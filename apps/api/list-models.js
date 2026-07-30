const { GoogleGenAI } = require('@google/genai');

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || 'your-gemini-api-key';
  const genai = new GoogleGenAI({
    apiKey,
  });

  try {
    const response = await genai.models.list();
    for await (const model of response) {
      console.log(model.name);
    }
  } catch (e) {
    console.error('Error fetching models:', e);
  }
}

main();
