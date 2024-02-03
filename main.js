import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import './style.css'
import cloud from './textures/clouds.jpg?url'
import map from './textures/water.png?url'
import airplaneGlb from './assets/cartoon_plane.glb?url'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const textureLoader = new THREE.TextureLoader()
const isMobile = window.innerWidth <= 768
const velocity = { value: 0.06 }
const locations = [
	{
		name: 'Roma',
		coords: [41.89, 12.49],
	},
	{
		name: 'Doha',
		coords: [25.28, 51.52]
	},
	{
		name: 'Abu Dhabi',
		coords: [24.47, 54.45]
	},
	{
		name: 'Kuala Lumpur',
		coords: [3.13, 101.6],
	},
	{
		name: 'Singapore',
		coords: [1.27, 103.85]
	},
	{
		name: 'Zanzibar',
		coords: [-6.15, 39.18]
	},
	{
		name: 'Lampedusa',
		coords: [35.50, 12.61]
	},
	{
		name: 'Valencia',
		coords: [39.46, -0.38]
	},
	{
		name: 'Londra',
		coords: [51.50, -0.12]
	}
]

/**
 * Scene
 */
const scene = new THREE.Scene()

/**
 * Axes helper
 */
const axesHelper = new THREE.AxesHelper(10)
//scene.add(axesHelper)

/**
 * Grid Helper
 */
const gridHelper = new THREE.GridHelper(10, 10)
//scene.add(gridHelper)

/**
 * Render sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
}

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(90, sizes.width / sizes.height, 0.1)
isMobile ? camera.position.set(16, 5, 16) : camera.position.set(10, 5, 10)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
	antialias: window.devicePixelRatio < 2,
	logarithmicDepthBuffer: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

/**
 * OrbitControls
 */
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false

if(isMobile) {
	controls.maxDistance = 25
	controls.minDistance = 18
}else {
	controls.maxDistance = 20
	controls.minDistance = 13
}

/**
 * Ambient light
 */
const ambientLight = new THREE.AmbientLight('#ffffff', 0.7)
scene.add(ambientLight)

/**
 * Point light
 */
const pointLight = new THREE.PointLight('#ffffff', 0.2)
camera.add(pointLight)

/**
 * Earth
 */
const earth = createEarth()
earth.rotation.y = -Math.PI * 0.3
scene.add(camera, earth)

/**
 * Airplane curve
 */
const airplaneCurve = createAirplaneCurve()

/**
 * Airplane path
 */
const airplanePath = createAirplanePath()
scene.add(airplanePath)

/**
 * Airplane
 */
const airplane = await new GLTFLoader().loadAsync(airplaneGlb)
scene.add(airplane.scene)

/**
 * Airplane animations
 */
const airplaneMixer = new THREE.AnimationMixer(airplane.scene)
airplaneMixer.clipAction(airplane.animations[0]).play()

/**
 * Location & Path creation
 */
locations.forEach((location, i) => {
	const mesh = createLocation(location, i)
	earth.add(mesh)

	if(i > 0) {
		const path = createPath(locations[i], locations[i - 1])
		earth.add(path)
	}
})

const cloudMesh = earth.getObjectByName('clouds')
const clock = new THREE.Clock()

/**
 * Frame loop
 */
function tic() {
	controls.update()
	
	const delta = clock.getDelta()

	/** Animating earth */
	earth.rotation.y -= velocity.value * delta

	/** Animating clouds */
	cloudMesh.rotation.y += velocity.value * delta * 0.25

	/** Animating airplane */
	const elapsedTime = clock.getElapsedTime()
	const loopTime = 20

	const progress = (elapsedTime % loopTime) / loopTime
	airplaneStepForward(progress)

	airplaneMixer.update(0.02);

	/** Render */
	renderer.render(scene, camera)

	requestAnimationFrame(tic)
}

requestAnimationFrame(tic)

/**
 * Resize event listener
 */
window.addEventListener('resize', onResize)

function onResize() {
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	camera.aspect = sizes.width / sizes.height
	camera.updateProjectionMatrix()

	renderer.setSize(sizes.width, sizes.height)

	const pixelRatio = Math.min(window.devicePixelRatio, 2)
	renderer.setPixelRatio(pixelRatio)
}//------------------------------------------------------------------------------------------------

function createEarth() {
	const texture = textureLoader.load(map)

	const water = createWater(texture)
	const ground = createGround(texture)
	//const atmo = createAtmo()
	const clouds = createClouds()

	const group = new THREE.Group()
	group.add(ground, water, clouds)

	return group
}//------------------------------------------------------------------------------------------------

function createGround(map) {
	const geometry = new THREE.SphereGeometry(8, 90, 90)
	const material = new THREE.MeshStandardMaterial({
		color: 0x88af34,
		transparent: true,
		map: map
	})

	material.onBeforeCompile = (shader) => {
		shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
		`
		#ifdef USE_MAP
			vec4 map = texture2D( map, vMapUv );
			diffuseColor *= vec4( vec3(1.) - map.rgb, 1. - map.r );
		#endif
		`)
	}

	const mesh = new THREE.Mesh(geometry, material)
	mesh.name = 'ground'

	return mesh
}//------------------------------------------------------------------------------------------------

function createAtmo() {
	const geometry = new THREE.SphereGeometry(8.25, 90, 90)
	const material = new THREE.MeshStandardMaterial({
		color: 0x000000,
		side: THREE.BackSide
	})

	const mesh = new THREE.Mesh(geometry, material)
	mesh.name = 'atmo'

	return mesh
}//------------------------------------------------------------------------------------------------

function createClouds() {
	const texture = textureLoader.load(cloud)

	const geometry = new THREE.SphereGeometry(8.25, 90, 90)
	const material = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		transparent: true,
		alphaMap: texture
	})

	const mesh = new THREE.Mesh(geometry, material)
	mesh.name = 'clouds'

	return mesh
}//------------------------------------------------------------------------------------------------

function createWater(map) {
	const geometry = new THREE.SphereGeometry(7.85, 90, 90)
	const material = new THREE.MeshStandardMaterial({
		color: 0x38bdf8,
		map: map
	})

	const mesh = new THREE.Mesh(geometry, material)
	mesh.name = 'water'

	return mesh
}//------------------------------------------------------------------------------------------------

function createLocation(location, i) {
	const geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.001)
	geometry.rotateX(Math.PI * 0.5)
	const material = new THREE.MeshBasicMaterial({
		color: 0xffffff
	})

	const mesh = new THREE.Mesh(geometry, material)

	const position = getLocationPosition(location.coords[0], location.coords[1])
	mesh.position.copy(position)

	mesh.lookAt(0, 0, 0)

	return mesh
}//------------------------------------------------------------------------------------------------

function getLocationPosition(lt, ln, radius = 8.01) {
	const t = THREE.MathUtils.degToRad(90 - lt)
	const p = THREE.MathUtils.degToRad(90 + ln)

	const position = new THREE.Vector3()
	position.setFromSphericalCoords(radius, t, p)

	return position
}//------------------------------------------------------------------------------------------------

function createPath(locationA, locationB) {
	const A = getLocationPosition(locationA.coords[0], locationA.coords[1], 8)
	const B = getLocationPosition(locationB.coords[0], locationB.coords[1], 8)

	const points = []
	for(let i = 0; i <= 10; i++) {
		const C = A.clone().lerp(B, 0.1 * i).normalize().multiplyScalar(8 + Math.sin(i / 10 * Math.PI))
		points.push(C)
	}

	const curve = new THREE.CatmullRomCurve3(points)

	const geometry = new THREE.TubeGeometry(curve, 50, 0.02, 5)
	const material = new THREE.MeshBasicMaterial({
		color: 0xffffff
	})

	const mesh = new THREE.Mesh(geometry, material)

	return mesh
}//------------------------------------------------------------------------------------------------

function createAirplaneCurve() {
	const curve = new THREE.EllipseCurve(0, 0, 9.5, 9.5);
	const points = curve.getPoints(100)

	points.forEach(point => {
		point.z = point.y
		point.y = 0
	})

	return new THREE.CatmullRomCurve3(points);
}//------------------------------------------------------------------------------------------------

function createAirplanePath() {
	const geometry = new THREE.BufferGeometry().setFromPoints(airplaneCurve.getPoints(100));
	const material = new THREE.LineBasicMaterial( {
		//color: 0xffffff
		transparent: true,
		opacity: 0
	});

	const mesh = new THREE.Line(geometry, material)

	return mesh
}//------------------------------------------------------------------------------------------------

function airplaneStepForward(progress) {
	const position = airplaneCurve.getPointAt(progress)
	const nextPosition = airplaneCurve.getPointAt(Math.min(progress + 0.01, 1))

	airplane.scene.position.copy(position)
	airplane.scene.lookAt(nextPosition)
	airplane.scene.rotateZ(Math.PI * 1.5)
}//------------------------------------------------------------------------------------------------