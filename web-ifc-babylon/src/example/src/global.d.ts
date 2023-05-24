interface Window {
  WebXRPolyfill?: any;
}
class WebXRPolyfill { }

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}
