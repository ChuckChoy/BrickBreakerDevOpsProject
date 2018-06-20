//Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var routing = require('./Resources/Routing');
var bodyParser = require('body-parser');

var app = express();
var server = http.Server(app);
var io = socketIO(server); // the io assigns a variable to each connection. It allows us to talk to each conneciton separately.

//set listening port to 5000
app.set('port', 80);

//parses JSON in the HTTP POST request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json('application/json'));
// use the routing in Routing.js
app.use('/', routing); //moved routing to a differnt file for clarity purposes.


//Starts the server. changed port to 80 because azure only has 80 and 443 open
server.listen(80, function () {
    console.log('Starting server on port 80');
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
                                //reset game
                                GameReset();
                                //record game function.
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
    setTimeout(() => { spawn(player); }, 4000);
}

//reset game after game over messages is emmitted
function GameReset() {
    //loop through all bricks and set status back to 0 (not hit);
    for (var c = 0; c < brickConfig.brickColumnCount; c++) {
        for (var r = 0; r < brickConfig.brickRowCount; r++) {
            var b = bricks[c][r];
            b.status = 1;
        }
    }
    //change each players score,ball speed,ball location to original
    for (var id in players) {
        var player = players[id];
        player.score = 0;
        player.dx = 0;
        player.dy = 2;
        player.paddleX = paddleX;
        player.x = player.paddleX + player.paddleWidth / 2;
        player.y = canvasHeight - 30;
    }
    //change the count of bricks hit back to 0;
    brickHitCount = 0;
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

    //create player when player presses 'join game' button
    socket.on("joinedGame", function () {
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

        //counts nested objects in players object.
        //wait for 2 players
        if (Object.keys(players).length === 2) {
            //inform clients they are connected
            io.sockets.emit('playersReady', "isConnected");
            //start physics and emitting physics to clients as updates
            startPhysics();
            startUpdate();
        }
        //if there are more than 2 players then join game immediately
        else if (Object.keys(players).length > 2) {
            socket.emit('playersReady', "isConnected");
        }
        //if only one player have them wait for second player.  
        else {
            socket.emit('playerWaiting', { players, brickSettings });
        }
    });

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
