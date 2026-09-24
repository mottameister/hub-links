const tiers = {
  iron: { material: "iron", level: 1, unbreaking: 1, fortune: 1, sharpness: 1, protection: 1 },
  diamond: { material: "diamond", level: 2, unbreaking: 2, fortune: 2, sharpness: 2, protection: 2 },
  netherite: { material: "netherite", level: 5, unbreaking: 3, fortune: 3, sharpness: 5, protection: 4 },
};

const enchantmentComponent = (levels) => {
  const entries = Object.entries(levels).map(([id, level]) => `${id}:${level}`).join(",");
  return `enchantments:{levels:{${entries}}}`;
};

const kitItems = (tier) => {
  const spec = tiers[tier];
  if (!spec) throw new Error(`Unknown explorer kit tier: ${tier}`);
  const topTier = tier === "netherite";
  const durability = { unbreaking: spec.unbreaking, ...(topTier ? { mending: 1 } : {}) };
  const armor = (extra = {}) => ({ protection: spec.protection, ...durability, ...extra });
  const tool = (extra = {}) => ({ efficiency: spec.level, ...durability, ...extra });
  const material = spec.material;
  return [
    [`${material}_helmet`, armor(topTier ? { respiration: 3, aqua_affinity: 1 } : {})],
    [`${material}_chestplate`, armor()],
    [`${material}_leggings`, armor()],
    [`${material}_boots`, armor({ feather_falling: topTier ? 4 : spec.protection, ...(topTier ? { depth_strider: 3 } : {}) })],
    [`${material}_sword`, { sharpness: spec.sharpness, ...durability, ...(topTier ? { looting: 3 } : {}) }],
    [`${material}_pickaxe`, tool({ fortune: spec.fortune })],
    [`${material}_axe`, tool()],
    [`${material}_shovel`, tool()],
    [`${material}_hoe`, tool()],
  ];
};

const buildKitCommand = (minecraftNick, tier) => {
  if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftNick)) throw new Error("Invalid Minecraft nickname for kit.");
  const slots = kitItems(tier).map(([id, enchants], slot) =>
    `{slot:${slot},item:{id:'${id}',count:1,components:{${enchantmentComponent(enchants)}}}}`);
  return `give ${minecraftNick} shulker_box[container=[${slots.join(",")}]] 1`;
};

module.exports = { buildKitCommand, kitItems };
