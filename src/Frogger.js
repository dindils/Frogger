var canvas;
var gl;

var nBuffer, vBuffer;

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

var lightPosition = vec4(10.0, 40.0, 10.0, 1.0 );
var lightAmbient = vec4(1.0, 1.0, 1.0, 1.0 );
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
var environment;
var PR;
const PLAYERMODELLOC = "frog_smooth.ply"

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

    PR = PlyReader();
    player = new Player();

    for(var i = 1; i < 5; i++){
        for(var j = 0; j < 4; j++){
            cars.push(new Car(i, j*13.0/4 - 6.5));
        }
    }

    environment = new Environment();

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );


    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);


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

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );

    projectionMatrix = perspective( fovy, 1.0, near, far );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );

    gl.uniform4fv( gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, "shininess"), materialShininess );

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
    environment.draw(modelViewMatrix);
    for(var i = 0; i < cars.length; i++) {
        cars[i].draw(modelViewMatrix);
        cars[i].update(deltaTime);
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
function setColor(mA, mD, mSp, mSh) {
    ambientProduct = mult(lightAmbient, mA);
    diffuseProduct = mult(lightDiffuse, mD);
    specularProduct = mult(lightSpecular, mSp);
    gl.uniform4fv( gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct) );
    gl.uniform1f( gl.getUniformLocation(program, "shininess"), mSh );
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
        this.animJumping = false;
        this.animY = 0.0;
        this.desiredX = 0.0;
        this.desiredZ = 0.0;
        this.speed = 2;
        
        var plyData = PR.read(PLAYERMODELLOC);

        this.points = plyData.points;
        this.normals = plyData.normals;

    }

    draw(mv) {
        setColor(vec4( 0.0, 0.2, 0.2, 1.0 ), vec4( 0.0, 1.0, 0.0, 1.0 ),
                 vec4( 1.0, 1.0, 1.0, 1.0 ), 100.0);

        mv = mult( mv, translate( 0.0, this.y + this.animY + 0.1, 0.0 ));
        mv = mult( mv, scalem(0.5, 0.5, 0.5));
        mv = mult( mv, rotateX(-85));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv) );
        setNormalMatrix(mv);
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW );

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW);

        gl.drawArrays( gl.TRIANGLES, 0, this.points.length );
    }

    update(delta) {
        if(this.animJumping) {
            this.animY = Math.fround(Math.abs(Math.sin((this.x-this.desiredX)*Math.PI)+Math.sin(this.z*Math.PI)));
            if(Math.abs(this.x-this.desiredX)>0.01) {
                this.x = this.x + (this.desiredX - this.x)/Math.abs(this.desiredX - this.x)*delta*this.speed;
            }
            else if(Math.abs(this.z-this.desiredZ)>0.01) {
                this.z = this.z + (this.desiredZ - this.z)/Math.abs(this.desiredZ - this.z)*delta*this.speed;
            } else {
                this.animY = 0.0;
                this.z = Math.round(this.z);
                this.animJumping = false;
            }
        } else {
            // this.x += 0.01; //move on log
        }
    }

    move(x, z) {
        if(!this.animJumping) {
            this.desiredX = this.x + x;
            this.desiredZ = Math.round(this.z) + z;
            this.animJumping = true;
        }
    }
}

class Car {
    constructor(lane, x) {
        this.x = x;
        this.y = 0.0;
        this.z = lane + 1;
        this.lane = lane
        this.length = 1.6;
        this.width = 0.6;
        this.height = 0.4;
        this.speed = 0.03*lane - 0.01;
        this.direction = (lane%2)*2-1;
    }

    update(delta) {
        if(delta =! undefined) {
            this.x = this.x + this.direction*delta*this.speed;
        }
        
        if(this.x <= -6.5 - this.length/2 && this.direction == -1)
            this.x = 6.5 + this.length/2;
        if(this.x >= 6.5 + this.length/2 && this.direction == 1)
            this.x = -6.5 - this.length/2;
            
    }

    draw(mv) {
        setColor(vec4( 0.0, 0.2, 0.2, 1.0 ), vec4( 0.0, 1.0, 0.0, 1.0 ),
                 vec4( 1.0, 1.0, 1.0, 1.0 ), 100.0);
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
        this.roadPoints = [vec4(13.0, 0.0, 5.0, 1.0), vec4(0.0, 0.0, 5.0, 1.0), vec4(13.0, 0.0, 0.0, 1.0),
                           vec4(0.0, 0.0, 5.0, 1.0), vec4(0.0, 0.0, 0.0, 1.0), vec4(13.0, 0.0, 0.0, 1.0)];
        this.roadNormals = [vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0),
                            vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0)];
        this.roadTexCoords = [];
    }

    drawRoad(mv) {
        setColor(vec4( 0.3, 0.3, 0.3, 1.0 ), vec4( 0.0, 0.0, 0.0, 1.0 ),
                 vec4( 0.0, 0.0, 0.0, 0.0 ), 100.0);
        mv = mult( mv, translate(-6.5, 0, 1.5));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv) );
        setNormalMatrix(mv);
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.roadNormals), gl.STATIC_DRAW );

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.roadPoints), gl.STATIC_DRAW);

        gl.drawArrays( gl.TRIANGLES, 0, this.roadPoints.length );
    }

    draw(mv) {
        this.drawRoad(mv);
    }
}