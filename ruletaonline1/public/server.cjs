require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);

const cors = require('cors');
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));

const io = require('socket.io')(http, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const path = require('path');
const { Pool } = require('pg');

// Sirve archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Redirige la raíz a host.html o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

// ==== BASE DE DATOS POSTGRES ====
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========== FUNCIONES AUXILIARES PARA LA BASE ==========

// Devuelve TODAS las apuestas actuales desde la base
async function cargarApuestas() {
  const { rows } = await pool.query('SELECT * FROM apuestas');
  return rows;
}

// Borra todas las apuestas de todos los jugadores (tras resultado)
async function borrarApuestas() {
  await pool.query('DELETE FROM apuestas');
}

// Borra las apuestas de un jugador por su playerId
async function borrarApuestasPorJugador(playerId) {
  await pool.query('DELETE FROM apuestas WHERE playerid = $1', [playerId]);
}

// Agrega una apuesta a la base
async function guardarApuesta(apuesta) {
  await pool.query(
    `INSERT INTO apuestas (player, playerid, monto, tipo, valor, fichaidx, casilla)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      apuesta.player,
      apuesta.playerId,
      apuesta.monto,
      apuesta.tipo,
      apuesta.valor,
      apuesta.fichaIdx ?? null,
      apuesta.casilla ?? null
    ]
  );
}

// ========== SISTEMA DE JUGADORES Y APUESTAS ==========

let jugadores = [];

// Al iniciar el servidor, no cargamos jugadores (solo apuestas se guardan en la base)

io.on('connection', socket => {
  let jugadorActual = null;

  // Al conectar, envía el estado actual (jugadores solo memoria, apuestas desde DB)
  (async () => {
    const apuestas = await cargarApuestas();
    socket.emit('update', { jugadores, apuestas });
  })();

  socket.on('registro', data => {
    jugadorActual = { id: socket.id, name: data.nombre, saldo: data.saldo };
    if (!jugadores.find(j => j.id === socket.id)) {
      jugadores.push(jugadorActual);
      emitirEstado();
    }
  });

  socket.on('apostar', async data => {
    // Borra las apuestas previas del jugador y guarda las nuevas
    await borrarApuestasPorJugador(socket.id);
    for (const ap of (data.apuestas || [])) {
      await guardarApuesta({
        ...ap,
        player: data.nombre,
        playerId: socket.id
      });
    }
    await emitirEstado();
  });

  socket.on('resultado', async data => {
    io.emit('resultado', data);
    await borrarApuestas();
    await emitirEstado();
  });

  socket.on('disconnect', async () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    await borrarApuestasPorJugador(socket.id);
    await emitirEstado();
  });

  async function emitirEstado() {
    const apuestas = await cargarApuestas();
    io.emit('update', { jugadores, apuestas });
  }
});

// ========== CREACIÓN DE TABLA SI NO EXISTE ==========

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS apuestas (
      id SERIAL PRIMARY KEY,
      player TEXT,
      playerid TEXT,
      monto INT,
      tipo TEXT,
      valor TEXT,
      fichaidx INT,
      casilla TEXT
    )
  `);
  console.log('Tabla "apuestas" verificada');
})();

const PORT = process.env.PORT || 8080;
http.listen(PORT, () => console.log('Servidor en puerto', PORT));
