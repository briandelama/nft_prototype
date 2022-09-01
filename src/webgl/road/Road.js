import * as THREE from "three";

export class Road {
  constructor(webgl, options) {
    this.webgl = webgl;
    this.options = options;
  }

  init() {
    const geometry = new THREE.PlaneBufferGeometry(this.options.width, this.options.height, 20, 200);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: new THREE.Uniform(new THREE.Color(0x101012)),
      },
      vertexShader: `
      void main(){
            vec3 transformed = position.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed.xyz, 1.);
      }
    `,
      fragmentShader: `
      uniform vec3 uColor;
    void main(){
          gl_FragColor = vec4(uColor,1.);
      }
  `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -6;
    // mesh.position.z = -5;
    this.webgl.scene.add(mesh);
  }
}
