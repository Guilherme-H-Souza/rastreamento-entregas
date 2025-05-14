const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const localizacoes = {};
const clientesPorPedido = {};

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const { tipo, pedidoId } = JSON.parse(msg);

    if (tipo === 'inscrever') {
      if (!clientesPorPedido[pedidoId]) {
        clientesPorPedido[pedidoId] = new Set();
      }
      clientesPorPedido[pedidoId].add(ws);

      if (localizacoes[pedidoId]) {
        ws.send(JSON.stringify({
          tipo: 'localizacao',
          pedidoId,
          ...localizacoes[pedidoId],
        }));
      }
    }
  });

  ws.on('close', () => {
    for (const set of Object.values(clientesPorPedido)) {
      set.delete(ws);
    }
  });
});

app.post('/atualizar-localizacao', (req, res) => {
  const { pedidoId, lat, lng } = req.body;
  if (!pedidoId) return res.status(400).send({ erro: 'pedidoId é obrigatório' });

  localizacoes[pedidoId] = { lat, lng };

  const clientes = clientesPorPedido[pedidoId] || new Set();
  clientes.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ tipo: 'localizacao', pedidoId, lat, lng }));
    }
  });

  res.send({ status: 'Localização atualizada', pedidoId });
});

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ Backend de rastreamento está funcionando!');
});

server.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
