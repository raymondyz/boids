import { Vec2, Utils } from "@raymondz/vector-math";


function boidAvoidFn(dist: number): number {
  return Math.min(1/dist, 40);
}

function wallAvoidFn(dist: number): number {
  return 1/Math.sqrt(0.3*dist);
}

function windowFn(dist: number): number {
  if (dist < 200) {
    return 1/dist;
  }
  else {
    return 0;
  }
}

class Boid {
  pos: Vec2;
  vel: Vec2;
  speed: number;

  wall = 1;
  separation = 0.5;
  cohesion = 0.20;
  alignment = 0.03;
  drag = 1.01;

  color: string = "red";

  constructor(pos?: Vec2, vel?: Vec2, speed?: number) {
    this.pos = pos ?? new Vec2(0, 0);
    this.vel = vel ?? new Vec2(0, 0);
    this.speed = speed ?? 5;
  }

  draw(ctx: any): void {
    const headRadius = 7;

    const color = `hsl(${this.vel.angle() * 180 / Math.PI} 30% 60%)`;
    ctx.fillStyle = color;

    // Draw head
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, headRadius, 0, 2 * Math.PI);
    ctx.fill();
  }

  update(): void {
    this.pos = this.pos.add(this.vel);
    this.vel = Utils.clampMag(this.vel.scale(this.drag), this.speed);
  }

  applyWallForce(walls: Array<Wall>, forceFn: (dist: number) => number): void {
    let netForce = new Vec2(0, 0);
    for (const wall of walls) {
      netForce = netForce.add(wall.normal.scale(forceFn(wall.getDist(this.pos))));
    }

    this.vel = this.vel.add(netForce.scale(this.wall));
  }

  applySeparation(boids: Array<Boid>, forceFn: (dist: number) => number): void {
    let netForce = new Vec2(0, 0);

    for (const boid of boids) {
      if (this === boid) {
        continue;
      }
      netForce = netForce.add(this.pos.sub(boid.pos).normalize().scale(forceFn(Utils.dist(this.pos, boid.pos))));
    }

    this.vel = this.vel.add(netForce.scale(this.separation));
  }

  applyCohesion(boids: Array<Boid>, windowFn: (dist: number) => number): void {
    let totalPos = new Vec2(0, 0);
    let totalMag = 0;

    for (const boid of boids) {
      if (this === boid) {
        continue;
      }

      const distScaler = windowFn(Utils.dist(this.pos, boid.pos));

      totalPos = totalPos.add(boid.pos.scale(distScaler));
      totalMag += distScaler;
    }

    if (totalMag === 0) {
      return;
    }

    const avgPos = totalPos.scale(1/totalMag);
    
    this.vel = this.vel.add(Utils.clampMag(avgPos.sub(this.pos), 100).scale(0.01 * this.cohesion));
  }

  applyAlignment(boids: Array<Boid>, windowFn: (dist: number) => number): void {
    let totalVel = new Vec2(0, 0);
    let totalMag = 0;

    for (const boid of boids) {
      if (this === boid) {
        continue;
      }

      const distScaler = windowFn(Utils.dist(this.pos, boid.pos));

      totalVel = totalVel.add(boid.vel.scale(distScaler));
      totalMag += distScaler;
    }

    if (totalMag === 0) {
      return;
    }

    const avgVel = totalVel.scale(1/totalMag);

    const forceDir = avgVel.sub(this.vel).normalize();

    this.vel = this.vel.add(forceDir.scale(this.alignment))
  }

}


class Wall {
  pos1: Vec2;
  pos2: Vec2;
  normal: Vec2;

  // moving from p1 to p2, normal points towards the right
  // (canvas is vertically flipped)
  constructor(pos1: Vec2, pos2: Vec2) {
    this.pos1 = pos1;
    this.pos2 = pos2;

    this.normal = this.pos2.sub(this.pos1).rotate(0.5*Math.PI).normalize()
  }

  getDist(pos: Vec2): number {
    return pos.sub(this.pos1).sub(pos.sub(this.pos1).proj(this.pos2.sub(this.pos1))).mag();
  }

  draw(ctx: any): void {
    ctx.beginPath();
    ctx.moveTo(this.pos1.x, this.pos1.y);
    ctx.lineTo(this.pos2.x, this.pos2.y);
    ctx.stroke();
  }
}

// =================================================================================================
// ==== Main Code ==================================================================================
// =================================================================================================


const canvas: any = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

// Consts
const CANVAS_RECT = canvas.getBoundingClientRect();
const FPS = 60;

let wallList = [
  new Wall(new Vec2(0, 0), new Vec2(canvas.width, 0)),
  new Wall(new Vec2(canvas.width, 0), new Vec2(canvas.width, canvas.height)),
  new Wall(new Vec2(canvas.width, canvas.height), new Vec2(0, canvas.height)),
  new Wall(new Vec2(0, canvas.height), new Vec2(0, 0)),
];


let boidList = [new Boid(new Vec2(200, 200)), new Boid(new Vec2(210, 200))];


// Set frame rate
setInterval(updateFrame, 1000 / FPS);


function updateFrame(): void {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const boid of boidList) {
    boid.draw(ctx);
    boid.applyWallForce(wallList, wallAvoidFn);
    boid.applyAlignment(boidList, windowFn);
    boid.applyCohesion(boidList, windowFn);
    boid.applySeparation(boidList, boidAvoidFn);
    boid.update();
  }
}

// =================================================================================================
// ==== Main Code ==================================================================================
// =================================================================================================

function getCursorPosition(event: any) {
  const x = event.clientX - CANVAS_RECT.left;
  const y = event.clientY - CANVAS_RECT.top;
  return { x: x, y: y };
}

// Mouse click
canvas.addEventListener("mousedown", function (e: any) {
  const mousePos = getCursorPosition(e);
  boidList.push(
    new Boid(new Vec2(mousePos.x, mousePos.y))
  );
});
