# web-ifc-babylon

This library is the implementation of [web-ifc](https://github.com/IFCjs/web-ifc) for [Babylon.js](https://www.babylonjs.com/) loaders. This allows to load ifc file in babylonjs scene. just as GLTF/GLB files. 

The Geomeotry convertion from web-ifc to babylon mesh function is implemented by (Anders Lundgren)[https://github.com/anders-lundgren/web-ifc-babylon]

=====================

# Babylon.js Loaders module
=====================

For usage documentation please visit https://doc.babylonjs.com/extensions and choose "loaders".

# Installation instructions

To install using npm :

```
npm i -D web-ifc @web-ifc-babylon/loaders
```

# How to use

Afterwards it can be imported to your project using:

```
import "@web-ifc-babylon/loaders/IFC";
```

This will extend Babylon's loader plugins to allow the load of ifc files.

For more information you can have a look at our [ES6 dedicated documentation](https://doc.babylonjs.com/features/es6_support).