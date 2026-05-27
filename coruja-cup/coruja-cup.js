const eventId = "poison-edition-001";
const capacity = 9;

const form = document.querySelector("[data-registration-form]");
const message = document.querySelector("[data-message]");
const confirmedCount = document.querySelector("[data-confirmed-count]");
const waitlistCount = document.querySelector("[data-waitlist-count]");
const remainingCount = document.querySelector("[data-remaining-count]");
const root = document.documentElement;

const copy = {
  "pt-BR": {
    discordPlaceholder: "ex: mottameister",
    timezonePlaceholder: "ex: Brasil, EUA Eastern, Portugal",
    notesPlaceholder: "Algo que a organização precisa saber?",
    sending: "Enviando...",
    submit: "Enviar inscrição",
    missingFields: "Preencha seu nick no Minecraft e seu Discord.",
    missingChecks: "Confirme as regras e o horário antes de se inscrever.",
    waitlist: "Você entrou na lista de espera. Se abrir vaga, a organização chama no Discord.",
    confirmed: "Inscrição confirmada. Te vejo domingo no check-in.",
    fallbackError: "Não foi possível enviar sua inscrição agora.",
    storageError: "Inscrições ainda não configuradas no servidor. Falta conectar o Vercel Blob no projeto.",
    discordSuffix: "Se persistir, chama no Discord.",
  },
  "en-US": {
    discordPlaceholder: "e.g. mottameister",
    timezonePlaceholder: "e.g. Brazil, US Eastern, Portugal",
    notesPlaceholder: "Anything the organizers should know?",
    sending: "Sending...",
    submit: "Submit registration",
    missingFields: "Fill in your Minecraft nickname and Discord name.",
    missingChecks: "Confirm the rules and schedule before registering.",
    waitlist: "You joined the waitlist. If a spot opens, the organizers will contact you on Discord.",
    confirmed: "Registration confirmed. See you Sunday at check-in.",
    fallbackError: "We could not submit your registration right now.",
    storageError: "Registrations are not fully configured on the server yet. The Vercel Blob store still needs to be connected.",
    discordSuffix: "If it keeps happening, message us on Discord.",
  },
};

const t = (key) => {
  const lang = root.dataset.lang === "en-US" ? "en-US" : "pt-BR";
  return copy[lang][key];
};

const showMessage = (text, type = "") => {
  if (!message) return;
  message.textContent = text;
  message.className = `message is-visible ${type ? `is-${type}` : ""}`;
};

const localizeError = (messageText) => {
  if (String(messageText || "").includes("Vercel Blob")) {
    return t("storageError");
  }
  return messageText || t("fallbackError");
};

const applyLocalizedFormCopy = () => {
  const discord = document.querySelector("#discordName");
  const timezone = document.querySelector("#timezone");
  const notes = document.querySelector("#notes");
  const submit = form && form.querySelector("button[type='submit']");

  if (discord) discord.placeholder = t("discordPlaceholder");
  if (timezone) timezone.placeholder = t("timezonePlaceholder");
  if (notes) notes.placeholder = t("notesPlaceholder");
  if (submit && !submit.disabled) submit.textContent = t("submit");
};

const updateStatus = async () => {
  try {
    const response = await fetch(`/api/coruja-cup/status?eventId=${encodeURIComponent(eventId)}`);
    if (!response.ok) throw new Error("status unavailable");
    const data = await response.json();
    const confirmed = Number(data.confirmed || 0);
    const waitlist = Number(data.waitlist || 0);
    const remaining = Math.max(capacity - confirmed, 0);

    if (confirmedCount) confirmedCount.textContent = String(confirmed);
    if (waitlistCount) waitlistCount.textContent = String(waitlist);
    if (remainingCount) remainingCount.textContent = String(remaining);
  } catch {
    if (confirmedCount) confirmedCount.textContent = "-";
    if (waitlistCount) waitlistCount.textContent = "-";
    if (remainingCount) remainingCount.textContent = "9";
  }
};

const getFormData = () => {
  const data = new FormData(form);
  return {
    eventId,
    minecraftNick: String(data.get("minecraftNick") || "").trim(),
    discordName: String(data.get("discordName") || "").trim(),
    timezone: String(data.get("timezone") || "").trim(),
    notes: String(data.get("notes") || "").trim(),
    rulesAccepted: data.get("rulesAccepted") === "on",
    scheduleConfirmed: data.get("scheduleConfirmed") === "on",
  };
};

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("button[type='submit']");
    const payload = getFormData();

    if (!payload.minecraftNick || !payload.discordName) {
      showMessage(t("missingFields"), "error");
      return;
    }

    if (!payload.rulesAccepted || !payload.scheduleConfirmed) {
      showMessage(t("missingChecks"), "error");
      return;
    }

    submit.disabled = true;
    submit.textContent = t("sending");

    try {
      const response = await fetch("/api/coruja-cup/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível enviar sua inscrição agora.");
      }

      const statusText = data.status === "waitlist"
        ? t("waitlist")
        : t("confirmed");

      showMessage(statusText, "success");
      form.reset();
      await updateStatus();
    } catch (error) {
      showMessage(`${localizeError(error.message)} ${t("discordSuffix")}`, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = t("submit");
    }
  });
}

new MutationObserver(applyLocalizedFormCopy).observe(root, {
  attributes: true,
  attributeFilter: ["data-lang"],
});
applyLocalizedFormCopy();
updateStatus();
