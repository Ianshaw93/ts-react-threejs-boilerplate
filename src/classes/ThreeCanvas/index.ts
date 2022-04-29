// import * as THREE from 'three'; // (i)orbit controls was not working using this & (ii) below
import THREE from './three' // orbit controls wasn't working until require in three.js
import { Mesh, Vector3, MathUtils } from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';// (ii)
// import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js'
// import { FirstPersonControls } from './FirstPersonControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import theme from 'utils/theme';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { vertex as basicVertex, fragment as basicFragment } from './shaders/basic';

interface IOptions {
  mountPoint: HTMLDivElement;
  width: number;
  height: number;
}

class ThreeCanvas {
  private renderer: THREE.WebGLRenderer;
  private composer: THREE.Composer;
  private camera: THREE.Camera;
  private cubeGroup: THREE.Group;
  private clock: THREE.Clock;
  private controls: THREE.Controls;
  private scene: THREE.Scene;
  // private FirstPersonControls: THREE.FirstPersonControls;

  constructor(options: IOptions) {
    const { mountPoint, width, height } = options; // look into mountPoint

    // this is just here for reference. most of this file should be overwritten :)

    // basics
    const clock = this.clock = new THREE.Clock();
    const scene = new THREE.Scene();
    const camera = this.camera = new THREE.PerspectiveCamera( 75, width / height, 0.1, 1000 );
    const renderer = this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    // const controls = this.controls = new THREE.OrbitControls(camera, renderer.domElement); 

    // scene.background = new THREE.Color( theme.colors.white );
    renderer.setSize( width, height );
    camera.position.z = 5;
    
    

    // post processing support
    const composer = this.composer = new EffectComposer( renderer );

    const renderPass = new RenderPass( scene, camera );
    renderPass.clear = false;
    composer.addPass( renderPass );
    const controls = this.controls = new OrbitControls(camera, renderer.domElement); //project works with orbit controls
    // const controls = this.controls = new FirstPersonControls(camera, renderer.domElement); // does not work with first person controls?? not sure why
    // const controls = this.controls = new THREE.FlyControls(camera, renderer.domElement); //FlyControls

 
    // mount to DOM
    mountPoint.appendChild( renderer.domElement );
    // VR support
    // renderer.xr.enabled = true;
    // mountPoint.appendChild( VRButton.createButton( renderer ) );

    this.addMeshes(scene);
    // controls.update()
  }
  // const screenTextureURL = 
  addMeshes(scene: THREE.Scene) {
    const loader = new THREE.TextureLoader();
    
    const screenTexture = loader.load('./Computer01.png');
    var screenMaterial = new THREE.MeshLambertMaterial({
      map: screenTexture,
      transparent: true,
      depthWrite:false,
      // opacity: 0.5,
      side: THREE.DoubleSide, 
    });
    const screenGeometry = new THREE.PlaneGeometry(2.1,2.1);
    const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial); // combine image and material in mesh
    screenMesh.position.set(0,0,-3); // z should be negative: ;
    scene.add(screenMesh);

    const testBoxGeometry = new THREE.BoxGeometry(8,8,8);
    const testBoxMesh = new THREE.Mesh(testBoxGeometry, new THREE.MeshBasicMaterial( {color: 0x00ff00} ));
    testBoxMesh.position.set(0,0,10);
    scene.add(testBoxMesh);

    const objLoader = new GLTFLoader();

    // const tableObject = await Promise()
    objLoader.load( './oldtablethreed.glb', function ( gltf ) {
        const model = gltf.scene.children[0];
        model.scale.set(0.5,0.5,0.5);
        scene.add( gltf.scene );
    },
    undefined, function ( error ) {
        console.error( error );
    } );

    {
      var light = new THREE.PointLight( 0xffffff, 0.9 );
      // camera.add( light );
      scene.add( light );
    }

    this.camera.target = screenMesh.position;
    // this.camera.target = screenMesh.position.copy();
  }

  resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const needResize = canvas.width !== width || canvas.height !== height;

    if (needResize) {
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // use 2x pixel ratio at max
    }

    return needResize;
  }

  public setAnimationLoop(callback: Function) {
    this.renderer.setAnimationLoop(callback);
  }
  
  render() {
    // check if we need to resize the canvas and re-setup the camera
    if (this.resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
      // this.controls.handleResize();
    }
    // this.scene.update()
    // this.controls.update()
    // this.renderer.render(this.scene, this.camera);
    this.composer.render(this.scene, this.camera); //confused why orbit controls not working??
    // this.scene.update()
    this.controls.update();
  }

  // this.render();
}

export default ThreeCanvas;
