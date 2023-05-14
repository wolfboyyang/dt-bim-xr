import './style.css'
import {
  Animation,
  Engine,
  MeshBuilder,
  Scene,
  Vector3,
  StandardMaterial,
  Color3,
  Texture,
  Mesh,
  SceneLoader,
  Axis,
  Tools,
  Space,
  CubeTexture,
  Sprite,
  SpriteManager,
  ParticleSystem,
  Color4,
  PointerEventTypes,
  SpotLight,
  BackgroundMaterial,
  ShadowGenerator,
  DirectionalLight,
  WebXRSessionManager,
  DeviceOrientationCamera,
  WebXRControllerPointerSelection,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Slider,
  StackPanel,
  TextBlock,
} from '@babylonjs/gui';

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

  const engine = new Engine(canvas, true);

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

  /**** Set camera and light *****/
  let camera = new DeviceOrientationCamera("deviceCamera", new Vector3(0, 5, -10), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(canvas, true);
  const light = new DirectionalLight("light", new Vector3(0, -1, 1), scene);
  light.position = new Vector3(0, 50, -100);

  // GUI
  const adt = AdvancedDynamicTexture.CreateFullscreenUI("UI");

  const panel = new StackPanel();
  panel.width = "220px";
  panel.top = "-25px";
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  adt.addControl(panel);

  const header = new TextBlock();
  header.text = "Night to Day";
  header.height = "30px";
  header.color = "white";
  panel.addControl(header); 

  const slider = new Slider();
  slider.minimum = 0;
  slider.maximum = 1;
  slider.borderColor = "black";
  slider.color = "gray";
  slider.background = "white";
  slider.value = 1;
  slider.height = "20px";
  slider.width = "200px";
  slider.onValueChangedObservable.add((value) => {
      if (light) {
          light.intensity = value;
      }
  });
  panel.addControl(slider);

  const spriteManagerUFO = new SpriteManager("UFOManager", "https://assets.babylonjs.com/environments/ufo.png", 1, { width: 128, height: 76 }, scene);
  const ufo = new Sprite("ufo", spriteManagerUFO);
  ufo.playAnimation(0, 16, true, 125);
  ufo.position.y = 5;
  ufo.position.z = 0;
  ufo.width = 2;
  ufo.height = 1;

  const spriteManagerTrees = new SpriteManager("treesManager", "textures/palm.png", 2000, { width: 512, height: 1024 }, scene);

  //We create trees at random positions
  for (let i = 0; i < 500; i++) {
    const tree = new Sprite("tree", spriteManagerTrees);
    tree.position.x = Math.random() * (-30);
    tree.position.z = Math.random() * 20 + 8;
    tree.position.y = 0.5;
  }

  for (let i = 0; i < 500; i++) {
    const tree = new Sprite("tree", spriteManagerTrees);
    tree.position.x = Math.random() * (25) + 7;
    tree.position.z = Math.random() * -35 + 8;
    tree.position.y = 0.5;
  }

  //Skybox
  const skybox = MeshBuilder.CreateBox("skyBox", { size: 150 }, scene);
  const skyboxMaterial = new StandardMaterial("skyBox", scene);
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.reflectionTexture = new CubeTexture("textures/day", scene);
  skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
  skyboxMaterial.specularColor = new Color3(0, 0, 0);
  skybox.material = skyboxMaterial;

  const wireMat = new StandardMaterial("wireMat");
  wireMat.alpha = 0;

  const hitBox = MeshBuilder.CreateBox("carbox", { width: 0.5, height: 0.6, depth: 4.5 });
  hitBox.material = wireMat;
  hitBox.position.x = 3.1;
  hitBox.position.y = 0.3;
  hitBox.position.z = -5;

  SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "valleyvillage.glb").then(() => {
    (scene.getMeshByName("ground")!.material! as BackgroundMaterial).maxSimultaneousLights = 5;
    scene.getMeshByName("ground")!.receiveShadows = true;
  });

  // SChapter 7 - Adding Shadowshadow generator
  const shadowGenerator = new ShadowGenerator(1024, light);

  let carReady = false;
  SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "car.glb").then(() => {
    const car = scene.getMeshByName("car")!;
    carReady = true;
    car.rotation = new Vector3(Math.PI / 2, 0, -Math.PI / 2);
    car.position.y = 0.16;
    car.position.x = -3;
    car.position.z = 8;

    const animCar = new Animation("carAnimation", "position.z", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);

    const carKeys = [
      {
        frame: 0,
        value: 10
      },
      {
        frame: 200,
        value: -15
      }
    ];

    animCar.setKeys(carKeys);

    car.animations = [animCar];

    scene.beginAnimation(car, 0, 200, true);

    //wheel animation
    const wheelRB = scene.getMeshByName("wheelRB");
    const wheelRF = scene.getMeshByName("wheelRF");
    const wheelLB = scene.getMeshByName("wheelLB");
    const wheelLF = scene.getMeshByName("wheelLF");

    scene.beginAnimation(wheelRB, 0, 30, true);
    scene.beginAnimation(wheelRF, 0, 30, true);
    scene.beginAnimation(wheelLB, 0, 30, true);
    scene.beginAnimation(wheelLF, 0, 30, true);
  });

  

  const walk = function (this, turn, dist) {
    this.turn = turn;
    this.dist = dist;
  }

  const track = [
    new walk(180, 2.5),
    new walk(0, 5),
  ];

  // Dude
  SceneLoader.ImportMeshAsync("him", "/scenes/Dude/", "Dude.babylon", scene).then((result) => {
    var dude = result.meshes[0];
    dude.scaling = new Vector3(0.008, 0.008, 0.008);

    shadowGenerator.addShadowCaster(dude, true);

    dude.position = new Vector3(1.5, 0, -6.9);
    dude.rotate(Axis.Y, Tools.ToRadians(-90), Space.LOCAL);
    const startRotation = dude.rotationQuaternion!.clone();

    scene.beginAnimation(result.skeletons[0], 0, 100, true, 1.0);

    let distance = 0;
    let step = 0.015;
    let p = 0;

    scene.onBeforeRenderObservable.add(() => {
      if (carReady) {
        if (!(dude.getChildren()[1] as Mesh).intersectsMesh(hitBox) && (scene.getMeshByName("car") as Mesh).intersectsMesh(hitBox)) {
          return;
        }
      }
      dude.movePOV(0, 0, step);
      distance += step;

      if (distance > track[p].dist) {

        dude.rotate(Axis.Y, Tools.ToRadians(track[p].turn), Space.LOCAL);
        p += 1;
        p %= track.length;
        if (p === 0) {
          distance = 0;
          dude.position = new Vector3(1.5, 0, -6.9);
          dude.rotationQuaternion = startRotation.clone();
        }
      }

    })
  });

  const fountainProfile = [
    new Vector3(0, 0, 0),
    new Vector3(0.5, 0, 0),
    new Vector3(0.5, 0.2, 0),
    new Vector3(0.4, 0.2, 0),
    new Vector3(0.4, 0.05, 0),
    new Vector3(0.05, 0.1, 0),
    new Vector3(0.05, 0.8, 0),
    new Vector3(0.15, 0.9, 0)
  ];

  //Create lathe
  const fountain = MeshBuilder.CreateLathe("fountain", { shape: fountainProfile, sideOrientation: Mesh.DOUBLESIDE }, scene);
  fountain.position.x = -4;
  fountain.position.z = -6;

  // Create a particle system
  const particleSystem = new ParticleSystem("particles", 5000, scene);

  //Texture of each particle
  particleSystem.particleTexture = new Texture("textures/flare.png", scene);

  // Where the particles come from
  particleSystem.emitter = new Vector3(-4, 0.8, -6); // the starting object, the emitter
  particleSystem.minEmitBox = new Vector3(-0.01, 0, -0.01); // Starting all from
  particleSystem.maxEmitBox = new Vector3(0.01, 0, 0.01); // To...

  // Colors of all particles
  particleSystem.color1 = new Color4(0.7, 0.8, 1.0, 1.0);
  particleSystem.color2 = new Color4(0.2, 0.5, 1.0, 1.0);
  particleSystem.colorDead = new Color4(0, 0, 0.2, 0.0);

  // Size of each particle (random between...
  particleSystem.minSize = 0.01;
  particleSystem.maxSize = 0.05;

  // Life time of each particle (random between...
  particleSystem.minLifeTime = 0.3;
  particleSystem.maxLifeTime = 1.5;

  // Emission rate
  particleSystem.emitRate = 1500;

  // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
  particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;

  // Set the gravity of all particles
  particleSystem.gravity = new Vector3(0, -9.81, 0);

  // Direction of each particle after it has been emitted
  particleSystem.direction1 = new Vector3(-1, 8, 1);
  particleSystem.direction2 = new Vector3(1, 8, -1);

  // Power and speed
  particleSystem.minEmitPower = 0.2;
  particleSystem.maxEmitPower = 0.6;
  particleSystem.updateSpeed = 0.01;

  //Switch fountain on and off
  let switched = false;
  const pointerDown = (mesh) => {
    if (mesh === fountain) {
      switched = !switched;
      if (switched) {
        // Start the particle system
        particleSystem.start();
      }
      else {
        // Stop the particle system
        particleSystem.stop();
      }
    }

  }

  scene.onPointerObservable.add((pointerInfo) => {
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN:
        if (pointerInfo?.pickInfo?.hit) {
          pointerDown(pointerInfo.pickInfo.pickedMesh)
        }
        break;
    }
  });

  SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "lamp.babylon").then(() =>{
        const lampLight = new SpotLight("lampLight", Vector3.Zero(), new Vector3(0, -1, 0), 0.8 * Math.PI, 0.01, scene);
        lampLight.diffuse = Color3.Yellow();
        lampLight.parent = scene.getMeshByName("bulb")

        const lamp = scene.getMeshByName("lamp")!;
        lamp.position = new Vector3(2, 0, 2); 
        lamp.rotation = Vector3.Zero();
        lamp.rotation.y = -Math.PI / 4;

        const lamp1 = lamp.clone("lamp1", lamp.parent)!;
        lamp1.position.x = -8;
        lamp1.position.z = 1.2;
        lamp1.rotation.y = Math.PI / 2;

        const lamp2 = lamp1.clone("lamp2", lamp.parent)!;
        lamp2.position.x = -2.7;
        lamp2.position.z = 0.8;
        lamp2.rotation.y = -Math.PI / 2;

        const lamp3 = lamp.clone("lamp3", lamp.parent)!;
        lamp3.position.z = -8;
    });

  //#endregion

  //#region Setup WebXR

  if (isVRSupported) {
    const xrHelper = await scene.createDefaultXRExperienceAsync({
      floorMeshes: [scene.getMeshByName("ground")!]
    });

    xrHelper.pointerSelection = <WebXRControllerPointerSelection>xrHelper.baseExperience.featuresManager.enableFeature(WebXRControllerPointerSelection, 'latest', {
      gazeCamera: xrHelper.baseExperience.camera,
      xrInput: xrHelper.input
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

})();