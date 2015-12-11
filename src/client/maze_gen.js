const assert = require('assert');
const { abs, max, min, round } = Math;
const { randCreate } = require('./glov/rand_alea.js');
const { clamp, ridx, sign } = require('../common/util.js');

export const M_OPEN = 0;
export const M_WALL = 1;
export const M_LEAF = 2;
export const M_TREASURE = 3;
export const M_INTERIOR = 4;
export const M_TORCH = 5;
export const M_DOOR = 6;

let rand = randCreate(1);
// Using recursive division method
export function mazeGen(params) {
  const { w, h, min_dim, door_w, r1, treasure, seed } = params;
  const size = w * h;
  let maze = new Uint8Array(size);
  let max_depth = 0;
  rand.reseed(seed);

  function paintDepth(depth, door) {
    let depthv = depth << 4;
    let { rooms, x, y } = door;
    assert(rooms);
    for (let ii = 0; ii < door_w; ++ii) {
      for (let jj = 0; jj < door_w; ++jj) {
        let idx = x + ii + (y + jj) * w;
        if (maze[idx] === M_DOOR) {
          maze[idx] |= depthv;
        }
      }
    }
    let next = [];
    for (let ii = 0; ii < rooms.length; ++ii) {
      let room = rooms[ii];
      if (room.depth !== undefined) {
        continue;
      }
      room.depth = depth;
      let { x0, y0, x1, y1, doors } = room;
      for (let jj = 0; jj < doors.length; ++jj) {
        next.push(doors[jj]);
      }
      for (let xx = x0; xx <= x1; ++xx) {
        for (let yy = y0; yy <= y1; ++yy) {
          maze[xx + yy * w] |= depthv;
        }
      }
    }
    for (let ii = 0; ii < next.length; ++ii) {
      let next_depth = clamp(depth + rand.range(3) - 1, 0, 0xF);
      paintDepth(next_depth, next[ii]);
    }
  }

  function line(x0, y0, x1, y1, v) {
    assert(v);
    let dx = sign(x1 - x0);
    let dy = sign(y1 - y0);
    assert(abs(dx) + abs(dy) <= 1);
    maze[x0 + y0 * w] = v;
    while (x0 !== x1 || y0 !== y1) {
      x0 += dx;
      y0 += dy;
      maze[x0 + y0 * w] = v;
    }
  }
  function drawRect(x0, y0, x1, y1, v) {
    for (let xx = x0; xx <= x1; ++xx) {
      for (let yy = y0; yy <= y1; ++yy) {
        maze[xx + yy * w] = v;
      }
    }
  }
  let doors = [];
  function doorAt(depth, x, y) {
    max_depth = max(max_depth, depth);
    for (let ii = 0; ii < depth; ++ii) {
      if (x >= doors[ii].x &&
        x < doors[ii].x + door_w &&
        y >= doors[ii].y &&
        y < doors[ii].y + door_w
      ) {
        return true;
      }
    }
    return false;
  }
  let terminals = [];
  function divide(depth, x0, y0, x1, y1) {
    let dx = x1 - x0;
    let dy = y1 - y0;
    let r = 0.25 + r1;
    do {
      if (max(dx, dy) < min_dim * 2 + 1) {
        break;
      }
      if (min(dx, dy) <= min_dim) {
        break;
      }
      let offs = (rand.range(2) * 2 - 1) * r;
      r++;
      if (dx > dy) {
        // divide with vertical line
        let split = x0 + round((dx - door_w) / 2 + offs);
        if (split < x0 + min_dim || split > x1 - min_dim) {
          break;
        }
        if (doorAt(depth, split, y0 - 1) || doorAt(depth, split, y1 + 1)) {
          continue;
        }
        let door = y0 + rand.range(dy);
        if (door > y0) {
          line(split, y0, split, door - 1, M_WALL);
        }
        if (door <= y1 - door_w) {
          line(split, door + door_w, split, y1, M_WALL);
        }
        doors[depth] = { x: split, y: door };
        line(split, door, split, door + door_w - 1, M_DOOR);
        divide(depth + 1, x0, y0, split - 1, y1);
        divide(depth + 1, split + 1, y0, x1, y1);
      } else {
        // divide with horizontal line
        let split = y0 + round((dy - 1) / 2 + offs);
        if (split < y0 + min_dim || split > y1 - min_dim) {
          break;
        }
        if (doorAt(depth, x0 - 1, split) || doorAt(depth, x1 + 1, split)) {
          continue;
        }
        let door = x0 + rand.range(dx);
        if (door > x0) {
          line(x0, split, door - 1, split, M_WALL);
        }
        if (door <= x1 - door_w) {
          line(door + door_w, split, x1, split, M_WALL);
        }
        doors[depth] = { x: door, y: split };
        line(door, split, door + door_w - 1, split, M_DOOR);
        divide(depth + 1, x0, y0, x1, split - 1);
        divide(depth + 1, x0, split + 1, x1, y1);
      }
      return;
    } while (true);
    // failed to place anything, is it a dead end?
    let room = { x0, x1, y0, y1, doors: [] };
    let openings = 0;
    for (let ii = 0; ii < depth; ++ii) {
      let door = doors[ii];
      if ((door.x === x0 - 1 || door.x === x1 + 1) && door.y >= y0 && door.y <= y1 ||
        (door.y === y0 - 1 || door.y === y1 + 1) && door.x >= x0 && door.x <= x1
      ) {
        openings++;
        room.doors.push(door);
        door.rooms = door.rooms || [];
        door.rooms.push(room);
      }
    }
    if (openings === 1) {
      drawRect(x0, y0, x1, y1, M_LEAF);
      terminals.push(room);
    } else {
      // hallway / adjoining multiple rooms
      // Also add a torch somewhere not overlapping a doorway
      let torch_pos = null;
      let count = 0;
      for (let xx = x0; xx <= x1; ++xx) {
        for (let yy = y0; yy <= y1; ++yy) {
          if (xx === x0 || xx === x1 || yy === y0 || yy === y1) {
            // on the edge, potential torch
            if (xx === x0 && doorAt(depth, xx - 1, yy) ||
              xx === x1 && doorAt(depth, xx + 1, yy) ||
              yy === y0 && doorAt(depth, xx, yy - 1) ||
              yy === y1 && doorAt(depth, xx, yy + 1)
            ) {
              // not valid
            } else {
              ++count;
              if (!rand.range(count)) {
                torch_pos = xx + yy * w;
              }
            }
          } else {
            // paint interior
            maze[xx + yy * w] = M_INTERIOR;
          }
        }
      }
      if (torch_pos) {
        maze[torch_pos] = M_TORCH;
      }
    }
  }
  line(0, 0, w - 1, 0, M_WALL);
  line(w-1, 0, w-1, h-1, M_WALL);
  line(w-1, h-1, 0, h-1, M_WALL);
  line(0, h-1, 0, 0, M_WALL);
  divide(0, 1, 1, w-2, h-2);
  let num_treasure = round(treasure * w * h);
  for (let ii = 0; ii < num_treasure && terminals.length; ++ii) {
    let idx = rand.range(terminals.length);
    let room = terminals[idx];
    ridx(terminals, idx);
    drawRect(room.x0, room.y0, room.x1, room.y1, M_TREASURE);
  }
  if (doors[0]) {
    paintDepth(7, doors[0]);
  }
  maze.max_depth = max_depth;
  return maze;
}
