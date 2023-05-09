import './style.css'
import {
  Engine,
  DeviceOrientationCamera,
  Scene,
  Vector3,
  WebXRControllerPointerSelection,
  WebXRSessionManager,
  WebXRState,
  AbstractMesh,
  Tools,
  FilesInput,
} from "@babylonjs/core";

import {
  AdvancedDynamicTexture,
  Button,
  Control,
} from '@babylonjs/gui';

import { IfcLoader } from './IfcLoader';

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

  //const env = scene.createDefaultEnvironment();

  //#region Setup WebXR

  if (isVRSupported) {
    const xrHelper = await scene.createDefaultXRExperienceAsync({
      floorMeshes: [<AbstractMesh>env!.ground]
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

  var filesInput = new FilesInput(engine, scene, null, null, null, null, function () {
    Tools.ClearLogCache()
  }, null, null);


  // Initialize IFC loader
  const ifc = new IfcLoader();
  await ifc.initialize();

  let data = await fetch("./test.ifc").then(res => res.arrayBuffer());
  let mesh = await ifc.load(new Uint8Array(data), scene, true);

  // Set up drag and drop for loading files
  filesInput.onProcessFileCallback = (file: File, name, _extension) => {
    console.log("Reading file: " + name);
    file.arrayBuffer().then(async buf => {
      // delete existing objects
      try {
        mesh.dispose();
      }
      catch {
        //
      }
      mesh = await ifc.load(new Uint8Array(buf), scene, true);
    });
    return true;
  };

  filesInput.monitorElementForDragNDrop(canvas);

  //#endregion

})();