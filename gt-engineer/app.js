const form = document.querySelector("#setup-form");
const start = document.querySelector("#start");
const configurator = document.querySelector("#configurator");
const steps = [...document.querySelectorAll(".step")];
const back = document.querySelector("#back");
const next = document.querySelector("#next");
const generate = document.querySelector("#generate");
const progress = document.querySelector("#progress-bar");
const stepKicker = document.querySelector("#step-kicker");
const stepTitle = document.querySelector("#step-title");
const result = document.querySelector("#result");
const resultKicker = document.querySelector("#result-kicker");
const resultTitle = document.querySelector("#result-title");
const copy = document.querySelector("#copy");
const restart = document.querySelector("#restart");
const notesEditor = document.querySelector("#notes-editor");
const driverNotes = document.querySelector("#driver-notes");
const carBrand = document.querySelector("#car-brand");
const carSearch = document.querySelector("#car-search");
const carValue = document.querySelector("#car-value");
const carSelected = document.querySelector("#car-selected");
const carResults = document.querySelector("#car-results");
const trackCountry = document.querySelector("#track-country");
const trackSearch = document.querySelector("#track-search");
const trackValue = document.querySelector("#track-value");
const trackSelected = document.querySelector("#track-selected");
const trackResults = document.querySelector("#track-results");
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

const initialResultText = "O setup aparece aqui depois de clicar em Gerar setup.";

const multiWordMakes = [
  "Alfa Romeo",
  "Aston Martin",
  "BMW",
  "Chevrolet",
  "Dodge",
  "Ferrari",
  "Ford",
  "Genesis",
  "Gran Turismo",
  "Honda",
  "Hyundai",
  "Jaguar",
  "Lamborghini",
  "Lexus",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-AMG",
  "Mercedes-Benz",
  "Nissan",
  "Porsche",
  "Renault",
  "Subaru",
  "Toyota",
  "Volkswagen",
].sort((a, b) => b.length - a.length);

const countryLabels = {
  Australia: "Austrália",
  Austria: "Áustria",
  Belgium: "Bélgica",
  Brazil: "Brasil",
  Canada: "Canadá",
  Croatia: "Croácia",
  France: "França",
  Germany: "Alemanha",
  Italy: "Itália",
  Japan: "Japão",
  Spain: "Espanha",
  Switzerland: "Suíça",
  "U.S.": "Estados Unidos",
  UAE: "Emirados Árabes Unidos",
  "United Kingdom": "Reino Unido",
};

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

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value) {
  return escapeAttr(value);
}

function makeFor(car) {
  const exact = multiWordMakes.find((make) => normalize(car.name).startsWith(normalize(make)));
  return exact || String(car.name || "").split(" ")[0] || "Outra";
}

function enrichCar(car) {
  return { ...car, make: makeFor(car) };
}

function enrichTrack(track) {
  return { country: "Outros", ...track };
}

const carsWithMake = cars.map(enrichCar);
const tracksWithCountry = tracks.map(enrichTrack);

function modelName(car) {
  const escapedMake = car.make.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return car.name.replace(new RegExp(`^${escapedMake}\\s*`, "i"), "").trim() || car.name;
}

function optionLabel(count, noun) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function countryLabel(country) {
  return countryLabels[country] || country || "Outros";
}

function fillFilters() {
  const makes = [...new Set(carsWithMake.map((car) => car.make))].sort((a, b) => a.localeCompare(b));
  carBrand.innerHTML = `<option value="">Todas as marcas</option>${makes
    .map((make) => `<option value="${escapeAttr(make)}">${escapeHtml(make)}</option>`)
    .join("")}`;

  const countries = [...new Set(tracksWithCountry.map((track) => track.country || "Outros"))].sort((a, b) =>
    a.localeCompare(b)
  );
  trackCountry.innerHTML = `<option value="">Todos os países</option>${countries
    .map((country) => `<option value="${escapeAttr(country)}">${escapeHtml(countryLabel(country))}</option>`)
    .join("")}`;
}

function clearCarSelection() {
  carValue.value = "";
  carSelected.textContent = "Nenhum carro selecionado";
  carSelected.classList.remove("selected");
}

function clearTrackSelection() {
  trackValue.value = "";
  trackSelected.textContent = "Nenhuma pista selecionada";
  trackSelected.classList.remove("selected");
}

function carMatchesQuery(car, query) {
  if (!query) return true;
  const q = normalize(query);
  return [car.name, car.short, car.make, modelName(car), car.drivetrain, car.class].some((value) =>
    normalize(value).includes(q)
  );
}

function trackMatchesQuery(track, query) {
  if (!query) return true;
  const q = normalize(query);
  return [track.name, track.country, track.type].some((value) => normalize(value).includes(q));
}

function renderCarResults() {
  const make = carBrand.value;
  const query = carSearch.value;
  const matches = carsWithMake
    .filter((car) => (!make || car.make === make) && carMatchesQuery(car, query))
    .slice(0, 80);

  carResults.innerHTML = matches.length
    ? matches
        .map(
          (car, index) => `
            <button type="button" class="picker-option" data-kind="car" data-index="${index}">
              <span>
                <strong>${escapeHtml(modelName(car))}</strong>
                <small>${escapeHtml(car.make)} | ${escapeHtml(car.drivetrain)} | ${escapeHtml(car.class)}</small>
              </span>
              <em>${escapeHtml(car.pp)}</em>
            </button>
          `
        )
        .join("")
    : `<div class="picker-empty">Nenhum carro encontrado. Tente marca ou parte do modelo.</div>`;

  carResults.querySelectorAll("[data-kind='car']").forEach((button, index) => {
    button.addEventListener("click", () => selectCar(matches[index]));
  });

  const total = carsWithMake.filter((car) => (!make || car.make === make) && carMatchesQuery(car, query)).length;
  carMeta.textContent = carValue.value
    ? carMeta.textContent
    : `${optionLabel(total, "carro")} encontrado${total === 1 ? "" : "s"}. Digite algo como 911, Porsche, Supra ou GT-R.`;
}

function renderTrackResults() {
  const country = trackCountry.value;
  const query = trackSearch.value;
  const matches = tracksWithCountry
    .filter((track) => (!country || track.country === country) && trackMatchesQuery(track, query))
    .slice(0, 80);

  trackResults.innerHTML = matches.length
    ? matches
        .map(
          (track, index) => `
            <button type="button" class="picker-option" data-kind="track" data-index="${index}">
              <span>
                <strong>${escapeHtml(track.name)}</strong>
                <small>${escapeHtml(countryLabel(track.country))} | ${escapeHtml(track.type)}</small>
              </span>
            </button>
          `
        )
        .join("")
    : `<div class="picker-empty">Nenhuma pista encontrada. Limpe o país ou busque pelo nome do circuito.</div>`;

  trackResults.querySelectorAll("[data-kind='track']").forEach((button, index) => {
    button.addEventListener("click", () => selectTrack(matches[index]));
  });

  const total = tracksWithCountry.filter(
    (track) => (!country || track.country === country) && trackMatchesQuery(track, query)
  ).length;
  trackMeta.textContent = trackValue.value
    ? trackMeta.textContent
    : `${optionLabel(total, "layout")} encontrado${total === 1 ? "" : "s"}. Filtre por país ou digite Spa, Suzuka, Tokyo...`;
}

function selectCar(car) {
  carValue.value = car.name;
  carSearch.value = modelName(car);
  carBrand.value = car.make;
  carSearch.setCustomValidity("");
  carSelected.textContent = `${car.make} ${modelName(car)}`;
  carSelected.classList.add("selected");
  updateMeta();
  renderCarResults();
}

function selectTrack(track) {
  trackValue.value = track.name;
  trackSearch.value = track.name;
  trackCountry.value = track.country || "";
  trackSearch.setCustomValidity("");
  trackSelected.textContent = track.name;
  trackSelected.classList.add("selected");
  updateMeta();
  renderTrackResults();
}

function findCar(name) {
  const target = normalize(name);
  return carsWithMake.find((car) => normalize(car.name) === target || normalize(car.short) === target);
}

function findTrack(name) {
  const target = normalize(name);
  return tracksWithCountry.find((track) => normalize(track.name) === target);
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
  if (input.car) {
    carMeta.textContent = car
      ? `${car.drivetrain} detectado | ${car.class} | ${car.pp}`
      : "Carro fora da base oficial local: vou inferir a tração pelo nome e deixar como ponto de partida.";
  }
  if (input.track) {
    trackMeta.textContent = track
      ? `Perfil inferido: ${track.type}${track.country ? ` | ${countryLabel(track.country)}` : ""}`
      : "Pista fora da base local: vou inferir o perfil pelo nome.";
  }
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

function validateCurrentStep() {
  if (currentStep === 0 && !carValue.value) {
    carSearch.setCustomValidity("Escolha um carro da lista.");
    carSearch.reportValidity();
    return false;
  }

  if (currentStep === 1 && !trackValue.value) {
    trackSearch.setCustomValidity("Escolha uma pista da lista.");
    trackSearch.reportValidity();
    return false;
  }

  const required = steps[currentStep].querySelector("[required]");
  if (required && !required.reportValidity()) return false;
  return true;
}

function data() {
  return {
    ...Object.fromEntries(new FormData(form).entries()),
    driverNotes: driverNotes.value,
  };
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

  const torqueSplit = is4WD ? ["Torque split", "35:65 para tração; 30:70 se precisar rotacionar mais"] : null;

  return { car, track, tune, torqueSplit };
}

function rows(items) {
  return `<div class="setup-grid">${items.map(([k, v]) => `<span>${k}</span><strong>${v}</strong>`).join("")}</div>`;
}

function noteObservation(notes) {
  const text = String(notes || "").trim();
  if (!text) return "";

  const n = normalize(text);
  const suggestions = [];
  if (/\b(curva|miolo|espalha|frente|understeer|subester)/.test(n)) {
    suggestions.push("priorizei frente mais obediente no meio/entrada de curva sem deixar a traseira solta demais");
  }
  if (/\b(traseira|sai de traseira|sobrester|oversteer|escapa)/.test(n)) {
    suggestions.push("dei mais margem para a traseira na saída, com toe traseiro e LSD menos agressivos");
  }
  if (/\b(reta|aceleracao|acelerar|velocidade|final|arrancada)/.test(n)) {
    suggestions.push("mantive o câmbio e a aero pensando em recuperar aceleração sem matar a velocidade final");
  }
  if (/\b(frei|freada|freando|brake|instavel)/.test(n)) {
    suggestions.push("deixei a frenagem mais estável para o carro aceitar trail braking com menos correção");
  }
  if (/\b(pneu|desgaste|stint|borracha)/.test(n)) {
    suggestions.push("segurei cambagem e diferencial para preservar pneu ao longo do stint");
  }

  const detail = suggestions.length
    ? suggestions.join("; ")
    : "mantive uma base neutra e fácil de ajustar depois das primeiras voltas";

  return `Li seu contexto: "${escapeHtml(text)}". Com isso, ${detail}. Use o setup como base e, se esse ponto específico continuar aparecendo, mexa primeiro no ajuste relacionado dentro do bloco acima.`;
}

function renderSetup(input) {
  const { car, track, tune, torqueSplit } = buildSetup(input);
  const pp = input.ppLimit ? `, limite ${input.ppLimit} PP` : "";
  const wearLabel = input.tireWear === "0" ? "off" : `${input.tireWear}x`;
  const fuelLabel = input.fuel === "0" ? "off" : `${input.fuel}x`;

  const blocks = [
    ["Resumo", rows([
      ["Carro", car.name],
      ["Tração detectada", car.drivetrain],
      ["Pista", `${track.name} (${track.type})`],
      ["Modo", `${input.mode}, BoP ${input.bop}${pp}`],
      ["Duração", raceLength(input)],
      ["Pneus/consumo", `${input.tires}, desgaste ${wearLabel}, combustível ${fuelLabel}`],
    ])],
    ["Pneus e suspensão", rows([
      ["Pneus", `${tune.frontTire} / ${tune.rearTire}`],
      ["Altura", `${tune.heightF} / ${tune.heightR}`],
      ["Anti-roll bar", `${tune.arbF} / ${tune.arbR}`],
      ["Damping comp.", `${tune.compF} / ${tune.compR}`],
      ["Damping exp.", `${tune.expF} / ${tune.expR}`],
      ["Frequência", `${tune.freqF} / ${tune.freqR}`],
      ["Cambagem", `${tune.camberF} / ${tune.camberR}`],
      ["Toe", `${tune.toeF} / ${tune.toeR}`],
    ])],
    ["Diferencial e aero", rows([
      ["LSD inicial", tune.lsdInitial],
      ["LSD aceleração", tune.lsdAccel],
      ["LSD frenagem", tune.lsdBrake],
      ...(torqueSplit ? [torqueSplit] : []),
      ["Downforce", `${tune.downF} / ${tune.downR}`],
      ["Brake balance", tune.brake],
    ])],
    ["Potência e câmbio", rows([
      ["ECU", `${tune.ecu}%`],
      ["Ballast", `${tune.ballast} kg`],
      ["Ballast position", tune.ballastPos],
      ["Power restrictor", `${tune.restrictor}%`],
      ["Câmbio auto set", `${tune.topSpeed} km/h`],
      ["Nitro/Overtake", "None"],
    ])],
  ];
  const observation = noteObservation(input.driverNotes);
  if (observation) {
    blocks.push(["Observação", `<p class="friendly-note">${observation}</p>`]);
  }

  lastPlainText = [
    `GT7 Setup Engineer - ${car.name} em ${track.name}`,
    `Tração: ${car.drivetrain} | Modo: ${input.mode} | BoP: ${input.bop} | Pneus: ${input.tires}`,
    `Duração: ${raceLength(input)} | Desgaste: ${wearLabel} | Combustível: ${fuelLabel}`,
    `Altura: ${tune.heightF}/${tune.heightR}`,
    `ARB: ${tune.arbF}/${tune.arbR}`,
    `Damping comp: ${tune.compF}/${tune.compR}`,
    `Damping exp: ${tune.expF}/${tune.expR}`,
    `Frequência: ${tune.freqF}/${tune.freqR}`,
    `Cambagem: ${tune.camberF}/${tune.camberR}`,
    `Toe: ${tune.toeF}/${tune.toeR}`,
    `LSD: ${tune.lsdInitial}/${tune.lsdAccel}/${tune.lsdBrake}`,
    `Downforce: ${tune.downF}/${tune.downR}`,
    `ECU: ${tune.ecu}% | Restrictor: ${tune.restrictor}% | Câmbio: ${tune.topSpeed} km/h`,
    observation ? `Observação: ${observation.replace(/<[^>]*>/g, "")}` : "",
  ].filter(Boolean).join("\n");

  resultKicker.textContent = "Setup gerado";
  resultTitle.textContent = `${car.name} - ${track.name}`;
  notesEditor.classList.add("hidden");
  copy.classList.remove("hidden");
  result.className = "setup-output";
  result.innerHTML = blocks.map(([title, body]) => `<div class="setup-block"><h3>${title}</h3>${body}</div>`).join("");
  restart.classList.remove("hidden");
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetFlow() {
  form.reset();
  carValue.value = "";
  trackValue.value = "";
  carSearch.value = "";
  trackSearch.value = "";
  clearCarSelection();
  clearTrackSelection();
  lastPlainText = "";
  currentStep = 0;
  resultKicker.textContent = "Detalhes opcionais";
  resultTitle.textContent = "Conte mais sobre a corrida";
  notesEditor.classList.remove("hidden");
  driverNotes.value = "";
  result.className = "result-empty";
  result.textContent = initialResultText;
  restart.classList.add("hidden");
  copy.classList.add("hidden");
  copy.textContent = "Copiar";
  updateSliders();
  updateStep();
  renderCarResults();
  renderTrackResults();
  document.querySelector(".tool-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

next.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
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

carBrand.addEventListener("change", () => {
  clearCarSelection();
  carSearch.value = "";
  carSearch.setCustomValidity("");
  renderCarResults();
});

carSearch.addEventListener("input", () => {
  clearCarSelection();
  carSearch.setCustomValidity("");
  renderCarResults();
});

carSearch.addEventListener("focus", renderCarResults);

trackCountry.addEventListener("change", () => {
  clearTrackSelection();
  trackSearch.value = "";
  trackSearch.setCustomValidity("");
  renderTrackResults();
});

trackSearch.addEventListener("input", () => {
  clearTrackSelection();
  trackSearch.setCustomValidity("");
  renderTrackResults();
});

trackSearch.addEventListener("focus", renderTrackResults);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generate.disabled = true;
  generate.textContent = "Gerando...";
  resultKicker.textContent = "Setup gerado";
  resultTitle.textContent = "Gerando setup...";
  notesEditor.classList.add("hidden");
  result.className = "result-empty";
  result.textContent = "Calculando tração, perfil da pista, desgaste, combustível e ajustes de base.";

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

restart.addEventListener("click", resetFlow);

start.addEventListener("click", () => {
  document.body.classList.remove("intro-active");
  configurator.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    try {
      carSearch.focus({ preventScroll: true });
    } catch {
      carSearch.focus();
    }
  }, 280);
});

fillFilters();
renderCarResults();
renderTrackResults();
updateSliders();
updateStep();
