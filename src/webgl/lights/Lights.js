import * as THREE from "three";

export class Lights {
  constructor(webgl, options, speed) {
    this.webgl = webgl;
    this.options = options;
    this.speed = speed;
    this.fade = new THREE.Vector2(0, 1 - 0.4);

    let fog = new THREE.Fog(options.background, options.length * 0.2, options.length * 500);

    this.webgl.scene.fog = fog;

    this.fogUniforms = {
      fogColor: { type: "c", value: fog.color },
      fogNear: { type: "f", value: fog.near },
      fogFar: { type: "f", value: fog.far },
    };
  }

  init() {
    console.log(THREE.ShaderChunk["fog_fragment"]);
    const options = this.options;
    const curve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1));
    const baseGeometry = new THREE.TubeBufferGeometry(curve, 25, 1, 8, false);

    const instancedGeometry = new THREE.InstancedBufferGeometry().copy(baseGeometry);
    instancedGeometry.instanceCount = options.count;

    const { offset, metrics } = this.getFloat32Arrays();

    instancedGeometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offset, 3, false));
    instancedGeometry.setAttribute("aMetrics", new THREE.InstancedBufferAttribute(metrics, 2, false));

    const material = new THREE.ShaderMaterial({
      uniforms: Object.assign(
        {
          uColor: new THREE.Uniform(new THREE.Color(0x7affff)),
          uTime: new THREE.Uniform(0),
          uSpeed: new THREE.Uniform(this.speed),
          uTravelLength: new THREE.Uniform(this.options.length),
          uFade: new THREE.Uniform(this.fade),
        },
        this.fogUniforms
      ),
      vertexShader: `
      #define USE_FOG;
      ${THREE.ShaderChunk["fog_pars_vertex"]}

      attribute vec3 aOffset;
      attribute vec2 aMetrics;

      uniform float uTime;
      uniform float uSpeed;
      uniform float uTravelLength;

      varying vec2 vUv;


      void main() {
        vec3 transformed = position.xyz;

        float radius = aMetrics.r;
        float len = aMetrics.g;

        transformed.xy *= radius;
        transformed.z *= len;

        // Keep them separated to make the next step easier!
        float speed = uTime * uSpeed;
        float zOffset = speed + aOffset.z;

        zOffset = len - mod(zOffset , uTravelLength);
        transformed.z += zOffset;
        transformed.xy += aOffset.xy;

        vec4 mvPosition = modelViewMatrix * vec4(transformed,1.);
        gl_Position = projectionMatrix * mvPosition;

        vUv = uv;
        ${THREE.ShaderChunk["fog_vertex"]}
      }
      `,
      fragmentShader: `
      #define USE_FOG;
      ${THREE.ShaderChunk["fog_pars_fragment"]}

      uniform vec3 uColor;
      uniform vec2 uFade;
      varying vec2 vUv;

      void main() {
          vec3 color = vec3(uColor);

          float fadeStart = 0.4;
          float maxFade = 0.;
          float alpha = 1.;

          alpha = smoothstep(uFade.x, uFade.y, vUv.x);
          gl_FragColor = vec4(color, alpha);

          if(gl_FragColor.a < 0.0001) discard;

          ${THREE.ShaderChunk["fog_fragment"]}

      }
      `,
      side: THREE.DoubleSide,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(instancedGeometry, material);

    this.webgl.scene.add(this.mesh);
  }

  getFloat32Arrays() {
    const aOffset = [];
    const aMetrics = [];

    const sectionWidth = this.options.roadWidth;

    for (let i = 0; i < this.options.count; i++) {
      const radius = -0.5 * Math.random();

      const length = Math.random() * this.options.length * 0.08 + this.options.length * 0.02;

      const offsetY = radius * 15;
      const offsetZ = Math.random() * this.options.length;

      aMetrics.push(radius);
      aMetrics.push(length);

      aMetrics.push(radius);
      aMetrics.push(length);

      aOffset.push(sectionWidth);
      aOffset.push(offsetY);
      aOffset.push(-offsetZ);

      aOffset.push(-sectionWidth);
      aOffset.push(offsetY);
      aOffset.push(-offsetZ);
    }

    return { offset: new Float32Array(aOffset), metrics: new Float32Array(aMetrics) };
  }

  update(t) {
    this.mesh.material.uniforms.uTime.value = t;
  }
}
