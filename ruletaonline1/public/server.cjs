const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

// Sirve archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Opcional: redirige la raíz a host.html o index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/host.html');
});

let jugadores = [];
let apuestas = [];

// Archivo donde se guardan las apuestas persistentes
const APU_FILE = path.join(__dirname, 'apuestas.json');

// Cargar apuestas al iniciar el servidor (si el archivo existe)
if (fs.existsSync(APU_FILE)) {
  try {
    apuestas = JSON.parse(fs.readFileSync(APU_FILE, 'utf8'));
  } catch (e) {
    console.error('Error leyendo apuestas.json:', e);
    apuestas = [];
  }
}

// Función para guardar apuestas cada vez que cambian
function guardarApuestas() {
  fs.writeFile(APU_FILE, JSON.stringify(apuestas, null, 2), err => {
    if (err) console.error('Error guardando apuestas.json:', err);
  });
}

io.on('connection', socket => {
  let jugadorActual = null;

  socket.on('registro', data => {
    jugadorActual = { id: socket.id, name: data.nombre, saldo: data.saldo };
    if (!jugadores.find(j => j.id === socket.id)) {
      jugadores.push(jugadorActual);
      emitirEstado();
    }
  });

  socket.on('apostar', data => {
    // Guarda apuestas y emite estado
    apuestas = apuestas.filter(a => a.playerId !== socket.id);
    (data.apuestas || []).forEach(ap => {
      apuestas.push({ ...ap, player: data.nombre, playerId: socket.id, monto: ap.monto, tipo: ap.tipo, valor: ap.valor });
    });
    guardarApuestas(); // <-- GUARDAR
    emitirEstado();
  });

  socket.on('resultado', data => {
    io.emit('resultado', data);
    // Reset apuestas tras el giro
    apuestas = [];
    guardarApuestas(); // <-- GUARDAR
    emitirEstado();
  });

  socket.on('disconnect', () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    apuestas = apuestas.filter(a => a.playerId !== socket.id);
    guardarApuestas(); // <-- GUARDAR
    emitirEstado();
  });

  function emitirEstado() {
    io.emit('update', { jugadores, apuestas });
  }
});

const PORT = process.env.PORT || 8080;
http.listen(PORT, () => console.log('Servidor en puerto', PORT));
console.log('Usando versión persistente de apuestas')
