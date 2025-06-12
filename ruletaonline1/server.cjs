const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { Pool } = require('pg');

// Usa la URL de la variable de entorno (Railway la inyecta automáticamente)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(express.static('public'));

let jugadores = [];

async function getApuestas() {
  const result = await pool.query('SELECT * FROM apuestas');
  return result.rows;
}

async function saveApuestas(playerId, playerName, apuestasList) {
  await pool.query('DELETE FROM apuestas WHERE player_id = $1', [playerId]);
  for (const ap of apuestasList) {
    await pool.query(
      'INSERT INTO apuestas (player_id, player_name, monto, tipo, valor) VALUES ($1, $2, $3, $4, $5)',
      [playerId, playerName, ap.monto, ap.tipo, ap.valor]
    );
  }
}

async function clearApuestas() {
  await pool.query('DELETE FROM apuestas');
}

io.on('connection', socket => {
  let jugadorActual = null;

  socket.on('registro', async data => {
    jugadorActual = { id: socket.id, name: data.nombre, saldo: data.saldo };
    if (!jugadores.find(j => j.id === socket.id)) {
      jugadores.push(jugadorActual);
      await emitirEstado();
    }
  });

  socket.on('apostar', async data => {
    await saveApuestas(socket.id, data.nombre, data.apuestas || []);
    await emitirEstado();
  });

  socket.on('resultado', async data => {
    io.emit('resultado', data);
    await clearApuestas();
    await emitirEstado();
  });

  socket.on('disconnect', async () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    await pool.query('DELETE FROM apuestas WHERE player_id = $1', [socket.id]);
    await emitirEstado();
  });

  async function emitirEstado() {
    const apuestas = await getApuestas();
    io.emit('update', { jugadores, apuestas });
  }
});

const PORT = process.env.PORT || 8080;
http.listen(PORT, () => console.log('Servidor en puerto', PORT));
