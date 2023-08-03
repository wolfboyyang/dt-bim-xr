import './style.css'
import {
  ArcRotateCamera,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Node,
  Scene,
  Vector3,
  WebGPUEngine,
  WebXRControllerPointerSelection,
  WebXRSessionManager,
  WebXRState,
  SceneLoader,
  WebXRFeatureName,
  Mesh,
  FilesInput,
  Tools,
} from '@babylonjs/core';

import {
  AdvancedDynamicTexture,
  Button,
  Control,
} from '@babylonjs/gui';

import 'web-ifc-babylon/loaders/IFC';

//#region WebXRPolyfill

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

  // wait for the polyfill to kick in
  await xrPolyfillPromise;
  //console.log(navigator.xr); // should be there!
  const isVRSupported = await WebXRSessionManager.IsSessionSupportedAsync("immersive-vr");
  console.log("immersive-vr supported?", isVRSupported);// should be true

  // create the canvas html element and attach it to the webpage
  const canvas = <HTMLCanvasElement>document.getElementById("MainCanvas");

  //#region Setup engine and scene

  const useWebGPU = !!(navigator as any).gpu;
  console.log("useWebGPU:", useWebGPU);
  let engine: Engine;
  if (useWebGPU && false) {
    engine = new WebGPUEngine(canvas);
    await (engine as WebGPUEngine).initAsync();
  } else {
    engine = new Engine(canvas, true);
  }

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

  // This creates and positions a DeviceOrientationCamera camera (non-mesh)
  // let camera = new DeviceOrientationCamera("deviceCamera", new Vector3(0, 5, -10), scene);
  let camera = new ArcRotateCamera("arcRotateCamera", 2, 1.25, 200, Vector3.Zero(), scene);

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);

  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  let light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

  // Default intensity is 1. Let's dim the light a small amount
  light.intensity = 0.7;

  // Our built-in 'ground' shape. Params: name, options, scene
  let ground = MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);

  scene.useRightHandedSystem = true;
  console.log("Right-handed Coordinate system: ", scene.useRightHandedSystem);

  // for test: make sure IFC Loader is activated.
  if (SceneLoader.IsPluginForExtensionAvailable('.ifc'))
    console.log("IFC Loader activated");

  // load default ifc file

  SceneLoader.ImportMeshAsync("", "./", "test.ifc").then((result) => {
    var root = result.meshes[0];
    root.name = "Duplex Model ifc";
    root.position = new Vector3(-25, -13, 50);
    root.rotation = new Vector3(0, 1, 0);
  });

  SceneLoader.ImportMeshAsync("", "./", "yeni campus west_deneme2.glb").then((result) => {
    var root = result.meshes[0];
    root.name = "Campus West";
  });

  SceneLoader.ImportMeshAsync("", "./", "FinalCountDown-2.glb").then((result) => {
    var root = result.meshes[0];
    root.name = "FinalCountDown-2";
    root.position = new Vector3(-60, -12.5, 35);
    root.rotation = new Vector3(0, 1, 0);
  });

  // useAppend for ifc file.
  const filesInput = new FilesInput(engine, scene, null, null, null, null, function () {
    Tools.ClearLogCache()
  }, null, null, true);

  // Set up drag and drop for loading files
  filesInput.onProcessFileCallback = (_file: File, name, extension) => {
    console.log("Reading file: " + name);
    if (extension == "ifc" || "babylon" || "glb" || "gltf" ) return true;
    return false;
  };

  filesInput.monitorElementForDragNDrop(canvas);

  //#endregion

  //#region Setup WebXR

  if (isVRSupported) {
    const xr = await scene.createDefaultXRExperienceAsync({
      floorMeshes: [ground],
      disableTeleportation: true
    });

    xr.pointerSelection = <WebXRControllerPointerSelection>xr.baseExperience.featuresManager.enableFeature(WebXRControllerPointerSelection, 'latest', {
      gazeCamera: xr.baseExperience.camera,
      xrInput: xr.input
    });

    const featureManager = xr.baseExperience.featuresManager;

    //const movementFeature = 
    featureManager.enableFeature(WebXRFeatureName.MOVEMENT, 'latest', {
      xrInput: xr.input,
      // add options here
      movementOrientationFollowsViewerPose: true, // default true
    });

    xr.baseExperience.onStateChangedObservable.add(async (state) => {
      switch (state) {
        case WebXRState.IN_XR:
          // XR is initialized and already submitted one frame
          break;
        case WebXRState.ENTERING_XR:
          // xr is being initialized, enter XR request was made
          break;
        case WebXRState.EXITING_XR:
          // xr exit request was made. not yet done.
          break;
        case WebXRState.NOT_IN_XR:
          // self explanatory - either out or not yet in XR
          break;
      }
    });
  }


  const requestPermission = window.DeviceOrientationEvent != undefined ?
    (DeviceOrientationEvent as unknown as DeviceOrientationEventiOS).requestPermission : undefined;
  const iOS = typeof requestPermission === 'function';
  if (iOS) {
    // GUI
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    const permission_button = Button.CreateSimpleButton("but1", "Enable Rotation");
    permission_button.width = "150px"
    permission_button.height = "40px";
    permission_button.color = "white";
    permission_button.cornerRadius = 20;
    permission_button.background = "green";
    permission_button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    permission_button.onPointerUpObservable.add(async () => {

      const response = await requestPermission();
      if (response === 'granted') {
        // execute
        console.log('motion & rotation permission granted');
        permission_button.isVisible = false;
      }

    });
    advancedTexture.addControl(permission_button);
  } else {
    // Motion and rotation not supported or permission not required
    // Handle the situation accordingly
    console.log('not iOS or no motion & rotation permission');
  }

  //#endregion

  //#region Debug Inspector

  // hide/show the Inspector
  if (true) {
    await import("@babylonjs/core/Debug/debugLayer");
    await import("@babylonjs/inspector");

    window.addEventListener("keydown", async (ev) => {
      // Shift+Ctrl+I
      if (ev.shiftKey && ev.ctrlKey && ev.code === "KeyJ") {
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