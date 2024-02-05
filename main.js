import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

/** Textures */
import cloudTexture from './textures/clouds.jpg?url'
import waterTexture from './textures/water.png?url'

/** Glb models */
import airplaneGlb from './assets/airplane.glb?url'
import elephantGlb from './assets/elephant.glb?url'
import pyramidGlb from './assets/pyramid.glb?url'

const textureLoader = new THREE.TextureLoader()
const cursor = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
const isMobile = window.innerWidth <= 768
const velocity = { value: 0.006 }
const locations = [
	{
		name: 'Roma, Italia',
		coords: [41.89, 12.49],
	},
	{
		name: 'Doha, Qatar',
		coords: [25.28, 51.52]
	},
	{
		name: 'Abu Dhabi, Emirati Arabi Uniti',
		coords: [24.47, 54.45]
	},
	{
		name: 'Kuala Lumpur, Malesia',
		coords: [3.13, 101.6],
	},
	{
		name: 'Singapore, Repubblica di Singapore',
		coords: [1.27, 103.85]
	},
	{
		name: 'Zanzibar, Tanzania',
		coords: [-6.15, 39.18]
	},
	{
		name: 'Addis Abeba, Etiopia',
		coords: [9.02, 38.75]
	},
	{
		name: 'Lampedusa, Italia',
		coords: [35.50, 12.61]
	},
	{
		name: 'Valencia, Spagna',
		coords: [39.46, -0.38]
	},
	{
		name: 'Londra, Inghilterra',
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
scene.add(camera)

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
	controls.minDistance = 12
}else {
	controls.maxDistance = 20
	controls.minDistance = 11
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
scene.add(earth)

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
 * Elephant family
 */
//const elephantFamily = await createElephantFamily()
//earth.add(elephantFamily)

/**
 * Pyramid
 */
//const pyramid = await createPyramid()
//earth.add(pyramid.scene)

/**
 * Location & Path creation
 */
printLocation(locations)
const cards = document.querySelectorAll('.card')

locations.forEach((location, i) => {
	const mesh = createLocation(location, i)
	location.HTMLCard = cards[i]
	location.mesh = mesh
	earth.add(mesh)

	if(i > 0) {
		const path = createPath(locations[i], locations[i - 1])
		earth.add(path)
	}
})

const locationMeshes = locations.map(({ mesh }) => mesh)

const cloudMesh = earth.getObjectByName('clouds')
const finalScale = new THREE.Vector3(2, 2, 2)
const clock = new THREE.Clock()

/**
 * Frame loop
 */
function tic() {
	controls.update()
	
	const delta = clock.getDelta()

	raycaster.setFromCamera(cursor, camera)
	const intersects = raycaster.intersectObjects(locationMeshes)
	
	const obj = intersects[0]
	if(obj) {
		velocity.value = THREE.MathUtils.lerp(velocity.value, 0, 0.05)
	}else {
		velocity.value = THREE.MathUtils.lerp(velocity.value, 0.006, 0.05)
	}

	const x = (cursor.x * 0.5 + 0.5) * window.innerWidth
	const y = (-cursor.y * 0.5 + 0.5) * window.innerHeight

	locations.forEach(location => {
		const { mesh, HTMLCard: card } = location
		
		if(mesh === obj?.object) {
			mesh.scale.lerp(finalScale, 0.05)
			card.style.opacity = THREE.MathUtils.lerp(card.style.opacity, 1, 0.05)
			card.style.top = (y + 20) + 'px'
			card.style.left = (x + 20) + 'px'
		}else {
			mesh.scale.lerp(new THREE.Vector3().setScalar(1), 0.1)
			card.style.opacity = THREE.MathUtils.lerp(card.style.opacity, 0, 0.1)
		}
	})

	/** Animating earth */
	earth.rotation.y -= delta * velocity.value * 15

	/** Animating clouds */
	cloudMesh.rotation.y += delta * velocity.value

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
window.addEventListener('resize', () => {
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	camera.aspect = sizes.width / sizes.height
	camera.updateProjectionMatrix()

	renderer.setSize(sizes.width, sizes.height)

	const pixelRatio = Math.min(window.devicePixelRatio, 2)
	renderer.setPixelRatio(pixelRatio)
})//------------------------------------------------------------------------------------------------

/**
 * Mouse move event listener
 */
window.addEventListener('mousemove', (e) => {
	cursor.x = 2 * (e.clientX / window.innerWidth) - 1
	cursor.y = -2 * (e.clientY / window.innerHeight) + 1
})//------------------------------------------------------------------------------------------------

function createEarth() {
	const texture = textureLoader.load(waterTexture)

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
	const texture = textureLoader.load(cloudTexture)

	const geometry = new THREE.SphereGeometry(8.5, 90, 90)
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

async function createElephantFamily() {
	const elephant = await createElephant(0.002, 0.66, 8.18)
	const elephantChild1 = await createElephant(0.001, 3.66, 8.09)
	const elephantChild2 = await createElephant(0.001, 5.8, 8.09)

	const elephantFamily = new THREE.Group();
	elephantFamily.add(elephant.scene, elephantChild1.scene, elephantChild2.scene)

	return elephantFamily
}//------------------------------------------------------------------------------------------------

async function createElephant(scale, lt, radius) {
	const elephant = await new GLTFLoader().loadAsync(elephantGlb)
	
	elephant.scene.scale.set(scale, scale, scale)
	elephant.scene.rotateZ(Math.PI * 1.5)
	
	const elephantPosition = getLocationPosition(24.21, lt, radius)
	elephant.scene.position.copy(elephantPosition)
	
	elephant.scene.lookAt(0, 0, 0)

	elephant.scene.rotateX(-Math.PI * 0.5)
	elephant.scene.rotateY(Math.PI * 0.5)

	return elephant
}//------------------------------------------------------------------------------------------------

async function createPyramid() {
	const pyramid = await new GLTFLoader().loadAsync(pyramidGlb)
	
	pyramid.scene.scale.set(0.3, 0.3, 0.3)

	const pyramidPosition = getLocationPosition(26.33, 28.20, 8.07)
	pyramid.scene.position.copy(pyramidPosition)
	
	pyramid.scene.lookAt(0, 0, 0)

	pyramid.scene.rotateX(-Math.PI * 0.5)
	pyramid.scene.rotateY(-Math.PI * 0.5)

	return pyramid
}//------------------------------------------------------------------------------------------------

/**
 * HTML cards
 */
function printLocation(locations) {
	const container = document.createElement('div')
	
	container.classList.add(
		'grid',
		'grid-cols-8',
		'gap-2',
		'fixed',
		'right-0',
		'left-0',
		'z-50',
		'p-4',
		'w-full',
		'top-0',
		'overflow-auto'
	)

	locations.forEach(location => {
		container.innerHTML += `<div class="fixed pointer-events-none select-none card w-64 flex flex-col bg-amber-100 rounded border-4 border-gray-900 shadow-brutal" style="opacity: 0">
			<div class="bg-blue-300 h-8 border-b-4 border-gray-900">
				<div class="flex gap-2 items-center h-full px-2">
					<div class="w-4 border-2 border-gray-900 h-4 rounded-full bg-red-800"></div>
					<div class="w-4 border-2 border-gray-900 h-4 rounded-full bg-yellow-600"></div>
					<div class="w-4 border-2 border-gray-900 h-4 rounded-full bg-green-700"></div>
				</div>
			</div>
			<div class="absolute -top-8 p-2 -right-8 bg-rose-200 rounded-3xl rounded-br-xl border-4 border-gray-900 shadow-[5px_5px_0px_0px_#000]">
				<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="500px" height="500px" viewBox="0 0 500 500" enable-background="new 0 0 500 500" class="w-10 lg:w-12 h-10 lg:h-12 text-gray-900"><path id="path6" fill="currentColor" d="M61.925,60.729c12.008-12.011,31.235-2.873,43.023,4.532    c13.794,8.665,25.993,19.841,37.474,31.321l66.963,66.964l208.147-39.9c1.233-0.618,3.14-0.279,4.407,0.074    c1.396,0.388,2.66,1.134,3.684,2.158l17.857,17.857c2.201,2.202,2.87,5.395,2.349,8.403c-0.485,2.808-2.273,4.955-4.86,6.104    l-160.436,76.451l68.359,68.358c18.595-5.313,37.19-10.65,55.888-15.595c3.688-0.975,7.382-1.954,11.105-2.788    c0.895-0.2,1.794-0.403,2.702-0.532c2.527-0.359,5.252,0.671,7.035,2.454l17.856,18.135c2.116,2.117,2.855,5.195,2.379,8.107    c-0.446,2.733-2.196,4.845-4.61,6.123l-78.125,43.248l-43.248,78.125c-1.447,2.314-3.645,3.984-6.385,4.367    c-2.839,0.397-5.792-0.36-7.846-2.414l-17.857-17.857c-1.888-1.887-2.842-4.712-2.403-7.356c0.211-1.274,0.511-2.535,0.808-3.792    c1.221-5.165,2.609-10.292,3.994-15.414c4.532-16.765,9.293-33.469,14.064-50.167l-68.359-68.359l-76.451,160.437    c-1.107,2.49-3.146,4.268-5.84,4.811c-3.074,0.619-6.408-0.039-8.668-2.3l-17.857-17.856c-1.674-1.674-2.511-3.813-2.511-6.418    l0.279-1.674l39.898-208.146l-66.965-66.964c-8.304-8.304-16.31-16.962-23.472-26.28c-5.323-6.926-10.284-14.277-13.852-22.277    C55.979,82.639,53.229,69.417,61.925,60.729C65.737,56.915,58.108,64.542,61.925,60.729z"></path></svg>
			</div>
			<div class="p-2 content">
				<h3 class="font-bold text-lg">${location.name}</h3>
				<ul>
					<li><strong>Latitudine:</strong> ${location.coords[0]}</li>
					<li><strong>Longitudine:</strong> ${location.coords[1]}</li>
				</ul>
			</div>
		</div>`
	})

	document.body.appendChild(container)
}