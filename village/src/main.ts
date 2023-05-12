import './style.css'
import {
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Vector3,
  ArcRotateCamera,
  Sound,
} from "@babylonjs/core";

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
  const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, new Vector3(0, 0, 0));
  camera.attachControl(canvas, true);
  const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);

  const box1 = MeshBuilder.CreateBox("box1", { width: 2, height: 1.5, depth: 3 });
  box1.position.y = 0.75;
  box1.rotation.y = Math.PI / 4;

  const box2 = MeshBuilder.CreateBox("box2", {});
  box2.scaling.x = 2;
  box2.scaling.y = 1.5;
  box2.scaling.z = 3;
  box2.position = new Vector3(-3, 0.75, 0);

  const box3 = MeshBuilder.CreateBox("box3", {});
  box3.scaling = new Vector3(2, 1.5, 3);
  box3.position.x = 3;
  box3.position.y = 0.75;
  box3.position.z = 0;

  const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 });

  // try sample sound from https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3
  //const sound = new Sound("name", "SoundHelix-Song-17.mp3", scene, null, { loop: true, autoplay: true });

  //#endregion

})();