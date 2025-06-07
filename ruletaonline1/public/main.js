// ====== SLIDERS DE OPACIDAD DE FONDO ======
function setSlider(sliderId, overlayId) {
  const slider = document.getElementById(sliderId);
  const overlay = document.getElementById(overlayId);
  slider.addEventListener('input', function() {
    overlay.style.opacity = this.value;
  });
  // Inicializar valor
  overlay.style.opacity = slider.value;
}
setSlider("mainOpacity", "main-bg");
setSlider("ruletaOpacity", "ruleta-bg");
setSlider("slotOpacity", "slot-bg");

// ====== MENÚ PRINCIPAL Y FONDO DINÁMICO ======
const mainMenu = document.getElementById('main-menu');
const ruletaSection = document.getElementById('ruleta-section');
const slotSection = document.getElementById('slot-section');

function setBodyBg(section) {
  document.body.classList.remove('menu-principal', 'ruleta', 'slot');
  if (section === 'ruleta') {
    document.body.classList.add('ruleta');
  } else if (section === 'slot') {
    document.body.classList.add('slot');
  } else {
    document.body.classList.add('menu-principal');
  }
}

function showSection(section) {
  mainMenu.classList.remove('visible');
  ruletaSection.classList.remove('active');
  slotSection.classList.remove('active');
  setBodyBg(section);
  if(section === 'ruleta') {
    ruletaSection.classList.add('active');
  } else if(section === 'slot') {
    slotSection.classList.add('active');
  }
  updateSliders();
}
function showMenu() {
  setBodyBg('menu-principal');
  mainMenu.classList.add('visible');
  ruletaSection.classList.remove('active');
  slotSection.classList.remove('active');
  updateSliders();
}
document.getElementById('btn-ruleta').onclick = ()=>showSection('ruleta');
document.getElementById('btn-slot').onclick = ()=>showSection('slot');
document.getElementById('volverPrincipal1').onclick = showMenu;
document.getElementById('volverPrincipal2').onclick = showMenu;

// Actualiza la visibilidad de los sliders de opacidad según la sección
function updateSliders() {
  document.getElementById('main-slider').style.display = mainMenu.classList.contains('visible') ? 'block' : 'none';
  document.getElementById('ruleta-slider').style.display = ruletaSection.classList.contains('active') ? 'block' : 'none';
  document.getElementById('slot-slider').style.display = slotSection.classList.contains('active') ? 'block' : 'none';
}
updateSliders();

// ===== TICK DE RULETA =====
const tickAudio = new Audio('images/tick.mp3');
tickAudio.volume = 0.04;
function playTick() {
  tickAudio.pause();
  tickAudio.currentTime = 0;
  tickAudio.play();
}
function stopTick() {
  tickAudio.pause();
  tickAudio.currentTime = 0;
}

// ====== RULETA ======
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
const FICHAS = [
  {valor:10, color:"#fff", borde:"#dabd6f", rayas:"#ffe066", txt:"#222"},
  {valor:50, color:"#3da9fc", borde:"#ffe066", rayas:"#c1e7fb", txt:"#222"},
  {valor:100, color:"#23253b", borde:"#ffd700", rayas:"#ffd700", txt:"#fff"},
  {valor:500, color:"#00ffd0", borde:"#ffd700", rayas:"#fff", txt:"#222"},
  {valor:1000, color:"#ffd700", borde:"#00ffd0", rayas:"#fff", txt:"#222"},
];

let fichaSeleccionada = FICHAS[0].valor;
let apuestas = [];
let saldo = 100000;
let ruletaGirando = false;

const canvas = document.getElementById('ruleta');
const ctx = canvas.getContext('2d');
const cx = 650, cy = 650, R = 530;
const bolaDiv = document.getElementById('bola-ruleta');
const flecha = document.getElementById('flecha-indicador');

// ====== DIBUJAR RULETA Y BOLA ======
function drawRuleta(angle=0, ganadorIdx=null, guideHits=[]) {
  ctx.clearRect(0,0,1300,1300);

  // Fondo exterior
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx,cy,R+36,0,2*Math.PI);
  ctx.fillStyle = "#181a23";
  ctx.fill();
  ctx.lineWidth = 32;
  ctx.strokeStyle = "#ffd700";
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
    ctx.arc(cx,cy,R-110,a1,a0,true);
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
    ctx.translate(cx + Math.cos(a)*(R-75), cy + Math.sin(a)*(R-75));
    ctx.rotate(a-Math.PI/2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 3.3em 'Montserrat', Arial, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#181a23";
    ctx.shadowBlur = 10;
    ctx.fillText(WHEEL_ORDER[i], 0, 0);
    ctx.restore();
  }

  // Centro moderno
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx,cy,R-202,0,2*Math.PI);
  let grad = ctx.createRadialGradient(cx,cy,90,cx,cy,R-202);
  grad.addColorStop(0,"#222b38");
  grad.addColorStop(0.7,"#23253b");
  grad.addColorStop(1,"#181a23");
  ctx.fillStyle = grad;
  ctx.shadowColor = "#ffd70055";
  ctx.shadowBlur = 38;
  ctx.fill();
  ctx.restore();

  // Eje central pequeño
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx,cy,32,0,2*Math.PI);
  ctx.fillStyle = "#ffd700";
  ctx.shadowColor = "#ffd700cc";
  ctx.shadowBlur = 32;
  ctx.fill();
  ctx.restore();
}
drawRuleta();

// ====== BOLA EN LA RULETA ======
function setBolaOnRuleta(angle=0, sectorIdx=null) {
  if(sectorIdx === null) {
    bolaDiv.style.display = "none";
    return;
  }
  bolaDiv.style.display = "block";
  const n = WHEEL_ORDER.length;
  let a0 = angle + (sectorIdx/n)*2*Math.PI;
  let a1 = angle + ((sectorIdx+1)/n)*2*Math.PI;
  let aMid = (a0+a1)/2;
  let r = R-75;
  let bx = cx + Math.cos(aMid)*r;
  let by = cy + Math.sin(aMid)*r;
  bolaDiv.style.left = `${bx-19}px`;
  bolaDiv.style.top = `${by-19}px`;
}

// ====== FICHAS ======
function fichaSVG(valor, color, borde, rayas, txt) {
  let txtVal = (valor>=1000) ? (valor/1000)+"K" : valor;
  return `
  <svg width="56" height="56" viewBox="0 0 54 54">
    <defs>
      <radialGradient id="fg${valor}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.97"/>
        <stop offset="70%" stop-color="${color}" />
        <stop offset="100%" stop-color="#222" />
      </radialGradient>
    </defs>
    <circle cx="27" cy="27" r="25" fill="url(#fg${valor})" stroke="${borde}" stroke-width="3"/>
    <circle cx="27" cy="27" r="15" fill="#fff" stroke="${borde}" stroke-width="1.3"/>
    <circle cx="27" cy="27" r="10" fill="#efefef"/>
    ${[...Array(8)].map((_,i)=>{
      let ang = i*45;
      return `<rect x="25" y="2.5" rx="2" ry="2" width="4" height="9"
        fill="${rayas}" stroke="${borde}" stroke-width="0.6"
        transform="rotate(${ang} 27 27)"/>`
    }).join("")}
    <text x="27" y="32.5" text-anchor="middle"
      font-size="17" font-family="'Montserrat',Arial,sans-serif"
      fill="#222" stroke="#fff" stroke-width="2" paint-order="stroke"
      font-weight="bold" dominant-baseline="middle">$${txtVal}</text>
    <text x="27" y="32.5" text-anchor="middle"
      font-size="17" font-family="'Montserrat',Arial,sans-serif"
      fill="#222"
      font-weight="bold" dominant-baseline="middle">$${txtVal}</text>
  </svg>
  `;
}
function renderFichas() {
  const cont = document.getElementById('fichas');
  cont.innerHTML = "";
  FICHAS.forEach((f,idx)=>{
    const div = document.createElement('div');
    div.className = "ficha" + (fichaSeleccionada===f.valor ? " selected":"");
    div.innerHTML = fichaSVG(f.valor, f.color, f.borde, f.rayas, f.txt);
    div.title = "$"+f.valor;
    div.onclick = ()=>{fichaSeleccionada=f.valor; renderFichas();};
    cont.appendChild(div);
  });
}
renderFichas();

// ====== MESA Y APUESTAS ======
function renderMesaApuestas() {
  const mesa = document.getElementById('mesaApuestas');
  let grid = mesa.querySelector('.mesa-casino');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = "mesa-casino";
    mesa.insertBefore(grid, document.getElementById('deshacerBtn'));
  } else {
    grid.innerHTML = "";
  }
  grid.appendChild(casillaNumDiv("0", 1, 1, 2, "green cero-doble"));
  grid.appendChild(casillaNumDiv("00", 1, 3, 2, "green cero-doble"));

  let numGrid = [
    ["3","6","9","12","15","18","21","24","27","30","33","36"],
    ["2","5","8","11","14","17","20","23","26","29","32","35"],
    ["1","4","7","10","13","16","19","22","25","28","31","34"]
  ];
  for(let row=0; row<3; row++)
    for(let col=0; col<12; col++)
      grid.appendChild(
        casillaNumDiv(
          numGrid[row][col],
          col+2,
          row+1,
          1,
          (numGrid[row][col]==="0"||numGrid[row][col]==="00")?"green":WHEEL_COLORS[numGrid[row][col]]
        )
      );

  grid.appendChild(casillaBetOuter("1st12",2,4,4,"doz1"));
  grid.appendChild(casillaBetOuter("2nd12",6,4,4,"doz2"));
  grid.appendChild(casillaBetOuter("3rd12",10,4,4,"doz3"));
  grid.appendChild(casillaBetOuter("1 to 18",2,5,4,"low"));
  grid.appendChild(casillaBetOuter("◆",6,5,2,"red","red"));
  grid.appendChild(casillaBetOuter("◆",8,5,2,"black","black"));
  grid.appendChild(casillaBetOuter("19 to 36",10,5,4,"high"));

  let agrupadas = {};
  apuestas.forEach((ap, idx) => {
    if(!agrupadas[ap.casilla]) agrupadas[ap.casilla] = [];
    agrupadas[ap.casilla].push({...ap, idx});
  });
  Object.entries(agrupadas).forEach(([casilla, aps]) => {
    let cas = grid.querySelector(`[data-casilla-ficha='${casilla}']`);
    if(cas) {
      aps.slice(-4).forEach((ap,idx2) => {
        let fichaDiv = document.createElement('div');
        fichaDiv.className = "apuesta-ficha";
        fichaDiv.style.top = `calc(50% + ${idx2*14.5}px)`;
        fichaDiv.innerHTML = fichaSVG(FICHAS[ap.fichaIdx].valor, FICHAS[ap.fichaIdx].color, FICHAS[ap.fichaIdx].borde, FICHAS[ap.fichaIdx].rayas, FICHAS[ap.fichaIdx].txt);
        cas.appendChild(fichaDiv);
      });
    }
  });
}
renderMesaApuestas();

function casillaNumDiv(num,col,row,span,colorClass) {
  let outer = document.createElement('div');
  let classes = ["casilla-num"];
  if (colorClass) {
    if (colorClass.includes("green")) classes.push("green");
    if (colorClass.includes("red")) classes.push("red");
    if (colorClass.includes("black")) classes.push("black");
    if (colorClass.includes("cero-doble")) classes.push("cero-doble");
  }
  outer.className = classes.join(" ");
  outer.style.gridColumn = `${col} / span 1`;
  outer.style.gridRow = `${row} / span ${span}`;
  outer.innerText = num;
  outer.setAttribute('data-casilla-ficha',num);
  outer.onclick = ()=>apostarEn("numero",num,outer);
  return outer;
}
function casillaBetOuter(label,col,row,span,tipo,colorClass){
  let outer = document.createElement('div');
  outer.className = "casilla-bet-outer";
  outer.style.gridColumn = `${col} / span ${span}`;
  outer.style.gridRow = `${row}`;
  outer.setAttribute('data-casilla-ficha',tipo);
  let div = document.createElement('div');
  div.className = "casilla-bet " + (colorClass||"");
  div.innerHTML = `<span class="casilla-bet-label">${label}</span>`;
  outer.appendChild(div);
  outer.onclick = ()=>apostarEn("zona",tipo,outer);
  return outer;
}
function apostarEn(tipo, valor, casillaDiv) {
  if(ruletaGirando) return;
  let fichaIdx = FICHAS.findIndex(f=>f.valor===fichaSeleccionada);
  saldo -= FICHAS[fichaIdx].valor;
  updateBalance();
  apuestas.push({tipo, valor, fichaIdx, casilla: valor, monto: FICHAS[fichaIdx].valor});
  renderMesaApuestas();
  enableGiro();
}
function deshacerApuesta() {
  if (!apuestas.length) return;
  let ap = apuestas.pop();
  saldo += ap.monto;
  updateBalance();
  renderMesaApuestas();
  enableGiro();
}
document.getElementById('deshacerBtn').onclick = deshacerApuesta;

function enableGiro() {
  document.getElementById('girarBtn').disabled = !(apuestas.length && !ruletaGirando);
}
function updateBalance() {
  document.getElementById('balance').innerText = saldo;
}
enableGiro();
updateBalance();

// ==== GIRO RULETA: bola animada, sonido y sincronizada ====
function girarRuleta() {
  if(ruletaGirando || !apuestas.length) return;
  ruletaGirando = true;
  document.getElementById('girarBtn').disabled = true;
  document.getElementById('ruleta-resultado').innerText = "Girando...";
  let idx = Math.floor(Math.random()*WHEEL_ORDER.length);
  let ganador = WHEEL_ORDER[idx];
  let n = WHEEL_ORDER.length;
  let angTarget = 0 - ((idx + 0.5)/n)*2*Math.PI;
  flecha.style.display = "block";
  let vueltas = 11 + Math.random()*2.5;
  let angStart = 2*Math.PI*vueltas + angTarget;
  let t0 = Date.now();
  let duracion = 9500;
  let stopped = false;
  let lastSector = null;

  function animate() {
    if (stopped) return;
    let t = Date.now()-t0;
    let frac = Math.min(t/duracion,1);
    let ease = 1 - Math.pow(1-frac,2.75);
    let ang = angStart*(1-ease) + angTarget*ease;

    let nSectores = WHEEL_ORDER.length;
    let ruletaAngle = ((ang % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
    let sector = Math.floor(((nSectores - (ruletaAngle * nSectores/(2*Math.PI))) % nSectores));

    // SONIDO DE TICK SOLO SI CAMBIA DE SECTOR
    if (lastSector === null) lastSector = sector;
    if (sector !== lastSector) {
      playTick();
      lastSector = sector;
    }

    drawRuleta(ang, null, []);
    setBolaOnRuleta(ang, sector);

    if(frac<1) {
      requestAnimationFrame(animate);
    } else {
      stopped = true;
      stopTick();
      drawRuleta(angTarget, idx, []);
      setBolaOnRuleta(angTarget, idx);
      mostrarResultado(idx);
      ruletaGirando = false;
      setTimeout(()=>{
        apuestas = [];
        renderMesaApuestas();
        enableGiro();
        document.getElementById('ruleta-resultado').innerText = "";
        flecha.style.display = "none";
        setBolaOnRuleta(0, null);
      },3200);
    }
  }
  animate();
}
document.getElementById('girarBtn').onclick = girarRuleta;

// ====== GANANCIA CON MULTIPLICADORES SIN RTP ======
function mostrarResultado(idx) {
  document.getElementById('ruleta-resultado').innerText = `¡Ganó el número ${WHEEL_ORDER[idx]}!`;
  let ganancia = 0;
  let n = WHEEL_ORDER[idx];
  apuestas.forEach(ap => {
    if(ap.tipo==="numero" && ap.valor==n) ganancia += ap.monto*36; // Pleno x36
    if(ap.tipo==="zona") {
      if(ap.valor==="doz1" && (n>=1 && n<=12)) ganancia += ap.monto*3; // Docena x3
      if(ap.valor==="doz2" && (n>=13 && n<=24)) ganancia += ap.monto*3;
      if(ap.valor==="doz3" && (n>=25 && n<=36)) ganancia += ap.monto*3;
      if(ap.valor==="low" && (n>=1 && n<=18)) ganancia += ap.monto*2;  // Mitad x2
      if(ap.valor==="high" && (n>=19 && n<=36)) ganancia += ap.monto*2;
      if(ap.valor==="red" && WHEEL_COLORS[n]==="red") ganancia += ap.monto*2; // Color x2
      if(ap.valor==="black" && WHEEL_COLORS[n]==="black") ganancia += ap.monto*2;
    }
  });
  saldo += ganancia;
  updateBalance();
  if(ganancia>0) {
    document.getElementById('ruleta-resultado').innerText += ` ¡Ganaste $${ganancia.toFixed(2)}!`;
  }
}