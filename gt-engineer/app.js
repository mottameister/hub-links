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

const titles = [
  "Escolha o carro",
  "Defina a pista",
  "Regras da corrida",
  "Pneus e desgaste",
  "Problema principal",
];

let currentStep = 0;
let lastPlainText = "";

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildSetup(input) {
  const tireWear = Number(input.tireWear);
  const fuel = Number(input.fuel);
  const isLong = input.duration === "long" || tireWear >= 5;
  const isFast = input.trackType === "fast";
  const isTechnical = input.trackType === "technical";
  const isFlowing = input.trackType === "flowing";
  const isLocked = input.bop === "on-locked";
  const isMR = input.drivetrain === "MR/RR";
  const is4WD = input.drivetrain === "4WD";

  const tune = {
    frontTire: input.tires,
    rearTire: input.tires,
    heightF: isFast ? 62 : isTechnical ? 58 : 60,
    heightR: isMR ? 70 : isFast ? 66 : 68,
    arbF: 4,
    arbR: isMR ? 3 : 4,
    compF: 28,
    compR: isMR ? 26 : 28,
    expF: 42,
    expR: isMR ? 39 : 42,
    freqF: isFast || isFlowing ? 4.15 : 3.95,
    freqR: isMR ? 3.45 : isTechnical ? 3.55 : 3.65,
    camberF: isLong ? 3.0 : 3.3,
    camberR: isLong ? 2.7 : 3.0,
    toeF: "-0.05",
    toeR: isLong || isMR ? "+0.25" : "+0.18",
    lsdInitial: isMR ? 8 : 10,
    lsdAccel: isMR ? 18 : 22,
    lsdBrake: isMR ? 32 : 38,
    downF: isFast ? 390 : isTechnical ? 470 : 450,
    downR: isFast ? 650 : isMR ? 720 : 700,
    ecu: input.ppLimit ? 97 : 100,
    ballast: 0,
    ballastPos: 0,
    restrictor: input.ppLimit ? 98 : 100,
    topSpeed: isFast ? 330 : isTechnical ? 280 : 300,
    brake: isMR ? "-2 traseira" : "-1 traseira",
    fuelMap: fuel >= 5 ? "Mapa 2-3 em stint; mapa 1 para atacar" : "Mapa 1",
  };

  if (input.problem === "rear-exit") {
    tune.lsdAccel = clamp(tune.lsdAccel - 4, 5, 60);
    tune.toeR = "+0.30";
    tune.arbR = clamp(tune.arbR - 1, 1, 10);
    tune.expR = clamp(tune.expR - 3, 20, 50);
  }

  if (input.problem === "understeer-entry") {
    tune.lsdBrake = clamp(tune.lsdBrake - 8, 5, 60);
    tune.toeF = "-0.10";
    tune.brake = "0 ou -1 traseira";
  }

  if (input.problem === "understeer-mid") {
    tune.downF = clamp(tune.downF + 20, 50, 500);
    tune.arbF = clamp(tune.arbF - 1, 1, 10);
    tune.camberF = Math.min(tune.camberF + 0.2, 4).toFixed(1);
  }

  if (input.problem === "brake-instability") {
    tune.lsdBrake = clamp(tune.lsdBrake + 8, 5, 60);
    tune.toeR = "+0.32";
    tune.brake = "-1 a -2 traseira";
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
    ? "BoP com tuning proibido: use esta resposta como guia de itens permitidos. Se a sala bloquear suspensao/aero/cambio, ajuste apenas pneus, brake balance, fuel map e estrategia."
    : "Tuning permitido: aplique como base e ajuste em passos pequenos depois de 3 voltas.";

  const torqueSplit = is4WD ? ["Torque split", "35:65 para tracao; 30:70 se precisar rotacionar mais"] : null;

  return { tune, lockedNotice, torqueSplit };
}

function rows(items) {
  return `<div class="setup-grid">${items.map(([k, v]) => `<span>${k}</span><strong>${v}</strong>`).join("")}</div>`;
}

function renderSetup(input) {
  const { tune, lockedNotice, torqueSplit } = buildSetup(input);
  const pp = input.ppLimit ? `, limite ${input.ppLimit} PP` : "";

  const blocks = [
    ["Resumo", rows([
      ["Carro", input.car],
      ["Pista", `${input.track} (${input.trackType})`],
      ["Modo", `${input.mode}, BoP ${input.bop}${pp}`],
      ["Pneus/consumo", `${input.tires}, desgaste ${input.tireWear}x, combustivel ${input.fuel === "0" ? "off" : `${input.fuel}x`}`],
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
        <li>Volta 2: force entrada, meio e saida de curva para achar o maior problema.</li>
        <li>Volta 3: valide tempo e desgaste. Se sair de traseira, reduza LSD aceleracao 2 pontos; se sair de frente, aumente frente aero 10 ou reduza LSD frenagem 3.</li>
        <li>Estrategia: ${tune.fuelMap}. Se desgaste estiver alto, evite esterco longo e reduza cambagem 0.2 por eixo.</li>
      </ul>
    `],
  ];

  lastPlainText = [
    `GT7 Setup Engineer - ${input.car} em ${input.track}`,
    `Modo: ${input.mode} | BoP: ${input.bop} | Pneus: ${input.tires}`,
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

  resultTitle.textContent = `${input.car} - ${input.track}`;
  result.className = "setup-output";
  result.innerHTML = blocks.map(([title, body]) => `<div class="setup-block"><h3>${title}</h3>${body}</div>`).join("");
}

next.addEventListener("click", () => {
  currentStep = clamp(currentStep + 1, 0, steps.length - 1);
  updateStep();
});

back.addEventListener("click", () => {
  currentStep = clamp(currentStep - 1, 0, steps.length - 1);
  updateStep();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderSetup(data());
});

copy.addEventListener("click", async () => {
  if (!lastPlainText) return;
  await navigator.clipboard.writeText(lastPlainText);
  copy.textContent = "Copiado";
  setTimeout(() => {
    copy.textContent = "Copiar";
  }, 1200);
});

updateStep();
