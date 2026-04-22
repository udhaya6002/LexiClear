import fs from 'fs';

let API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const match = envContent.match(/GEMINI_API_KEY="?([^"\r\n]+)"?/);
    if (match && match[1]) {
      API_KEY = match[1].trim();
    }
  } catch (e) {
    // Ignore
  }
}

async function list() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

list();
