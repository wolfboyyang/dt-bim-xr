import './style.css'
import {
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Vector3,
  ArcRotateCamera,
  Sound,
  StandardMaterial,
  Color3,
  Texture,
  Vector4,
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

  /**** Materials *****/
  //color
  const groundMat = new StandardMaterial("groundMat");
  groundMat.diffuseColor = new Color3(0, 1, 0)

  //texture
  const roofMat = new StandardMaterial("roofMat");
  roofMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/roof.jpg");
  const boxMat = new StandardMaterial("boxMat");
  boxMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/cubehouse.png")
  const semiBoxMat = new StandardMaterial("boxMat");
  semiBoxMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/semihouse.png")

  //options parameter to set different images on each side
  let faceUV = [
    new Vector4(0.5, 0.0, 0.75, 1.0), //rear face
    new Vector4(0.0, 0.0, 0.25, 1.0), //front face
    new Vector4(0.25, 0, 0.5, 1.0), //right side
    new Vector4(0.75, 0, 1.0, 1.0), //left side
    // top 4 and bottom 5 not seen so not set
  ];
  let semiFaceUV = [
    new Vector4(0.6, 0.0, 1.0, 1.0), //rear face
    new Vector4(0.0, 0.0, 0.4, 1.0), //front face
    new Vector4(0.4, 0, 0.6, 1.0), //right side
    new Vector4(0.4, 0, 0.6, 1.0), //left side
    // top 4 and bottom 5 not seen so not set
  ];

  /**** World Objects *****/
  const box = MeshBuilder.CreateBox("box", { faceUV: faceUV, wrap: true });
  box.position.y = 0.5;
  box.material = boxMat;
  const roof = MeshBuilder.CreateCylinder("roof", { diameter: 1.3, height: 1.2, tessellation: 3 });
  roof.material = roofMat;
  roof.scaling.x = 0.75;
  roof.rotation.z = Math.PI / 2;
  roof.position.y = 1.22;

  const semiBox = MeshBuilder.CreateBox("box", { width: 2, faceUV: semiFaceUV, wrap: true });
  semiBox.position.x = 2;
  semiBox.position.y = 0.5;
  semiBox.material = semiBoxMat;
  const semiRoof = MeshBuilder.CreateCylinder("roof", { diameter: 1.3, height: 1.2, tessellation: 3 });
  semiRoof.material = roofMat;
  semiRoof.scaling.x = 0.75;
  semiRoof.rotation.z = Math.PI / 2;
  semiRoof.scaling.y = 2;
  semiRoof.position.x = 2;
  semiRoof.position.y = 1.22;

  const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 });
  ground.material = groundMat;

  // try sample sound from https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3
  //const sound = new Sound("name", "SoundHelix-Song-17.mp3", scene, null, { loop: true, autoplay: true });

  //#endregion

})();