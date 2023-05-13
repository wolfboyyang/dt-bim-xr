import './style.css'
import {
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
} from "@babylonjs/core";
import earcut from "earcut";

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

  const car = buildCar();
  car.rotation.x = -Math.PI / 2;

  //#endregion

})();

function buildCar() {
  //base
  const outline = [
    new Vector3(-0.3, 0, -0.1),
    new Vector3(0.2, 0, -0.1),
  ]

  //curved front
  for (let i = 0; i < 20; i++) {
    outline.push(new Vector3(0.2 * Math.cos(i * Math.PI / 40), 0, 0.2 * Math.sin(i * Math.PI / 40) - 0.1));
  }

  //top
  outline.push(new Vector3(0, 0, 0.1));
  outline.push(new Vector3(-0.3, 0, 0.1));

  //back formed automatically

  //car face UVs
  const faceUV = [
    new Vector4(0, 0.5, 0.38, 1),
    new Vector4(0, 0, 1, 0.5),
    new Vector4(0.38, 1, 0, 0.5),
  ];

  //car material
  const carMat = new StandardMaterial("carMat");
  carMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/car.png");

  const car = MeshBuilder.ExtrudePolygon("car", { shape: outline, depth: 0.2, faceUV, wrap: true}, undefined, earcut);
  car.material = carMat;

  //wheel face UVs
  const wheelUV = [
    new Vector4(0, 0, 1, 1),
    new Vector4(0, 0.5, 0, 0.5),
    new Vector4(0, 0, 1, 1),
  ];
  
  //wheel material
  const wheelMat = new StandardMaterial("wheelMat");
  wheelMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/wheel.png");

  const wheelRB = MeshBuilder.CreateCylinder("wheelRB", { diameter: 0.125, height: 0.05, faceUV: wheelUV})
  wheelRB.material = wheelMat;
  wheelRB.parent = car;
  wheelRB.position.z = -0.1;
  wheelRB.position.x = -0.2;
  wheelRB.position.y = 0.035;

  const wheelRF = wheelRB.clone("wheelRF");
  wheelRF.position.x = 0.1;

  const wheelLB = wheelRB.clone("wheelLB");
  wheelLB.position.y = -0.2 - 0.035;

  const wheelLF = wheelRF.clone("wheelLF");
  wheelLF.position.y = -0.2 - 0.035;

  return car;
}