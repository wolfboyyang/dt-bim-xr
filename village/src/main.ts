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

  const wireMat = new StandardMaterial("wireMat");
  wireMat.wireframe = true;

  const hitBox = MeshBuilder.CreateBox("carbox", { width: 0.5, height: 0.6, depth: 4.5 });
  hitBox.material = wireMat;
  hitBox.position.x = 3.1;
  hitBox.position.y = 0.3;
  hitBox.position.z = -5;

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
        value: 8
      },
      {
        frame: 150,
        value: -7
      },
      {
        frame: 200,
        value: -7
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

  SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "village.glb");

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

  //#endregion

})();