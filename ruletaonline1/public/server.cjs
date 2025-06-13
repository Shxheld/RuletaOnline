const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let jugadores = [];
let apuestas = [];

/**
 * Devuelve el estado actual a todos los clientes
 */
function emitirEstado() {
  io.emit('update', { jugadores, apuestas });
}

io.on('connection', socket => {
  let jugadorActual = null;

  // Registro de jugador
  socket.on('registro', data => {
    jugadorActual = { id: socket.id, name: data.nombre, saldo: data.saldo };
    // Actualizar saldo si el jugador ya existe, o agregarlo
    const existente = jugadores.find(j => j.id === socket.id);
    if (!existente) {
      jugadores.push(jugadorActual);
    } else {
      existente.saldo = data.saldo;
      existente.name = data.nombre;
    }
    emitirEstado();
    // Al conectarse, envía el estado solo a este cliente también
    socket.emit('update', { jugadores, apuestas });
  });

  // Nueva apuesta (sobrescribe las apuestas de este jugador)
  socket.on('apostar', data => {
    // Borra las apuestas previas de este jugador
    apuestas = apuestas.filter(a => a.playerId !== socket.id);
    (data.apuestas || []).forEach(ap => {
      apuestas.push({ ...ap, player: data.nombre, playerId: socket.id, monto: ap.monto, tipo: ap.tipo, valor: ap.valor });
    });
    emitirEstado();
  });

  // Resultado de la ruleta
  socket.on('resultado', data => {
    io.emit('resultado', data);
    // Reset apuestas tras el giro
    apuestas = [];
    emitirEstado();
  });

  // Desconexión
  socket.on('disconnect', () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    apuestas = apuestas.filter(a => a.playerId !== socket.id);
    emitirEstado();
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Servidor en puerto', PORT));
