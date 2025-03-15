const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
let scores = { p1: 0, p2: 0 };
let ball = { x: 300, y: 200, vx: 0, vy: 0 }; // Ball starts still
let gameStarted = false;

// Handle player connections
io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    if (Object.keys(players).length < 2) {
        players[socket.id] = { y: 150, number: Object.keys(players).length + 1 };
        socket.emit("playerNumber", players[socket.id].number);
    } else {
        socket.emit("gameFull");
        return;
    }

    // Paddle movement, now logging the client's local timestamp
    socket.on("paddleMove", (data) => {
        if (players[socket.id]) {
            console.log(`Received paddleMove from player ${players[socket.id].number} with timestamp: ${data.timestamp}`);
            players[socket.id].y = data.y;
            io.emit("updatePaddles", players);
        }
    });

    // Start game when clicked
    socket.on("startGame", () => {
        if (!gameStarted) {
            gameStarted = true;
            resetBall();
        }
    });

    // Reset game when clicked
    socket.on("resetGame", () => {
        scores = { p1: 0, p2: 0 };
        gameStarted = false;
        ball = { x: 300, y: 200, vx: 0, vy: 0 }; // Stop ball again
        io.emit("updateGame", { paddles: players, ball, scores });
    });

    // Player disconnects
    socket.on("disconnect", () => {
        delete players[socket.id];
        console.log("Player disconnected:", socket.id);
    });
});

// Ball movement & scoring (Only moves if gameStarted is true)
setInterval(() => {
    if (!gameStarted) return;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y <= 0 || ball.y >= 400) ball.vy *= -1;

    let player1 = Object.values(players)[0];
    let player2 = Object.values(players)[1];

    if (
        (ball.x <= 30 && ball.y >= player1?.y && ball.y <= player1?.y + 60) ||
        (ball.x >= 570 && ball.y >= player2?.y && ball.y <= player2?.y + 60)
    ) {
        ball.vx *= -1;
    }

    // Scoring
    if (ball.x < 0) {
        scores.p2++;
        resetBall();
    } else if (ball.x > 600) {
        scores.p1++;
        resetBall();
    }

    io.emit("updateGame", { paddles: players, ball, scores });
}, 1000 / 60);

function resetBall() {
    ball = { 
      x: 300, 
      y: 200, 
      vx: (Math.random() > 0.5 ? 4 : -4), 
      vy: (Math.random() > 0.5 ? 3 : -3) 
    };
}

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
