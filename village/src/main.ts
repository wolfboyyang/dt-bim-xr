import './style.css'
import {
  Animation,
  Engine,
  HemisphericLight,
  PolygonMeshBuilder,
  MeshBuilder,
  Scene,
  Vector3,
  ArcRotateCamera,
  Sound,
  StandardMaterial,
  Color3,
  Texture,
  Vector4,
  Mesh,
  InstancedMesh,
  SceneLoader,
  Axis,
  Tools,
  Space,
  CubeTexture,
  Sprite,
  SpriteManager,
  ParticleSystem,
  Color4,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

(async () => {

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
  const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, new Vector3(0, 0, 0));
  camera.attachControl(canvas, true);
  const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);

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

  SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "valleyvillage.glb");

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
  var particleSystem = new ParticleSystem("particles", 5000, scene);

  //Texture of each particle
  particleSystem.particleTexture = new Texture("textures/flare.png", scene);

  // Where the particles come from
  particleSystem.emitter = new Vector3(-4, 0.9, -6); // the starting object, the emitter
  particleSystem.minEmitBox = new Vector3(-0.05, 0, 0); // Starting all from
  particleSystem.maxEmitBox = new Vector3(0.05, 0, 0); // To...

  // Colors of all particles
  particleSystem.color1 = new Color4(0.7, 0.8, 1.0, 1.0);
  particleSystem.color2 = new Color4(0.2, 0.5, 1.0, 1.0);
  particleSystem.colorDead = new Color4(0, 0, 0.2, 0.0);

  // Size of each particle (random between...
  particleSystem.minSize = 0.005;
  particleSystem.maxSize = 0.025;

  // Life time of each particle (random between...
  particleSystem.minLifeTime = 2;
  particleSystem.maxLifeTime = 3.5;

  // Emission rate
  particleSystem.emitRate = 1500;

  // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
  particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;

  // Set the gravity of all particles
  particleSystem.gravity = new Vector3(0, -9.81/20, 0);

  // Direction of each particle after it has been emitted
  particleSystem.direction1 = new Vector3(-2, 8, 2);
  particleSystem.direction2 = new Vector3(2, 8, -2);

  // Angular speed, in radians
  particleSystem.minAngularSpeed = 0;
  particleSystem.maxAngularSpeed = Math.PI;

  // Speed
  particleSystem.minEmitPower = 0.05;
  particleSystem.maxEmitPower = 0.15;
  particleSystem.updateSpeed = 0.025;

  // Start the particle system
  particleSystem.start();

  //#endregion

})();