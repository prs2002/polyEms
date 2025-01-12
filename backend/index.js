const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Groq } = require('groq-sdk'); 
const { GoogleGenerativeAI } = require('@google/generative-ai'); 
const OpenAI = require('openai');
const { HfInference } = require("@huggingface/inference");

dotenv.config();

const app = express();
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HF_API_KEY = process.env.HF_API_KEY;

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and enable CORS
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
}));

// Initialize Groq client
const groqClient = new Groq({ apiKey: GROQ_API_KEY });

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Initialize OpenAI client
const token = OPENAI_API_KEY; // Fetch OpenAI API key from environment
const endpoint = "https://models.inference.ai.azure.com";
const openAIClient = new OpenAI({ baseURL: endpoint, apiKey: token });

// Initialize HuggingFace client
const hfclient = new HfInference(HF_API_KEY);

app.get("/", (req, res) => {
  res.json({
    message: "Server running",
  });
});

// Endpoint to interact with Groq API
app.post('/api/chat', async (req, res) => {
  const { messages, model } = req.body;
  let response = '';

  try {
    if (model && model.startsWith('gemini')) {
      const geminiModel = genAI.getGenerativeModel({ model });
      const prompt = messages.map(msg => msg.content).join('\n');
      const result = await geminiModel.generateContent(prompt);
      response = result.response.text();
    } else if (model && model.startsWith('gpt')) {
      const result = await openAIClient.chat.completions.create({
        messages: messages,
        temperature: 1.0,
        top_p: 1.0,
        max_tokens: 1024,
        model: model
      });
      response = result.choices[0]?.message?.content || 'No response generated.';
    } else if (model === 'Qwen2.5-Coder-32B-Instruct') {
      let out = "";
      const stream = hfclient.chatCompletionStream({
        model: "Qwen/Qwen2.5-Coder-32B-Instruct",
        messages,
        temperature: 1,
        max_tokens: 1024,
        top_p: 0.7
      });

      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0) {
          const newContent = chunk.choices[0].delta.content;
          out += newContent;
        }
      }

      response = out || 'No response generated.';
    } else {
      const result = await groqClient.chat.completions.create({
        messages,
        model,
        temperature: 1,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      });
      response = result.choices[0]?.message?.content || 'No response generated.';
    }

    res.json({ response });
  } catch (error) {
    console.error('Error communicating with APIs:', error.message);
    res.status(500).json({ error: `Model ${model} is currently unreachable. Please try a different model.` });
  }
});

// Endpoint to handle image-based interactions
app.post('/api/chat/v3', async (req, res) => {
  const { messages, image_url } = req.body;
  let response = '';
  try {
    const result = await groqClient.chat.completions.create({
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": messages
            },
            {
              "type": "image_url",
              "image_url": {
                "url": image_url
              }
            }
          ]
        }
      ],
      "model": "llama-3.2-11b-vision-preview",
      "temperature": 1,
      "max_tokens": 2048,
      "top_p": 1,
      "stream": false,
      "stop": null
    });
    response = result.choices[0]?.message?.content || 'No response generated.';
    res.json({ response });
  } catch (error) {
    console.error('Error with image-based API:', error.message);
    res.status(500).json({ error: `Image-based model is currently unreachable. Please try again later or use a different model.` });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});