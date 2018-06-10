//gets the socket to send information to get server.
var socket = io();
//gets socket id
var socketID = socket.id;
//create a player variable to hold player objects
var arrayOfPlayers = {};
//create an object hold brick array & config
var brickSettings = {};
//get canvas reference for drawing.
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
//get scoreboard span reference
var scoreboard = document.getElementById("score");
//variable to set and stop keyboard controls set interval
var keyboardControls;

//A container to send paddle updates to the server.
//declaring properties for objects requires colons instead of commas
var movement = {
    rightPressed: false,
    leftPressed: false
};

//Keyboard events
window.addEventListener("keydown", function (event) {
    if (event.code === "ArrowRight") {
        movement.rightPressed = true;
    }
    else if (event.code === "ArrowLeft") {
        movement.leftPressed = true;
    }
});

window.addEventListener("keyup", function (event) {
    if (event.code === "ArrowRight") {
        movement.rightPressed = false;
    }
    else if (event.code === "ArrowLeft") {
        movement.leftPressed = false;
    }
});

//send paddle movments to server 60 times a second.
setInterval(function () {
    socket.emit('update', movement);
}, 1000 / 60);


function StartKeyboardControls() {
    keyboardControls = setInterval(function () {
        socket.emit('update', movement);
    }, 1000 / 60);
}

function StopKeyboardControls() {
    clearInterval(keyboardControls);
}

//Sets an interval to check if array of players object is popoulated with atleast 1 player.
function UpdateCheck() {
    var check = setInterval(function () {
        if (Object.keys(arrayOfPlayers).length === 1) {
            draw(arrayOfPlayers);
            clearInterval(check);
        }
    }, 1000);

}


function drawBall(player) {
    //start drawing
    ctx.beginPath();
    //make a circle at "this locations", "this diameter",
    ctx.arc(player.x, player.y, player.ballRadius, 0, Math.PI * 2);
    //choose a color
    if (player.playerID === socketID) {
        //blue
        ctx.fillStyle = "#0095DD";
    }
    else {
        //black
        ctx.fillStyle = "#FF0000";
    }
    // finish drawing
    ctx.closePath();
    //fill shape with color
    ctx.fill();
}

function drawPaddle(player) {
    ctx.beginPath();
    //X,Y,Width,Height paddle starting location
    ctx.rect(player.paddleX, player.canvas.height - player.paddleHeight, player.paddleWidth, player.paddleThickness);
    ctx.fillStyle = "#0095DD";
    ctx.closePath();
    ctx.fill();
}

function drawBricks(brickSettings) {
    var bricks = brickSettings.bricks;
    var config = brickSettings.brickConfig;
    for (var c = 0; c < config.brickColumnCount; c++) {
        for (var r = 0; r < config.brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                ctx.beginPath();
                ctx.rect(bricks[c][r].x, bricks[c][r].y, config.brickWidth, config.brickHeight);
                ctx.fillStyle = "#0095DD";
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}

function draw() {
    //clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //for each player draw a ball and paddle
    for (var id in arrayOfPlayers) {
        var ActivePlayer = arrayOfPlayers[id];
        drawBall(ActivePlayer);
        drawPaddle(ActivePlayer);
        //update score
        scoreboard.innerHTML = ActivePlayer.score;
    }
    drawBricks(brickSettings);
    //this is a recursive method for better animations.
    requestAnimationFrame(draw);
}

//Received updated players object locations and store them in the players array
socket.on('objectUpdates', function (data) {
    if (data !== null) {
        arrayOfPlayers = data.players;
        brickSettings = data.brickSettings;
    }
    else {
        console.log("empty update");
    }
    //console.log("msg received");
});


//once player is connected then start drawing
socket.on('playerReady', function () {
    //start sending keyboard inputs
    StartKeyboardControls();
    //Start checking for array of players object to have a player object.
    UpdateCheck();
});

//on receiving the "gameover" message stop the game, draw the "game over" on canvas & show scoreboard. Then activate/show start game button.
socket.on('gameOver', function () {
    //stop drawing
    cancelAnimationFrame(draw);
    //stop sending keyboard inputs
    StopKeyboardControls();
    //clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //display "gameover" image in canvas
    var img = new Image();
    img.onload = function () {
        ctx.drawImage(img, 0, 0);
    };
    img.src = "/GameOver.png";
});




