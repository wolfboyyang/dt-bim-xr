import './style.css'
import {
  Engine,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Vector3,
  WebXRControllerPointerSelection,
  WebXRSessionManager
} from "@babylonjs/core";

//#region WebXRPolyfill

declare global {
  interface Window {
    WebXRPolyfill?: any;
  }
  class WebXRPolyfill { }
}

const xrPolyfillPromise = new Promise<void>((resolve) => {
  if (navigator.xr) {
    return resolve();
  }

  if (window.WebXRPolyfill) {
    new WebXRPolyfill();
    return resolve();
  } else {
    const url = "https://cdn.jsdelivr.net/npm/webxr-polyfill@latest/build/webxr-polyfill.js";
    const s = document.createElement("script");
    s.src = url;
    document.head.appendChild(s);
    s.onload = () => {
      new WebXRPolyfill();
      resolve();
    };
  }
});

//#endregion

(async () => {

  // create the canvas html element and attach it to the webpage
  const canvas = <HTMLCanvasElement>document.getElementById("MainCanvas");

  //#region Setup engine and scene

  // wait for the polyfill to kick in
  await xrPolyfillPromise;
  //console.log(navigator.xr); // should be there!
  console.log("immersive-vr supported?", await WebXRSessionManager.IsSessionSupportedAsync("immersive-vr")); // should be true

  const engine = new Engine(canvas, true);
  // This creates a basic Babylon Scene object (non-mesh)
  const scene = new Scene(engine);

  window.addEventListener('resize', function () {
    engine.resize()
  })

  // run the main render loop
  engine.runRenderLoop(() => {
    if (scene.activeCamera) {
      scene.render()
    }
  })

  //#endregion

  //#region Setup scene

  // This creates and positions a free camera (non-mesh)
  let camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);

  // This targets the camera to scene origin
  camera.setTarget(Vector3.Zero());

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);

  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  let light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

  // Default intensity is 1. Let's dim the light a small amount
  light.intensity = 0.7;

  // Our built-in 'sphere' shape. Params: name, options, scene
  let sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);

  // Move the sphere upward 1/2 its height
  sphere.position.y = 1;

  // Our built-in 'ground' shape. Params: name, options, scene
  let ground = MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);

  //#endregion

  //const env = scene.createDefaultEnvironment();

  //#region Setup WebXR

  const xrHelper = await scene.createDefaultXRExperienceAsync({
    floorMeshes: [ground]
  });
  xrHelper.pointerSelection = <WebXRControllerPointerSelection>xrHelper.baseExperience.featuresManager.enableFeature(WebXRControllerPointerSelection, 'latest', {
    gazeCamera: xrHelper.baseExperience.camera,
    xrInput: xrHelper.input
  });

  //#endregion

  //#region Debug Inspector

  // hide/show the Inspector
  if (false) {
    window.addEventListener("keydown", async (ev) => {
      // Shift+Ctrl+I
      if (ev.shiftKey && ev.ctrlKey && ev.code === "KeyI") {
        await import("@babylonjs/core/Debug/debugLayer");
        await import("@babylonjs/inspector");
        if (scene.debugLayer.isVisible()) {
          scene.debugLayer.hide();
        } else {
          scene.debugLayer.show();
        }
      }
    });
  }

  //#endregion

})();