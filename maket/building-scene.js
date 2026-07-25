/**
 * Procedural Three.js building scene (house + toy trees + planet).
 * Depends on global THREE and THREE.OrbitControls (CDN before this script).
 */
(function (global) {
  'use strict';

  var cameraZoom = 0.45;
  var HOUSE_EXIT_WORLD_DROP = 42;

  function init(options) {
    options = options || {};
    var sceneLayer = options.sceneLayer;
    var scrollContainer = options.scrollContainer;
    var exitStartEl = options.exitStartEl;
    var exitEndEl = options.exitEndEl;

    if (!sceneLayer) {
      throw new Error('BuildingScene.init: options.sceneLayer is required');
    }
    if (typeof THREE === 'undefined') {
      var loadingFail = document.getElementById('loading');
      if (loadingFail) {
        loadingFail.textContent =
          'Не удалось загрузить библиотеку three.js (проверьте подключение к интернету).';
      }
      return;
    }

    // ---------- Базовая сцена ----------
    var scene = new THREE.Scene();
    var worldRig = new THREE.Group();
    scene.add(worldRig);

    function getSceneSize() {
      return {
        width: sceneLayer.clientWidth || window.innerWidth,
        height: sceneLayer.clientHeight || window.innerHeight
      };
    }

    var initialSceneSize = getSceneSize();
    var camera = new THREE.PerspectiveCamera(
      42,
      initialSceneSize.width / initialSceneSize.height,
      0.1,
      500
    );

    var renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true
    });
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.id = 'threeCanvas';
    renderer.setSize(initialSceneSize.width, initialSceneSize.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sceneLayer.appendChild(renderer.domElement);

    // ---------- Свет ----------
    var ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    var sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(-3, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0015;
    scene.add(sun);

    var fill = new THREE.DirectionalLight(0xbdd6e8, 0.35);
    fill.position.set(-10, 6, -8);
    scene.add(fill);

    // ---------- Текстуры (генерируются на canvas) ----------
    function createBrickTexture(brickColor, mortarColor) {
      var c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      var ctx = c.getContext('2d');
      ctx.fillStyle = mortarColor;
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = brickColor;
      var bw = 30,
        bh = 12,
        gap = 2;
      var row = 0;
      for (var y = -bh; y < 128 + bh; y += bh + gap) {
        var offset = row % 2 === 0 ? 0 : (bw + gap) / 2;
        for (var x = -bw; x < 128 + bw; x += bw + gap) {
          ctx.fillRect(x + offset, y, bw, bh);
        }
        row++;
      }
      var tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    function createWindowTexture() {
      var c = document.createElement('canvas');
      c.width = 128;
      c.height = 160;
      var ctx = c.getContext('2d');
      var grad = ctx.createLinearGradient(0, 0, 128, 160);
      grad.addColorStop(0, '#6a5642');
      grad.addColorStop(1, '#332822');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 160);
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 118, 150);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(64, 5);
      ctx.lineTo(64, 155);
      ctx.moveTo(5, 80);
      ctx.lineTo(123, 80);
      ctx.stroke();
      return new THREE.CanvasTexture(c);
    }

    function createLitWindowTexture() {
      var c = document.createElement('canvas');
      c.width = 128;
      c.height = 160;
      var ctx = c.getContext('2d');
      var grad = ctx.createRadialGradient(64, 80, 10, 64, 80, 100);
      grad.addColorStop(0, '#fff3cf');
      grad.addColorStop(0.6, '#ffd873');
      grad.addColorStop(1, '#e8a93a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 160);
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 118, 150);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(64, 5);
      ctx.lineTo(64, 155);
      ctx.moveTo(5, 80);
      ctx.lineTo(123, 80);
      ctx.stroke();
      return new THREE.CanvasTexture(c);
    }

    var darkBrickTex = createBrickTexture('#2f6690', '#1c4262');
    darkBrickTex.repeat.set(4, 1.2);

    var stripeBrickTex = createBrickTexture('#2f6690', '#1c4262');
    stripeBrickTex.repeat.set(1.2, 6);

    var windowTex = createWindowTexture();
    var windowLitTex = createLitWindowTexture();

    // ---------- Материалы ----------
    var lightBlueMat = new THREE.MeshStandardMaterial({
      color: 0xa9c8db,
      roughness: 0.65,
      metalness: 0.03
    });
    var darkBlueMat = new THREE.MeshStandardMaterial({
      map: darkBrickTex,
      roughness: 0.85,
      metalness: 0.03
    });
    var stripeMat = new THREE.MeshStandardMaterial({
      map: stripeBrickTex,
      roughness: 0.85,
      metalness: 0.03
    });
    var windowMatOff = new THREE.MeshStandardMaterial({
      map: windowTex,
      roughness: 0.25,
      metalness: 0.5,
      side: THREE.DoubleSide
    });
    var windowMatOn = new THREE.MeshStandardMaterial({
      map: windowLitTex,
      emissive: 0xffcf70,
      emissiveMap: windowLitTex,
      emissiveIntensity: 1.1,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    var doorMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.5 });
    var platformMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

    var windowGeo = new THREE.PlaneGeometry(1, 1);
    var windows = [];

    var houseX = 0;
    var _groundEmbed = -0.15;
    var firstFloorHeighMul = 1.5;

    // ---------- Параметры здания ----------
    var width = 6.4;
    var depth = 4.0;
    var floorH = 1.0;
    var floors = 6;
    var height = floorH * floors;
    var groundEmbed = _groundEmbed;

    var building = new THREE.Group();
    building.position.y = -groundEmbed;
    building.position.x = houseX;
    worldRig.add(building);

    function getCameraSpherical() {
      var offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
      var radius = offset.length();
      var horizontalDist = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
      var polar = Math.atan2(horizontalDist, offset.y);
      var azimuth = Math.atan2(offset.x, offset.z);
      return { radius: radius, polar: polar, azimuth: azimuth };
    }

    function setCameraFromSpherical(radius, polar, azimuth) {
      var sinPolar = Math.sin(polar);
      var x = radius * sinPolar * Math.sin(azimuth);
      var y = radius * Math.cos(polar);
      var z = radius * sinPolar * Math.cos(azimuth);
      camera.position.set(
        controls.target.x + x,
        controls.target.y + y,
        controls.target.z + z
      );
    }

    function addWindow(x, y, z, w, h, rotY) {
      var mesh = new THREE.Mesh(windowGeo, windowMatOff);
      mesh.scale.set(w, h, 1);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      if (Math.abs(rotY - Math.PI) < 0.01) mesh.userData.face = 'back';
      else if (Math.abs(rotY + Math.PI / 2) < 0.01) mesh.userData.face = 'left';
      else if (Math.abs(rotY - Math.PI / 2) < 0.01) mesh.userData.face = 'right';
      else mesh.userData.face = 'front';
      building.add(mesh);
      windows.push(mesh);
      return mesh;
    }

    // ---------- Цоколь (тёмно-синий, 1 этаж) ----------
    var baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, firstFloorHeighMul * floorH, depth),
      darkBlueMat
    );
    baseMesh.position.set(0, floorH / 4, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    building.add(baseMesh);

    // ---------- Верхние этажи (светло-голубые) ----------
    var upperH = height - floorH;
    var upperMesh = new THREE.Mesh(new THREE.BoxGeometry(width, upperH, depth), lightBlueMat);
    upperMesh.position.set(0, floorH + upperH / 2, 0);
    upperMesh.castShadow = true;
    upperMesh.receiveShadow = true;
    building.add(upperMesh);

    // ---------- Тонкая тёмная полоса под крышей ----------
    var trimMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.04, 0.12, depth + 0.04),
      darkBlueMat
    );
    trimMesh.position.set(0, height - 0.06, 0);
    building.add(trimMesh);

    // ---------- Крыша (нависающая плита) ----------
    var overhang = 0.35,
      roofThick = 0.28;
    var roofMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width + overhang * 2, roofThick, depth + overhang * 2),
      lightBlueMat
    );
    roofMesh.position.set(0, height + roofThick / 2, 0);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    building.add(roofMesh);

    // ---------- Центральный выступающий простенок на фасаде ----------
    var stripeW = 0.95,
      stripeD = 0.18;
    var stripeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(stripeW, height * 1.1, stripeD),
      stripeMat
    );
    stripeMesh.position.set(0, height / 1.1 / 2, depth / 2 + stripeD / 2);
    stripeMesh.castShadow = true;
    stripeMesh.receiveShadow = true;
    building.add(stripeMesh);

    // ---------- Узкий выступающий "плавник" у левого переднего угла ----------
    var finW = 0.18,
      finD = 0.55;
    var finMesh = new THREE.Mesh(new THREE.BoxGeometry(finW, height, finD), lightBlueMat);
    finMesh.position.set(-width / 2 - finW / 2, height / 2, depth / 2 - finD / 2 - 0.25);
    finMesh.castShadow = true;
    finMesh.receiveShadow = true;
    building.add(finMesh);

    // ---------- Вход: дверь и козырёк ----------
    var doorMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.95), doorMat);
    doorMesh.position.set(-0.2, 0.475, depth / 2 + stripeD + 0.01);
    building.add(doorMesh);

    var canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.0), lightBlueMat);
    canopyMesh.position.set(-0.4, 0.95, depth / 2 + 0.55);
    canopyMesh.castShadow = true;
    building.add(canopyMesh);

    var postGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.9 * 1.5, 8);
    var post1 = new THREE.Mesh(postGeo, lightBlueMat);
    post1.position.set(-1.45, 0.45 / 2, depth / 2 + 0.98);
    building.add(post1);
    var post2 = post1.clone();
    post2.position.x = 0.65;
    building.add(post2);

    // ---------- Окна ----------
    var winW = 0.62,
      winH = 0.58;
    var yOffset = 0.55;

    var frontCols = [-2.3, -1.15, 1.15, 2.3];
    for (var f = 0; f < floors; f++) {
      var y = floorH * f + yOffset;
      for (var i = 0; i < frontCols.length; i++) {
        var cx = frontCols[i];
        if (f === 0 && Math.abs(cx) < 2) continue;
        addWindow(cx, y, depth / 2 + 0.01, winW, winH, 0);
      }
      if (f > 0) {
        addWindow(0, y, depth / 2 + stripeD + 0.01, 0.5, winH, 0);
      }
    }

    var backCols = [-2.3, -1.15, 1.15, 2.3];
    for (var f2 = 0; f2 < floors; f2++) {
      var y2 = floorH * f2 + yOffset;
      for (var j = 0; j < backCols.length; j++) {
        addWindow(backCols[j], y2, -depth / 2 - 0.01, winW, winH, Math.PI);
      }
    }

    var finWinW = 0.28,
      finWinH = 0.5;
    for (var f3 = 0; f3 < floors; f3++) {
      var y3 = floorH * f3 + yOffset;
      addWindow(
        -width / 2 - finW - 0.01,
        y3,
        depth / 2 - finD / 2 - 0.25,
        finWinW,
        finWinH,
        -Math.PI / 2
      );
      addWindow(-width / 2 - 0.01, y3, -0.5, winW, winH, -Math.PI / 2);
      addWindow(-width / 2 - 0.01, y3, -1.6, winW, winH, -Math.PI / 2);
    }

    for (var f4 = 0; f4 < floors; f4++) {
      var y4 = floorH * f4 + yOffset;
      addWindow(width / 2 + 0.01, y4, -0.5, winW, winH, Math.PI / 2);
      addWindow(width / 2 + 0.01, y4, -1.6, winW, winH, Math.PI / 2);
    }

    // ---------- Игрушечные 3D-деревья рядом с домом ----------
    function makeCloudOutline(halfWidth, height, lobes, bumpAmp, seed) {
      var pts = [];
      var steps = 48;
      for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var angle = Math.PI - t * Math.PI;
        var edgeFade = Math.sin(angle);
        var bump = 1 + bumpAmp * edgeFade * Math.sin(t * Math.PI * lobes * 2 + seed);
        pts.push(
          new THREE.Vector2(Math.cos(angle) * halfWidth, Math.sin(angle) * height * bump)
        );
      }
      return pts;
    }

    function createCloudTreeShape(width, height, lobes, bumpAmp, seed) {
      var halfW = width / 2;
      var shape = new THREE.Shape();
      shape.moveTo(-halfW, 0);
      makeCloudOutline(halfW, height, lobes, bumpAmp, seed || 0).forEach(function (p) {
        shape.lineTo(p.x, p.y);
      });
      shape.lineTo(halfW, 0);
      shape.lineTo(-halfW, 0);
      return shape;
    }

    function createConiferShape(width, height, tiers) {
      var halfW = width / 2;
      var topStart = height * 0.94;
      var yStep = topStart / tiers;
      var leftPts = [];
      for (var i = 0; i <= tiers; i++) {
        var t = i / tiers;
        var yBase = t * topStart;
        var tierScale = 1 - t * 0.85;
        var outW = halfW * tierScale;
        var inW = outW * 0.66;
        leftPts.push({ x: -outW, y: yBase });
        leftPts.push({ x: -inW, y: yBase + yStep * 0.5 });
      }
      var shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(-halfW * 0.98, 0.02);
      leftPts.forEach(function (p) {
        shape.lineTo(p.x, p.y);
      });
      shape.lineTo(0, height);
      for (var j = leftPts.length - 1; j >= 0; j--) {
        shape.lineTo(-leftPts[j].x, leftPts[j].y);
      }
      shape.lineTo(halfW * 0.98, 0.02);
      shape.lineTo(0, 0);
      return shape;
    }

    function buildTreeMesh(shape, thickness, material) {
      var geo = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.035,
        bevelSegments: 3,
        curveSegments: 24
      });
      geo.translate(0, 0, -thickness / 2);
      var mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    var treeMatLight = new THREE.MeshStandardMaterial({
      color: 0x74b862,
      roughness: 0.75,
      metalness: 0.02
    });
    var treeMatMedium = new THREE.MeshStandardMaterial({
      color: 0x519149,
      roughness: 0.75,
      metalness: 0.02
    });
    var treeMatDark = new THREE.MeshStandardMaterial({
      color: 0x336638,
      roughness: 0.8,
      metalness: 0.02
    });
    var treeMatDeep = new THREE.MeshStandardMaterial({
      color: 0x24492b,
      roughness: 0.8,
      metalness: 0.02
    });

    var toyTreesGroup = new THREE.Group();
    toyTreesGroup.position.set(houseX, -groundEmbed, 0);
    worldRig.add(toyTreesGroup);

    function addToyTree(shape, thickness, material, x, z, rotY, scale, y) {
      if (y === undefined) y = -0.3;
      var mesh = buildTreeMesh(shape, thickness, material);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      mesh.scale.setScalar(scale);
      toyTreesGroup.add(mesh);
      return mesh;
    }

    var bigCloudShape = createCloudTreeShape(2.5, 0.9, 3, 0.35, 0.4);
    var smallCloudShape = createCloudTreeShape(1.7, 1, 3, 0.4, 1.7);
    var wideCloudShape = createCloudTreeShape(3.1, 2.0, 4, 0.28, 2.9);
    var coniferShape = createConiferShape(1.6, 3.3, 7);

    addToyTree(bigCloudShape, 0.5, treeMatMedium, width / 2 + 2.3, 1.5, 0.35, 1.05);
    addToyTree(coniferShape, 0.45, treeMatDeep, width / 2 + 3.5, 0.1, -0.15, 1.0);
    addToyTree(smallCloudShape, 0.45, treeMatDark, width / 2 + 1.5, -1.4, 0.6, 0.85);
    addToyTree(wideCloudShape, 0.55, treeMatLight, width / 2 + 4.6, -0.5, -0.4, 1.15, -1);

    // ---------- Платформа-сфера ----------
    var planetRadius = 105;
    var planetGeo = new THREE.SphereGeometry(planetRadius, 96, 64);
    var planet = new THREE.Mesh(planetGeo, platformMat);
    planet.position.set(houseX, -planetRadius, 0);
    planet.receiveShadow = true;
    worldRig.add(planet);

    // ---------- Адаптивная компоновка ----------
    var REFERENCE_ASPECT = 16 / 9;
    // Совпадает с CSS мобилки в index.html (max-width: 900px)
    var MOBILE_BREAKPOINT = 900;
    var MOBILE_FILL_RATIO = 1.2;
    var MOBILE_HOUSE_HEIGHT_FRACTION = 0.5;
    var MOBILE_PROJECTION_FX = 0.58;
    var MOBILE_PROJECTION_Y = 0.78;
    var REFERENCE_VIEWPORT_WIDTH = 1440;
    var REFERENCE_VIEWPORT_HEIGHT = 900;
    var DESKTOP_HOUSE_WIDTH_FRACTION = 0.5;
    var HOUSE_SCREEN_FRACTION = 0.32;
    var DESKTOP_PROJECTION_FX = 0.75; // центр правой половины окна
    var lastHouseWidthFraction = DESKTOP_HOUSE_WIDTH_FRACTION;
    var vFovHalf = THREE.MathUtils.degToRad(camera.fov) / 2;

    building.updateMatrixWorld(true);
    var houseBox = new THREE.Box3().setFromObject(building);
    var houseWidth = houseBox.max.x - houseBox.min.x;
    var houseHeightWorld = houseBox.max.y - houseBox.min.y;

    var compactCalAspect = Math.min(
      MOBILE_BREAKPOINT / REFERENCE_VIEWPORT_HEIGHT,
      REFERENCE_ASPECT
    );
    var compactTargetPixelHeight = HOUSE_SCREEN_FRACTION * REFERENCE_VIEWPORT_HEIGHT;
    var compactDistance =
      (houseHeightWorld * REFERENCE_VIEWPORT_HEIGHT) /
      (2 * compactTargetPixelHeight * Math.tan(vFovHalf));
    var COMPACT_HOUSE_WIDTH_FRACTION =
      houseWidth / (compactDistance * 2 * Math.tan(vFovHalf) * compactCalAspect);

    var houseExitProgress = 0;
    var cachedExitStart = 0;
    var cachedExitEnd = 1;

    var startTarget = new THREE.Vector3(houseX, height / 2 - groundEmbed, 0);

    // Орбита слушает scroll-container: колесо/тач скроллят нативно, drag крутит дом
    var orbitRoot = scrollContainer || renderer.domElement;
    var controls = new THREE.OrbitControls(camera, orbitRoot);
    controls.target.copy(startTarget);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minDistance = 4;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;

    function isOrbitTarget(el) {
      if (!el || !el.closest) return false;
      if (el.closest('.screen-4, .screen-5')) return false;
      if (
        el.closest(
          'a, button, input, textarea, select, label, .block-16x9, .btn-group, .form-container, .block-a'
        )
      ) {
        return false;
      }
      return !!el.closest('.scroll-container, .screen, .screen-content, .block-b');
    }

    orbitRoot.addEventListener(
      'pointerdown',
      function (e) {
        controls.enabled = isOrbitTarget(e.target);
      },
      true
    );
    window.addEventListener('pointerup', function () {
      controls.enabled = true;
    });

    var baseOffsetDir = new THREE.Vector3(9.5, 4.05, 10.5);
    var baseHorizontal = Math.sqrt(
      baseOffsetDir.x * baseOffsetDir.x + baseOffsetDir.z * baseOffsetDir.z
    );
    var basePolar = Math.atan2(baseHorizontal, baseOffsetDir.y);
    var baseAzimuth = Math.atan2(baseOffsetDir.x, baseOffsetDir.z);

    function applyOffAxisProjection(fx, aspectActual, fy) {
      if (fy === undefined) fy = 0.5;
      var near = camera.near,
        far = camera.far;
      var top = near * Math.tan(vFovHalf);
      var frustumHeight = 2 * top;
      var frustumWidth = frustumHeight * aspectActual;
      var left = -fx * frustumWidth;
      var right = (1 - fx) * frustumWidth;
      var bottom = -fy * frustumHeight;
      var topEdge = (1 - fy) * frustumHeight;
      camera.projectionMatrix.makePerspective(left, right, topEdge, bottom, near, far);
      if (camera.projectionMatrixInverse && camera.projectionMatrixInverse.invert) {
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      }
      camera.aspect = aspectActual;
    }

    function applyResponsiveFraming(preserveOrbit) {
      var sceneSize = getSceneSize();
      var aspectActual = sceneSize.width / sceneSize.height;
      // Верхний кадр только пока вёрстка держит блок Б сверху (≤900px + portrait)
      var isPortrait = sceneSize.height >= sceneSize.width;
      var useTopHouseFraming =
        sceneSize.width <= MOBILE_BREAKPOINT && isPortrait;
      controls.enabled = true;
      renderer.domElement.style.pointerEvents = 'none';

      var distance, fx, fy;
      if (useTopHouseFraming) {
        var targetPixelHeight = MOBILE_HOUSE_HEIGHT_FRACTION * sceneSize.height;
        distance =
          (houseHeightWorld * sceneSize.height) /
          (2 * targetPixelHeight * Math.tan(vFovHalf));
        var distByWidth =
          houseWidth / (MOBILE_FILL_RATIO * 2 * Math.tan(vFovHalf) * aspectActual);
        if (distByWidth > distance) distance = distByWidth;
        fx = MOBILE_PROJECTION_FX;
        fy = MOBILE_PROJECTION_Y;
        lastHouseWidthFraction =
          houseWidth / (distance * 2 * Math.tan(vFovHalf) * aspectActual);
      } else {
        // Дом — доля ширины окна, якорь в правой половине (как при Б справа)
        var widthT =
          (sceneSize.width - MOBILE_BREAKPOINT) /
          (REFERENCE_VIEWPORT_WIDTH - MOBILE_BREAKPOINT);
        widthT = Math.max(0, Math.min(1, widthT));
        var houseWidthFraction =
          COMPACT_HOUSE_WIDTH_FRACTION +
          widthT * (DESKTOP_HOUSE_WIDTH_FRACTION - COMPACT_HOUSE_WIDTH_FRACTION);
        lastHouseWidthFraction = houseWidthFraction;
        distance =
          houseWidth /
          (houseWidthFraction * 2 * Math.tan(vFovHalf) * aspectActual);
        fx = DESKTOP_PROJECTION_FX;
        fy = 0.5;
      }

      distance = distance / cameraZoom;

      var azimuth, polar;
      if (preserveOrbit) {
        var sph = getCameraSpherical();
        azimuth = sph.azimuth;
        polar = sph.polar;
      } else {
        azimuth = baseAzimuth;
        polar = basePolar;
      }

      setCameraFromSpherical(distance, polar, azimuth);
      controls.update();
      applyOffAxisProjection(fx, aspectActual, fy);
    }

    function smootherstep(t) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function refreshExitRange() {
      if (!scrollContainer || !exitStartEl || !exitEndEl) return;
      cachedExitStart = exitStartEl.offsetTop;
      cachedExitEnd = exitEndEl.offsetTop + scrollContainer.clientHeight * 0.55;
    }

    function updateHouseExitFromScroll() {
      if (!scrollContainer || !exitStartEl || !exitEndEl) return;
      var range = Math.max(cachedExitEnd - cachedExitStart, 1);
      var progress = (scrollContainer.scrollTop - cachedExitStart) / range;
      houseExitProgress = Math.max(0, Math.min(1, progress));
    }

    function applyHouseExitOffset() {
      worldRig.position.y = -smootherstep(houseExitProgress) * HOUSE_EXIT_WORLD_DROP;
    }

    refreshExitRange();
    applyResponsiveFraming(false);
    updateHouseExitFromScroll();
    applyHouseExitOffset();

    if (scrollContainer) {
      scrollContainer.addEventListener(
        'scroll',
        function () {
          updateHouseExitFromScroll();
          applyHouseExitOffset();
        },
        { passive: true }
      );
    }

    window.addEventListener('resize', function () {
      var sceneSize = getSceneSize();
      renderer.setSize(sceneSize.width, sceneSize.height);
      refreshExitRange();
      applyResponsiveFraming(true);
      updateHouseExitFromScroll();
      applyHouseExitOffset();
    });

    function animate() {
      requestAnimationFrame(animate);
      // offsetTop не читаем каждый кадр — только controls + render
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    var loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';

    return {
      scene: scene,
      camera: camera,
      renderer: renderer,
      worldRig: worldRig,
      controls: controls,
      windows: windows,
      applyResponsiveFraming: applyResponsiveFraming
    };
  }

  global.BuildingScene = {
    init: init
  };
})(typeof window !== 'undefined' ? window : this);
