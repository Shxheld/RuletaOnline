const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let jugadores = [];
let apuestas = [];

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
    emitirEstado();
  });

  socket.on('resultado', data => {
    io.emit('resultado', data);
    // Reset apuestas tras el giro
    apuestas = [];
    emitirEstado();
  });

  socket.on('disconnect', () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    apuestas = apuestas.filter(a => a.playerId !== socket.id);
    emitirEstado();
  });

  function emitirEstado() {
    io.emit('update', { jugadores, apuestas });
  }
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Servidor en puerto', PORT));
