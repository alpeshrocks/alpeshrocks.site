import * as THREE from 'three';

// Common shape of a world. pose(u, t, mouse, cam) places the camera for
// u in 0..1 across the world's own drift path.
export function baseWorld({ fov = 50, near = 0.5, far = 30000, from, to, lookFrom, lookTo, focal, sunDir, exposure = 1, enterPush = 30, sway = 1 }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  const p = new THREE.Vector3(), l = new THREE.Vector3();
  const ease = (x) => x * x * (3 - 2 * x);
  return {
    scene,
    camera,
    fov,
    focal: focal.clone(),
    sunDir: sunDir.clone().normalize(),
    exposure,
    enterPush,
    pickables: [],
    targets: {},
    pose(u, t, mouse, cam) {
      const e = ease(u);
      p.lerpVectors(from, to, e);
      l.lerpVectors(lookFrom, lookTo, e);
      p.x += mouse.x * 2.2 * sway + Math.sin(t * 0.21) * 0.6 * sway;
      p.y += -mouse.y * 1.0 * sway + Math.sin(t * 0.33) * 0.3 * sway;
      cam.position.copy(p);
      cam.lookAt(l);
    },
    update() {},
  };
}
