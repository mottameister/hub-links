const eventId = "coruja-cup-next";
const apiBaseUrl = "https://coruja-cup-api.mottameister.xyz";

const form = document.querySelector("[data-registration-form]");
const message = document.querySelector("[data-message]");
const root = document.documentElement;

const copy = {
  "pt-BR": {
    discordPlaceholder: "ex: mottameister",
    timezonePlaceholder: "ex: Brasil, EUA Eastern, Portugal",
    notesPlaceholder: "Algo que a organização precisa saber?",
    sending: "Enviando...",
    submit: "Enviar inscrição",
    missingFields: "Preencha seu nick no Minecraft e seu Discord.",
    missingChecks: "Confirme os avisos da próxima edição antes de se inscrever.",
    confirmed: "Inscrição recebida. A organização chama no Discord quando a próxima edição tiver data e regras definidas.",
    fallbackError: "Não foi possível enviar sua inscrição agora.",
    storageError: "Inscrições ainda não configuradas no servidor.",
    discordSuffix: "Se persistir, chama no Discord.",
  },
  "en-US": {
    discordPlaceholder: "e.g. mottameister",
    timezonePlaceholder: "e.g. Brazil, US Eastern, Portugal",
    notesPlaceholder: "Anything the organizers should know?",
    sending: "Sending...",
    submit: "Submit registration",
    missingFields: "Fill in your Minecraft nickname and Discord name.",
    missingChecks: "Confirm the next-edition notices before registering.",
    confirmed: "Registration received. The organizers will contact you on Discord when the next edition has a date and rules.",
    fallbackError: "We could not submit your registration right now.",
    storageError: "Registrations are not fully configured on the server yet.",
    discordSuffix: "If it keeps happening, message us on Discord.",
  },
};

const t = (key) => {
  const lang = root.dataset.lang === "en-US" ? "en-US" : "pt-BR";
  return copy[lang][key];
};

const apiUrl = (path) => `${apiBaseUrl}${path}`;

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
      const response = await fetch(apiUrl("/api/coruja-cup/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível enviar sua inscrição agora.");
      }

      showMessage(t("confirmed"), "success");
      form.reset();
    } catch (error) {
      showMessage(`${localizeError(error.message)} ${t("discordSuffix")}`, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = t("submit");
    }
  });
}

window.addEventListener("coruja-cup-langchange", applyLocalizedFormCopy);
applyLocalizedFormCopy();
