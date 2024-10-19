import assert from 'assert';
import { dataError } from 'glov/common/data_error';
import {
  Vec4,
  v4set,
  vec4,
} from 'glov/common/vmath';
import { engineStartupFunc } from './engine';
import { filewatchOn } from './filewatch';
import {
  Sprite,
  SpriteUIData,
  Texture,
  TextureOptions,
  spriteCreate,
} from './sprites';
import { textureError, textureLoad } from './textures';
import { webFSGetFile, webFSOnReady } from './webfs';

import type { TSMap } from 'glov/common/types';

type AutoAtlasBuildData = [string, number, number, number[], number[], number[] | undefined, number[] | undefined];

let load_opts: TSMap<TextureOptions> = {};
let hit_startup = false;
export function autoAtlasTextureOpts(name: string, opts: TextureOptions): void {
  assert(!hit_startup);
  load_opts[name] = opts;
}

const uidata_error: SpriteUIData = {
  rects: [[0,0,1,1]],
  wh: [1],
  hw: [1],
  widths: [1],
  heights: [1],
  aspect: null,
  total_w: 1,
  total_h: 1,
};

function spriteMakeError(sprite: Sprite): void {
  v4set(sprite.uvs as Vec4, 0, 0, 1, 1);
  sprite.texs = [textureError()];
  sprite.uidata = uidata_error;
}

class AutoAtlasImp {
  sprites: TSMap<Sprite & { autoatlas_used?: boolean }> = {};

  // Create with dummy data, will load later
  texs: Texture[] = [];
  prealloc(): Sprite {
    let sprite = spriteCreate({
      texs: this.texs,
      uvs: vec4(0, 0, 1, 1),
    });
    sprite.uidata = uidata_error;
    return sprite;
  }

  did_tex_load = false;

  verifySprites(seen: TSMap<true>): void {
    let { sprites } = this;
    for (let img_name in sprites) {
      if (sprites[img_name]!.autoatlas_used && !seen[img_name] && img_name !== 'def') {
        dataError(`AutoAtlas "${this.atlas_name}" does not contain image "${img_name}"`);
        spriteMakeError(sprites[img_name]!);
      }
    }
  }

  doInit(): void {
    let { sprites, atlas_name, texs } = this;
    let atlas_data = webFSGetFile(`${atlas_name}.auat`, 'jsobj');
    // Root default sprite, with frame-indexing
    let root_sprite = sprites.def = this.prealloc();
    let root_rects = [] as unknown as Vec4[] & TSMap<Vec4>;
    let root_aspect: number[] = [];

    // Make sprites for all named sprites
    let { tiles, w, h } = atlas_data;
    let seen: TSMap<true> = {};
    for (let tile_id = 0; tile_id < tiles.length; ++tile_id) {
      let [tile_name, x, y, ws, hs, padh, padv] = tiles[tile_id] as AutoAtlasBuildData;
      seen[tile_name] = true;
      let total_w = 0;
      for (let jj = 0; jj < ws.length; ++jj) {
        total_w += ws[jj];
      }
      let total_h = 0;
      for (let jj = 0; jj < hs.length; ++jj) {
        total_h += hs[jj];
      }
      root_aspect.push(total_w / total_h);
      let sprite = sprites[tile_name];
      if (!sprite) {
        sprite = sprites[tile_name] = this.prealloc();
      }
      sprite.texs = texs;
      let tile_uvs = sprite.uvs as Vec4;
      v4set(tile_uvs, x/w, y/h, (x+total_w)/w, (y+total_h)/h);
      root_rects.push(tile_uvs);
      root_rects[tile_name] = tile_uvs;

      let wh = [];
      for (let ii = 0; ii < ws.length; ++ii) {
        wh.push(ws[ii] / total_h);
      }
      let hw = [];
      for (let ii = 0; ii < hs.length; ++ii) {
        hw.push(hs[ii] / total_w);
      }
      let aspect = [];
      let non_square = false;
      let yy = y;
      let rects = [];
      for (let jj = 0; jj < hs.length; ++jj) {
        let xx = x;
        for (let ii = 0; ii < ws.length; ++ii) {
          let r = vec4(xx / w, yy / h,
            (xx + ws[ii]) / w, (yy + hs[jj]) / h);
          rects.push(r);
          let asp = ws[ii] / hs[jj];
          if (asp !== 1) {
            non_square = true;
          }
          aspect.push(asp);
          xx += ws[ii];
        }
        yy += hs[jj];
      }
      sprite.uidata = {
        widths: ws,
        heights: hs,
        wh,
        hw,
        rects,
        aspect: non_square ? aspect : null,
        padh,
        padv,
        total_w,
        total_h,
      };
    }

    root_sprite.uidata = {
      rects: root_rects,
      aspect: root_aspect,
      total_h: h,
      total_w: w,
      // These should not be needed:
      widths: null!,
      heights: null!,
      wh: null!,
      hw: null!,
    };

    if (hit_startup) {
      this.verifySprites(seen);
    }

    // Only issue texture load once at startup, not upon reload
    if (this.did_tex_load) {
      return;
    }
    this.did_tex_load = true;
    engineStartupFunc(() => {
      hit_startup = true;
      let opts = load_opts[atlas_name] || {};
      if (atlas_data.layers) {
        for (let idx = 0; idx < atlas_data.layers; ++idx) {
          let tex = textureLoad({
            wrap_s: gl.CLAMP_TO_EDGE,
            wrap_t: gl.CLAMP_TO_EDGE,
            ...opts,
            url: `img/atlas_${atlas_name}_${idx}.png`,
          });
          texs.push(tex);
        }
      } else {
        let tex = textureLoad({
          wrap_s: gl.CLAMP_TO_EDGE,
          wrap_t: gl.CLAMP_TO_EDGE,
          ...opts,
          url: `img/atlas_${atlas_name}.png`,
        });
        texs.push(tex);
      }
      this.verifySprites(seen);
    });
  }

  constructor(public atlas_name: string) {
    webFSOnReady(this.doInit.bind(this));
  }

  get(img_name: string): Sprite {
    let ret = this.sprites[img_name];
    if (!ret) {
      ret = this.sprites[img_name] = this.prealloc();
      if (hit_startup) {
        dataError(`AutoAtlas "${this.atlas_name}" does not contain image "${img_name}"`);
        spriteMakeError(ret);
      }
    }
    ret.autoatlas_used = true;
    return ret;
  }
}

let atlases: TSMap<AutoAtlasImp>;
function autoAtlasReload(filename: string): void {
  filename = filename.slice(0, -5);
  let atlas = atlases[filename];
  if (!atlas) {
    // bundled in app, but not loaded? what a waste, but, I guess, maybe fine?
    // will happen when doing git updates on atlases that are not currently active
    return;
  }
  atlas.doInit();
}

function autoAtlasGet(atlas_name: string): AutoAtlasImp {
  if (!atlases) {
    atlases = {};
    filewatchOn('.auat', autoAtlasReload);
  }
  let atlas = atlases[atlas_name];
  if (!atlas) {
    atlas = atlases[atlas_name] = new AutoAtlasImp(atlas_name);
  }
  return atlas;
}

export function autoAtlas(atlas_name: string, img_name: string): Sprite {
  return autoAtlasGet(atlas_name).get(img_name);
}
