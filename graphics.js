new Graphics();

var scene;
var terrain;
var uniforms;

function Graphics() {

    var game = new Game();

    var objects = [];

    scene = new THREE.Scene();

    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

    var controls = new THREE.PointerLockControls(camera);
    scene.add(controls.getObject());

    var renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);

    initTerrain(7, 2000, 3);

    render();

    function render() {
        requestAnimationFrame(render);

        controls.handle(objects);

        renderer.render(scene, camera);
    }

    function initTerrain(size, seed, balance) {

        var detail = Math.pow(2, size) + 2;

        var planeSize = size * 1500; // should be counted by size

        var terrainGeometry = new THREE.PlaneGeometry(planeSize, planeSize, detail, detail);
        terrainGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));


        // Creating matrix from vertice array
        var vertices = new Array();
        var active;

        for (var i = 0; i < terrainGeometry.vertices.length; i++) {

            if (i % (detail + 1) === 0) {

                if (active) {
                    vertices.push(active);
                }

                active = new Array();
            }

            var vertex = terrainGeometry.vertices[ i ];

            vertex.y = 0;

            active.push(vertex);
        }

        // Doing square-diamond algorithm
        var SIZE = vertices.length - 1;

        vertices[0][0].y = 0;
        vertices[SIZE][0].y = 0;
        vertices[0][SIZE].y = 0;
        vertices[SIZE][SIZE].y = 0;

        for (var sideLength = SIZE - 1; sideLength >= 2; sideLength /= 2, seed /= 2.0) {

            var halfSide = sideLength / 2;

            for (var x = 0; x < SIZE - 1; x += sideLength) {

                for (var y = 0; y < SIZE - 1; y += sideLength) {

                    var avg = vertices[x][y].y
                            + vertices[x + sideLength][y].y
                            + vertices[x][y + sideLength].y
                            + vertices[x + sideLength][y + sideLength].y;

                    avg /= 4.0;

                    vertices[x + halfSide][y + halfSide].y = avg + (Math.random() * 2 * seed) - seed;
                }
            }


            for (var x = 0; x < SIZE - 1; x += halfSide) {

                for (var y = (x + halfSide) % sideLength; y < SIZE - 1; y += sideLength) {

                    var avg = vertices[(x - halfSide + SIZE) % SIZE][y].y
                            + vertices[(x + halfSide) % SIZE][y].y
                            + vertices[x][(y + halfSide) % SIZE].y
                            + vertices[x][(y - halfSide + SIZE) % SIZE].y;

                    avg /= 4.0;

                    vertices[x][y].y = avg + (Math.random() * 2 * seed) - seed;

                    if (x === 0 || x === SIZE - 1) {
                        vertices[SIZE - 1][y].y = avg;
                    }

                    if (y === 0 || y === SIZE - 1) {
                        vertices[x][SIZE - 1].y = avg;
                    }
                }
            }
        }

        // Post-balancing
        for (var k = 0; k < balance; k++) {

            for (var i = 1; i < SIZE - 1; i++) {
                for (var j = 1; j < SIZE - 1; j++) {

                    vertices[i][j].y = (vertices[i + 1][j].y
                            + vertices[i - 1][j].y
                            + vertices[i][j + 1].y
                            + vertices[i][j - 1].y) / 4;
                }
            }
        }

        delete(vertices);

        var texture = THREE.ImageUtils.loadTexture('moon.png');
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(size * 10, size * 10);

        var terrainMaterial = new THREE.MeshBasicMaterial({
//            wireframe: true,
            shading: THREE.FlatShading,
            color: 0xdcdcdc,
            map: texture,
            vertexColors: THREE.VertexColors
        });

        terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);

        scene.add(terrain);

        objects.push(terrain);

        scene.fog = new THREE.Fog(0x000000, 1, 5000);
        scene.fog.color.setHSL(0.6, 0, 1);

        // LIGHTS
        var hemiLight = new THREE.HemisphereLight(0xfefefe, 0xfefefe, 0.6);
        hemiLight.color.setHSL(0.6, 1, 0.6);
        hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        hemiLight.position.set(0, 500, 0);
        scene.add(hemiLight);

        var dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.color.setHSL(0.1, 1, 0.95);
        dirLight.position.set(-1, 1.75, 1);
        dirLight.position.multiplyScalar(50);
        scene.add(dirLight);

        dirLight.castShadow = true;

        dirLight.shadowMapWidth = 2048;
        dirLight.shadowMapHeight = 2048;

        var d = 50;

        dirLight.shadowCameraLeft = -d;
        dirLight.shadowCameraRight = d;
        dirLight.shadowCameraTop = d;
        dirLight.shadowCameraBottom = -d;

        dirLight.shadowCameraFar = 3500;
        dirLight.shadowBias = -0.0001;
        dirLight.shadowDarkness = 0.35;
        dirLight.shadowCameraVisible = true;

        // SKYDOME
        var vertexShader = document.getElementById('vertexShader').textContent;
        var fragmentShader = document.getElementById('fragmentShader').textContent;

        uniforms = {
            topColor: {type: "c", value: new THREE.Color(0x000000)},
            bottomColor: {type: "c", value: new THREE.Color(0x111111)},
            offset: {type: "f", value: 33},
            exponent: {type: "f", value: 0.6}
        };

//        uniforms.topColor.value.copy(hemiLight.color);

        scene.fog.color.copy(uniforms.bottomColor.value);

        var skyGeo = new THREE.SphereGeometry(4000, 32, 15);
        var skyMat = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: uniforms,
            side: THREE.BackSide
        });

        var sky = new THREE.Mesh(skyGeo, skyMat);
        scene.add(sky);
        controls.setSky(sky);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

}


