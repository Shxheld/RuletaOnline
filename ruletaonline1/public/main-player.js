const socket = io();

const FICHAS = [
  {valor:10, color:"#fff", borde:"#dabd6f", rayas:"#ffe066", txt:"#222"},
  {valor:50, color:"#3da9fc", borde:"#ffe066", rayas:"#c1e7fb", txt:"#222"},
  {valor:100, color:"#23253b", borde:"#ffd700", rayas:"#ffd700", txt:"#fff"},
  {valor:500, color:"#00ffd0", borde:"#ffd700", rayas:"#fff", txt:"#222"},
  {valor:1000, color:"#ffd700", borde:"#00ffd0", rayas:"#fff", txt:"#222"},
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

let fichaSeleccionada = FICHAS[0].valor;
let apuestas = [];
let saldo = 1000;
let nombre = "";
let ruletaGirando = false;

const fichasCont = document.getElementById('fichas');
const balanceSpan = document.getElementById('balance');
const mesa = document.getElementById('mesaApuestas');
const mensajeDiv = document.getElementById('mensaje');
const deshacerBtn = document.getElementById('deshacerBtn');
const apostarBtn = document.getElementById('apostarBtn');

// NOMBRE
const nombreForm = document.getElementById('nombre-form');
const inputNombre = document.getElementById('nombre-usuario-input');
const btnNombre = document.getElementById('btn-nombre');
const nombreUsuarioContainer = document.getElementById('nombre-usuario-container');

// Bloquear scroll y fondo hasta que se ingrese el nombre
const desbloquearScroll = () => { document.body.style.overflow = ""; };
const bloquearScroll = () => { document.body.style.overflow = "hidden"; };

bloquearScroll();
setTimeout(() => { try { inputNombre.focus(); } catch {} }, 200);

nombreForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const val = inputNombre.value.trim();
  if (!val) return alert("Debes escribir tu nombre.");
  nombre = val;
  nombreUsuarioContainer.style.display = "none";
  desbloquearScroll();
  socket.emit('registro', {nombre, saldo});
});

inputNombre.addEventListener('keyup', (e) => {
  if(e.key === "Enter") {
    btnNombre.click();
  }
});

function fichaSVG(valor, color, borde, rayas, txt) {
  let txtVal = (valor>=1000) ? (valor/1000)+"K" : valor;
  return `
  <svg width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <radialGradient id="fg${valor}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.97"/>
        <stop offset="70%" stop-color="${color}" />
        <stop offset="100%" stop-color="#222" />
      </radialGradient>
    </defs>
    <circle cx="20" cy="20" r="18" fill="url(#fg${valor})" stroke="${borde}" stroke-width="2"/>
    <circle cx="20" cy="20" r="11" fill="#fff" stroke="${borde}" stroke-width="1"/>
    <circle cx="20" cy="20" r="7" fill="#efefef"/>
    ${[...Array(8)].map((_,i)=>{
      let ang = i*45;
      return `<rect x="18" y="2" rx="1" ry="1" width="4" height="6"
        fill="${rayas}" stroke="${borde}" stroke-width="0.4"
        transform="rotate(${ang} 20 20)"/>`
    }).join("")}
    <text x="20" y="25" text-anchor="middle"
      font-size="11" font-family="'Montserrat',Arial,sans-serif"
      fill="#222" stroke="#fff" stroke-width="1.2" paint-order="stroke"
      font-weight="bold" dominant-baseline="middle">$${txtVal}</text>
    <text x="20" y="25" text-anchor="middle"
      font-size="11" font-family="'Montserrat',Arial,sans-serif"
      fill="#222"
      font-weight="bold" dominant-baseline="middle">$${txtVal}</text>
  </svg>
  `;
}
function renderFichas() {
  fichasCont.innerHTML = "";
  FICHAS.forEach((f,idx)=>{
    const div = document.createElement('div');
    div.className = "ficha" + (fichaSeleccionada===f.valor ? " selected":"");
    div.innerHTML = fichaSVG(f.valor, f.color, f.borde, f.rayas, f.txt);
    div.title = "$"+f.valor;
    div.onclick = ()=>{fichaSeleccionada=f.valor; renderFichas();};
    fichasCont.appendChild(div);
  });
}
renderFichas();

function posicionarDeshacerBtn() {
  const btn = document.getElementById('deshacerBtn');
  let casillaRef = window.innerWidth <= 700
    ? document.querySelector('[data-casilla-ficha="36"]')
    : document.querySelector('[data-casilla-ficha="36"]');
  if (btn && casillaRef) {
    const rect = casillaRef.getBoundingClientRect();
    const mesaRect = mesa.getBoundingClientRect();
    btn.style.position = 'absolute';
    btn.style.top = (rect.top - mesaRect.top + rect.height/2 - 10) + 'px';
    btn.style.left = (rect.right - mesaRect.left + 6) + 'px';
    btn.style.margin = '0';
    btn.style.width = window.innerWidth <= 700 ? '18px' : '36px';
    btn.style.height = window.innerWidth <= 700 ? '18px' : '36px';
    btn.style.borderRadius = window.innerWidth <= 700 ? '5px' : '9px';
    btn.classList.add('cuadrado');
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
  }
}

function renderMesaApuestas() {
  let grid = mesa.querySelector('.mesa-casino');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = "mesa-casino";
    mesa.insertBefore(grid, document.getElementById('deshacerBtn'));
  } else {
    grid.innerHTML = "";
  }

  const isMobile = window.innerWidth <= 700;
  if (isMobile) {
    // Fila 1: "0" y "00" ocupando columnas 2 y 3
    grid.appendChild(casillaNumDiv("0", 2, 1, 1, "green cero-doble"));
    grid.appendChild(casillaNumDiv("00", 3, 1, 1, "green cero-doble"));

    // Números del 1 al 36, 4x9, filas 2 a 10
    let n = 1;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 4; col++) {
        const num = n++;
        grid.appendChild(
          casillaNumDiv(
            num.toString(),
            col + 1,
            row + 2,
            1,
            WHEEL_COLORS[num]
          )
        );
      }
    }

    // Fila 11: docenas (cada una ocupa más de 1 columna, total 4 columnas)
    grid.appendChild(casillaBetOuter("1st12", 1, 11, 4/3, "doz1", "dozen"));
    grid.appendChild(casillaBetOuter("2nd12", 1+4/3, 11, 4/3, "doz2", "dozen"));
    grid.appendChild(casillaBetOuter("3rd12", 1+8/3, 11, 4/3, "doz3", "dozen"));

    // Fila 12: mitades (1 to 18, 19 to 36), cada una ocupa 2 columnas
    grid.appendChild(casillaBetOuter("1 to 18", 1, 12, 2, "low", "lowhigh"));
    grid.appendChild(casillaBetOuter("19 to 36", 3, 12, 2, "high", "lowhigh"));

    // Fila 13: Color rojo y negro, cada uno ocupa 2 columnas
    grid.appendChild(casillaBetOuter("◆", 1, 13, 2, "red", "red"));
    grid.appendChild(casillaBetOuter("◆", 3, 13, 2, "black", "black"));
  } else {
    // PC - clásico 3 filas x 12 columnas
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
  }

  // Fichas sobrepuestas (más pequeñas en móvil)
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
        fichaDiv.style.top = `calc(50% + ${idx2*6}px)`;
        fichaDiv.innerHTML = fichaSVG(FICHAS[ap.fichaIdx].valor, FICHAS[ap.fichaIdx].color, FICHAS[ap.fichaIdx].borde, FICHAS[ap.fichaIdx].rayas, FICHAS[ap.fichaIdx].txt);
        fichaDiv.style.width = window.innerWidth <= 700 ? "18px" : "54px";
        fichaDiv.style.height = window.innerWidth <= 700 ? "18px" : "54px";
        cas.appendChild(fichaDiv);
      });
    }
  });

  setTimeout(posicionarDeshacerBtn, 50);
}
renderMesaApuestas();

function casillaNumDiv(num, col, row, span, colorClass) {
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
  outer.className = "casilla-bet-outer" + (colorClass ? ` ${colorClass}` : "");
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
  if (!nombre) return alert("Ingresa tu nombre primero.");
  let fichaIdx = FICHAS.findIndex(f=>f.valor===fichaSeleccionada);
  if (saldo < FICHAS[fichaIdx].valor) return alert("Saldo insuficiente.");
  saldo -= FICHAS[fichaIdx].valor;
  updateBalance();
  apuestas.push({tipo, valor, fichaIdx, casilla: valor, monto: FICHAS[fichaIdx].valor});
  renderMesaApuestas();
}
function deshacerApuesta() {
  if (!apuestas.length) return;
  let ap = apuestas.pop();
  saldo += ap.monto;
  updateBalance();
  renderMesaApuestas();
}
deshacerBtn.onclick = deshacerApuesta;

apostarBtn.onclick = () => {
  if (!apuestas.length) return alert("Haz una apuesta primero.");
  socket.emit('apostar', {nombre, apuestas});
  mensajeDiv.innerText = "¡Apuesta enviada! Esperando giro...";
  apostarBtn.disabled = true;
  deshacerBtn.disabled = true;
};

function updateBalance() {
  balanceSpan.innerText = saldo;
}
updateBalance();

socket.on('resultado', data => {
  ruletaGirando = true;
  const ganador = data.ganador;
  let ganancia = 0;
  apuestas.forEach(ap => {
    if(ap.tipo==="numero" && ap.valor==ganador) ganancia += ap.monto*36;
    if(ap.tipo==="zona") {
      if(ap.valor==="doz1" && (ganador>=1 && ganador<=12)) ganancia += ap.monto*3;
      if(ap.valor==="doz2" && (ganador>=13 && ganador<=24)) ganancia += ap.monto*3;
      if(ap.valor==="doz3" && (ganador>=25 && ganador<=36)) ganancia += ap.monto*3;
      if(ap.valor==="low" && (ganador>=1 && ganador<=18)) ganancia += ap.monto*2;
      if(ap.valor==="high" && (ganador>=19 && ganador<=36)) ganancia += ap.monto*2;
      if(ap.valor==="red" && WHEEL_COLORS[ganador]==="red") ganancia += ap.monto*2;
      if(ap.valor==="black" && WHEEL_COLORS[ganador]==="black") ganancia += ap.monto*2;
    }
  });
  saldo += ganancia;
  updateBalance();
  mensajeDiv.innerText = ganancia > 0 
    ? `¡Ganaste $${ganancia}! Saldo actual: $${saldo}`
    : `No acertaste. Saldo actual: $${saldo}`;
  apuestas = [];
  setTimeout(() => {
    mensajeDiv.innerText = "";
    apostarBtn.disabled = false;
    deshacerBtn.disabled = false;
    ruletaGirando = false;
    renderMesaApuestas();
  }, 3500);
});
