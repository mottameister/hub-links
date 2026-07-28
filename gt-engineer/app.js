const form = document.querySelector("#setup-form");
const steps = [...document.querySelectorAll(".step")];
const back = document.querySelector("#back");
const next = document.querySelector("#next");
const generate = document.querySelector("#generate");
const progress = document.querySelector("#progress-bar");
const stepKicker = document.querySelector("#step-kicker");
const stepTitle = document.querySelector("#step-title");
const result = document.querySelector("#result");
const resultTitle = document.querySelector("#result-title");
const copy = document.querySelector("#copy");
const carList = document.querySelector("#car-list");
const trackList = document.querySelector("#track-list");
const carMeta = document.querySelector("#car-meta");
const trackMeta = document.querySelector("#track-meta");
const tireWearInput = document.querySelector("[name='tireWear']");
const fuelInput = document.querySelector("[name='fuel']");
const tireWearValue = document.querySelector("#tireWearValue");
const fuelValue = document.querySelector("#fuelValue");

const titles = [
  "Escolha o carro",
  "Defina a pista",
  "Regras da corrida",
  "Pneus e desgaste",
  "Problema principal",
];

const dataSource = window.GT7_DATA || { cars: [], tracks: [] };
const cars = dataSource.cars || [];
const tracks = dataSource.tracks || [];

let currentStep = 0;
let lastPlainText = "";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fillDatalists() {
  carList.innerHTML = cars
    .map((car) => `<option value="${escapeAttr(car.name)}">${escapeAttr(`${car.drivetrain} | ${car.class} | ${car.pp}`)}</option>`)
    .join("");
  trackList.innerHTML = tracks
    .map((track) => `<option value="${escapeAttr(track.name)}">${escapeAttr(track.type)}</option>`)
    .join("");
}

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function findCar(name) {
  const target = normalize(name);
  return cars.find((car) => normalize(car.name) === target || normalize(car.short) === target);
}

function findTrack(name) {
  const target = normalize(name);
  return tracks.find((track) => normalize(track.name) === target);
}

function inferCar(name) {
  const exact = findCar(name);
  if (exact) return exact;

  const n = normalize(name);
  let drivetrain = "FR";
  if (/\b(911|ruf|alpine a110|de lorean|delorean)\b/.test(n)) drivetrain = "RR";
  if (/\b(nsx|gt3|rs\.01|r8|ford gt|f40|f50|enzo|laferrari|mclaren|lamborghini|pagani|bugatti|tomahawk|vision)\b/.test(n)) drivetrain = "MR";
  if (/\b(gtr|gt-r|skyline|wrx|impreza|evo|lancer|celica gt-four|rally|4wd)\b/.test(n)) drivetrain = "4WD";
  if (/\b(civic|integra|mini|swift|208|twingo|ff)\b/.test(n)) drivetrain = "FF";
  return { name, short: name, drivetrain, class: "Manual", pp: "PP a confirmar" };
}

function inferTrack(name) {
  const exact = findTrack(name);
  if (exact) return exact;

  const n = normalize(name);
  if (/\b(le mans|daytona|monza|route x|tokyo|fuji|spa|watkins)\b/.test(n)) return { name, type: "fast" };
  if (/\b(tsukuba|laguna|short|sprint|kart|willow streets|autopolis shortcut)\b/.test(n)) return { name, type: "technical" };
  if (/\b(suzuka|brands|road atlanta|goodwood)\b/.test(n)) return { name, type: "flowing" };
  return { name, type: "balanced" };
}

function updateMeta() {
  const input = data();
  const car = findCar(input.car);
  const track = findTrack(input.track);
  carMeta.textContent = car
    ? `${car.drivetrain} detectado | ${car.class} | ${car.pp}`
    : "Carro fora da base oficial local: vou inferir a tracao pelo nome e deixar como ponto de partida.";
  trackMeta.textContent = track
    ? `Perfil inferido: ${track.type}`
    : "Pista fora da base local: vou inferir o perfil pelo nome.";
}

function updateSliders() {
  tireWearValue.textContent = tireWearInput.value === "0" ? "Off" : `${tireWearInput.value}x`;
  fuelValue.textContent = fuelInput.value === "0" ? "Off" : `${fuelInput.value}x`;
}

function updateStep() {
  steps.forEach((step, index) => step.classList.toggle("active", index === currentStep));
  back.disabled = currentStep === 0;
  next.classList.toggle("hidden", currentStep === steps.length - 1);
  generate.classList.toggle("hidden", currentStep !== steps.length - 1);
  progress.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  stepKicker.textContent = `Etapa ${currentStep + 1} de ${steps.length}`;
  stepTitle.textContent = titles[currentStep];
}

function data() {
  return Object.fromEntries(new FormData(form).entries());
}

function raceLength(input) {
  const amount = Number(input.durationValue || 0);
  if (input.durationType === "time") return `${amount || 1} min`;
  return `${amount || 1} voltas`;
}

function buildSetup(input) {
  const car = inferCar(input.car);
  const track = inferTrack(input.track);
  const tireWear = Number(input.tireWear);
  const fuel = Number(input.fuel);
  const durationValue = Number(input.durationValue || 0);
  const isLong = input.durationType === "time" ? durationValue >= 30 : durationValue >= 12;
  const isFast = track.type === "fast";
  const isTechnical = track.type === "technical";
  const isFlowing = track.type === "flowing";
  const isLocked = input.bop === "on-locked";
  const isMR = car.drivetrain === "MR" || car.drivetrain === "RR";
  const is4WD = car.drivetrain === "4WD";
  const isFF = car.drivetrain === "FF";
  const wetTire = /wet|intermediate/i.test(input.tires);
  const endurance = isLong || tireWear >= 5 || fuel >= 4;

  const tune = {
    frontTire: input.tires,
    rearTire: input.tires,
    heightF: isFast ? 62 : isTechnical ? 58 : 60,
    heightR: isMR ? 70 : isFast ? 66 : 68,
    arbF: isFF ? 3 : 4,
    arbR: isMR ? 3 : isFF ? 5 : 4,
    compF: 28,
    compR: isMR ? 26 : 28,
    expF: 42,
    expR: isMR ? 39 : 42,
    freqF: isFast || isFlowing ? 4.15 : 3.95,
    freqR: isMR ? 3.45 : isTechnical ? 3.55 : 3.65,
    camberF: endurance ? 3.0 : 3.3,
    camberR: endurance ? 2.7 : 3.0,
    toeF: "-0.05",
    toeR: endurance || isMR ? "+0.25" : "+0.18",
    lsdInitial: isFF ? 6 : isMR ? 8 : 10,
    lsdAccel: isFF ? 16 : isMR ? 18 : 22,
    lsdBrake: isFF ? 20 : isMR ? 32 : 38,
    downF: isFast ? 390 : isTechnical ? 470 : 450,
    downR: isFast ? 650 : isMR ? 720 : 700,
    ecu: input.ppLimit ? 97 : 100,
    ballast: 0,
    ballastPos: 0,
    restrictor: input.ppLimit ? 98 : 100,
    topSpeed: isFast ? 330 : isTechnical ? 280 : 300,
    brake: isMR ? "-2 traseira" : isFF ? "+1 dianteira" : "-1 traseira",
    fuelMap: fuel >= 8 ? "Mapa 3-4 em trafego; mapa 1-2 para atacar" : fuel >= 4 ? "Mapa 2 no stint; mapa 1 para atacar" : "Mapa 1",
  };

  if (wetTire) {
    tune.downF = clamp(tune.downF + 20, 50, 500);
    tune.downR = clamp(tune.downR + 30, 50, 800);
    tune.toeR = "+0.32";
    tune.lsdAccel = clamp(tune.lsdAccel - 3, 5, 60);
  }

  if (input.problem === "rear-exit") {
    tune.lsdAccel = clamp(tune.lsdAccel - 4, 5, 60);
    tune.toeR = "+0.30";
    tune.arbR = clamp(tune.arbR - 1, 1, 10);
    tune.expR = clamp(tune.expR - 3, 20, 50);
  }

  if (input.problem === "understeer-entry") {
    tune.lsdBrake = clamp(tune.lsdBrake - 8, 5, 60);
    tune.toeF = "-0.10";
    tune.brake = isFF ? "0 dianteira" : "0 ou -1 traseira";
  }

  if (input.problem === "understeer-mid") {
    tune.downF = clamp(tune.downF + 20, 50, 500);
    tune.arbF = clamp(tune.arbF - 1, 1, 10);
    tune.camberF = Math.min(tune.camberF + 0.2, 4).toFixed(1);
  }

  if (input.problem === "brake-instability") {
    tune.lsdBrake = clamp(tune.lsdBrake + 8, 5, 60);
    tune.toeR = "+0.32";
    tune.brake = isFF ? "0 dianteira" : "-1 a -2 traseira";
  }

  if (input.problem === "tire-wear") {
    tune.camberF = Math.max(Number(tune.camberF) - 0.3, 2.2).toFixed(1);
    tune.camberR = Math.max(Number(tune.camberR) - 0.3, 2.1).toFixed(1);
    tune.lsdAccel = clamp(tune.lsdAccel - 3, 5, 60);
    tune.downR = clamp(tune.downR + 10, 50, 800);
  }

  if (input.problem === "top-speed") {
    tune.downF = clamp(tune.downF - 30, 50, 500);
    tune.downR = clamp(tune.downR - 40, 50, 800);
    tune.topSpeed += 20;
  }

  if (input.problem === "safe" || input.controller === "Controle") {
    tune.toeR = "+0.30";
    tune.lsdBrake = clamp(tune.lsdBrake + 4, 5, 60);
    tune.downR = clamp(tune.downR + 15, 50, 800);
  }

  const lockedNotice = isLocked
    ? "BoP com tuning proibido: se a sala bloquear suspensao/aero/cambio, ajuste apenas pneus permitidos, brake balance, fuel map e estrategia."
    : "Tuning permitido: aplique como base e ajuste em passos pequenos depois de 3 voltas.";

  const torqueSplit = is4WD ? ["Torque split", "35:65 para tracao; 30:70 se precisar rotacionar mais"] : null;

  return { car, track, tune, lockedNotice, torqueSplit };
}

function rows(items) {
  return `<div class="setup-grid">${items.map(([k, v]) => `<span>${k}</span><strong>${v}</strong>`).join("")}</div>`;
}

function renderSetup(input) {
  const { car, track, tune, lockedNotice, torqueSplit } = buildSetup(input);
  const pp = input.ppLimit ? `, limite ${input.ppLimit} PP` : "";
  const wearLabel = input.tireWear === "0" ? "off" : `${input.tireWear}x`;
  const fuelLabel = input.fuel === "0" ? "off" : `${input.fuel}x`;

  const blocks = [
    ["Resumo", rows([
      ["Carro", car.name],
      ["Tracao detectada", car.drivetrain],
      ["Pista", `${track.name} (${track.type})`],
      ["Modo", `${input.mode}, BoP ${input.bop}${pp}`],
      ["Duracao", raceLength(input)],
      ["Pneus/consumo", `${input.tires}, desgaste ${wearLabel}, combustivel ${fuelLabel}`],
    ])],
    ["Pneus e suspensao", rows([
      ["Pneus", `${tune.frontTire} / ${tune.rearTire}`],
      ["Altura", `${tune.heightF} / ${tune.heightR}`],
      ["Anti-roll bar", `${tune.arbF} / ${tune.arbR}`],
      ["Damping comp.", `${tune.compF} / ${tune.compR}`],
      ["Damping exp.", `${tune.expF} / ${tune.expR}`],
      ["Frequencia", `${tune.freqF} / ${tune.freqR}`],
      ["Cambagem", `${tune.camberF} / ${tune.camberR}`],
      ["Toe", `${tune.toeF} / ${tune.toeR}`],
    ])],
    ["Diferencial e aero", rows([
      ["LSD inicial", tune.lsdInitial],
      ["LSD aceleracao", tune.lsdAccel],
      ["LSD frenagem", tune.lsdBrake],
      ...(torqueSplit ? [torqueSplit] : []),
      ["Downforce", `${tune.downF} / ${tune.downR}`],
      ["Brake balance", tune.brake],
    ])],
    ["Potencia e cambio", rows([
      ["ECU", `${tune.ecu}%`],
      ["Ballast", `${tune.ballast} kg`],
      ["Ballast position", tune.ballastPos],
      ["Power restrictor", `${tune.restrictor}%`],
      ["Cambio auto set", `${tune.topSpeed} km/h`],
      ["Nitro/Overtake", "None"],
    ])],
    ["Plano de teste", `
      <ul class="notes">
        <li>${lockedNotice}</li>
        <li>Volta 1: aqueca pneus e freie conservador.</li>
        <li>Volta 2: force entrada, meio e saida para achar o maior problema.</li>
        <li>Volta 3: valide tempo e desgaste. Se sair de traseira, reduza LSD aceleracao 2 pontos; se sair de frente, aumente aero dianteira 10 ou reduza LSD frenagem 3.</li>
        <li>Estrategia: ${tune.fuelMap}. Com desgaste alto, reduza cambagem 0.2 por eixo e suavize saida de curva.</li>
      </ul>
    `],
  ];

  lastPlainText = [
    `GT7 Setup Engineer - ${car.name} em ${track.name}`,
    `Tracao: ${car.drivetrain} | Modo: ${input.mode} | BoP: ${input.bop} | Pneus: ${input.tires}`,
    `Duracao: ${raceLength(input)} | Desgaste: ${wearLabel} | Combustivel: ${fuelLabel}`,
    `Altura: ${tune.heightF}/${tune.heightR}`,
    `ARB: ${tune.arbF}/${tune.arbR}`,
    `Damping comp: ${tune.compF}/${tune.compR}`,
    `Damping exp: ${tune.expF}/${tune.expR}`,
    `Frequencia: ${tune.freqF}/${tune.freqR}`,
    `Cambagem: ${tune.camberF}/${tune.camberR}`,
    `Toe: ${tune.toeF}/${tune.toeR}`,
    `LSD: ${tune.lsdInitial}/${tune.lsdAccel}/${tune.lsdBrake}`,
    `Downforce: ${tune.downF}/${tune.downR}`,
    `ECU: ${tune.ecu}% | Restrictor: ${tune.restrictor}% | Cambio: ${tune.topSpeed} km/h`,
    lockedNotice,
  ].join("\n");

  resultTitle.textContent = `${car.name} - ${track.name}`;
  result.className = "setup-output";
  result.innerHTML = blocks.map(([title, body]) => `<div class="setup-block"><h3>${title}</h3>${body}</div>`).join("");
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

next.addEventListener("click", () => {
  const required = steps[currentStep].querySelector("[required]");
  if (required && !required.reportValidity()) return;
  currentStep = clamp(currentStep + 1, 0, steps.length - 1);
  updateStep();
  updateMeta();
});

back.addEventListener("click", () => {
  currentStep = clamp(currentStep - 1, 0, steps.length - 1);
  updateStep();
  updateMeta();
});

form.addEventListener("input", () => {
  updateMeta();
  updateSliders();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generate.disabled = true;
  generate.textContent = "Gerando...";
  resultTitle.textContent = "Gerando setup...";
  result.className = "result-empty";
  result.textContent = "Calculando tracao, perfil da pista, desgaste, combustivel e ajustes de base.";

  window.setTimeout(() => {
    renderSetup(data());
    generate.textContent = "Setup gerado";
    window.setTimeout(() => {
      generate.disabled = false;
      generate.textContent = "Gerar setup";
    }, 900);
  }, 250);
});

copy.addEventListener("click", async () => {
  if (!lastPlainText) return;
  await navigator.clipboard.writeText(lastPlainText);
  copy.textContent = "Copiado";
  setTimeout(() => {
    copy.textContent = "Copiar";
  }, 1200);
});

fillDatalists();
updateSliders();
updateStep();
