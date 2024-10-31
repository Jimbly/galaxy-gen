export const BIOMES = {
  WATER_DEEP: 24,
  WATER_SHALLOW: 25,
  DESERT: 30,
  GREEN_PLAINS: 26,
  GREEN_FOREST: 29,
  MOUNTAINS: 27,
  MOUNTAINS_SNOW: 28,
  FROZEN_PLAINS: 10,
  FROZEN_MOUNTAINS: 9,
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
  return ret;
}());
