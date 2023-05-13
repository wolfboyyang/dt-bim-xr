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

  SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "village.glb");

  const walk = function (this, turn, dist) {
    this.turn = turn;
    this.dist = dist;
  }

  const track = [
    new walk(86, 7),
    new walk(-85, 14.8),
    new walk(-93, 16.5),
    new walk(48, 25.5),
    new walk(-112, 30.5),
    new walk(-72, 33.2),
    new walk(42, 37.5),
    new walk(-98, 45.2),
    new walk(0, 47),
  ];

  // Dude
  SceneLoader.ImportMeshAsync("him", "/scenes/Dude/", "Dude.babylon", scene).then((result) => {
    var dude = result.meshes[0];
    dude.scaling = new Vector3(0.008, 0.008, 0.008);

    dude.position = new Vector3(-6, 0, 0);
    dude.rotate(Axis.Y, Tools.ToRadians(-95), Space.LOCAL);
    const startRotation = dude.rotationQuaternion!.clone();

    scene.beginAnimation(result.skeletons[0], 0, 100, true, 1.0);

    let distance = 0;
    let step = 0.015;
    let p = 0;

    scene.onBeforeRenderObservable.add(() => {
      dude.movePOV(0, 0, step);
      distance += step;

      if (distance > track[p].dist) {

        dude.rotate(Axis.Y, Tools.ToRadians(track[p].turn), Space.LOCAL);
        p += 1;
        p %= track.length;
        if (p === 0) {
          distance = 0;
          dude.position = new Vector3(-6, 0, 0);
          dude.rotationQuaternion = startRotation.clone();
        }
      }

    })
  });

  //#endregion

})();