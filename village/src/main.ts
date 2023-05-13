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
  Mesh,
  InstancedMesh,
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

  buildDwellings();

  // try sample sound from https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3
  //const sound = new Sound("name", "SoundHelix-Song-17.mp3", scene, null, { loop: true, autoplay: true });

  //#endregion

})();

/******Build Functions***********/
function buildDwellings() {
  const ground = buildGround();

  const detached_house = buildHouse();
  detached_house.rotation.y = -Math.PI / 16;
  detached_house.position.x = -6.8;
  detached_house.position.z = 2.5;

  const semi_house = buildHouse(2);
  semi_house.rotation.y = -Math.PI / 16;
  semi_house.position.x = -4.5;
  semi_house.position.z = 3;

  //each entry is an array [house type, rotation, x, z]
  const places = [
    [1, -Math.PI / 16, -6.8, 2.5],
    [2, -Math.PI / 16, -4.5, 3],
    [2, -Math.PI / 16, -1.5, 4],
    [2, -Math.PI / 3, 1.5, 6],
    [2, 15 * Math.PI / 16, -6.4, -1.5],
    [1, 15 * Math.PI / 16, -4.1, -1],
    [2, 15 * Math.PI / 16, -2.1, -0.5],
    [1, 5 * Math.PI / 4, 0, -1],
    [1, Math.PI + Math.PI / 2.5, 0.5, -3],
    [2, Math.PI + Math.PI / 2.1, 0.75, -5],
    [1, Math.PI + Math.PI / 2.25, 0.75, -7],
    [2, Math.PI / 1.9, 4.75, -1],
    [1, Math.PI / 1.95, 4.5, -3],
    [2, Math.PI / 1.9, 4.75, -5],
    [1, Math.PI / 1.9, 4.75, -7],
    [2, -Math.PI / 3, 5.25, 2],
    [1, -Math.PI / 3, 6, 4],
  ];

  //Create instances from the first two that were built 
  const houses: InstancedMesh[] = [];
  for (let i = 0; i < places.length; i++) {
    if (places[i][0] === 1) {
      houses[i] = detached_house.createInstance("house" + i);
    }
    else {
      houses[i] = semi_house.createInstance("house" + i);
    }
    houses[i].rotation.y = places[i][1];
    houses[i].position.x = places[i][2];
    houses[i].position.z = places[i][3];
  }
}

function buildGround(): Mesh {
  //color
  const groundMat = new StandardMaterial("groundMat");
  groundMat.diffuseColor = new Color3(0, 1, 0)

  const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 });
  ground.material = groundMat;

  return ground;
}

function buildHouse(width: number = 1): Mesh {
  const box = buildBox(width);
  const roof = buildRoof(width);

  return Mesh.MergeMeshes([box, roof], true, false, undefined, false, true)!;
}

function buildBox(width: number): Mesh {
  //texture
  const boxMat = new StandardMaterial("boxMat");
  //options parameter to set different images on each side
  const faceUV: Vector4[] = [];

  if (width == 2) {
    boxMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/semihouse.png");

    faceUV[0] = new Vector4(0.0, 0.0, 0.4, 1.0); //front face
    faceUV[1] = new Vector4(0.6, 0.0, 1.0, 1.0); //rear face
    faceUV[2] = new Vector4(0.4, 0, 0.6, 1.0); //right side
    faceUV[3] = new Vector4(0.4, 0, 0.6, 1.0); //left side
    // top 4 and bottom 5 not seen so not set
  }
  else {
    boxMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/cubehouse.png");

    faceUV[0] = new Vector4(0.0, 0.0, 0.25, 1.0); //front face
    faceUV[1] = new Vector4(0.5, 0.0, 0.75, 1.0); //rear face
    faceUV[2] = new Vector4(0.25, 0, 0.5, 1.0); //right side
    faceUV[3] = new Vector4(0.75, 0, 1.0, 1.0); //left side
    // top 4 and bottom 5 not seen so not set
  }

  /**** World Objects *****/
  const box = MeshBuilder.CreateBox("box", { width, faceUV, wrap: true });
  box.material = boxMat;
  box.position.y = 0.5;

  return box;
}

function buildRoof(width: number): Mesh {
  //texture
  const roofMat = new StandardMaterial("roofMat");
  roofMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/roof.jpg");

  const roof = MeshBuilder.CreateCylinder("roof", { diameter: 1.3, height: 1.2, tessellation: 3 });
  roof.material = roofMat;
  roof.scaling.x = 0.75;
  roof.scaling.y = width;
  roof.rotation.z = Math.PI / 2;
  roof.position.y = 1.22;

  return roof;
}