const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (Dashboard HTML)
app.use(express.static(path.join(__dirname, 'public')));

// Estado em memória RAM (Persiste pois o Render não desliga o Web Service)
let jobIdsQueue = [];
let activeBots = {};

// ==========================================
// ROTAS DA API PROS EMULADORES
// ==========================================

// 1. Bot extrator (epooooeAC) envia os 100 JobIds novos
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
    
    console.log(`[API] Fila atualizada: +${added} JobIds novos | Total estocado: ${jobIdsQueue.length}`);
    res.json({ success: true, added, total: jobIdsQueue.length });
});

// 2. Bots normais pedem 1 JobId pra hoppar (a cada 30s)
app.get('/api/jobids/pop', (req, res) => {
    if (jobIdsQueue.length === 0) {
        return res.json({ success: false, jobId: null, message: "Fila vazia!" });
    }
    
    // Pega 1 aleatório dos 15 primeiros pra evitar colisão entre bots simultâneos
    const maxIdx = Math.min(15, jobIdsQueue.length);
    const pickIdx = Math.floor(Math.random() * maxIdx);
    const chosenJobId = jobIdsQueue.splice(pickIdx, 1)[0];
    
    res.json({ success: true, jobId: chosenJobId, remaining: jobIdsQueue.length });
});

// 3. Heartbeat & Mudança de Status ("Vou Hoppar", "Ativo", etc)
app.post('/api/heartbeat', (req, res) => {
    const { botName, status } = req.body;
    
    if (botName) {
        activeBots[botName] = {
            status: status || 'Ativo',
            lastPing: Date.now()
        };
    }
    
    res.json({ success: true });
});

// 4. Painel lê os dados pra renderizar a tela
app.get('/api/status', (req, res) => {
    res.json({
        queueSize: jobIdsQueue.length,
        bots: activeBots
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[VEX CORE] Servidor Sitezera Ativo na porta ${PORT}`);
});
