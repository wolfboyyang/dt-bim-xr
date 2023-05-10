# dt-bim-xr
Digital Twins Prototyping for BIM with WebXR.

# Live Demo
Github Pages:
- web-ifc-babylon: https://wolfboyyang.github.io/dt-bim-xr/
- demo: https://wolfboyyang.github.io/dt-bim-xr/demo/ 

Or on fly.io:

- web-ifc-babylon: https://dt-bim-xr.fly.dev/

- demo: https://dt-bim-xr.fly.dev/demo

# Development

```sh
npm i
cd demo
npm i
npm run dev

```

# Build
```sh
cd demo
npm run build
```

# Deploy to fly.io

```sh
flyctl deploy
```

# Debug Inspector
change the condition to **true**, and press **clt+shift+I**.

```js
// hide/show the Inspector
  if (true) {
    window.addEventListener("keydown", async (ev) => {
      // Shift+Ctrl+I
      if (ev.shiftKey && ev.ctrlKey && ev.code === "KeyI") {
        await import("@babylonjs/core/Debug/debugLayer");
        await import("@babylonjs/inspector");
        if (scene.debugLayer.isVisible()) {
          scene.debugLayer.hide();
        } else {
          scene.debugLayer.show();
        }
      }
    });
  }
```

change position of MainCanvas in style.css to **relative** to see the scene explorer.

```css
#MainCanvas {
  position: relative; left: 0; top: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0);
}
```