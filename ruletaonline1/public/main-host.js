// ========== main-host.js mejorado (giro realista, flecha a la izquierda, sin rebote) ==========

const socket = io();

const WHEEL_ORDER = [
  "0","28","9","26","30","11","7","20","32","17","5","22","34","15","3","24","36","13","1","00",
  "27","10","25","29","12","8","19","31","18","6","21","33","16","4","23","35","14","2"
];
const WHEEL_COLORS = {
  "0": "green", "00": "green",
  "28": "black", "9": "red", "26": "black", "30": "red", "11": "black", "7": "red",
  "20": "black", "32": "red", "17": "black", "5": "red", "22": "black", "34": "red", "15": "black",
  "3": "red", "24": "black", "36": "red", "13": "black", "1": "red",
  "27": "red", "10": "black", "25": "red", "29": "black", "12": "red", "8": "black",
  "19": "red", "31": "black", "18": "red", "6": "black", "21": "red", "33": "black",
  "16": "red", "4": "black", "23": "red", "35": "black", "14": "red", "2": "black"
};

const canvas = document.getElementById('ruleta');
const ctx = canvas.getContext('2d');
const cx = canvas.width/2, cy = canvas.height/2, R = canvas.width/2-20;
const ruletaResultado = document.getElementById('ruleta-resultado');
const jugadoresLista = document.getElementById('jugadores-lista');
const apuestasLista = document.getElementById('apuestas-lista');
const playerCount = document.getElementById('playerCount');
const girarBtn = document.getElementById('girarBtn');
const tickAudio = document.getElementById('tick-audio');
const flecha = document.getElementById('flecha-indicador');

let apuestasActuales = [];
let jugadores = [];
let ruletaGirando = false;

// ========== FLECHA EN EL BORDE IZQUIERDO (9 EN PUNTO, 180 grados) ==========
function updateFlecha() {
  flecha.style.position = "absolute";
  flecha.style.width = "0";
  flecha.style.height = "0";
  flecha.style.borderTop = "18px solid transparent";
  flecha.style.borderBottom = "18px solid transparent";
  flecha.style.borderRight = "38px solid #fff";
  flecha.style.left = "calc(50% - 330px)";
  flecha.style.top = "50%";
  flecha.style.transform = "translate(-50%, -50%) rotate(180deg)";
  flecha.style.zIndex = "12";
  flecha.style.filter = "drop-shadow(0 2px 8px #fff)";
}
updateFlecha();

// Slider de opacidad funcional
const opacitySlider = document.getElementById('opacity-slider');
function setBgOpacity(val) {
  document.body.style.setProperty('--bg-opacity', val);
}
if (opacitySlider) {
  opacitySlider.addEventListener('input', e => setBgOpacity(e.target.value));
  setBgOpacity(opacitySlider.value);
}

// Centrado absoluto de la ruleta (tanto vertical como horizontal)
function centerRuletaContainer() {
  const main = document.querySelector('.casino-main.host-center');
  if (main) {
    main.style.justifyContent = 'center';
    main.style.alignItems = 'center';
    main.style.height = 'calc(100vh - 70px)';
  }
}
centerRuletaContainer();

// ========== DIBUJA RULETA ==========

function drawRuleta(angle=0) {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Fondo exterior redondo
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx,cy,R+18,0,2*Math.PI);
  ctx.fillStyle = "#181a23";
  ctx.fill();
  ctx.lineWidth = 16;
  ctx.strokeStyle = "#ffd700";
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();

  // Casillas
  const n = WHEEL_ORDER.length;
  for(let i=0; i<n; i++) {
    let a0 = angle + (i/n)*2*Math.PI;
    let a1 = angle + ((i+1)/n)*2*Math.PI;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx,cy,R,a0,a1,false);
    ctx.arc(cx,cy,R-60,a1,a0,true);
    ctx.closePath();
    ctx.fillStyle =
      WHEEL_ORDER[i] === "0" || WHEEL_ORDER[i] === "00"
        ? "#39ea92"
        : (WHEEL_COLORS[WHEEL_ORDER[i]]==="red" ? "#ff637a" : "#23253b");
    ctx.fill();
    ctx.restore();

    // Número
    ctx.save();
    let a = (a0+a1)/2;
    ctx.translate(cx + Math.cos(a)*(R-40), cy + Math.sin(a)*(R-40));
    ctx.rotate(a-Math.PI/2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 1.5em Montserrat, Arial, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#181a23";
    ctx.shadowBlur = 5;
    ctx.fillText(WHEEL_ORDER[i], 0, 0);
    ctx.restore();
  }

  // Centro moderno
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx,cy,R-80,0,2*Math.PI);
  let grad = ctx.createRadialGradient(cx,cy,40,cx,cy,R-80);
  grad.addColorStop(0,"#222b38");
  grad.addColorStop(0.7,"#23253b");
  grad.addColorStop(1,"#181a23");
  ctx.fillStyle = grad;
  ctx.shadowColor = "#ffd70055";
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.restore();

  // Eje central pequeño
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx,cy,16,0,2*Math.PI);
  ctx.fillStyle = "#ffd700";
  ctx.shadowColor = "#ffd700cc";
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.restore();
}
drawRuleta();

// ========== JUGADORES Y APUESTAS ==========

function renderJugadores() {
  jugadoresLista.innerHTML = jugadores.map(j => `<li>${j.name}</li>`).join('');
  playerCount.textContent = jugadores.length;
}
function renderApuestas() {
  if (!apuestasActuales.length) {
    apuestasLista.innerHTML = "<i>Sin apuestas aún</i>";
    return;
  }
  apuestasLista.innerHTML = apuestasActuales.map(ap => 
    `<li><b>${ap.player}</b>: ${ap.monto} a ${ap.tipo=="numero"?ap.valor:("zona "+ap.valor)}</li>`
  ).join('');
}
socket.on('update', data => {
  jugadores = data.jugadores;
  apuestasActuales = data.apuestas;
  renderJugadores();
  renderApuestas();
});

// ========== SONIDO "TICK" ==========
// (el sonido tick.mp3 debe estar en la misma carpeta)
function playTick() {
  if (!tickAudio) return;
  tickAudio.pause();
  tickAudio.currentTime = 0;
  tickAudio.volume = 0.18;
  tickAudio.play();
}

// ========== ANIMACIÓN DE GIRO REALISTA (suave, sin rebote) ==========

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function girarRuleta() {
  if(ruletaGirando) return;
  if (!apuestasActuales.length) {
    ruletaResultado.innerText = "No hay apuestas.";
    return;
  }
  ruletaGirando = true;
  girarBtn.disabled = true;
  ruletaResultado.innerText = "Girando...";

  let idx = Math.floor(Math.random()*WHEEL_ORDER.length);
  let ganador = WHEEL_ORDER[idx];
  const n = WHEEL_ORDER.length;

  // Flecha a la IZQUIERDA (9 en punto = PI radianes)
  // Queremos que el centro del sector ganador quede en PI radianes.
  const angTarget = Math.PI - ((idx + 0.5)/n)*2*Math.PI;

  // Giro: vueltas iniciales, desaceleración muy suave al final
  const vueltas = 5 + Math.random()*1.2;
  const angStart = 2*Math.PI*vueltas + angTarget;

  const t0 = Date.now();
  const duracion = 8500; // 8.5 segundos para giro realista y lento
  let stopped = false;
  let lastSector = null;

  function animate() {
    if (stopped) return;
    let t = Date.now()-t0;
    let frac = Math.min(t/duracion,1);
    let ease = easeOutCubic(frac); // Suave, sin rebote
    let ang = angStart*(1-ease) + angTarget*ease;

    // Sonido "tick" por sector
    let nSectores = WHEEL_ORDER.length;
    let ruletaAngle = ((ang % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
    let raw = (nSectores - (ruletaAngle * nSectores/(2*Math.PI))) % nSectores;
    let sector = Math.floor(raw);
    if (lastSector === null) lastSector = sector;
    if (sector !== lastSector) {
      playTick();
      lastSector = sector;
    }

    drawRuleta(ang);

    if(frac<1) {
      requestAnimationFrame(animate);
    } else {
      stopped = true;
      drawRuleta(angTarget);
      mostrarResultado(idx);
      ruletaGirando = false;
      girarBtn.disabled = false;
      socket.emit('resultado', {ganador, idx});
      setTimeout(()=>{
        apuestasActuales = [];
        renderApuestas();
        ruletaResultado.innerText = "";
      }, 4000);
    }
  }
  animate();
}

girarBtn.onclick = girarRuleta;

function mostrarResultado(idx) {
  ruletaResultado.innerText = `¡Ganó el número ${WHEEL_ORDER[idx]}!`;
}