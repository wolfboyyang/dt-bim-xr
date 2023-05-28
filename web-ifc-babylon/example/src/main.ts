import './style.css'
import {
  Engine,
  DeviceOrientationCamera,
  Scene,
  Vector3,
  WebXRControllerPointerSelection,
  WebXRSessionManager,
  WebXRState,
  Tools,
  FilesInput,
  SceneLoader,
} from "@babylonjs/core";

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

  // create the canvas html element and attach it to the webpage
  const canvas = <HTMLCanvasElement>document.getElementById("MainCanvas");

  //#region Setup engine and scene

  // wait for the polyfill to kick in
  await xrPolyfillPromise;
  //console.log(navigator.xr); // should be there!
  const isVRSupported = await WebXRSessionManager.IsSessionSupportedAsync("immersive-vr");
  console.log("immersive-vr supported?", isVRSupported);// should be true

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

  // This creates and positions a DeviceOrientationCamera camera (non-mesh)
  let camera = new DeviceOrientationCamera("deviceCamera", new Vector3(0, 5, -10), scene);

  // This targets the camera to scene origin
  camera.setTarget(Vector3.Zero());

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);

  //Controls  WASD+QE
  camera.keysUp.push(87);
  camera.keysDown.push(83);
  camera.keysRight.push(68);
  camera.keysLeft.push(65);
  camera.keysRotateLeft.push(81);
  camera.keysRotateRight.push(69);

  // Create a default environment for the scene.
  const env = scene.createDefaultEnvironment({
    createSkybox: false
  });

  //#endregion

  //#region Setup WebXR

  if (isVRSupported) {
    const xrHelper = await scene.createDefaultXRExperienceAsync({
      floorMeshes: [env!.ground!]
    });

    xrHelper.pointerSelection = <WebXRControllerPointerSelection>xrHelper.baseExperience.featuresManager.enableFeature(WebXRControllerPointerSelection, 'latest', {
      gazeCamera: xrHelper.baseExperience.camera,
      xrInput: xrHelper.input
    });

    xrHelper.baseExperience.onStateChangedObservable.add(async (state) => {
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


  const requestPermission = (DeviceOrientationEvent as unknown as DeviceOrientationEventiOS).requestPermission;
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

  //#region Setup IFCLoader

  // useAppend for ifc file.
  const filesInput = new FilesInput(engine, scene, null, null, null, null, function () {
    Tools.ClearLogCache()
  }, null, null, true);

  // load default ifc file
  await SceneLoader.ImportMeshAsync("", "./", "test.ifc");

  // Set up drag and drop for loading files
  filesInput.onProcessFileCallback = (_file: File, name, extension) => {
    console.log("Reading file: " + name);
    if (extension != "ifc") return false;
    return true;
  };

  filesInput.monitorElementForDragNDrop(canvas);

  // for test: make sure IFC Loader is activated.
  SceneLoader.OnPluginActivatedObservable.add(function (loader) {
    if (loader.name === "ifc") {
      console.log("IFC Loader activated");
    }
  });

  //#endregion

})();