// Aktuelle Einstellungen
let currentShape = "slab"; // 'slab' | 'column' | 'bagsLeft'
let currentMode = "bags";  // 'bags' | 'truck' | 'mixer'
let lastSummaryText = "";

// HTML-Elemente verknüpfen
const shapeTabs = document.querySelectorAll("#shapeTabs .tab");
const modeTabs = document.querySelectorAll("#modeTabs .tab");

const inputsSlab = document.getElementById("inputsSlab");
const inputsColumn = document.getElementById("inputsColumn");
const inputsBagsLeft = document.getElementById("inputsBagsLeft");
const reserveRow = document.getElementById("reserveRow");

const modeBags = document.getElementById("modeBags");
const modeTruck = document.getElementById("modeTruck");
const modeMixer = document.getElementById("modeMixer");

const reserveSlider = document.getElementById("reserve");
const reserveVal = document.getElementById("reserveVal");

// Hilfsfunktion für deutsche Zahlenformatierung (Komma statt Punkt)
function fmt(num, decimals = 2) {
  return num.toFixed(decimals).replace(".", ",");
}

// Bauteil wechseln (Platte / Punktfundament / Rückwärts)
shapeTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    shapeTabs.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentShape = btn.dataset.shape;

    inputsSlab.classList.toggle("hidden", currentShape !== "slab");
    inputsColumn.classList.toggle("hidden", currentShape !== "column");
    inputsBagsLeft.classList.toggle("hidden", currentShape !== "bagsLeft");
    reserveRow.classList.toggle("hidden", currentShape === "bagsLeft");

    calculate();
  });
});

// Lieferart wechseln (Sackware / Fahrmischer / Betonmischer)
modeTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeTabs.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;

    modeBags.classList.toggle("hidden", currentMode !== "bags");
    modeTruck.classList.toggle("hidden", currentMode !== "truck");
    modeMixer.classList.toggle("hidden", currentMode !== "mixer");

    calculate();
  });
});

// Neuberechnung bei jeder Änderung
document.querySelectorAll("input, select").forEach((el) => {
  el.addEventListener("input", () => {
    reserveVal.textContent = reserveSlider.value + "%";
    calculate();
  });
});

// Hauptberechnung
function calculate() {
  const bagWeight = parseFloat(document.getElementById("bagWeight").value) || 25;
  const yieldPerKg = parseFloat(document.getElementById("yieldPerKg").value) || 0.5;
  const litersPerBag = bagWeight * yieldPerKg; // z.B. 25 kg * 0,5 = 12,5 Liter

  const detailsEl = document.getElementById("resultDetails");
  const warningEl = document.getElementById("warningBox");
  const bigNumberEl = document.getElementById("totalVolume");
  const subNumberEl = document.getElementById("netVolume");
  const badgeEl = document.getElementById("resultBadge");

  warningEl.classList.add("hidden");
  warningEl.textContent = "";

  // FALL 1: Rückwärts-Rechner (Vorhandene Säcke)
  if (currentShape === "bagsLeft") {
    const availableBags = parseFloat(document.getElementById("availableBags").value) || 0;
    const thicknessCm = parseFloat(document.getElementById("targetThicknessCm").value) || 1;

    const totalLiters = availableBags * litersPerBag;
    const totalM3 = totalLiters / 1000;
    const thicknessM = thicknessCm / 100;
    const areaM2 = totalM3 / thicknessM;

    badgeEl.textContent = "VORHANDENES VOLUMEN";
    bigNumberEl.textContent = `${fmt(totalM3, 3)} m³ (${totalLiters.toFixed(0)} L)`;
    subNumberEl.textContent = `Aus ${availableBags} Säcken × ${bagWeight} kg`;

    detailsEl.innerHTML = `
      <div class="detail-item">
        <span>Reicht für Fläche bei ${fmt(thicknessCm, 1)} cm Stärke:</span>
        <strong>${fmt(areaM2, 2)} m²</strong>
      </div>
      <div class="detail-item">
        <span>Gesamtgewicht Trockenmischung:</span>
        <strong>${(availableBags * bagWeight).toFixed(0)} kg</strong>
      </div>
    `;

    lastSummaryText = `Vorhanden: ${availableBags} Säcke x ${bagWeight} kg = ${fmt(totalM3, 2)} m³ (reicht für ca. ${fmt(areaM2, 2)} m² bei ${fmt(thicknessCm, 1)} cm Stärke).`;
    return;
  }

  // FALL 2: Volumenberechnung (Platte oder Punktfundament)
  let netM3 = 0;

  if (currentShape === "slab") {
    const l = parseFloat(document.getElementById("length").value) || 0;
    const w = parseFloat(document.getElementById("width").value) || 0;
    const hM = (parseFloat(document.getElementById("heightCm").value) || 0) / 100;
    netM3 = l * w * hM;
  } else if (currentShape === "column") {
    const rM = ((parseFloat(document.getElementById("diameterCm").value) || 0) / 100) / 2;
    const depthM = (parseFloat(document.getElementById("depthCm").value) || 0) / 100;
    const count = parseFloat(document.getElementById("holesCount").value) || 0;
    netM3 = Math.PI * rM * rM * depthM * count;
  }

  const reservePct = parseFloat(reserveSlider.value) || 0;
  let totalM3 = netM3 * (1 + reservePct / 100);

  // Restmenge für Betonpumpe addieren
  let pumpExtra = 0;
  if (currentMode === "truck") {
    pumpExtra = parseFloat(document.getElementById("usePump").value) || 0;
    totalM3 += pumpExtra;
  }

  const totalLiters = totalM3 * 1000;

  badgeEl.textContent = "BENÖTIGTER BETON (INKL. RESERVE)";
  bigNumberEl.textContent = `${fmt(totalM3, 2)} m³`;
  subNumberEl.textContent = `Nettovolumen: ${fmt(netM3, 2)} m³ + ${reservePct}% Reserve (${totalLiters.toFixed(0)} Liter)`;

  // Details nach Lieferart
  if (currentMode === "bags") {
    const bagsNeeded = Math.ceil(totalLiters / litersPerBag);
    const totalKg = bagsNeeded * bagWeight;
    const pallets = fmt(totalKg / 1050, 1); // ca. 42 Säcke à 25 kg pro Palette
    const waterLiters = Math.round(bagsNeeded * (bagWeight * 0.11));

    detailsEl.innerHTML = `
      <div class="detail-item">
        <span>Anzahl Säcke (${bagWeight} kg):</span>
        <strong>${bagsNeeded} Stk.</strong>
      </div>
      <div class="detail-item">
        <span>Gesamtgewicht:</span>
        <strong>${totalKg} kg (~${pallets} Paletten)</strong>
      </div>
      <div class="detail-item">
        <span>Wasserbedarf ca.:</span>
        <strong>~${waterLiters} Liter</strong>
      </div>
    `;

    if (bagsNeeded > 45) {
      warningEl.classList.remove("hidden");
      warningEl.textContent =
        "Hinweis: Über 1 Palette Sackware! Prüfen Sie, ob Transportbeton (Fahrmischer) günstiger und schneller ist.";
    }

    lastSummaryText = `Betonbedarf: ${fmt(totalM3, 2)} m³ | Bestellung: ${bagsNeeded} Säcke Estrich-Beton à ${bagWeight} kg (${totalKg} kg gesamt, inkl. ${reservePct}% Reserve).`;
  } else if (currentMode === "truck") {
    const grade = document.getElementById("concreteGrade").value;
    // Betonwerke runden meist auf 0,25 m³ auf
    const orderM3 = fmt(Math.ceil(totalM3 * 4) / 4, 2);

    detailsEl.innerHTML = `
      <div class="detail-item">
        <span>Empfohlene Bestellmenge Betonwerk:</span>
        <strong>${orderM3} m³ (${grade})</strong>
      </div>
      <div class="detail-item">
        <span>Restmenge Pumpe inkl.:</span>
        <strong>${fmt(pumpExtra, 2)} m³</strong>
      </div>
    `;

    if (totalM3 > 0 && totalM3 < 3.5) {
      warningEl.classList.remove("hidden");
      warningEl.textContent =
        "Achtung: Unter 3–4 m³ berechnen Betonwerke in Deutschland oft einen Mindermengenzuschlag.";
    }

    lastSummaryText = `Betonbestellung: ${orderM3} m³ (${grade}), inkl. ${reservePct}% Reserve${pumpExtra > 0 ? " + Pumpe" : ""}.`;
  } else if (currentMode === "mixer") {
    const cementKg = Math.ceil(totalM3 * 320);
    const cementBags = Math.ceil(cementKg / 25);
    const gravelKg = Math.ceil(totalM3 * 1900);
    const waterL = Math.ceil(totalM3 * 170);

    detailsEl.innerHTML = `
      <div class="detail-item">
        <span>Zement (25 kg Säcke):</span>
        <strong>${cementBags} Säcke (${cementKg} kg)</strong>
      </div>
      <div class="detail-item">
        <span>Sand + Kies (0–16 / 0–32):</span>
        <strong>${fmt(gravelKg / 1000, 2)} t (${gravelKg} kg)</strong>
      </div>
      <div class="detail-item">
        <span>Wasserbedarf ca.:</span>
        <strong>~${waterL} Liter</strong>
      </div>
    `;

    lastSummaryText = `Baustellenmischung (${fmt(totalM3, 2)} m³): ${cementBags} Säcke Zement (25 kg) + ${fmt(gravelKg / 1000, 2)} t Betonkies.`;
  }
}

// Text für WhatsApp / SMS kopieren
document.getElementById("copyBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(lastSummaryText).then(() => {
    const btn = document.getElementById("copyBtn");
    const oldText = btn.textContent;
    btn.textContent = "Kopiert! Bereit zum Einfügen";
    setTimeout(() => (btn.textContent = oldText), 2000);
  });
});

// Startberechnung beim Laden
calculate();

// Създава снимка (PNG) с текущите данни от калкулатора
async function createSummaryImageFile() {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 540;
  const ctx = canvas.getContext("2d");

  // Фон и рамка
  ctx.fillStyle = "#12151a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  // Заглавие и дата
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillText("BETON & ESTRICH RECHNER", 56, 86);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "22px system-ui, sans-serif";
  const now = new Date().toLocaleString("de-DE");
  ctx.fillText(now, 56, 124);

  // Главен резултат
  const mainVol = document.getElementById("totalVolume").textContent;
  const subVol = document.getElementById("netVolume").textContent;

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 58px system-ui, sans-serif";
  ctx.fillText(mainVol, 56, 205);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText(subVol, 56, 245);

  // Редовете с детайли от екрана
  const items = document.querySelectorAll("#resultDetails .detail-item");
  let y = 310;
  ctx.font = "26px system-ui, sans-serif";

  items.forEach((row) => {
    const spans = row.querySelectorAll("span, strong");
    if (spans.length >= 2) {
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(spans[0].textContent.trim(), 56, y);

      ctx.fillStyle = "#fbbf24";
      ctx.fillText(spans[1].textContent.trim(), 560, y);
      y += 46;
    }
  });

  // Превръщаме canvas в файл (PNG)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], "beton-berechnung.png", { type: "image/png" });
      resolve(file);
    }, "image/png");
  });
}

document.getElementById("imgBtn").addEventListener("click", async () => {
  const file = await createSummaryImageFile();
  const phoneRaw = (document.getElementById("waPhone")?.value || "").replace(/\D/g, "");

  // На телефон / поддържащ браузър отваря системното меню за споделяне (вкл. WhatsApp)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Beton Berechnung",
        text: lastSummaryText
      });
      return;
    } catch (err) {
      // Ако потребителят затвори менюто, падаме към сваляне на файла
    }
  }

  // На компютър: сваля PNG файла, за да го прикачиш лесно в WhatsApp Web
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = "beton-berechnung.png";
  a.click();
  URL.revokeObjectURL(url);

  // Ако е въведен номер, отваря и чат с него в нов таб
  if (phoneRaw) {
    const waUrl = `https://wa.me/${phoneRaw}?text=${encodeURIComponent(lastSummaryText)}`;
    window.open(waUrl, "_blank");
  }
});