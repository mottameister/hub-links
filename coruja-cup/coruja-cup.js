const eventId = "poison-edition-001";
const capacity = 9;

const form = document.querySelector("[data-registration-form]");
const message = document.querySelector("[data-message]");
const confirmedCount = document.querySelector("[data-confirmed-count]");
const waitlistCount = document.querySelector("[data-waitlist-count]");
const remainingCount = document.querySelector("[data-remaining-count]");

const showMessage = (text, type = "") => {
  if (!message) return;
  message.textContent = text;
  message.className = `message is-visible ${type ? `is-${type}` : ""}`;
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
      showMessage("Preencha seu nick no Minecraft e seu Discord.", "error");
      return;
    }

    if (!payload.rulesAccepted || !payload.scheduleConfirmed) {
      showMessage("Confirme as regras e o horário antes de se inscrever.", "error");
      return;
    }

    submit.disabled = true;
    submit.textContent = "Enviando...";

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
        ? "Você entrou na lista de espera. Se abrir vaga, a organização chama no Discord."
        : "Inscrição confirmada. Te vejo domingo no check-in.";

      showMessage(statusText, "success");
      form.reset();
      await updateStatus();
    } catch (error) {
      showMessage(`${error.message} Se persistir, chama no Discord.`, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "Enviar inscrição";
    }
  });
}

updateStatus();
