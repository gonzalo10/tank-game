// https://bl.ocks.org/duhaime/fae9d11f86a4097df0bffe81ae24feae#index.html

import * as THREE from "three";
import { OrbitControls } from "./OrbitControls";

const runTankGame = () => {
	function getScene() {
		var scene = new THREE.Scene();
		return scene;
	}

	function getCamera() {
		var aspectRatio = window.innerWidth / window.innerHeight;
		var camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
		camera.position.set(0, 3, -10);
		return camera;
	}

	function getLight(scene) {
		var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		scene.add(directionalLight);

		var ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
		scene.add(ambientLight);
		return light;
	}

	function getRenderer() {
		var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(renderer.domElement);
		return renderer;
	}

	function getControls(camera, renderer) {
		var controls = new OrbitControls(camera, renderer.domElement);
		controls.zoomSpeed = 0.4;
		controls.panSpeed = 0.4;
		return controls;
	}

	/**
	 * TANKS
	 **/

	var Tank = function (options) {
		this.mesh = new THREE.Object3D();
		this.mesh.name = "tank";
		this.width = 3;
		this.height = 1.1;
		this.depth = 2;
		this.nWheels = 6;
		this.color = options.color || 0x107d23;

		// bottom
		var geometry = new THREE.BoxGeometry(3, 1.1, 2);
		var material = new THREE.MeshPhongMaterial({ color: this.color });
		var cube = new THREE.Mesh(geometry, material);
		this.mesh.add(cube);

		// wheels
		for (var i = 0; i < this.nWheels; i++) {
			var geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
			var material = new THREE.MeshPhongMaterial({
				color: 0x454545,
				flatShading: true
			});
			var wheel = new THREE.Mesh(geometry, material);
			// positions
			if (i < this.nWheels / 2) wheel.position.z = -(this.depth / 2);
			else wheel.position.z = this.depth / 2;
			wheel.position.x = (i % (this.nWheels / 2)) - this.width / 2 + 0.5;
			wheel.position.y = -this.height / 2;
			// name and rotation
			wheel.name = "wheel";
			wheel.rotation.x = Math.PI / 2;
			this.mesh.add(wheel);
		}

		var turret = new Turret(options);
		this.mesh.add(turret.mesh);
	};

	var Turret = function (options) {
		this.color = options.color || 0x107d23;

		// turret
		this.mesh = new THREE.Object3D();

		// base
		var geometry = new THREE.BoxGeometry(1.7, 1.8, 1.2);
		var material = new THREE.MeshPhongMaterial({ color: this.color });
		var base = new THREE.Mesh(geometry, material);
		this.mesh.add(base);

		// pipe
		var geometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 10);
		var material = new THREE.MeshPhongMaterial({
			color: 0x222222,
			flatShading: true
		});
		var pipe = new THREE.Mesh(geometry, material);
		pipe.rotation.x = Math.PI / 2;
		pipe.rotation.z = Math.PI / 2;
		pipe.position.y = 0.5;
		pipe.position.x = -0.5;
		this.mesh.add(pipe);

		// turret position
		this.mesh.position.y = 0.5;
	};

	function getTanks() {
		var colors = [0x0e679e, 0x9e220e];
		for (var i = 0; i < 2; i++) {
			var tank = new Tank({ color: colors[i] });
			tank.mesh.position.x = -10 + i * 10;
			tank.mesh.position.y = 1;
			tank.mesh.position.z = -10 + i * 10;
			if (i === 0) tank.mesh.rotation.y = Math.PI;
			scene.add(tank.mesh);
		}
	}

	function getFloor() {
		var geometry = new THREE.PlaneGeometry(500, 500, 32);
		var material = new THREE.MeshBasicMaterial({ color: 0xf7d9aa });
		var floor = new THREE.Mesh(geometry, material);
		floor.rotation.x = -Math.PI / 2;
		scene.add(floor);
	}

	function render() {
		requestAnimationFrame(render);
		renderer.render(scene, camera);
		controls.update();
	}

	var scene = getScene();
	var camera = getCamera();
	var light = getLight(scene);
	var renderer = getRenderer();
	var controls = getControls(camera, renderer);

	// geoms
	getFloor();
	getTanks();

	render();
};

export default runTankGame();
