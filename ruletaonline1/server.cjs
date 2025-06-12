const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*"
  }
});
const { Pool } = require('pg');

// Conexión a la base de datos PostgreSQL (Railway te da DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(express.static('public'));

let jugadores = []; // Estado en memoria, solo para usuarios conectados

// 1. Obtener todas las apuestas de la base de datos
async function getApuestas() {
  const result = await pool.query('SELECT * FROM apuestas');
  return result.rows;
}

// 2. Guardar o actualizar apuestas de un jugador
async function saveApuestas(playerId, playerName, apuestasList) {
  await pool.query('DELETE FROM apuestas WHERE player_id = $1', [playerId]);
  for (const ap of apuestasList) {
    await pool.query(
      'INSERT INTO apuestas (player_id, player_name, monto, tipo, valor) VALUES ($1, $2, $3, $4, $5)',
      [playerId, playerName, ap.monto, ap.tipo, ap.valor]
    );
  }
}

// 3. Borrar todas las apuestas (al finalizar ronda)
async function clearApuestas() {
  await pool.query('DELETE FROM apuestas');
}

io.on('connection', socket => {
  let jugadorActual = null;

  // Cuando alguien se registra (host o jugador)
  socket.on('registro', async data => {
    jugadorActual = { id: socket.id, name: data.nombre, saldo: data.saldo };
    if (!jugadores.find(j => j.id === socket.id)) {
      jugadores.push(jugadorActual);
    }
    await emitirEstado(); // Actualiza a todos
  });

  // Cuando alguien apuesta
  socket.on('apostar', async data => {
    await saveApuestas(socket.id, data.nombre, data.apuestas || []);
    await emitirEstado();
  });

  // Cuando el host pide el estado actual (por si refresca la página)
  socket.on('get_estado', async () => {
    await emitirEstado();
  });

  // Cuando termina la ronda (host manda resultado)
  socket.on('resultado', async data => {
    io.emit('resultado', data);
    await clearApuestas(); // Limpia apuestas para la siguiente ronda
    await emitirEstado();
  });

  // Cuando alguien se desconecta
  socket.on('disconnect', async () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    await pool.query('DELETE FROM apuestas WHERE player_id = $1', [socket.id]);
    await emitirEstado();
  });

  // Emitir estado a todos los clientes conectados
  async function emitirEstado() {
    const apuestas = await getApuestas();
    io.emit('update', { jugadores, apuestas });
  }
});

// Puerto dinámico para Railway
const PORT = process.env.PORT || 8080;
http.listen(PORT, () => console.log('Servidor corriendo en puerto', PORT));
