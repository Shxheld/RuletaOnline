const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*"
  }
});

app.use(express.static('public'));

let jugadores = []; // Estado en memoria
let apuestas = []; // Estado en memoria

io.on('connection', socket => {
  let jugadorActual = null;

  // Registro de jugador
  socket.on('registro', data => {
    jugadorActual = { id: socket.id, name: data.nombre, saldo: data.saldo };
    if (!jugadores.find(j => j.id === socket.id)) {
      jugadores.push(jugadorActual);
    }
    emitirEstado();
  });

  // Nueva apuesta (sobrescribe las apuestas de este jugador)
  socket.on('apostar', data => {
    // Elimina apuestas previas de este jugador
    apuestas = apuestas.filter(a => a.playerId !== socket.id);
    (data.apuestas || []).forEach(ap => {
      apuestas.push({ ...ap, player: data.nombre, playerId: socket.id, monto: ap.monto, tipo: ap.tipo, valor: ap.valor });
    });
    emitirEstado();
  });

  // Cuando el host pide el estado actual
  socket.on('get_estado', () => {
    emitirEstado();
  });

  // Resultado de la ruleta (limpia apuestas)
  socket.on('resultado', data => {
    io.emit('resultado', data);
    apuestas = [];
    emitirEstado();
  });

  // Desconexión
  socket.on('disconnect', () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    apuestas = apuestas.filter(a => a.playerId !== socket.id);
    emitirEstado();
  });

  // Emitir estado a todos los clientes conectados
  function emitirEstado() {
    io.emit('update', { jugadores, apuestas });
  }
});

// Puerto dinámico para Railway
const PORT = process.env.PORT || 8080;
http.listen(PORT, () => console.log('Servidor corriendo en puerto', PORT));
