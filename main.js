import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const exrLoader = new EXRLoader();
exrLoader.load('/resources/textures/skybox.exr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
});

function placeOnGround(object) {
    const bbox = new THREE.Box3().setFromObject(object);
    const minY = bbox.min.y;
    object.position.y -= minY;
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 2;
controls.maxDistance = 10;

const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

const mtlLoader = new MTLLoader();

function loadModel(objFile, mtlFile, position = { x: 0, y: 0, z: 0 }) {
    mtlLoader.setPath('/resources/models/');
    mtlLoader.load(mtlFile, (materials) => {
        materials.preload();
        
        const objLoader = new OBJLoader();
        objLoader.setPath('/resources/models/');
        objLoader.setMaterials(materials);

        objLoader.load(objFile, (object) => {
            object.position.set(position.x, position.y, position.z);
            placeOnGround(object);
            
            object.traverse((child) => {
                if (child.isMesh) {
                    child.material.side = THREE.DoubleSide;
                }
            });

            scene.add(object);
        }, undefined, (error) => {
            console.error(`Error loading ${objFile}:`, error);
        });
    }, undefined, (error) => {
        console.error(`Error loading ${mtlFile}:`, error);
    });
}

// Load models
loadModel('donut.obj', 'donut.mtl', { x: 0, y: 0, z: 0 });
loadModel('dice.obj', 'dice.mtl', { x: 2, y: 0, z: 0 });

const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(5, 5, 5);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040, 3);
scene.add(ambientLight);

camera.position.z = 5;

function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
