import * as THREE from "three";
import GSAP from "gsap";

export class LoadingManager {
  constructor(scene) {
    this.overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    this.overlayMaterial = new THREE.RawShaderMaterial({
      uniforms: {
        u_alpha: { value: 1.0 },
        u_moveY: { value: 0.0 },
      },
      vertexShader: `
             attribute vec3 position;
             attribute vec2 uv;
             uniform mat4 projectionMatrix;
             uniform mat4 modelViewMatrix;
             uniform float u_moveY;

             void main() {
              vec3 customPosition = vec3(position.x,position.y - u_moveY,position.z);
               gl_Position = vec4(customPosition, 1.0);
             }
             `,
      fragmentShader: `
             precision mediump float;

             uniform float u_alpha;

             void main() {
               gl_FragColor = vec4(0, 0, 0, u_alpha);
             }
             `,
      transparent: true,
    });

    this.progressRatio = 0;
    this.overlayMesh = new THREE.Mesh(this.overlayGeometry, this.overlayMaterial);

    this.loadingManager = new THREE.LoadingManager(() => this.onLoadedAssets(this.overlayMaterial), this.onProgressLoadAssets);

    scene.add(this.overlayMesh);
  }

  onLoadedAssets(material) {
    GSAP.to(material.uniforms.u_alpha, { duration: 6, value: 0 });
  }

  onProgressLoadAssets(url, loaded, total) {
    this.progressRatio = Math.floor((loaded / total) * 100);
  }
}
