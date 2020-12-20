import * as THREE from "three";
import Stats from "stats.js";
import Ammo from "ammo.js";

import { OrbitControls } from "./OrbitControls";
import { GUI } from "./GUI";
import Detector from "./Detector";
import configLights from "./configLights";

function cameraOrbit(camera, renderer, target) {
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.maxPolarAngle = (0.9 * Math.PI) / 2;
	controls.enableZoom = true;
}

export default Ammo().then(function (Ammo) {
	// Detects webgl
	if (!Detector.webgl) {
		Detector.addGetWebGLMessage();
		document.getElementById("container").innerHTML = "";
	}

	// - Global variables -
	var DISABLE_DEACTIVATION = 4;
	var TRANSFORM_AUX = new Ammo.btTransform();
	var ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

	// Graphics variables
	var container, stats, speedometer;
	var camera, scene, renderer;
	var clock = new THREE.Clock();
	var materialDynamic, materialStatic, materialInteractive;
	var mouseCoords = new THREE.Vector2();
	var raycaster = new THREE.Raycaster();
	var ballMaterial = new THREE.MeshPhongMaterial({ color: 0x202020 });
	var pos = new THREE.Vector3();
	var quat = new THREE.Quaternion();
	var clickRequest = false;
	var CanvasPointer;
	var plane;
	var raycasterMouse;
	var mouse;
	var pointOfIntersection;
	var TorretPoint;

	// Physics variables
	// var collisionConfiguration;
	// var dispatcher;
	// var broadphase;
	// var solver;
	var physicsWorld;
	var carPosition;
	var gravityConstant = -9.8;
	var time = 0;
	var syncList = [];
	var rigidBodies = [];
	var transformAux1 = new Ammo.btTransform();

	// Keybord actions
	var actions = {};
	var keysActions = {
		KeyW: "acceleration",
		KeyS: "braking",
		KeyA: "left",
		KeyD: "right"
	};

	// - Functions -

	function initGraphics() {
		container = document.getElementById("container");
		speedometer = document.getElementById("speedometer");

		scene = new THREE.Scene();

		camera = new THREE.PerspectiveCamera(
			90,
			window.innerWidth / window.innerHeight,
			0.2,
			2000
		);
		camera.position.x = 0;
		camera.position.y = 10;
		camera.position.z = -20;

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setClearColor(0xbfd1e5);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);

		configLights(scene);

		materialDynamic = new THREE.MeshPhongMaterial({ color: 0xffffff });
		materialStatic = new THREE.MeshPhongMaterial({ color: 0xcc8866 });
		materialInteractive = new THREE.MeshPhongMaterial({
			color: 0x54893d
		});

		container.innerHTML = "";

		container.appendChild(renderer.domElement);

		// Handle Mouse --> Aim

		CanvasPointer = renderer.domElement;
		plane = new THREE.Plane(new THREE.Vector3(1, 1, 1), -35);
		raycasterMouse = new THREE.Raycaster();
		mouse = new THREE.Vector2();
		pointOfIntersection = new THREE.Vector3();
		CanvasPointer.addEventListener("mousemove", onMouseMove, false);

		cameraOrbit(camera, renderer);

		stats = new Stats();
		stats.domElement.style.position = "absolute";
		stats.domElement.style.top = "0px";
		container.appendChild(stats.domElement);

		window.addEventListener("resize", onWindowResize, false);
		window.addEventListener("keydown", keydown);
		window.addEventListener("keyup", keyup);

		renderer.shadowMap.enabled = true;
	}

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	function initPhysics() {
		// Physics configuration
		const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
		const broadphase = new Ammo.btDbvtBroadphase();
		const solver = new Ammo.btSequentialImpulseConstraintSolver();
		physicsWorld = new Ammo.btSoftRigidDynamicsWorld(
			dispatcher,
			broadphase,
			solver,
			collisionConfiguration
		);
		physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
		physicsWorld
			.getWorldInfo()
			.set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));
	}

	function tick() {
		requestAnimationFrame(tick);
		var dt = clock.getDelta();
		for (var i = 0; i < syncList.length; i++) syncList[i](dt);
		physicsWorld.stepSimulation(dt, 10);
		// controls.update(dt);

		renderer.render(scene, camera);
		time += dt;
		stats.update();
	}

	function keyup(e) {
		if (keysActions[e.code]) {
			actions[keysActions[e.code]] = false;
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	}
	function keydown(e) {
		if (keysActions[e.code]) {
			actions[keysActions[e.code]] = true;
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	}

	function createFloor() {
		const pos = new THREE.Vector3(0, 0, 0);
		const quat = ZERO_QUATERNION;
		const w = 1000;
		const l = 1;
		const h = 1000;
		const mass = 0;
		const friction = 20;

		var material = materialStatic;
		var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
		var geometry = new Ammo.btBoxShape(
			new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5)
		);

		var mesh = new THREE.Mesh(shape, material);
		mesh.position.copy(pos);
		mesh.quaternion.copy(quat);
		scene.add(mesh);

		mesh.receiveShadow = true;

		var transform = new Ammo.btTransform();
		// Prevents the car from going through
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
		transform.setRotation(
			new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
		);

		var motionState = new Ammo.btDefaultMotionState(transform);

		var localInertia = new Ammo.btVector3(0, 0, 0);
		geometry.calculateLocalInertia(mass, localInertia);

		var rbInfo = new Ammo.btRigidBodyConstructionInfo(
			mass,
			motionState,
			geometry,
			localInertia
		);
		var body = new Ammo.btRigidBody(rbInfo);

		body.setFriction(friction);

		physicsWorld.addRigidBody(body);
	}

	function createBox(pos, quat, w, l, h, mass, friction) {
		var material = mass > 0 ? materialDynamic : materialStatic;
		var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
		var geometry = new Ammo.btBoxShape(
			new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5)
		);

		if (!mass) {
			console.log(w, l, h);
			mass = 0;
		}
		if (!friction) {
			friction = 1;
		}

		var mesh = new THREE.Mesh(shape, material);
		mesh.position.copy(pos);
		mesh.quaternion.copy(quat);
		scene.add(mesh);

		mesh.castShadow = true;
		if (mass === 0) {
			mesh.receiveShadow = true;
		}

		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
		transform.setRotation(
			new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
		);
		var motionState = new Ammo.btDefaultMotionState(transform);

		var localInertia = new Ammo.btVector3(0, 0, 0);
		geometry.calculateLocalInertia(mass, localInertia);

		var rbInfo = new Ammo.btRigidBodyConstructionInfo(
			mass,
			motionState,
			geometry,
			localInertia
		);
		var body = new Ammo.btRigidBody(rbInfo);

		body.setFriction(friction);

		physicsWorld.addRigidBody(body);

		if (mass > 0) {
			body.setActivationState(DISABLE_DEACTIVATION);
			// Sync physics and graphics
			function sync(dt) {
				var ms = body.getMotionState();
				if (ms) {
					ms.getWorldTransform(TRANSFORM_AUX);
					var p = TRANSFORM_AUX.getOrigin();
					var q = TRANSFORM_AUX.getRotation();
					mesh.position.set(p.x(), p.y(), p.z());
					mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
				}
			}

			syncList.push(sync);
		}
	}

	function createWheelMesh(radius, width) {
		var t = new THREE.CylinderGeometry(radius, radius, width, 25, 1);
		t.rotateZ(Math.PI / 2);
		var mesh = new THREE.Mesh(t, materialInteractive);
		mesh.castShadow = true;
		mesh.add(
			new THREE.Mesh(
				new THREE.BoxGeometry(
					width * 1.5,
					radius * 1.75,
					radius * 0.1,
					1,
					1,
					1
				),
				materialInteractive
			)
		);
		scene.add(mesh);
		return mesh;
	}

	function createChassisMesh(w, l, h) {
		var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
		var mesh = new THREE.Mesh(shape, materialInteractive);
		mesh.castShadow = true;
		scene.add(mesh);
		return mesh;
	}

	function createDomeMesh(
		domeRadius,
		domeWidthSubdivisions,
		domeHeightSubdivisions,
		domePhiStart,
		domePhiEnd,
		domeThetaStart,
		domeThetaEnd
	) {
		const domeGeometry = new THREE.SphereBufferGeometry(
			domeRadius,
			domeWidthSubdivisions,
			domeHeightSubdivisions,
			domePhiStart,
			domePhiEnd,
			domeThetaStart,
			domeThetaEnd
		);
		const mesh = new THREE.Mesh(domeGeometry, materialInteractive);
		mesh.castShadow = true;
		mesh.position.y = 0.5;
		return mesh;
	}

	function createCannonMesh(turretWidth, turretHeight, turretLength) {
		// Torret
		const meshGeometry = new THREE.BoxBufferGeometry(
			turretWidth,
			turretHeight,
			turretLength
		);
		const mesh = new THREE.Mesh(meshGeometry, materialInteractive);
		mesh.castShadow = true;
		mesh.position.z = turretLength * 0.5;
		return mesh;
	}
	function createCannonPivot() {
		const mesh = new THREE.Object3D();
		mesh.scale.set(5, 5, 5);
		mesh.position.y = 2;
		mesh.position.x = 0;
		return mesh;
	}

	function createTank(pos, quat) {
		// Vehicle contants

		var chassisWidth = 4;
		var chassisHeight = 1.7;
		var chassisLength = 8;
		var massVehicle = 800;
		var massDome = 80;

		const domeRadius = 1.5;
		const domeWidthSubdivisions = 12;
		const domeHeightSubdivisions = 12;
		const domePhiStart = 0;
		const domePhiEnd = Math.PI * 2;
		const domeThetaStart = 0;
		const domeThetaEnd = Math.PI * 0.5;

		const turretWidth = 0.1;
		const turretHeight = 0.1;
		const turretLength = chassisLength * 0.75 * 0.2;

		var friction = 1000;
		var suspensionStiffness = 10.0;
		var suspensionDamping = 2.3;
		var suspensionCompression = 2;
		var suspensionRestLength = 0.6;
		var rollInfluence = 0.2;

		var steeringIncrement = 0.04;
		var steeringClamp = 0.5;
		var maxEngineForce = 2000;
		var maxBreakingForce = 100;

		// Chassis
		var geometry = new Ammo.btBoxShape(
			new Ammo.btVector3(
				chassisWidth * 0.5,
				chassisHeight * 0.5,
				chassisLength * 0.5
			)
		);

		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
		transform.setRotation(
			new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
		);
		var motionState = new Ammo.btDefaultMotionState(transform);
		var localInertia = new Ammo.btVector3(0, 0, 0);
		geometry.calculateLocalInertia(massVehicle, localInertia);

		var body = new Ammo.btRigidBody(
			new Ammo.btRigidBodyConstructionInfo(
				massVehicle,
				motionState,
				geometry,
				localInertia
			)
		);

		body.setActivationState(DISABLE_DEACTIVATION);
		physicsWorld.addRigidBody(body);

		// Dome
		var geometry2 = new Ammo.btBoxShape(
			new Ammo.btVector3(
				chassisWidth * 0.5,
				chassisHeight * 0.5,
				chassisLength * 0.16
			)
		);

		var transform2 = new Ammo.btTransform();
		transform2.setIdentity();
		transform2.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
		transform2.setRotation(
			new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
		);
		var motionState2 = new Ammo.btDefaultMotionState(transform2);
		var localInertia2 = new Ammo.btVector3(0, 0, 0);
		geometry2.calculateLocalInertia(100, localInertia2);

		var body2 = new Ammo.btRigidBody(
			new Ammo.btRigidBodyConstructionInfo(
				100,
				motionState2,
				geometry2,
				localInertia2
			)
		);

		body2.setActivationState(DISABLE_DEACTIVATION);
		physicsWorld.addRigidBody(body2);

		// Glue body and Dome
		var pivotA = new Ammo.btVector3(0, 2, 0);
		var pivotB = new Ammo.btVector3(0, 3.4, 0);
		var axis = new Ammo.btVector3(0, 1, 0);
		var hinge = new Ammo.btHingeConstraint(
			body2,
			body,
			pivotA,
			pivotB,
			axis,
			axis,
			true
		);
		physicsWorld.addConstraint(hinge, true);

		// Body Varibles
		var chassisMesh = createChassisMesh(
			chassisWidth,
			chassisHeight,
			chassisLength
		);

		//keep real time tank position
		carPosition = chassisMesh;

		chassisMesh.add(camera);

		var domeMesh = createDomeMesh(
			domeRadius,
			domeWidthSubdivisions,
			domeHeightSubdivisions,
			domePhiStart,
			domePhiEnd,
			domeThetaStart,
			domeThetaEnd
		);

		var cannonMesh = createCannonMesh(turretWidth, turretHeight, turretLength);

		var cannonPivot = createCannonPivot();

		chassisMesh.add(domeMesh);
		cannonPivot.add(cannonMesh);
		chassisMesh.add(cannonPivot);
		TorretPoint = cannonPivot;

		// Raycast Vehicle
		var engineForce = 0;
		var vehicleSteering = 0;
		var breakingForce = 0;
		var tuning = new Ammo.btVehicleTuning();
		var rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
		var vehicle = new Ammo.btRaycastVehicle(tuning, body, rayCaster);
		vehicle.setCoordinateSystem(0, 1, 2);
		physicsWorld.addAction(vehicle);

		// Wheels
		var FRONT_LEFT = 0;
		var FRONT_RIGHT = 1;
		var MEDIUM_LEFT = 2;
		var MEDIUM_RIGHT = 3;
		var BACK_LEFT = 4;
		var BACK_RIGHT = 5;
		var wheelMeshes = [];
		var wheelDirectionCS0 = new Ammo.btVector3(0, -1, 0);
		var wheelAxleCS = new Ammo.btVector3(-1, 0, 0);

		function addWheel(isFront, pos, radius, width, index) {
			var wheelInfo = vehicle.addWheel(
				pos,
				wheelDirectionCS0,
				wheelAxleCS,
				suspensionRestLength,
				radius,
				tuning,
				isFront
			);

			wheelInfo.set_m_suspensionStiffness(suspensionStiffness);
			wheelInfo.set_m_wheelsDampingRelaxation(suspensionDamping);
			wheelInfo.set_m_wheelsDampingCompression(suspensionCompression);
			wheelInfo.set_m_frictionSlip(friction);
			wheelInfo.set_m_rollInfluence(rollInfluence);

			wheelMeshes[index] = createWheelMesh(radius, width);
		}

		// Wheels variables
		var wheelAxisPositionBack = -2.8;
		var wheelRadiusBack = 1;
		var wheelWidthBack = 0.5;
		var wheelHalfTrackBack = 2.23;
		var wheelAxisHeightBack = 0.2;

		var wheelAxisPositionMedium = 0;
		var wheelRadiusMedium = 1;
		var wheelWidthMedium = 0.5;
		var wheelHalfTrackMedium = 2.23;
		var wheelAxisHeightMedium = 0.2;

		var wheelAxisFrontPosition = 2.8;
		var wheelRadiusFront = 1;
		var wheelWidthFront = 0.5;
		var wheelHalfTrackFront = 2.23;
		var wheelAxisHeightFront = 0.2;

		addWheel(
			true,
			new Ammo.btVector3(
				wheelHalfTrackFront,
				wheelAxisHeightFront,
				wheelAxisFrontPosition
			),
			wheelRadiusFront,
			wheelWidthFront,
			FRONT_LEFT
		);
		addWheel(
			true,
			new Ammo.btVector3(
				-wheelHalfTrackFront,
				wheelAxisHeightFront,
				wheelAxisFrontPosition
			),
			wheelRadiusFront,
			wheelWidthFront,
			FRONT_RIGHT
		);
		addWheel(
			false,
			new Ammo.btVector3(
				wheelHalfTrackMedium,
				wheelAxisHeightMedium,
				wheelAxisPositionMedium
			),
			wheelRadiusMedium,
			wheelWidthMedium,
			MEDIUM_LEFT
		);
		addWheel(
			false,
			new Ammo.btVector3(
				-wheelHalfTrackMedium,
				wheelAxisHeightMedium,
				wheelAxisPositionMedium
			),
			wheelRadiusMedium,
			wheelWidthMedium,
			MEDIUM_RIGHT
		);
		addWheel(
			false,
			new Ammo.btVector3(
				-wheelHalfTrackBack,
				wheelAxisHeightBack,
				wheelAxisPositionBack
			),
			wheelRadiusBack,
			wheelWidthBack,
			BACK_LEFT
		);
		addWheel(
			false,
			new Ammo.btVector3(
				wheelHalfTrackBack,
				wheelAxisHeightBack,
				wheelAxisPositionBack
			),
			wheelRadiusBack,
			wheelWidthBack,
			BACK_RIGHT
		);

		// Sync keybord actions and physics and graphics
		function sync(dt) {
			var speed = vehicle.getCurrentSpeedKmHour();
			speedometer.innerHTML =
				(speed < 0 ? "(R) " : "") + Math.abs(speed).toFixed(1) + " km/h";

			breakingForce = 0;
			engineForce = 0;

			if (actions.acceleration) {
				if (speed < -1) breakingForce = maxBreakingForce;
				else engineForce = maxEngineForce;
			}
			if (actions.braking) {
				if (speed > 1) breakingForce = maxBreakingForce;
				else engineForce = -maxEngineForce / 2;
			}
			if (actions.left) {
				if (vehicleSteering < steeringClamp)
					vehicleSteering += steeringIncrement;
			} else {
				if (actions.right) {
					if (vehicleSteering > -steeringClamp)
						vehicleSteering -= steeringIncrement;
				} else {
					if (vehicleSteering < -steeringIncrement)
						vehicleSteering += steeringIncrement;
					else {
						if (vehicleSteering > steeringIncrement)
							vehicleSteering -= steeringIncrement;
						else {
							vehicleSteering = 0;
						}
					}
				}
			}

			vehicle.applyEngineForce(engineForce, BACK_LEFT);
			vehicle.applyEngineForce(engineForce, BACK_RIGHT);
			vehicle.applyEngineForce(engineForce, MEDIUM_LEFT);
			vehicle.applyEngineForce(engineForce, MEDIUM_RIGHT);

			vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
			vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
			vehicle.setBrake(breakingForce, BACK_LEFT);
			vehicle.setBrake(breakingForce, BACK_RIGHT);

			vehicle.setSteeringValue(vehicleSteering, FRONT_LEFT);
			vehicle.setSteeringValue(vehicleSteering, FRONT_RIGHT);

			var tm, p, q, i;
			var n = vehicle.getNumWheels();
			for (i = 0; i < n; i++) {
				vehicle.updateWheelTransform(i, true);
				tm = vehicle.getWheelTransformWS(i);
				p = tm.getOrigin();
				q = tm.getRotation();
				wheelMeshes[i].position.set(p.x(), p.y(), p.z());
				wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());
			}

			tm = vehicle.getChassisWorldTransform();
			p = tm.getOrigin();
			q = tm.getRotation();
			chassisMesh.position.set(p.x(), p.y(), p.z());
			chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
		}
		syncList.push(sync);
	}

	function createObjects() {
		// Ground - floor - terrain
		// createBox(new THREE.Vector3(0, 0, 0), ZERO_QUATERNION, 1000, 1, 1000, 0, 2);
		createFloor();

		// Jump
		var quaternion = new THREE.Quaternion(0, 0, 0, 1);
		quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
		createBox(new THREE.Vector3(0, -1.5, 0), quaternion, 8, 4, 10, 0);

		// Boxes
		var size = 5;
		var nw = 10;
		var nh = 5;
		for (var j = 0; j < nw; j++)
			for (var i = 0; i < nh; i++)
				createBox(
					new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10),
					ZERO_QUATERNION,
					size,
					size,
					size,
					10
				);

		// Tank
		createTank(new THREE.Vector3(0, 0, -10), ZERO_QUATERNION);
	}

	function onMouseMove(event) {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
		raycasterMouse.setFromCamera(mouse, camera);
		raycasterMouse.ray.intersectPlane(plane, pointOfIntersection);

		TorretPoint.lookAt(
			new THREE.Vector3(pointOfIntersection.x, 0, pointOfIntersection.z)
		);
	}

	function initInput() {
		window.addEventListener(
			"mousedown",
			function (event) {
				if (!clickRequest) {
					mouseCoords.set(
						(event.clientX / window.innerWidth) * 2 - 1,
						-(event.clientY / window.innerHeight) * 2 + 1
					);
					clickRequest = true;
				}
			},
			false
		);
	}

	function createRigidBody(threeObject, physicsShape, mass, pos, quat) {
		threeObject.position.copy(pos);
		threeObject.quaternion.copy(quat);

		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
		transform.setRotation(
			new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
		);
		var motionState = new Ammo.btDefaultMotionState(transform);

		var localInertia = new Ammo.btVector3(0, 0, 0);
		physicsShape.calculateLocalInertia(mass, localInertia);

		var rbInfo = new Ammo.btRigidBodyConstructionInfo(
			mass,
			motionState,
			physicsShape,
			localInertia
		);
		var body = new Ammo.btRigidBody(rbInfo);

		threeObject.userData.physicsBody = body;

		scene.add(threeObject);

		if (mass > 0) {
			rigidBodies.push(threeObject);

			// Disable deactivation
			body.setActivationState(4);
		}

		physicsWorld.addRigidBody(body);

		return body;
	}

	function shootBall() {
		if (clickRequest) {
			// Initial position of the ball
			const { _x, _y, _z } = TorretPoint.rotation;
			const shootingOrigin = {
				y: carPosition.position.y + 2,
				z: carPosition.position.z + 5,
				x: carPosition.position.x + 5 * _y
			};

			raycaster.set(shootingOrigin, new THREE.Vector3(_y, 0, 0.7));

			// Creates a ball
			var ballMass = 17;
			var ballRadius = 0.325;

			var ball = new THREE.Mesh(
				new THREE.SphereGeometry(ballRadius, 18, 16),
				ballMaterial
			);
			ball.castShadow = true;
			ball.receiveShadow = true;
			var ballShape = new Ammo.btSphereShape(ballRadius);
			const margin = 0.0;
			ballShape.setMargin(margin);
			pos.copy(raycaster.ray.direction);
			pos.add(raycaster.ray.origin);
			quat.set(0, 0, 0, 1);
			var ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);
			ballBody.setFriction(1);

			pos.copy(raycaster.ray.direction);
			pos.multiplyScalar(150);
			ballBody.setLinearVelocity(new Ammo.btVector3(pos.x, pos.y, pos.z));

			clickRequest = false;
		}
	}
	function updatePhysics(deltaTime) {
		// Step world
		physicsWorld.stepSimulation(deltaTime, 10);

		// Update rigid bodies
		for (var i = 0, il = rigidBodies.length; i < il; i++) {
			var objThree = rigidBodies[i];
			var objPhys = objThree.userData.physicsBody;
			var ms = objPhys.getMotionState();
			if (ms) {
				ms.getWorldTransform(transformAux1);
				var p = transformAux1.getOrigin();
				var q = transformAux1.getRotation();
				objThree.position.set(p.x(), p.y(), p.z());
				objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
			}
		}
	}
	function render() {
		var deltaTime = clock.getDelta();
		updatePhysics(deltaTime);
		shootBall();
		renderer.render(scene, camera);
	}
	function animate() {
		requestAnimationFrame(animate);
		render();
		stats.update();
	}
	// - Init -
	initGraphics();
	initPhysics();
	createObjects();
	initInput();
	tick();
	animate();
});
