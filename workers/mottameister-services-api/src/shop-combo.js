export const comboSku = "combo_personalizado";

const allowedSkus = new Set([
  "cobbledollars_1m", "cobbledollars_5m", "cobbledollars_10m", "cobbledollars_15m", "cobbledollars_20m", "cobbledollars_30m",
  "claims_5", "claims_12", "claims_20", "claims_30", "claims_45", "claims_60",
  "coruja_plus", "coruja_plus_plus", "coruja_gold", "coruja_diamond",
  "chunk_loader_1", "shiny_cookie", "ace_trainer_toca",
]);

const badCombo = (message) => Object.assign(new Error(message), { statusCode: 400 });
const money = (value) => Math.round(value * 100) / 100;

export const calculateCombo = (input, products) => {
  if (!Array.isArray(input) || input.length < 1 || input.length > allowedSkus.size) {
    throw badCombo(`Escolha de 1 a ${allowedSkus.size} beneficios para o combo.`);
  }

  const seen = new Set();
  let membershipSku = "";
  const items = input.map((entry) => {
    const sku = String(entry?.sku || "");
    const product = products[sku];
    const quantity = Number(entry?.quantity ?? 1);
    if (!allowedSkus.has(sku) || !product || seen.has(sku)) throw badCombo("Beneficio repetido ou indisponivel no combo.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw badCombo("Quantidade invalida no combo.");
    if (["membership", "manual_fulfillment", "opac_forceload"].includes(product.type) && quantity !== 1) {
      throw badCombo("Assinaturas, servicos e Chunk Loader sao limitados a uma unidade por combo.");
    }
    if (sku === "shiny_cookie" && quantity > 3) throw badCombo("Shiny Cookie limitado a 3 por combo.");
    if (product.type === "membership") {
      if (membershipSku) throw badCombo("Escolha apenas uma assinatura por combo.");
      membershipSku = sku;
    }
    seen.add(sku);
    return { sku, quantity };
  });

  const subtotal = money(items.reduce((total, item) => total + products[item.sku].amount * item.quantity, 0));
  const comboDiscountPercent = items.length >= 4 ? 15 : items.length === 3 ? 10 : items.length === 2 ? 5 : 0;
  return {
    items,
    subtotal,
    comboDiscountPercent,
    comboAmount: money(subtotal * (1 - comboDiscountPercent / 100)),
    membershipSku,
    hasChunkLoader: seen.has("chunk_loader_1"),
    hasManualItems: items.some((item) => products[item.sku].type === "manual_fulfillment"),
    hasAutomaticItems: items.some((item) => products[item.sku].type !== "manual_fulfillment"),
    cobbleDollars: items.reduce((total, item) => total + (products[item.sku].cobbleDollars || 0) * item.quantity, 0),
    claimChunks: items.reduce((total, item) => total + (products[item.sku].claimChunks || 0) * item.quantity, 0),
    shinyEggs: items.reduce((total, item) => total + (products[item.sku].shinyEggs || 0) * item.quantity, 0),
    shinyCookies: items.find((item) => item.sku === "shiny_cookie")?.quantity || 0,
  };
};
