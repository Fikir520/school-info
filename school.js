let API_KEY = localStorage.getItem('sd_key') || ''; 

const DEFAULT_SCHOOL = "Addis Ababa Academy";
const DEFAULT_KB = `
- Registrar Office: Room 102. Hours: Mon-Fri, 8:30 AM - 5:00 PM.
- Transcripts: Request via portal. Processing takes 3-5 business days.
- Library: North Block. Open 8:00 AM - 10:00 PM.
- Deadlines: Registration ends this Friday.
- Facilities: Cafeteria is in the East Wing.
`;

let SCHOOL_NAME = localStorage.getItem('sd_school') || DEFAULT_SCHOOL;
let KNOWLEDGE_BASE = localStorage.getItem('sd_kb') || DEFAULT_KB;
let conversationHistory = [];
let savedChatLog = JSON.parse(localStorage.getItem('sd_persistent_log')) || [];

window.addEventListener('load', () => {
    document.getElementById('schoolBadge').textContent = SCHOOL_NAME;
    renderHistoryDrawer();
});

function handleLogin(role) {
    if (role === 'admin') {
        const pass = prompt("Enter Admin Password:");
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
            alert("Please login as Admin and enter an OpenRouter API Key.");
            return;
        }
        document.getElementById('loginGate').style.display = 'none';
        document.getElementById('chatInterface').style.display = 'flex';
    }
}

function saveSetup() {
    const keyInput = document.getElementById('apiKeyInput').value.trim();
    const nameInput = document.getElementById('schoolNameInput').value.trim();
    const kbInput = document.getElementById('knowledgeInput').value.trim();

    if (!keyInput) {
        alert("API Key is required.");
        return;
    }

    API_KEY = keyInput;
    SCHOOL_NAME = nameInput || DEFAULT_SCHOOL;
    KNOWLEDGE_BASE = kbInput || DEFAULT_KB;

    localStorage.setItem('sd_key', API_KEY);
    localStorage.setItem('sd_school', SCHOOL_NAME);
    localStorage.setItem('sd_kb', KNOWLEDGE_BASE);

    document.getElementById('schoolBadge').textContent = SCHOOL_NAME;
    document.getElementById('setupOverlay').style.display = 'none';
    document.getElementById('chatInterface').style.display = 'flex';
}

function askQuestion(text) {
    const input = document.getElementById('userInput');
    input.value = text;
    autoResize(input);
    sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text || !API_KEY) return;

    const welcome = document.getElementById('welcomeCard');
    if (welcome) welcome.style.display = 'none';

    addMessage('user', text);
    logToHistoryData('user', text);
    input.value = '';
    input.style.height = 'auto';

    const systemPrompt = `You are the SchoolDesk AI for ${SCHOOL_NAME}. Use this knowledge: ${KNOWLEDGE_BASE}. If unsure, tell them to visit the Registrar.`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                "model": "openrouter/free",
                "messages": [
                    { "role": "system", "content": systemPrompt },
                    ...conversationHistory.map(msg => ({
                        role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.parts ? msg.parts[0].text : msg.content
                    })),
                    { "role": "user", "content": text }
                ]
            })
        });

        const data = await response.json();
        const botReply = data.choices[0].message.content;
        
        conversationHistory.push({ role: 'user', parts: [{ text: text }] });
        conversationHistory.push({ role: 'model', parts: [{ text: botReply }] });

        logToHistoryData('bot', botReply);
        addMessage('bot', botReply);
    } catch (err) {
        addMessage('bot', "❌ Error connecting to OpenRouter.");
    }
}

function addMessage(role, text) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `msg-row ${role}`;
    div.innerHTML = `<div class="bubble ${role}">${text}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function logToHistoryData(sender, text) {
    savedChatLog.push({ sender, text, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    localStorage.setItem('sd_persistent_log', JSON.stringify(savedChatLog));
    renderHistoryDrawer();
}

function renderHistoryDrawer() {
    const container = document.getElementById('historyDrawerLog');
    if (!container) return;
    container.innerHTML = '';
    
    if (savedChatLog.length === 0) {
        container.innerHTML = `<p style="color: var(--text-faint); text-align: center; margin-top: 20px;">No saved history found.</p>`;
        return;
    }

    savedChatLog.forEach(item => {
        const div = document.createElement('div');
        div.className = `history-item ${item.sender}`;
        div.innerHTML = `<strong>${item.sender === 'user' ? 'You' : 'Assistant'}</strong> <span style="font-size:10px; color:var(--text-faint); float:right;">${item.timestamp}</span><p style="margin-top:4px;">${item.text}</p>`;
        container.appendChild(div);
    });
}

function toggleHistoryDrawer() {
    const drawer = document.getElementById('historyDrawer');
    if (drawer.style.display === 'none') {
        drawer.style.display = 'flex';
    } else {
        drawer.style.display = 'none';
    }
}

function clearSavedHistory() {
    if (confirm("Are you sure you want to permanently clear your chat logs?")) {
        savedChatLog = [];
        localStorage.removeItem('sd_persistent_log');
        renderHistoryDrawer();
    }
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}
