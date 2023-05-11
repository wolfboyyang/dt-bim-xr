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

  const box = MeshBuilder.CreateBox("box", {});
  box.position.y = 0.5;
  const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 });

  // try sample sound from https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3
  //const sound = new Sound("name", "SoundHelix-Song-17.mp3", scene, null, { loop: true, autoplay: true });

  //#endregion

})();