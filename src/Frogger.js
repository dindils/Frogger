var canvas;
var gl;

var nBuffer, vBuffer, cBuffer;

var cubePoints = [];
var cubeNormals = [];

var now = 0.0;

var movement = false;     // Do we rotate?
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var zDist = -5.0;

var fovy = 60.0;
var near = 0.2;
var far = 100.0;

var program;
var waterprogram;
var colorprogram;

var lightPosition = vec4( 10.0, 20.0, -10.0, 1.0 );
var lightAmbient = vec4( 0.5, 0.5, 0.5, 0.5 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 0.2, 0.0, 0.2, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 50.0;

var ctm;
var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var then = 0; // seinasti tími sem kallað var á render

var player;
var cars = [];
var logs = [];
var environment;
var PR;
const PLAYERMODELLOC = "frog.ply"
const CARMODELLOC = ["car1.ply", "car2.ply"];

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    colorCube();

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.9, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
    projectionMatrix = perspective( fovy, 1.0, near, far );

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    //gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    waterprogram = initShaders( gl, "water-vertex-shader", "fragment-shader");
    gl.useProgram(waterprogram)

    gl.uniformMatrix4fv(gl.getUniformLocation(waterprogram, "projectionMatrix"), false, flatten(projectionMatrix) )
    gl.uniform4fv( gl.getUniformLocation(waterprogram, "lightPosition"), flatten(lightPosition) );

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    colorprogram = initShaders( gl, "color-vertex-shader", "color-fragment-shader");
    gl.useProgram(colorprogram)
    
    gl.uniform4fv( gl.getUniformLocation(colorprogram, "lightAmbient"), flatten(lightAmbient) );
    gl.uniform4fv( gl.getUniformLocation(colorprogram, "lightDiffuse"), flatten(lightDiffuse) );
    gl.uniform4fv( gl.getUniformLocation(colorprogram, "lightSpecular"), flatten(lightSpecular) );
    gl.uniform1f( gl.getUniformLocation(colorprogram, "shininess"), materialShininess );
    gl.uniformMatrix4fv(gl.getUniformLocation(colorprogram, "projectionMatrix"), false, flatten(projectionMatrix) )
    gl.uniform4fv( gl.getUniformLocation(colorprogram, "lightPosition"), flatten(lightPosition) );

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    vPosition = gl.getAttribLocation( colorprogram, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    vNormal = gl.getAttribLocation( colorprogram, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);
    
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    var vColor = gl.getAttribLocation( colorprogram, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.useProgram(program);

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );

    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) )
    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition) );

    PR = PlyReader();
    player = new Player();

    for(var i = 1; i < 6; i++){
        for(var j = 0; j < 3; j++){
            cars.push(new Car(i, j*13.0/4 - 6.5));
        }
    }
    for(var i = 1; i < 6; i++){
        for(var j = 0; j < 3; j++){
            logs.push(new Log(i, j*13.0/3 - 6.5));
        }
    }

    environment = new Environment();

    //event listeners for mouse
    canvas.addEventListener("mousedown", function(e){
        movement = true;
        origX = e.clientX;
        origY = e.clientY;
        e.preventDefault();         // Disable drag and drop
    } );

    canvas.addEventListener("mouseup", function(e){
        movement = false;
    } );

    canvas.addEventListener("mousemove", function(e){
        if(movement) {
    	    spinY = ( spinY + (e.clientX - origX) ) % 360;
            //spinX = ( spinX + (e.clientY - origY) ) % 360;
            origX = e.clientX;
            origY = e.clientY;
        }
    } );

    window.addEventListener("keydown", function(e){
        switch( e.keyCode ) {
            case 37:	// vinstri ör
                player.move(1, 0);
                break;
            case 39:	// hægri ör
                player.move(-1, 0);
                break;
            case 38:	// upp ör
                player.move(0, 1);
                break;
            case 40:	// niður ör
                player.move(0, -1);
                break;
        }
    } );

    window.addEventListener("keyup", function(e){
        switch( e.keyCode ) {
            case 37:	// vinstri ör
                break;
            case 39:	// hægri ör
                break;
            case 38:	// upp ör    
                break;
            case 40:	// niður ör
                break;
        }
    } );

    // Event listener for mousewheel
     window.addEventListener("wheel", function(e){
         if( e.deltaY > 0.0 ) {
             //zDist += 0.2;
         } else {
             //zDist -= 0.2;
         }
     }  );

    render();
}

function render(now) {
    now *= 0.001; // breytum í sekúndur
    var deltaTime = now - then;
    then = now; // geymum núverandi tímann

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelViewMatrix = lookAt( vec3( 0.0, 3.0, zDist), vec3( 0.0, 0.0, 0.0 ), up );
    player.draw(modelViewMatrix);
    player.update(deltaTime);
    modelViewMatrix = mult( modelViewMatrix, translate(-player.x, 0.0, -player.z));
    environment.draw(modelViewMatrix, now);
    for(var i = 0; i < cars.length; i++) {
        cars[i].draw(modelViewMatrix);
        cars[i].update(deltaTime);
    }
    for(var i = 0; i < logs.length; i++) {
        logs[i].draw(modelViewMatrix);
        logs[i].update(deltaTime);
    }
    window.requestAnimFrame(render);
}

function colorCube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

function quad(a, b, c, d) 
{
    var vertices = [
        vec4( -0.5, -0.5,  0.5 , 1.0 ),
        vec4( -0.5,  0.5,  0.5 , 1.0 ),
        vec4(  0.5,  0.5,  0.5 , 1.0 ),
        vec4(  0.5, -0.5,  0.5 , 1.0 ),
        vec4( -0.5, -0.5, -0.5 , 1.0 ),
        vec4( -0.5,  0.5, -0.5 , 1.0 ),
        vec4(  0.5,  0.5, -0.5 , 1.0 ),
        vec4(  0.5, -0.5, -0.5 , 1.0 )
    ];


    var indices = [ a, b, c, a, c, d ];
    var t2 = subtract(vertices[b], vertices[a]);
    var t1 = subtract(vertices[c], vertices[a]);
    var normal = vec4(normalize(cross(t2,t1)));
    normal[3] = 0;
    for ( var i = 0; i < indices.length; ++i ) {
        cubePoints.push( vertices[indices[i]] );
        cubeNormals.push(normal);
    }
}

function setColor(mA, mD, mSp, mSh, p) {
    ambientProduct = mult(lightAmbient, mA);
    diffuseProduct = mult(lightDiffuse, mD);
    specularProduct = mult(lightSpecular, mSp);
    gl.uniform4fv( gl.getUniformLocation(p, "ambientProduct"), flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(p, "diffuseProduct"), flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(p, "specularProduct"), flatten(specularProduct) );
    gl.uniform1f( gl.getUniformLocation(p, "shininess"), mSh );
}

function setNormalMatrix(mv) {
    var normalMatrix = [
        vec3(mv[0][0], mv[0][1], mv[0][2]),
        vec3(mv[1][0], mv[1][1], mv[1][2]),
        vec3(mv[2][0], mv[2][1], mv[2][2])
    ];
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

class Player {
    constructor() {
        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
        this.scale = 0.1
        this.direction = 0; // 0 fram - 1 hægri - 2 niður - 3 vinstri
        this.animJumping = false;
        this.animY = 0.0;
        this.desiredX = 0.0;
        this.desiredZ = 0.0;
        this.speed = 6;
        this.logSpeed = 0.0;
        this.logDirection = 1;
        
        var plyData = PR.read(PLAYERMODELLOC);

        this.points = plyData.points;
        this.normals = plyData.normals;
        this.colors = plyData.colors;
        this.getBoundaries(); 
    }

    getBoundaries() {
        this.xMax = -Infinity;
        this.yMax = -Infinity;
        this.zMax = -Infinity;
        this.xMin =  Infinity;
        this.yMin =  Infinity;
        this.zMin =  Infinity;
        this.points.forEach(point => {
            var x = point[1];
            var y = point[2];
            var z = point[3];
            if(x > this.xMax) this.xMax = x;
            if(y > this.yMax) this.yMax = y;
            if(z > this.zMax) this.zMax = z;
            if(x < this.xMin) this.xMin = x;
            if(y < this.yMin) this.yMin = y;
            if(z < this.zMin) this.zMin = z;
        });
        this.xMax *= this.scale;
        this.yMax *= this.scale;
        this.zMax *= this.scale;
        this.xMin *= this.scale;
        this.yMin *= this.scale;
        this.zMin *= this.scale;
    }

    draw(mv) {
        gl.useProgram( colorprogram );
        //setColor(vec4( 0.0, 0.2, 0.2, 1.0 ), vec4( 0.0, 1.0, 0.0, 1.0 ),
        //         vec4( 1.0, 1.0, 1.0, 1.0 ), 100.0, program);

        mv = mult( mv, translate( 0.0, this.y + this.animY + 0.1, 0.0 ));
        mv = mult( mv, scalem(this.scale, this.scale, this.scale));
        mv = mult( mv, rotateY(90+this.direction*90));
        gl.uniformMatrix4fv(gl.getUniformLocation(colorprogram, "modelViewMatrix"), false, flatten(mv) );
        var normalMatrix = [
            vec3(mv[0][0], mv[0][1], mv[0][2]),
            vec3(mv[1][0], mv[1][1], mv[1][2]),
            vec3(mv[2][0], mv[2][1], mv[2][2])
        ];
        gl.uniformMatrix3fv(gl.getUniformLocation(colorprogram, "normalMatrix"), false, flatten(normalMatrix) );
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW );

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.colors), gl.STATIC_DRAW);

        gl.drawArrays( gl.TRIANGLES, 0, this.points.length );

        gl.useProgram( colorprogram );
    }

    update(delta) {
        //check for car collision
        cars.forEach(car => {
            if(((car.x+car.xMin<this.x+this.xMin && this.x+this.xMin<car.x+car.xMax)  ||
                (car.x+car.xMin<this.x+this.xMax && this.x+this.xMax<car.x+car.xMax)) &&
                Math.abs(this.z-car.z) < 0.01) {
                this.x = 0.0;
                this.z = 0.0;
                this.desiredX = 0.0;
                this.desiredZ = 0.0;
                console.log(car.x, car.y, car.z);
            }
        });

        if(this.animJumping) {
            this.animY = Math.abs(Math.sin((this.x-this.desiredX)*Math.PI)+Math.sin(this.z*Math.PI))/2;
            if(Math.abs(this.x-this.desiredX)>0.01) {
                var newX = this.x + Math.sign(this.desiredX - this.x)*delta*this.speed;
                if(Math.sign(this.desiredX-newX)!=Math.sign(this.desiredX-this.x)) {
                    this.x = this.desiredX;
                } else {
                    this.x = newX;
                }

            }
            else if(Math.abs(this.z-this.desiredZ)>0.01) {
                var newZ = this.z + Math.sign(this.desiredZ - this.z)*delta*this.speed;
                if(Math.sign(this.desiredZ-newZ)!=Math.sign(this.desiredZ-this.z)) {
                    this.z = this.desiredZ;
                } else {
                    this.z = newZ;
                }
            } else {
                this.animY = 0.0;
                this.z = Math.round(this.z);
                this.animJumping = false;
                // if on water area
                if(this.z>=8 && this.z<=12) {
                    // check if on log 
                    var onLog = false;
                    logs.forEach(log => {
                        if(log.x-log.length/2<this.x && this.x<log.x+log.length/2 && Math.abs(this.z-log.z) < 0.01) {
                            // set log speed
                            this.logSpeed = log.speed;
                            this.logDirection = log.direction;
                            onLog = true;
                        }
                    });
                    if(!onLog) {
                        this.x = 0.0;
                        this.z = 0.0;
                        this.desiredX = 0.0;
                        this.desiredZ = 0.0;
                    }
                    
                }
            }
        } else {
            //reset log speed if on land
            if(!(this.z>=8 && this.z<=12) && this.logSpeed>0.01) {
                this.logSpeed = 0.0;
            }
            if(delta =! undefined && this.logSpeed!=0) {
                // move frog with the log
                this.x += this.logSpeed * this.logDirection * delta; //move on log
            }
        }
    }

    move(x, z) {
        if(!this.animJumping) {
            this.desiredX = this.x + x;
            this.desiredZ = Math.round(this.z) + z;
            this.animJumping = true;
            if(Math.abs(x)<0.01) {
                if(z>0) {
                    this.direction = 0;
                } else {
                    this.direction = 2;
                }
            } else if(Math.abs(z)<0.01) {
                if(x>0) {
                    this.direction = 1;
                } else {
                    this.direction = 3;
                }
            }
        }
    }
}

class Car {
    constructor(lane, x) {
        this.isEveryColor = true;
        this.x = x;
        this.y = 0.0;
        this.z = lane + 1;
        this.lane = lane;
        this.length = 0.25;
        this.width = 0.3;
        this.height = 0.3;
        this.speed = 0.01*lane - 0.005;// 0.03*lane - 0.01;
        this.direction = (lane%2)*2-1;
        
        var plyData = PR.read(CARMODELLOC[Math.floor(Math.random()*CARMODELLOC.length)]);

        this.points = plyData.points;
        this.normals = plyData.normals;
        this.colors = plyData.colors;
        this.xMax = 0.7;
        this.xMin = -0.7;
    }

    update(delta) {
        if(delta =! undefined) {
            this.x = this.x + this.direction*delta*this.speed;
        }
        
        if(this.x <= -6.5 - this.length/2 && this.direction == -1){
            this.x = 6.5 + this.length/2;
        }
        if(this.x >= 6.5 + this.length/2 && this.direction == 1){
            this.x = -6.5 - this.length/2;
        }
    }

    draw(mv) {
        gl.useProgram( colorprogram );
        
        //setColor( vec4(0.2,0.1,0.0,1.0), vec4(1.0,0.0,0.0,1.0),
        //    vec4( 1.0, 1.0, 1.0, 1.0 ), 100.0, colorprogram);
        mv = mult( mv, translate(this.x, this.y + this.height/2+0.2, this.z));
        mv = mult( mv, scalem(this.length, this.height, this.width))
        mv = mult( mv, rotateY(90*(this.direction+1)));
   
        gl.uniformMatrix4fv(gl.getUniformLocation(colorprogram, "modelViewMatrix"), false, flatten(mv) );
        var normalMatrix = [
            vec3(mv[0][0], mv[0][1], mv[0][2]),
            vec3(mv[1][0], mv[1][1], mv[1][2]),
            vec3(mv[2][0], mv[2][1], mv[2][2])
        ];
        gl.uniformMatrix3fv(gl.getUniformLocation(colorprogram, "normalMatrix"), false, flatten(normalMatrix) );

        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW );

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.colors), gl.STATIC_DRAW);

        gl.drawArrays( gl.TRIANGLES, 0, this.points.length );
    }
}


class Log {
    constructor(lane, x) {
        this.x = x;
        this.y = -0.4;
        this.z = lane + 7;
        this.lane = lane;
        this.length = Math.floor(2+Math.random()*2);
        this.width = 0.6;
        this.height = 0.4;
        this.speed = 0.03*lane - 0.01;
        this.direction = (lane%2)*2-1;
        this.colors = [vec4(73/255, 56/255, 41/255, 1,0)];
        this.diffuses = [];
        this.colors.forEach(color => {
            this.diffuses.push(scale(0.1,color));
        });
        this.newColor();

    }

    update(delta) {
        if(delta =! undefined) {
            this.x = this.x + this.direction*delta*this.speed;
        }
        
        if(this.x <= -6.5 - this.length/2 && this.direction == -1){
            this.x = 6.5 + this.length/2;
            this.newColor();
        }
        if(this.x >= 6.5 + this.length/2 && this.direction == 1){
            this.x = -6.5 - this.length/2;
            this.newColor();
        }
    }
    newColor() {
        var i = Math.floor(Math.random()*this.colors.length);
        this.color = this.colors[i];
        this.diffuse = this.diffuses[i];
    }

    draw(mv) {
        gl.useProgram( program );
        setColor( this.diffuse, this.color,
                 vec4( 1.0, 1.0, 1.0, 1.0 ), 100.0, program);
        mv = mult( mv, translate(this.x, this.y + this.height/2, this.z));
        mv = mult( mv, scalem(this.length, this.height, this.width))
        
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv) );
        setNormalMatrix(mv);
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(cubeNormals), gl.STATIC_DRAW );

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(cubePoints), gl.STATIC_DRAW);

        gl.drawArrays( gl.TRIANGLES, 0, cubePoints.length );
    }
}


class Environment {
    constructor() {
        //road
        this.roadPoints = [vec4(13.0, 0.0, 5.0, 1.0), vec4(0.0, 0.0, 5.0, 1.0), vec4(13.0, 0.0, 0.0, 1.0),
                           vec4(0.0, 0.0, 5.0, 1.0), vec4(0.0, 0.0, 0.0, 1.0), vec4(13.0, 0.0, 0.0, 1.0)];
        this.roadNormals = [vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0),
                            vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0)];
        this.roadTexCoords = [];

        //river
        this.noPointsX = 14;
        this.noPointsZ = 12;
        this.riverPoints = [];
        this.riverNormals = [];
        this.generateRiver();
        var plyData = PR.read("Tunnel.ply");
        //grass
        this.grassPoints = [vec4(13.0, 0.0, 2.0, 1.0), vec4(0.0, 0.0, 2.0, 1.0), vec4(13.0, 0.0, -5.0, 1.0),
                            vec4(0.0, 0.0, 2.0, 1.0), vec4(0.0, 0.0, -5.0, 1.0), vec4(13.0, 0.0, -5.0, 1.0),
                            vec4(13.0, 0.0, 8.0, 1.0), vec4(0.0, 0.0, 8.0, 1.0), vec4(13.0, 0.0, 7.0, 1.0),
                            vec4(0.0, 0.0, 8.0, 1.0), vec4(0.0, 0.0, 7.0, 1.0), vec4(13.0, 0.0, 7.0, 1.0),
                            vec4(13.0, 0.0, 18.0, 1.0), vec4(0.0, 0.0, 18.0, 1.0), vec4(13.0, 0.0, 13.0, 1.0),
                            vec4(0.0, 0.0, 18.0, 1.0), vec4(0.0, 0.0, 13.0, 1.0), vec4(13.0, 0.0, 13.0, 1.0),
                            vec4(13.0, 0.0, 13.0, 1.0), vec4(0.0, 0.0, 13.0, 1.0), vec4(13.0, -1.0, 13.0, 1.0),
                            vec4(0.0, -1.0, 13.0, 1.0), vec4(0.0, 0.0, 13.0, 1.0), vec4(13.0, -1.0, 13.0, 1.0)];
        this.grassNormals = [vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0),
                            vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0),
                            vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0),
                            vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0),
                            vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0),
                            vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0),
                            vec4(0.0, 0.0, -1.0, 0.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(0.0, 0.0, -1.0, 0.0),
                            vec4(0.0, 0.0, -1.0, 0.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(0.0, 0.0, -1.0, 0.0)];
        //tunnel
        this.tunnelPoints = plyData.points;
        this.tunnelNormals = plyData.normals;
    }

    drawGrass(mv) {
        gl.useProgram( program );
        setColor(vec4( 0.1, 0.2, 0.1, 1.0 ), vec4( 0.0, 0.8, 0.0, 1.0 ),
                 vec4( 0.0, 0.0, 0.0, 0.0 ), 100.0, program);
        mv = mult( mv, translate(-6.5, 0, -0.5));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv) );
        setNormalMatrix(mv);
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.grassNormals), gl.STATIC_DRAW );

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.grassPoints), gl.STATIC_DRAW);

        gl.drawArrays( gl.TRIANGLES, 0, this.grassPoints.length );
    }

    drawRoad(mv) {
        gl.useProgram( program );
        setColor(vec4( 0.3, 0.3, 0.3, 1.0 ), vec4( 0.0, 0.0, 0.0, 1.0 ),
                 vec4( 0.0, 0.0, 0.0, 0.0 ), 100.0, program);
        mv = mult( mv, translate(-6.5, 0, 1.5));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv) );
        setNormalMatrix(mv);
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.roadNormals), gl.STATIC_DRAW );

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.roadPoints), gl.STATIC_DRAW);

        gl.drawArrays( gl.TRIANGLES, 0, this.roadPoints.length );
    }
    drawTunnels(mv) {
        var roadScale = 2.0;
        var riverScale = 2.1;
        setColor(vec4( 0.3, 0.3, 0.3, 1.0 ), vec4( 0.6, 0.6, 0.6, 1.0 ),
                 vec4( 1.0, 1.0, 1.0, 1.0 ), 20.0, program);
        var y = 0.6;
        var tunnelCoords = [vec3(8.4, y, 4), // Left tunnels
                            vec3(8.4, y, 10),
                            vec3(-8.4, y, 4), // Right tunnels
                            vec3(-8.4, y, 10)];

        var tunnelScales = [vec3(roadScale, roadScale, roadScale), // Left tunnels
                            vec3(roadScale, roadScale, riverScale),
                            vec3(roadScale, roadScale, roadScale), // Right tunnels
                            vec3(roadScale, roadScale, riverScale)];

        for(var i = 0; i < tunnelCoords.length; i++){
            var mv1 = mult( mv, translate(tunnelCoords[i][0], tunnelCoords[i][1], tunnelCoords[i][2]));
            mv1 = mult( mv1, scalem(tunnelScales[i][0], tunnelScales[i][1], tunnelScales[i][2]));
            mv1 = mult( mv1, rotateX(-90));
            mv1 = mult( mv1, rotateZ(-90));

            gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1) );
            setNormalMatrix(mv1);
            gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
            gl.bufferData( gl.ARRAY_BUFFER, flatten(this.tunnelNormals), gl.STATIC_DRAW );
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(this.tunnelPoints), gl.STATIC_DRAW);
            gl.drawArrays( gl.TRIANGLES, 0, this.tunnelPoints.length );
        }
        
    }

    generateRiver() {
        for (var j = 0; j < this.noPointsZ-1; j++) {
            for(var i=0; i < this.noPointsX; i++) {
                if(i==0) {
                    this.riverPoints.push(vec4(i, 0, j, 1));
                    this.riverNormals.push(vec4(0, 1, 0, 0));
                }
                this.riverPoints.push(vec4(i, 0, j, 1));
                this.riverPoints.push(vec4(i, 0, j+1, 1));
                this.riverNormals.push(vec4(0, 1, 0, 0));
                this.riverNormals.push(vec4(0, 1, 0, 0));
                if(i==this.noPointsX-1) {
                    this.riverPoints.push(vec4(i, 0, j+1, 1));
                    this.riverNormals.push(vec4(0, 1, 0, 0));
                }
            }
        }
    }

    drawRiver(mv, time) {
        gl.useProgram( waterprogram );
        gl.uniform1f( gl.getUniformLocation(waterprogram, "time"), time );
        setColor(vec4( 0.0, 0.0, 0.1, 1.0 ), vec4( 0.0, 0.5, 1.0, 1.0 ),
        vec4( 0.4, 0.4, 0.4, 1.0 ), 100.0, waterprogram);
        mv = mult( mv, translate(-6.5, -0.18, 7.5));
        mv = mult( mv, scalem(1, 1, 0.5));
        gl.uniformMatrix4fv(gl.getUniformLocation(waterprogram, "modelViewMatrix"), false, flatten(mv) );
        var normalMatrix = [
            vec3(mv[0][0], mv[0][1], mv[0][2]),
            vec3(mv[1][0], mv[1][1], mv[1][2]),
            vec3(mv[2][0], mv[2][1], mv[2][2])
        ];
        gl.uniformMatrix3fv(gl.getUniformLocation(waterprogram, "normalMatrix"), false, flatten(normalMatrix) );
        //gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        //gl.bufferData( gl.ARRAY_BUFFER, flatten(this.riverNormals), gl.STATIC_DRAW );

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.riverPoints), gl.STATIC_DRAW);

        gl.drawArrays( gl.TRIANGLE_STRIP, 0, this.riverPoints.length );
    }

    draw(mv, now) {
        this.drawGrass(mv);
        this.drawRoad(mv);
        this.drawTunnels(mv);
        this.drawRiver(mv, now);
    }
}