const express = require('express');
const axios = require('axios');
const pdf = require('pdf-parse');
const { pipeline } = require('@xenova/transformers');
const faiss = require('faiss-node');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

dotenv.config();

const upload = multer({ dest: '/tmp' });

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 8080;

// === Load API Key ===
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

let systemPrompt = `You are a helpful assistant.`;

app.post('/hackrx/update-prompt', (req, res) => {
    const { prompt } = req.body;
    if (prompt) {
        systemPrompt = prompt;
        res.status(200).json({ message: 'Prompt updated successfully.' });
    } else {
        res.status(400).json({ error: 'Invalid prompt.' });
    }
});

app.post('/hackrx/create-resume', upload.single('resumePdf'), async (req, res) => {
    const { jobDescription } = req.body;
    const resumePdf = req.file;

    if (!jobDescription || !resumePdf) {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    let pdfPath = resumePdf.path;
    try {
        if (!NVIDIA_API_KEY) {
            return res.status(500).json({ error: 'NVIDIA API key not configured.' });
        }

        const dataBuffer = fs.readFileSync(pdfPath);
        const { text } = await pdf(dataBuffer);

        const nvidia_llm_call = async (context, question, api_key) => {
            const url = "https://integrate.api.nvidia.com/v1/chat/completions";
            const headers = {
                "Authorization": `Bearer ${api_key}`,
                "Accept": "application/json"
            };
            const messages = [
                {"role": "system", "content": systemPrompt},
                {"role": "user", "content": `Resume Text:\n${context}\n\nJob Description:\n${question}`}
            ];
            const payload = {
                "model": "meta/llama-4-maverick-17b-128e-instruct",
                "messages": messages,
                "max_tokens": 2048,
                "temperature": 0.3,
                "top_p": 1.0,
                "frequency_penalty": 0.0,
                "presence_penalty": 0.0,
                "stream": false
            };
            const response = await axios.post(url, payload, { headers });
            if (response.status === 200) {
                return response.data.choices[0].message.content.trim();
            } else {
                throw new Error(`NVIDIA API error: ${response.statusText}`);
            }
        };

        const llmResponse = await nvidia_llm_call(text, jobDescription, NVIDIA_API_KEY);
        res.send(llmResponse);

    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    } finally {
        if (pdfPath && fs.existsSync(pdfPath)) {
            try {
                fs.unlinkSync(pdfPath);
            } catch (cleanupError) {
                console.warn(`Cleanup failed: ${cleanupError}`);
            }
        }
    }
});

app.get('/', (req, res) => {
    res.send('Express server is running');
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;
