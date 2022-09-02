import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
import { Lights } from "./lights/Lights";
import { GridEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass } from "postprocessing";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler";
import { LoadingManager } from "./loadingManager/loadingManager";
import Stats from "stats-js";

import model from "../model/untitled.glb";

console.log(model);

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

export class Canvas {
  constructor(element) {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ powerPreference: "high-performance", canvas: element, antialias: false });
    this.renderer.setClearColor(0x000000);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.clock = new THREE.Clock();
    this.isLoaded = false;

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);

    const noiseEffect = new NoiseEffect({ premultiply: false });
    noiseEffect.blendMode.opacity.value = 0.01;
    // noiseEffect.blendMode.blendFunction = BlendFunction;

    const gridEffect = new GridEffect({ scale: 1.5 });
    const effectPass = new EffectPass(this.camera, noiseEffect, gridEffect);
    // this.composer.addPass(effectPass);

    this.instancedCount = 20000;
    this.dummyVector = new THREE.Vector3(0, 0, 8.15123832525186);

    const fog = new THREE.Fog(0x000000, 1, 20);

    this.fogUniforms = {
      fogColor: { type: "c", value: fog.color },
      fogNear: { type: "f", value: fog.near },
      fogFar: { type: "f", value: fog.far },
    };

    this.camera.position.set(0, 0.0, 8.15123832525186);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);

    this.lights = new Lights(
      this,
      {
        count: 250,
        length: 200,
        roadWidth: 10,
        roadSections: 1,
        background: 0x000000,
      },
      50
    );

    this.lights.init();

    RectAreaLightUniformsLib.init();

    this.loadingManager = new LoadingManager(this.scene);

    // this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
    // this.scene.add(this.ambientLight);

    this.dracoLoader = new DRACOLoader(this.loadingManager.loadingManager);
    this.dracoLoader.setDecoderPath("/webgl/draco/");

    this.gltfLoader = new GLTFLoader(this.loadingManager.loadingManager);
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.rectLight1 = new THREE.RectAreaLight(0xd5fbfd, 3, 10, 10);
    this.rectLight1.position.set(0, 0, 6);
    this.rectLight1.rotation.z = -Math.PI / 2;
    this.scene.add(this.rectLight1);

    this.gltfLoader.load(model, (gltf) => {
      this.handleGltf(gltf);
      // this.handleGltfSurface(gltf);
      this.isLoaded = true;
    });

    this.animate();
    this.handleResize();
    this.createFloor();
    this.createBackgroundLight();

    document.addEventListener("click", () => {
      const v = new THREE.Vector3();
      console.log(this.camera.position);
      this.camera.getWorldDirection(v);
      console.log(v);
    });
  }

  handleGltf(gltf) {
    gltf.scene.position.y = -9;

    // gltf.scene.rotateY(-0.5);
    this.scene.add(gltf.scene);
  }

  handleGltfSurface(gltf) {
    console.log(gltf.scene);
    const geometry = gltf.scene.children[0].geometry;
    console.log(geometry);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // this.scene.add(gltf.scene.children[0]);

    this.surface = new THREE.Mesh(geometry, material);
    // this.surface.position.y = -9;

    // Sampler
    const sampler = new MeshSurfaceSampler(this.surface);
    sampler.build();

    this.createSphere(sampler);

    // this.scene.add(gltf.scene);
  }

  createSphere(sampler) {
    const geometry = new THREE.SphereBufferGeometry(0.01);

    const float32Arrays = this.getFloat32Array(sampler);

    const count = 5000;
    const positionsBufferAttribute = new THREE.InstancedBufferAttribute(float32Arrays.position, 3);

    const distortionBufferAttribute = new THREE.InstancedBufferAttribute(float32Arrays.distortion, 4);

    geometry.setAttribute("a_position", positionsBufferAttribute);
    geometry.setAttribute("a_distortion", distortionBufferAttribute);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: new THREE.Uniform(0),
      },
      vertexShader: `
      #define PI 3.14159265359

      attribute vec3 a_position;
      attribute vec4 a_distortion;
      uniform float uTime;


      varying float v_strength;


      void main(){
          float strength = 0.015 * distance(a_position, vec3(0.)) * a_distortion.w;
          vec3 customPosition = position.xyz + a_position;

          float distortion = sin(a_distortion.w * 3.5 * uTime) * 1.25;
          customPosition += a_distortion.xyz * distortion;

          gl_Position = projectionMatrix* modelViewMatrix * vec4(customPosition, 1.);


          v_strength = strength;
        }
      `,
      fragmentShader: `
      uniform float uTime;

      varying float v_strength;

        void main(){
          vec3 color = vec3(1.0);
          gl_FragColor = vec4(color, 1.0 - v_strength);
        }
      `,
      transparent: true,
    });

    this.model = new THREE.InstancedMesh(geometry, material, this.instancedCount);
    this.model.position.y = -9;

    this.scene.add(this.model);
  }

  getFloat32Array(sampler) {
    const position = [];
    const distortion = [];
    const dummyPosition = new THREE.Vector3();

    for (let i = 0; i < this.instancedCount; i++) {
      sampler.sample(dummyPosition);

      position.push(dummyPosition.x, dummyPosition.y, dummyPosition.z);
      distortion.push(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random());
    }

    return {
      position: new Float32Array(position),
      distortion: new Float32Array(distortion),
    };
  }

  createBackgroundLight() {
    const light = new THREE.RectAreaLight(0x3a7073, 30, 6, 6.5);
    light.position.set(0, 0, -7);
    light.position.z = -6;
    light.lookAt(0, 0, 0);

    const helper = new RectAreaLightHelper(light);

    light.add(helper);

    this.scene.add(light);
    // this.scene.add(circle);
  }

  handleResize() {
    window.addEventListener("resize", () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;

      this.camera.aspect = sizes.width / sizes.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(sizes.width, sizes.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  createFloor() {
    const material = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.1, metalness: 0 });

    const geometry = new THREE.BoxGeometry(200, 0.1, 200);
    const plane = new THREE.Mesh(geometry, material);
    plane.position.y = -7;

    this.rectLight2 = new THREE.RectAreaLight(0x3a7073, 5, 50, 50);
    this.rectLight2.position.set(0, 25, -5);
    this.rectLight2.lookAt(new THREE.Vector3(0));

    this.scene.add(this.rectLight2);
    this.scene.add(plane);
  }

  animate() {
    stats.begin();
    this.composer.render();
    const elapsedTime = this.clock.getElapsedTime();
    this.orbitControls.update();

    // if (this.isLoaded) {
    //   this.camera.position.lerp(this.dummyVector, 0.1);
    // }

    if (this.sphere) {
      this.sphere.material.uniforms.uTime.value = elapsedTime;
    }

    this.lights.update(elapsedTime);
    stats.end();
    requestAnimationFrame(() => this.animate());
  }
}
