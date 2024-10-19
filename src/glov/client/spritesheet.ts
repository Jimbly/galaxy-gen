import assert from 'assert';
import { TSMap } from 'glov/common/types';
import {
  Vec4,
  vec2,
  vec4,
} from 'glov/common/vmath';
import { engineStartupFunc } from './engine';
import {
  Sprite,
  SpriteUIData,
  Texture,
  TextureOptions,
  spriteCreate,
} from './sprites';
import { textureLoad } from './textures';

export type SpriteSheetBuildTime = {
  name: string;
  tiles: TSMap<number>;
  uidata: {
    rects: Vec4[];
    aspect?: number[];
  };
  layers?: number;
  // [frame:string]: number; // FRAME_*
};

export type SpriteSheet = {
  sprite: Sprite;
  sprite_centered: Sprite;
  sprite_centered_x: Sprite;
  tiles: Partial<Record<string, number>>;
};


const uvs = vec4(0, 0, 1, 1);
const origin_centered = vec2(0.5, 0.5);
const origin_centered_x = vec2(0.5, 0);
let load_opts: TSMap<TextureOptions> = {};
let hit_startup = false;
export function spritesheetTextureOpts(name: string, opts: TextureOptions): void {
  assert(!hit_startup);
  load_opts[name] = opts;
}

// Called only from auto-generated .js files
export function spritesheetRegister(runtime_data_in: SpriteSheetBuildTime): void {
  let runtime_data = runtime_data_in as (SpriteSheetBuildTime & SpriteSheet & TSMap<Sprite>);
  // Create with dummy data, will load later
  let texs: Texture[] = [];
  let sprite = runtime_data.sprite = spriteCreate({ texs, uvs });
  runtime_data[`sprite_${runtime_data.name}`] = sprite;
  let sprite_centered = runtime_data.sprite_centered = spriteCreate({ texs, uvs, origin: origin_centered });
  runtime_data[`sprite_${runtime_data.name}_centered`] = sprite_centered;
  let sprite_centered_x = runtime_data.sprite_centered_x = spriteCreate({ texs, uvs, origin: origin_centered_x });
  runtime_data[`sprite_${runtime_data.name}_centered_x`] = sprite_centered_x;
  sprite.uidata = sprite_centered.uidata = sprite_centered_x.uidata = runtime_data.uidata as SpriteUIData;
  engineStartupFunc(function () {
    hit_startup = true;
    let opts = load_opts[runtime_data.name] || {};
    if (runtime_data.layers) {
      for (let idx = 0; idx < runtime_data.layers; ++idx) {
        let tex = textureLoad({
          ...opts,
          url: `img/${runtime_data.name}_${idx}.png`,
        });
        texs.push(tex);
      }
    } else {
      let tex = textureLoad({
        ...opts,
        url: `img/${runtime_data.name}.png`,
      });
      texs.push(tex);
    }
  });
}
