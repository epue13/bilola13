const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (Dashboard HTML)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Estado em memória RAM 
let jobIdsQueue = [];
let activeBots = {};

// Função auxiliar para eleger o Líder (Bot ativo com o maior número)
function getDesignatedScraper() {
    const now = Date.now();
    let maxNum = -1;
    let leaderName = null;

    for (const [name, info] of Object.entries(activeBots)) {
        // Se o ping tiver mais de 25s, consideramos morto/crashado
        if (now - info.lastPing <= 25000) {
            // Extrai o número do nome (ex: BeriSahur15 -> 15)
            const match = name.match(/\d+/);
            const num = match ? parseInt(match[0], 10) : 0;
            if (num > maxNum) {
                maxNum = num;
                leaderName = name;
            }
        }
    }
    return leaderName;
}

// ==========================================
// ROTAS DA API PROS EMULADORES
// ==========================================

// 1. O Líder envia os 100 JobIds novos
app.post('/api/jobids', (req, res) => {
    const newIds = req.body.jobIds || [];
    let added = 0;
    
    const queueSet = new Set(jobIdsQueue);
    newIds.forEach(id => {
        if (!queueSet.has(id)) {
            jobIdsQueue.push(id);
            added++;
        }
    });
    
    console.log(`[API] Fila atualizada por ${req.body.botName}: +${added} JobIds | Total: ${jobIdsQueue.length}`);
    res.json({ success: true, added, total: jobIdsQueue.length });
});

// 2. Bots normais pedem 1 JobId pra hoppar
app.get('/api/jobids/pop', (req, res) => {
    if (jobIdsQueue.length === 0) {
        return res.json({ success: false, jobId: null, message: "Fila vazia!" });
    }
    
    const maxIdx = Math.min(15, jobIdsQueue.length);
    const pickIdx = Math.floor(Math.random() * maxIdx);
    const chosenJobId = jobIdsQueue.splice(pickIdx, 1)[0];
    
    res.json({ success: true, jobId: chosenJobId, remaining: jobIdsQueue.length });
});

// 3. Heartbeat & Elegendo o Líder
app.post('/api/heartbeat', (req, res) => {
    const { botName, status } = req.body;
    
    if (botName) {
        activeBots[botName] = {
            status: status || 'Ativo',
            lastPing: Date.now()
        };
    }
    
    // O pulo do gato: A nuvem diz quem deve raspar a API
    const leader = getDesignatedScraper();
    const isScraper = (botName === leader);
    
    res.json({ success: true, isScraper: isScraper, queueSize: jobIdsQueue.length });
});

// 4. Painel lê os dados pra renderizar a tela
app.get('/api/status', (req, res) => {
    res.json({
        queueSize: jobIdsQueue.length,
        bots: activeBots,
        leader: getDesignatedScraper()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[VEX CORE] Servidor Sitezera Ativo na porta ${PORT}`);
});
