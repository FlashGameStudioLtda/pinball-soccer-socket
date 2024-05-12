const { v4: uuidv4 } = require('uuid');
const express = require("express");
const app = express();
const port = 6590;

const server = require('http').Server(app);

server.listen(port, () => {
    console.log(`Server listening at port ${port}`);
});

const io = require('socket.io')(server, {
    pingInterval: 30005,
    pingTimeout: 5000,
    upgradeTimeout: 3000,
    allowUpgrades: true,
    cookie: false,
    serveClient: true,
    allowEIO3: false,
    cors: {
        origin: "*"
    }
});

let rooms = {};

class Room {
    constructor(roomId, tableId) {
        this.id = roomId;
        this.socketIds = [];
        this.tableId = tableId;
        this.available = true;
    }
}

io.on('connection', async (socket) => {
    console.log(socket.id + ' connected!');

    socket.on('ping', () => {
        socket.emit('pong');
    });

    socket.on('authenticate', (playFabId) => {
        socket.playFabId = playFabId;
    });

    socket.on('joinOrCreateRoom', async (player) => {
        console.log(`JoinOrCreateRoom receive data ${player}`);

        player.socketId = socket.id;
        player = await joinOrCreateRoom(socket, player);

        if(player.roomId != null)
        {
            socket.join(player.roomId);
            io.to(player.roomId).emit('onJoinedRoom', player);

            if(rooms[room.id].socketIds.length == 2){
                rooms[room.id].available = false;
                io.to(room.id).emit('startGame');
            }

            console.log(`Player ${socket.playFabId} connected on room ${player.roomId}`);
        }
    });

    socket.on('flipperAttack', async (attack) => {
        let otherPlayer = rooms[socket.roomId].socketIds[0] == socket.id ? rooms[socket.roomId].socketIds[1] : rooms[socket.roomId].socketIds[0];
        io.to(otherPlayer).emit('onFlipperAttack', attack);
    });

    socket.on('continueWithConnection', async () => {
        socket.emit('continueWithConnection');
    });

    socket.emit('ping');
});

async function findAvailableRoom(tableId) {
    return rooms.forEach(room => {
        return room.tableId == tableId && room.available == true;
    });
}

async function joinOrCreateRoom(socket, player) {
    
    let room = null;

    room = await findAvailableRoom(player.tableId);

    console.log(`Room found ${room}`);

    if (room == null) {
        const newRoomId = uuidv4();
        room = new Room(newRoomId, player.tableId);
        rooms[newRoomId] = room;
        player.roomOwner = true;
        console.log(`New room ${newRoomId} created.`);
    }

    rooms[room.id].socketIds.push(socket.id);
    
    console.log(`Entering on room ${room.id}.`);

    socket.roomId = room.id;
    player.roomId = room.id;

    return player;
};