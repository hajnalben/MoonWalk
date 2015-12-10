/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.PointerLockControls = function (camera) {

    var scope = this;
    
    camera.rotation.set(0, 0, 0);

    var pitchObject = new THREE.Object3D();
    pitchObject.add(camera);

    var yawObject = new THREE.Object3D();
    yawObject.position.y = 5000;
    yawObject.add(pitchObject);

    var PI_2 = Math.PI / 2;

    var onMouseMove = function (event) {

        if (scope.enabled === false)
            return;

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.y -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;

        pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
    };

    document.addEventListener('mousemove', onMouseMove, false);

    this.enabled = false;

    this.getObject = function () {
        return yawObject;
    };

    this.getDirection = function () {

        // assumes the camera itself is not rotated

        var direction = new THREE.Vector3(0, 0, -1);
        var rotation = new THREE.Euler(0, 0, 0, "YXZ");

        return function (v) {
            rotation.set(pitchObject.rotation.x, yawObject.rotation.y, 0);

            v.copy(direction).applyEuler(rotation);

            return v;
        };
    }();
    
    this.sky;
    
    this.setSky = function (sky) {
        scope.sky = sky;
    };
    
    var controlsEnabled = false;
    
    var moveForward = false;
    var moveBackward = false;
    var moveLeft = false;
    var moveRight = false;
    var canJump = false;
    
    init();
    
    function init() {

        if (!'pointerLockElement' in document
                || 'mozPointerLockElement' in document
                || 'webkitPointerLockElement' in document) {

            throw new Error("PointerLock is not available");
        }

        var element = document.body;
        
        var pointerlockchange = function () {

            if (document.pointerLockElement === element
                    || document.mozPointerLockElement === element
                    || document.webkitPointerLockElement === element) {
                controlsEnabled = true;
                scope.enabled = true;
            } else {
                scope.enabled = false;
            }

        };
        
        var pointerlockerror = function (event) {
            console.log(event);
        };
        
        // Hook pointer lock state change events
        document.addEventListener('pointerlockchange', pointerlockchange, false);
        document.addEventListener('mozpointerlockchange', pointerlockchange, false);
        document.addEventListener('webkitpointerlockchange', pointerlockchange, false);
        document.addEventListener('pointerlockerror', pointerlockerror, false);
        document.addEventListener('mozpointerlockerror', pointerlockerror, false);
        document.addEventListener('webkitpointerlockerror', pointerlockerror, false);
        document.addEventListener('click', function () {

            element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
            
            if (/Firefox/i.test(navigator.userAgent)) {

                var fullscreenchange = function () {

                    if (document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {
                        document.removeEventListener('fullscreenchange', fullscreenchange);
                        document.removeEventListener('mozfullscreenchange', fullscreenchange);
                        element.requestPointerLock();
                    }
                };
                
                document.addEventListener('fullscreenchange', fullscreenchange, false);
                document.addEventListener('mozfullscreenchange', fullscreenchange, false);
                
                element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
                element.requestFullscreen();
            } else {
                element.requestPointerLock();
            }

        }, false);

        var onKeyDown = function (event) {
            switch (event.keyCode) {
                case 38: // up
                case 87: // w
                    moveForward = true;
                    break;
                case 37: // left
                case 65: // a
                    moveLeft = true;
                    break;
                case 40: // down
                case 83: // s
                    moveBackward = true;
                    break;
                case 39: // right
                case 68: // d
                    moveRight = true;
                    break;
                case 32: // space
                    if (canJump === true)
                        velocity.y = 350;
                    canJump = false;
                    break;
            }
        };
        var onKeyUp = function (event) {
            switch (event.keyCode) {
                case 38: // up
                case 87: // w
                    moveForward = false;
                    break;
                case 37: // left
                case 65: // a
                    moveLeft = false;
                    break;
                case 40: // down
                case 83: // s
                    moveBackward = false;
                    break;
                case 39: // right
                case 68: // d
                    moveRight = false;
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('keyup', onKeyUp, false);
    };
    
    
    var prevTime = performance.now();
    
    var velocity = new THREE.Vector3();
    var raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 60);
    raycaster.precision = 0.000001;
    
    this.handle = function(objects) {
        
        if (!controlsEnabled) {
            return;
        }

        raycaster.ray.origin.copy(yawObject.position);
        raycaster.ray.origin.y -= 10; //a player alól indul

        // ha a player alatt 10 távolságban van valami
        var intersections = raycaster.intersectObjects(objects);

        var isOnObject = intersections.length > 0;

        var time = performance.now();
        var delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        if (moveForward)
            velocity.z -= 4000.0 * delta;
        if (moveBackward)
            velocity.z += 4000.0 * delta;
        if (moveLeft)
            velocity.x -= 4000.0 * delta;
        if (moveRight)
            velocity.x += 4000.0 * delta;

        yawObject.translateX(velocity.x * delta);
        yawObject.translateZ(velocity.z * delta);
        
        scope.sky.position.x = yawObject.position.x;
        scope.sky.position.z = yawObject.position.z;

        if (isOnObject) {

            canJump = true;

            velocity.y = Math.max(0, velocity.y);

            if (velocity.y === 0) {

                var avg = 0;
                var numOfObjs = 0;

                for (var o in intersections) {

                    var obj = intersections[o];

                    if (!obj || !obj.point || !obj.point.y) {
                        continue;
                    }

                    avg += obj.point.y;
                    numOfObjs++;
                }

                var height =  (avg / numOfObjs) + 60;

                yawObject.position.y = height;

            }
        } else {
            velocity.y -= 9.8 * 10.0 * delta; // 100.0 = mass
        }

        yawObject.translateY(velocity.y * delta);

        prevTime = time;
    };

};