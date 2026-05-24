let API_KEY = '';
let SCHOOL_NAME = '';
let KNOWLEDGE_BASE = '';
let conversationHistory = [];

window.addEventListener('load', () => {
    const savedKey = localStorage.getItem('sd_key');
    const savedSchool = localStorage.getItem('sd_school');
    const savedKB = localStorage.getItem('sd_kb');

    if (savedKey && savedSchool) {
        API_KEY = savedKey;
        SCHOOL_NAME = savedSchool;
        KNOWLEDGE_BASE = savedKB;
        document.getElementById('schoolBadge').textContent = SCHOOL_NAME;
          }
});

function handleLogin(role) {
    if (role === 'admin') {
        const pass = prompt("Enter Admin Password (default: admin123):");
        if (pass === 'admin123') {
            document.getElementById('loginGate').style.display = 'none';
            document.getElementById('setupOverlay').style.display = 'flex';
          
            document.getElementById('apiKeyInput').value = API_KEY;
            document.getElementById('schoolNameInput').value = SCHOOL_NAME;
            document.getElementById('knowledgeInput').value = KNOWLEDGE_BASE;
        } else {
            alert("Unauthorized.");
        }
    } else {
        if (!API_KEY) {
            alert("School not configured! Please login as Admin first.");
            return;
        }
        document.getElementById('loginGate').style.display = 'none';
       
        document.querySelector('.layout').style.display = 'flex'; 
    }
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text || !API_KEY) return;

    addMessage('user', text);
    input.value = '';
    
    const systemInstruction = `You are the official SchoolDesk AI for ${SCHOOL_NAME}. 
    Use this Knowledge Base to answer: ${KNOWLEDGE_BASE}. 
    If the answer isn't in the knowledge base, say: "I'm sorry, I don't have that information. Please visit the Registrar in person."`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: "Context: " + systemInstruction }]
            },
            ...conversationHistory,
            {
                role: "user",
                parts: [{ text: text }]
            }
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);

        const botReply = data.candidates[0].content.parts[0].text;
        
    
        conversationHistory.push({ role: 'user', parts: [{ text: text }] });
        conversationHistory.push({ role: 'model', parts: [{ text: botReply }] });

        addMessage('bot', botReply);
    } catch (err) {
        addMessage('bot', "❌ Connection Error: " + err.message);
        console.error("API Failure:", err);
    }
}


function addMessage(role, text) {
    const msgContainer = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `msg-row ${role}`;
    div.innerHTML = `<div class="bubble ${role}">${text}</div>`;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}