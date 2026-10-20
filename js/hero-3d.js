import * as THREE from "three";

const canvas = document.querySelector("#hero-3d-canvas");
const host = canvas?.parentElement;
if (!canvas || !host || !window.WebGLRenderingContext) {
  console.info("3D hero unavailable; showing the illustrated fallback.");
} else {

let renderer;
try {
  const compact = matchMedia("(max-width: 680px)").matches;
  renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:!compact, powerPreference:"low-power"});
} catch (error) {
  console.info("3D hero unavailable; showing the illustrated fallback.", error);
}

if (renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(0, 0, 8.4);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");

  scene.add(new THREE.AmbientLight(0xffe5c2, 2.15));
  const keyLight = new THREE.DirectionalLight(0xffcf8c, 4.5);
  keyLight.position.set(-3, 4, 6);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0xc8894e, 28, 14);
  rimLight.position.set(3, -2, 3);
  scene.add(rimLight);

  const display = new THREE.Group();
  scene.add(display);
  const cacao = [0x4a2114, 0x63301b, 0x35160f, 0x754126, 0x51271b];
  const gold = new THREE.MeshStandardMaterial({color:0xd8b16d, metalness:.7, roughness:.28});
  const cream = new THREE.MeshStandardMaterial({color:0xf1d8aa, metalness:.12, roughness:.34});

  function bonbon(color, x, y, scale, turn, accent = false) {
    const shape = new THREE.Shape();
    const w = .72, h = .62, r = .19;
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h); shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r); shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
    const geometry = new THREE.ExtrudeGeometry(shape, {depth:.28, bevelEnabled:true, bevelSegments:3, steps:1, bevelSize:.075, bevelThickness:.055, curveSegments:8});
    geometry.center();
    const group = new THREE.Group();
    group.position.set(x, y, 0);
    group.scale.setScalar(scale);
    group.rotation.set(-.18 + Math.random()*.1, -.18, turn);
    const body = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({color, roughness:.23, metalness:.02, clearcoat:.9, clearcoatRoughness:.16}));
    group.add(body);
    const center = new THREE.Mesh(new THREE.SphereGeometry(.16, 20, 14), accent ? gold : cream);
    center.scale.set(1.12, .82, .42);
    center.position.z = .18;
    group.add(center);
    if (accent) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.27, .025, 8, 36), gold);
      ring.position.z = .17;
      group.add(ring);
    } else {
      for (let i = 0; i < 3; i++) {
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), gold);
        pearl.position.set((i - 1) * .18, .19, .18);
        group.add(pearl);
      }
    }
    display.add(group);
    return group;
  }

  bonbon(cacao[0], -.93, .78, .86, -.38, true);
  bonbon(cacao[1], .62, .88, .74, .3);
  bonbon(cacao[2], .04, -.42, 1.02, -.12, true);
  bonbon(cacao[3], -1.18, -.73, .64, .24);
  bonbon(cacao[4], 1.18, -.62, .7, -.32);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.15, .012, 6, 120), new THREE.MeshBasicMaterial({color:0xc59a5c, transparent:true, opacity:.63}));
  halo.rotation.x = .26;
  halo.rotation.y = -.2;
  display.add(halo);

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = {x:0, y:0};
  const resize = new ResizeObserver(([entry]) => {
    const {width, height} = entry.contentRect;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.z = width < 430 ? 9.7 : width < 680 ? 9 : 8.4;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 680 ? 1.35 : 1.75));
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  });
  resize.observe(host);

  host.addEventListener("pointermove", event => {
    if (event.pointerType === "mouse") {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - .5) * .15;
      pointer.y = ((event.clientY - rect.top) / rect.height - .5) * .12;
    }
  }, {passive:true});
  host.addEventListener("pointerleave", () => { pointer.x = 0; pointer.y = 0; }, {passive:true});

  let frame;
  const draw = time => {
    display.rotation.y += ((time * .00012 + pointer.x) - display.rotation.y) * .018;
    display.rotation.x += ((pointer.y) - display.rotation.x) * .018;
    display.position.y = Math.sin(time * .00055) * .045;
    renderer.render(scene, camera);
    if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(draw);
  };
  const start = () => {
    cancelAnimationFrame(frame);
    if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(draw);
    else renderer.render(scene, camera);
  };
  document.addEventListener("visibilitychange", start);
  reducedMotion.addEventListener?.("change", start);
  host.classList.add("has-3d-hero");
  start();
}

let productStage = null;
let productStageToken = 0;

function closeProductStage() {
  productStageToken++;
  if (!productStage) return;
  cancelAnimationFrame(productStage.frame);
  productStage.removeVisibility?.();
  productStage.removePointer?.();
  productStage.resize.disconnect();
  productStage.texture?.dispose();
  productStage.renderer.dispose();
  productStage.host.classList.remove("has-product-3d");
  productStage = null;
}

function openProductStage(imageUrl) {
  closeProductStage();
  if (!imageUrl) return;
  const token = productStageToken;
  const host = document.querySelector("#dialog-image");
  const canvas = host?.querySelector(".product-display-canvas");
  const image = host?.querySelector("img");
  if (!host || !canvas || !image || !window.WebGLRenderingContext) return;

  let productRenderer;
  try {
    productRenderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:"low-power"});
  } catch (error) {
    console.info("Interactive product display unavailable; showing the product photo.", error);
    return;
  }
  productRenderer.outputColorSpace = THREE.SRGBColorSpace;
  productRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  productRenderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 30);
  camera.position.z = 7;
  scene.add(new THREE.AmbientLight(0xffe6c8, 2.1));
  const key = new THREE.DirectionalLight(0xffd28c, 3.5);
  key.position.set(-2.5, 3.5, 5);
  scene.add(key);
  const glint = new THREE.PointLight(0xd69a59, 14, 10);
  glint.position.set(2.8, -1.8, 2.6);
  scene.add(glint);

  const root = new THREE.Group();
  scene.add(root);
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const request = loader.load(imageUrl, texture => {
    if (token !== productStageToken) { texture.dispose(); return; }
    const source = texture.image;
    const ratio = (source.naturalWidth || source.width) / (source.naturalHeight || source.height);
    const photoHeight = Math.min(3.55, 3.25 / Math.max(.5, ratio));
    const photoWidth = photoHeight * ratio;
    const frameWidth = photoWidth + .16, frameHeight = photoHeight + .16;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = productRenderer.capabilities.getMaxAnisotropy();
    const back = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, frameHeight, .16), new THREE.MeshPhysicalMaterial({color:0x63371f, metalness:.22, roughness:.26, clearcoat:.8}));
    root.add(back);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(photoWidth, photoHeight), new THREE.MeshBasicMaterial({map:texture, toneMapped:false}));
    photo.position.z = .04;
    root.add(photo);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(frameWidth + .045, frameHeight + .045, .035), new THREE.MeshStandardMaterial({color:0xc49a59, metalness:.74, roughness:.29}));
    trim.position.z = -.17;
    root.add(trim);
    // Keep the thin gold edge behind the photo so the owner's image stays unobstructed.
    root.children[0].position.z = -.08;
    root.children[1].position.z = .04;
    productStage.texture = texture;
    host.classList.add("has-product-3d");
    productRenderer.render(scene, camera);
  }, undefined, error => {
    if (token === productStageToken) {
      console.info("Product photo remains available without the 3D frame.", error);
      closeProductStage();
    }
  });
  const resize = new ResizeObserver(([entry]) => {
    if (!entry.contentRect.width || !entry.contentRect.height) return;
    camera.aspect = entry.contentRect.width / entry.contentRect.height;
    camera.position.z = camera.aspect > 1.25 ? 7.8 : 7.3;
    camera.updateProjectionMatrix();
    productRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    productRenderer.setSize(entry.contentRect.width, entry.contentRect.height, false);
    productRenderer.render(scene, camera);
  });
  resize.observe(host);
  const pointer = {x:0,y:0};
  let draggingPointer = null;
  const move = event => {
    if (event.pointerType !== "mouse" && !(event.pointerType === "touch" && draggingPointer === event.pointerId)) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - .5) * .28;
    pointer.y = ((event.clientY - rect.top) / rect.height - .5) * .2;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.rotation.y = pointer.x;
      root.rotation.x = pointer.y;
      productRenderer.render(scene, camera);
    }
  };
  const leave = () => { pointer.x = 0; pointer.y = 0; };
  const down = event => {
    if (event.pointerType !== "touch") return;
    draggingPointer = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    move(event);
  };
  const up = event => { if (draggingPointer === event.pointerId) draggingPointer = null; };
  canvas.addEventListener("pointermove", move, {passive:true});
  canvas.addEventListener("pointerleave", leave, {passive:true});
  canvas.addEventListener("pointerdown", down, {passive:true});
  canvas.addEventListener("pointerup", up, {passive:true});
  canvas.addEventListener("pointercancel", up, {passive:true});
  const stage = {renderer:productRenderer, resize, host, texture:null, frame:0,
    removePointer:() => {canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerleave", leave); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);}};
  productStage = stage;
  const animate = time => {
    if (productStage !== stage || document.hidden) return;
    root.rotation.y += ((pointer.x + Math.sin(time * .00035) * .035) - root.rotation.y) * .045;
    root.rotation.x += ((pointer.y) - root.rotation.x) * .045;
    productRenderer.render(scene, camera);
    stage.frame = requestAnimationFrame(animate);
  };
  const start = () => {
    cancelAnimationFrame(stage.frame);
    if (productStage !== stage) return;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches && !document.hidden) stage.frame = requestAnimationFrame(animate);
    else productRenderer.render(scene, camera);
  };
  document.addEventListener("visibilitychange", start);
  stage.removeVisibility = () => document.removeEventListener("visibilitychange", start);
  start();
}

window.addEventListener("chocolate:product-open", event => openProductStage(event.detail?.imageUrl || ""));
window.addEventListener("chocolate:product-close", closeProductStage);
const openDialog = document.querySelector("#product-dialog");
if (openDialog && !openDialog.hidden) openProductStage(document.querySelector("#dialog-image img")?.src || "");
}
