export const BIOMES = {
  WATER_DEEP: 24,
  WATER_SHALLOW: 25,
  DESERT: 30,
  GREEN_PLAINS: 26,
  GREEN_FOREST: 29,
  MOUNTAINS: 27,
  MOUNTAINS_SNOW: 28,
  FROZEN_PLAINS: 10, // AAP64'd
  FROZEN_OCEAN: 11, // AAP64'd
  FROZEN_MOUNTAINS: 31,
  DIRT: 32,
  DIRT_DARK: 42,
  MOLTEN_MOUNTAINS: 36,
  MOLTEN_PLAINS: 37,
  MOLTEN_LAVAFLOW: 38,
  DIRT_RED: 46,
  DEAD_FOREST: 1, // AAP64'd
  // needs pixel art below here
  MOONROCK1: 6,
  MOONROCK2: 7,
  MOONROCK3: 8,
  MOONROCK4: 9,
  GAS_ORANGE_LIGHT: 33,
  GAS_ORANGE_DARK: 34,
  GAS_GRAY: 35,
  GAS_BLUE_DARK: 39,
  GAS_BLUE_MED: 40,
  GAS_BLUE_LIGHT: 41,
  GAS_YELLOW: 43,
  GAS_YELLOW_RED: 44,
  GAS_RED: 45,
  GAS_PURPLE_LIGHT: 16,
  GAS_PURPLE_DARK: 17,
};
type BiomeName = keyof typeof BIOMES;
export type Biome = typeof BIOMES[BiomeName];

export const BIOMES_SAME_LOOSE = (function () {
  let ret: Record<Biome, Partial<Record<Biome, true>>> = {};
  let key: BiomeName;
  for (key in BIOMES) {
    let v = BIOMES[key]!;
    ret[v] = { [v]: true };
  }
  function associate(b1: Biome, b2: Biome): void {
    ret[b1][b2] = true;
    ret[b2][b1] = true;
  }
  associate(BIOMES.GREEN_PLAINS, BIOMES.GREEN_FOREST);
  associate(BIOMES.GREEN_PLAINS, BIOMES.MOUNTAINS);
  associate(BIOMES.GREEN_FOREST, BIOMES.MOUNTAINS);
  // associate(BIOMES.DIRT_RED, BIOMES.DEAD_FOREST);
  return ret;
}());
