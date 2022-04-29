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

const KEYS = {
  'a': 65,
  's': 83,
  'w': 87,
  'd': 68,
};

function clamp(x, a, b) {
  return Math.min(Math.max(x, a), b);
}

class InputController {
  private target_: any; // not 100% what type all should be;
  private current_: any;
  private previous_: any;
  private keys_: any; 
  private previousKeys_: any;

  constructor(target) {
    this.target_ = target || document; 
    this.initialize_();    
  }

  initialize_() {
    this.current_ = {
      leftButton: false,
      rightButton: false,
      mouseXDelta: 0,
      mouseYDelta: 0,
      mouseX: 0,
      mouseY: 0,
    };
    this.previous_ = null;
    this.keys_ = {};
    this.previousKeys_ = {};
    this.target_.addEventListener('mousedown', (e) => this.onMouseDown_(e), false);
    this.target_.addEventListener('mousemove', (e) => this.onMouseMove_(e), false);
    this.target_.addEventListener('mouseup', (e) => this.onMouseUp_(e), false);
    this.target_.addEventListener('keydown', (e) => this.onKeyDown_(e), false);
    this.target_.addEventListener('keyup', (e) => this.onKeyUp_(e), false);
  }

  onMouseMove_(e) {
    this.current_.mouseX = e.pageX - window.innerWidth / 2;
    this.current_.mouseY = e.pageY - window.innerHeight / 2;

    if (this.previous_ === null) {
      this.previous_ = {...this.current_};
    }

    this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
    this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;
  }

  onMouseDown_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = true;
        break;
      }
      case 2: {
        this.current_.rightButton = true;
        break;
      }
    }
  }

  onMouseUp_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = false;
        break;
      }
      case 2: {
        this.current_.rightButton = false;
        break;
      }
    }
  }

  onKeyDown_(e) {
    this.keys_[e.keyCode] = true;
  }

  onKeyUp_(e) {
    this.keys_[e.keyCode] = false;
  }

  key(keyCode) {
    return !!this.keys_[keyCode];
  }

  isReady() {
    return this.previous_ !== null;
  }

  update(_) {
    if (this.previous_ !== null) {
      this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
      this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;

      this.previous_ = {...this.current_};
    }
  }
};

class FirstPersonCamera {
  private camera_: any; // not 100% what type all should be;
  private input_: InputController;
  private rotation_: THREE.Quaternion;
  private translation_: THREE.Vector3; 
  private phi_: any;
  private phiSpeed_: any; 
  private theta_: any;
  private thetaSpeed_: any;
  private headBobActive_: boolean; 
  private headBobTimer_: any;
  private objects_: any;
  // private thetaSpeed_: any;
  // private headBobActive_: boolean; 
  // private headBobTimer_: any;


  constructor(camera, objects) {
    this.camera_ = camera;
    this.input_ = new InputController();
    this.rotation_ = new THREE.Quaternion();
    this.translation_ = new THREE.Vector3(0, 2, 0);
    this.phi_ = 0;
    this.phiSpeed_ = 8;
    this.theta_ = 0;
    this.thetaSpeed_ = 5;
    this.headBobActive_ = false;
    this.headBobTimer_ = 0;
    this.objects_ = objects;
  }

  update(timeElapsedS) {
    this.updateRotation_(timeElapsedS);
    this.updateCamera_(timeElapsedS);
    this.updateTranslation_(timeElapsedS);
    this.updateHeadBob_(timeElapsedS);
    this.input_.update(timeElapsedS);
  }

  updateCamera_(_) {
    this.camera_.quaternion.copy(this.rotation_);
    this.camera_.position.copy(this.translation_);
    this.camera_.position.y += Math.sin(this.headBobTimer_ * 10) * 1.5;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation_);

    const dir = forward.clone();

    forward.multiplyScalar(100);
    forward.add(this.translation_);

    let closest = forward;
    const result = new THREE.Vector3();
    const ray = new THREE.Ray(this.translation_, dir);
    for (let i = 0; i < this.objects_.length; ++i) {
      if (ray.intersectBox(this.objects_[i], result)) {
        if (result.distanceTo(ray.origin) < closest.distanceTo(ray.origin)) {
          closest = result.clone();
        }
      }
    }

    this.camera_.lookAt(closest);
  }

  updateHeadBob_(timeElapsedS) {
    if (this.headBobActive_) {
      const wavelength = Math.PI;
      const nextStep = 1 + Math.floor(((this.headBobTimer_ + 0.000001) * 10) / wavelength);
      const nextStepTime = nextStep * wavelength / 10;
      this.headBobTimer_ = Math.min(this.headBobTimer_ + timeElapsedS, nextStepTime);

      if (this.headBobTimer_ == nextStepTime) {
        this.headBobActive_ = false;
      }
    }
  }

  updateTranslation_(timeElapsedS) {
    const forwardVelocity = (this.input_.key(KEYS.w) ? 1 : 0) + (this.input_.key(KEYS.s) ? -1 : 0)
    const strafeVelocity = (this.input_.key(KEYS.a) ? 1 : 0) + (this.input_.key(KEYS.d) ? -1 : 0)

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(qx);
    forward.multiplyScalar(forwardVelocity * timeElapsedS * 10);

    const left = new THREE.Vector3(-1, 0, 0);
    left.applyQuaternion(qx);
    left.multiplyScalar(strafeVelocity * timeElapsedS * 10);

    this.translation_.add(forward);
    this.translation_.add(left);

    if (forwardVelocity != 0 || strafeVelocity != 0) {
      this.headBobActive_ = true;
    }
  }

  updateRotation_(timeElapsedS) {
    const xh = this.input_.current_.mouseXDelta / window.innerWidth;
    const yh = this.input_.current_.mouseYDelta / window.innerHeight;

    this.phi_ += -xh * this.phiSpeed_;
    this.theta_ = clamp(this.theta_ + -yh * this.thetaSpeed_, -Math.PI / 3, Math.PI / 3);

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
    const qz = new THREE.Quaternion();
    qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta_);

    const q = new THREE.Quaternion();
    q.multiply(qx);
    q.multiply(qz);

    this.rotation_.copy(q);
  }
}




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
