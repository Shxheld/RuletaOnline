require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.static('public'));

const io = require('socket.io')(http, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ==== BASE DE DATOS POSTGRES ====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========== CREACIÓN DE TABLA SI NO EXISTE Y ARRANQUE ==========

async function startServer() {
  try {
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
    console.log('Tabla "apuestas" verificada y base conectada');

    // ========== SISTEMA DE JUGADORES Y APUESTAS ==========

    let jugadores = [];

    io.on('connection', socket => {
      let jugadorActual = null;

      // Al conectar, envía el estado actual (jugadores solo memoria, apuestas desde DB)
      (async () => {
        try {
          const apuestas = await cargarApuestas();
          socket.emit('update', { jugadores, apuestas });
        } catch (e) {
          console.error('Error al cargar apuestas en conexión:', e);
        }
      })();

      socket.on('registro', data => {
        jugadorActual = { id: socket.id, name: data.nombre, saldo: data.saldo };
        if (!jugadores.find(j => j.id === socket.id)) {
          jugadores.push(jugadorActual);
          emitirEstado();
        }
      });

      socket.on('apostar', async data => {
        try {
          await borrarApuestasPorJugador(socket.id);
          for (const ap of (data.apuestas || [])) {
            await guardarApuesta({
              ...ap,
              player: data.nombre,
              playerId: socket.id
            });
          }
          await emitirEstado();
        } catch (e) {
          console.error('Error al apostar:', e);
        }
      });

      socket.on('resultado', async data => {
        try {
          io.emit('resultado', data);
          await borrarApuestas();
          await emitirEstado();
        } catch (e) {
          console.error('Error al resetear apuestas:', e);
        }
      });

      socket.on('disconnect', async () => {
        try {
          jugadores = jugadores.filter(j => j.id !== socket.id);
          await borrarApuestasPorJugador(socket.id);
          await emitirEstado();
        } catch (e) {
          console.error('Error al desconectar jugador:', e);
        }
      });

      async function emitirEstado() {
        try {
          const apuestas = await cargarApuestas();
          io.emit('update', { jugadores, apuestas });
        } catch (e) {
          console.error('Error emitiendo estado:', e);
        }
      }
    });

    // ==== RUTA PRINCIPAL ====
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'host.html'));
    });

    const PORT = process.env.PORT || 8080;
    http.listen(PORT, () => console.log('Servidor en puerto', PORT));

  } catch (err) {
    console.error('Error al inicializar base de datos:', err);
    process.exit(1);
  }
}

// ========== FUNCIONES AUXILIARES PARA LA BASE ==========

async function cargarApuestas() {
  const { rows } = await pool.query('SELECT * FROM apuestas');
  return rows;
}

async function borrarApuestas() {
  await pool.query('DELETE FROM apuestas');
}

async function borrarApuestasPorJugador(playerId) {
  await pool.query('DELETE FROM apuestas WHERE playerid = $1', [playerId]);
}

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

// ========== ARRANQUE SEGURO ==========
startServer();
