import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const effect = new OutlineEffect(renderer, {
    edgeStrength: 3.0,
    edgeGlow: 0.1,
    edgeThickness: 1.0,
    pulsePeriod: 0
});

document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
document.body.addEventListener('click', () => document.body.requestPointerLock());

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== document.body) {
        console.log('Pointer lock lost');
    }
});

const clock = new THREE.Clock();

const exrLoader = new EXRLoader();
exrLoader.load('/resources/textures/skybox.exr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 2;
controls.maxDistance = 10;
controls.enableKeys = false;
controls.enabled = false;

const gltfLoader = new GLTFLoader();
let pokerTable = null;
let pokerTableHighlighted = false;
let interactText = null;

gltfLoader.load('resources/models/hall.glb', (gltf) => {
    const hall = gltf.scene;
    scene.add(hall);

    const pokerTablePos = hall.getObjectByName("PokerTable_Position");
    if (pokerTablePos) {
        gltfLoader.load('resources/models/table.glb', (tableGltf) => {
            pokerTable = tableGltf.scene;
            pokerTable.position.copy(pokerTablePos.position);
            pokerTable.rotation.copy(pokerTablePos.rotation);
            scene.add(pokerTable);

            const fontLoader = new FontLoader();
            fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
                const textGeometry = new TextGeometry('Press E to Interact', {
                    font: font,
                    size: 0.3,
                    height: 1,
                    curveSegments: 12, 
                    bevelEnabled: false,
                });
                textGeometry.computeBoundingBox();
                const textMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
                interactText = new THREE.Mesh(textGeometry, textMaterial);
                interactText.geometry.center();
                interactText.position.set(pokerTable.position.x , pokerTable.position.y + 3, pokerTable.position.z);
                interactText.scale.set(1, 1, 0.002);
                scene.add(interactText);
                interactText.visible = false;
            });
        });
    }
});

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 50;
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

camera.position.set(0, 2, 5);

const keyStates = {};
const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

document.addEventListener('keydown', (event) => {
    keyStates[event.code] = true;
});

document.addEventListener('keyup', (event) => {
    keyStates[event.code] = false;
});

document.body.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
});

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function getForwardVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    return playerDirection;
}

function getSideVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);
    return playerDirection;
}

function playerControls(deltaTime) {
    const speedDelta = deltaTime * 2;

    if (keyStates['KeyW']) {
        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
    }
    if (keyStates['KeyS']) {
        playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));
    }
    if (keyStates['KeyA']) {
        playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));
    }
    if (keyStates['KeyD']) {
        playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
    }
    
    camera.position.add(playerVelocity);
    playerVelocity.multiplyScalar(0.9);
}

function checkProximity() {
    if (!pokerTable) return;

    const playerPos = camera.position;
    const tablePos = pokerTable.position;
    const distance = playerPos.distanceTo(tablePos);

    const interactDistance = 5;

    if (distance < interactDistance) {
        if (!pokerTableHighlighted) {
            pokerTableHighlighted = true;
            pokerTable.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x00ff00); 
                    child.material.emissiveIntensity = 0.3;
                }
            });
            if (interactText) interactText.visible = true;
        }
    } else {
        if (pokerTableHighlighted) {
            pokerTableHighlighted = false;
            pokerTable.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            });
            if (interactText) interactText.visible = false;
        }
    }
}

document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyE' && pokerTableHighlighted) {
        alert('Interacting with Poker Table!');
    }
});

function animate() {
    const deltaTime = clock.getDelta();
    playerControls(deltaTime);
    checkProximity();
    // effect.render(scene, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
