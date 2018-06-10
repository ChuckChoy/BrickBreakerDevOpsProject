//Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var routing = require('./Resources/Routing');

var app = express();
var server = http.Server(app);
var io = socketIO(server); // the io assigns a variable to each connection. It allows us to talk to each conneciton separately.

//set listening port to 5000
app.set('port', 5000);

// use the routing in Routing.js
app.use('/', routing); //moved routing to a differnt file for clarity purposes.


//Starts the server
server.listen(5000, function () {
    console.log('Starting server on port 5000');
});

//Create an object to hold our array of player objects & initialize array to hold bricks array & initialize interval/loop variables
var players = {};
var bricks = [];
var brickCount = 0;
var brickHitCount = 0;
var physics;
var update;

//start setInterval functions
function startPhysics() {
    physics = setInterval(function () {
        for (var id in players) {
            var player = players[id];
            if (player === 'undefined') {
                console.log("deleted player");
            }
            else {
                //update ball position
                player.x += player.dx;
                player.y += player.dy;

                //Collision detection of ball
                //ball collision w/ walls
                if (player.x + player.dx > player.canvas.width - player.ballRadius || player.x + player.dx < player.ballRadius) {
                    player.dx = -player.dx;
                }
                //ball collision w/ ceiling
                if (player.y + player.dy < player.ballRadius) {
                    player.dy = -player.dy;
                }
                //if collision between paddle mix and max x then bounce
                else if (player.x > player.paddleX && player.x < player.paddleX + player.paddleWidth && player.y + player.dy > player.canvas.height - player.ballRadius - player.paddleHeight) {
                    // need a formula for that produces a vector depending on where the paddle is hit instead of elseif
                    // Hardcoded paddle numbers for expediency
                    if (player.x > player.paddleX && player.x < player.paddleX + 15) {
                        player.dx = player.dx - 2.5;
                        player.dy = -player.dy - 1.3;
                    }
                    else if (player.x > player.paddleX + 15 && player.x < player.paddleX + 30) {
                        player.dx = player.dx - 2;
                        player.dy = -player.dy - 2;
                    }
                    else if (player.x > player.paddleX + 30 && player.x < player.paddleX + 45) {
                        player.dy = -player.dy;

                    }
                    else if (player.x > player.paddleX + 45 && player.x < player.paddleX + 60) {
                        player.dx = player.dx + 2.0;
                        player.dy = -player.dy - 2.0;
                    }
                    else if (player.x > player.paddleX + 60 && player.x < player.paddleX + player.paddleWidth) {
                        player.dx = player.dx + 2.5;
                        player.dy = -player.dy - 1.3;
                    }
                }

                //if collision with bottom game over
                else if (player.y + player.dy > player.canvas.height - player.ballRadius) {
                    respawn(player);
                }

                //ball collision with bricks.
                for (var c = 0; c < brickConfig.brickColumnCount; c++) {
                    for (var r = 0; r < brickConfig.brickRowCount; r++) {
                        var b = bricks[c][r];
                        // need to make some adjustments for ball radius
                        if (player.x > b.x && player.x < b.x + brickConfig.brickWidth &&
                            player.y + 10 > b.y && player.y - 10 < b.y + brickConfig.brickHeight && b.status !== 0) {
                            player.dy = -player.dy;
                            b.status = 0;
                            player.score += 25;
                            //increment the number of bricks "removed"
                            brickHitCount++;
                            //if bricks removed equals the brick count
                            if (brickHitCount === brickCount) {
                                //send to gameover message to all players
                                io.sockets.emit('gameOver', "Game complete");
                                stopPhysics();
                                stopUpdate();
                            }
                        }
                    }
                }
            }
        }
    }, 1000 / 60);// 60 times a second
}

function spawn(player) {
    //reset ball to middle of paddle and speed to original speed.
    player.dx = 0;
    player.dy = -2;
    player.x = player.paddleX + player.paddleWidth / 2;
    player.y = canvasHeight - 30;
}

function respawn(player) {
    //set ball position and speed
    player.x = -20;
    player.dx = 0;
    player.dy = 0;
    //4 second timer before ball reset
    setTimeout(function () {
        //reset ball to middle of paddle and speed to original speed.
        player.dx = 2;
        player.dy = -2;
        player.x = player.paddleX + player.paddleWidth / 2;
        player.y = canvasHeight - 30;
    }, 4000);
}

function startUpdate() {
    update = setInterval(function () {
        //transmit location to all players
        io.sockets.emit('objectUpdates', { players, brickSettings });
        //console.log('message sent');
    }, 1000 / 60);
}

//stop setInterval functions
function stopPhysics() {
    clearInterval(physics);
}

function stopUpdate() {
    clearInterval(update);
}

//Initial player variables for calculation
var canvasHeight = 400;
var canvasWidth = 600;
var x = canvasWidth / 2;
var y = canvasHeight - 30;
var paddleWidth = 75;
var paddleX = (canvasWidth - paddleWidth) / 2;

//Initial Brick Values
var brickConfig = {
    brickRowCount: 5,
    brickColumnCount: 9,
    brickWidth: 50,
    brickHeight: 15,
    brickPadding: 5,
    brickOffsetTop: 10,
    brickOffsetLeft: 10
};

//Fill brick array w/ "bricks"
for (var c = 0; c < brickConfig.brickColumnCount; c++) {
    //each c (column) gets it's own array
    bricks[c] = [];
    for (var r = 0; r < brickConfig.brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
        //give bricks their locations
        var brickX = c * (brickConfig.brickWidth + brickConfig.brickPadding) + brickConfig.brickOffsetLeft;
        var brickY = r * (brickConfig.brickHeight + brickConfig.brickPadding) + brickConfig.brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;
        //increment count so it's known when game should end
        brickCount++;
    }
}

//combine brick array and Config into one object to send to client
var brickSettings = { bricks, brickConfig };

//Add the WebSocket handlers... The communication between client and server... the communcation events
io.on('connection', function (socket) {
    console.log('Connection made');

    //socket.emit("connected", "isConnected");
    //socket.on('message', console.log);

    //Add players to an array and intiate starting location of ball and paddle
    players[socket.id] = {
        //hard coding canvas height and width for speed sake
        canvas: {
            height: canvasHeight,
            width: canvasWidth
        },
        //ball starting position
        x: x,
        y: y,
        //ball position rate of change
        dx: 0,
        dy: -2,
        ballRadius: 10,
        //paddle
        paddleHeight: 20,
        paddleWidth: paddleWidth,
        paddleThickness: 10,
        paddleX: paddleX,
        score: 0
    };

    //inform client they are connected
    socket.emit('playerReady', "isConnected");

    //receive update from client and update key position to server.
    socket.on('update', function (data) {
        var player = players[socket.id];// || {};

        //paddle movement
        if (data.rightPressed === true && player.paddleX < player.canvas.width - player.paddleWidth) {
            player.paddleX += 7;
        }
        else if (data.leftPressed === true && player.paddleX > 0) {
            player.paddleX -= 7;
        }

    });

    //start physics if there is one person connected, by counting nested player objects in the players object.
    if (Object.keys(players).length === 1) {
        startPhysics();
        startUpdate();
    }

    //Disconnect Event
    socket.on("disconnect", function () {
        //console.log(socket.id);
        delete players[socket.id];
        console.log("player disconnected");

        //stop physics if there are no payers
        if (Object.keys(players).length === 0) {
            stopPhysics();
            stopUpdate();
        }
    });


});
