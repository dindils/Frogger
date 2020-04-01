var canvas;
var gl;

var nBuffer, vBuffer;

var pointsArray = [];
var normalsArray = [];

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

var lightPosition = vec4(10.0, 10.0, 10.0, 1.0 );
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
var environment;
var PR;
const PLAYERMODELLOC = "frog_smooth.ply"

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.9, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    PR = PlyReader();
    player = new Player();
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
            spinX = ( spinX + (e.clientY - origY) ) % 360;
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
             zDist += 0.2;
         } else {
             zDist -= 0.2;
         }
     }  );

    render();
}


function render(now) {
    now *= 0.001; // breytum í sekúndur
    var deltaTime = now - then;
    then = now; // geymum núverandi tímann

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelViewMatrix = lookAt( vec3(0.0, 0.0, zDist), at, up );
    modelViewMatrix = mult( modelViewMatrix, rotateY( -spinY ) );
    modelViewMatrix = mult( modelViewMatrix, rotateX( spinX ) );

    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix) );

    player.draw();
    player.update(deltaTime);
    environment.draw();

    //gl.drawArrays( gl.TRIANGLES, 0, points.length );
    window.requestAnimFrame(render);
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

class Player {
    constructor() {
        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
        this.animJumping = false;
        this.animY = 0.0;
        this.desiredX = 0.0;
        this.desiredZ = 0.0;
        
        var plyData = PR.read(PLAYERMODELLOC);

        this.points = plyData.points;
        this.normals = plyData.normals;

    }

    draw() {
        setColor(vec4( 0.0, 0.2, 0.2, 1.0 ), vec4( 0.0, 1.0, 0.0, 1.0 ),
                 vec4( 1.0, 1.0, 1.0, 1.0 ), 100.0);

        var mv = mult( modelViewMatrix, translate(this.x, this.y + this.animY + 0.1, this.z));
        mv = mult(mv, scalem(0.5, 0.5, 0.5));
        mv = mult( mv, rotateX(-85));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv) );
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW );

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW);

        gl.drawArrays( gl.TRIANGLES, 0, this.points.length );
    }

    update(delta) {
        if(this.animJumping) {
            this.animY = Math.fround(Math.abs(Math.sin(this.x*3.14)+Math.sin(this.z*3.14)));
            if(Math.abs(this.x-this.desiredX)>0.001) {
                this.x = this.x + (this.desiredX - this.x)/Math.abs(this.desiredX - this.x)*delta;
            }
            else if(Math.abs(this.z-this.desiredZ)>0.001) {
                this.z = this.z + (this.desiredZ - this.z)/Math.abs(this.desiredZ - this.z)*delta;
            } else {
                this.animY = 0.0;
                this.x = Math.round(this.x);
                this.z = Math.round(this.z);
                this.animJumping = false;
            }
        }
    }

    move(x, z) {
        if(!this.animJumping) {
            this.desiredX = Math.round(this.x) + x;
            this.desiredZ = Math.round(this.z) + z;
            this.animJumping = true;
        }
    }
}

class Environment {
    constructor() {
        this.roadPoints = [vec4(13.0, 0.0, 5.0, 1.0), vec4(-13.0, 0.0, 5.0, 1.0), vec4(13.0, 0.0, -5.0, 1.0),
                           vec4(-13.0, 0.0, 5.0, 1.0), vec4(-13.0, 0.0, -5.0, 1.0), vec4(13.0, 0.0, -5.0, 1.0)];
        this.roadNormals = [vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0),
                            vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0)];

    }

    drawRoad() {

    }

    draw() {
        setColor(vec4( 0.3, 0.3, 0.3, 1.0 ), vec4( 0.5, 0.5, 0.0, 1.0 ),
                 vec4( 1.0, 1.0, 1.0, 1.0 ), 100.0);
        var mv = mult( modelViewMatrix, translate(0, 0, 6));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv) );
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.roadNormals), gl.STATIC_DRAW );

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.roadPoints), gl.STATIC_DRAW);

        gl.drawArrays( gl.TRIANGLES, 0, this.roadPoints.length );
    }
}