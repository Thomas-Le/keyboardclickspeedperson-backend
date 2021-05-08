import 'reflect-metadata';
import Redis from 'ioredis';
import connectRedis from 'connect-redis';
import session from 'express-session';
import { REDIS_OPTIONS, APP_PORT, CORS_ORIGIN } from './config';
import { createApp } from './app'
import { createConnection } from "typeorm";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

const main = async () => {

    const RedisStore = connectRedis(session);

    const client = new Redis(REDIS_OPTIONS);

    const store = new RedisStore({ client });

    const app = createApp(store);

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: CORS_ORIGIN,
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    const prompts = [
        "This is prompt#1 from the server",
        "This is prompt#2 from the server",
        "This is prompt#3 from the server",
        "This is prompt#4 from the server",
        "This is prompt#5 from the server"
    ]
    let roomOwners = new Set(); // string (owner socket id)
    let rooms = new Map(); // string (owner socket id) to set (clients id)
    let idToRoom = new Map(); // string (client socket id) to string (owner socket id)
    let idToUser = new Map(); // string (socket id) to string (client username)
    let userToId = new Map(); // string (client username) to string (socket id), for use in checking if player already connected
    let roomToPrompt = new Map(); // contains prompt (integer corresponding to index of prompts[]) for a room
    let lockedRooms = new Set(); // set of rooms that started the race already, meaning it is locked
    let roomsFinish = new Map(); // map room to # of finished racers
    let roomsRaceData = new Map(); // map room to its race data, i.e. players' WPM and % complete, stored as Map<room, Map<player, [wpm, %complete]>>, where room,wpm,%complete is string

    /**
     * @TODO:
     * Originally this used the default rooms of socket (their socket.id) for other clients to join in.
     * This runs into an issue when the original client ("owner" of the default room) tries to call socket.to(socket.id).emit(...)
     * It is expected that the caller won't receive an emit, however it turns out that no one else in the room will receive the emit, due to some behaviour in socket.io
     * So I did an "non-invasive" change so that the rooms will have the names of the username that is sent from the client.
     * Non-invasive means I converted instances where rooms are created to use username and vice versa, meaning that the rest of the code logic still *looks* like it'll use
     * socket.id as the room name. Get's super confusing.
     */
    io.on("connection", (socket: Socket) => {
        socket.emit('init-rooms', Array.from(rooms.keys()).map(roomid => [roomid, idToUser.get(roomid), lockedRooms.has(roomid)])); // Send all current rooms to client in form of [roomID, owner username, ifLocked]

        // data = client username
        // since room name = socket.id (which is the default room), don't need to join any particular one.
        socket.on('create-room', (data: string) => {
            let username = socket.handshake.query.username;
            if (username === undefined) {
                // @TODO: Better handling
                console.log("Can't create room, undefined username");
                return;
            }
            if (userToId.has(socket.handshake.query.username)) {
                socket.emit('already-logged');
                const oldSocketID = userToId.get(socket.handshake.query.username);
                io.of('/').sockets.get(oldSocketID)?.disconnect(); // disconnect oldsocket
            }
            socket.join(username);

            idToUser.set(socket.id, username); // map id to user
            userToId.set(username, socket.id); // map user to id
            roomOwners.add(socket.id); // set client id as owner of room
            rooms.set(socket.id, new Set([socket.id])); // add owner as client in room
            idToRoom.set(socket.id, socket.id) // not sure how necessary this line is, since owner room is itself TODO: Probably not necessary
            const promptNum = Math.floor(Math.random() * prompts.length); // select random prompt from list of prompts
            roomToPrompt.set(socket.id, promptNum);

            socket.emit('room-prompt', prompts[promptNum]); // send prompt to owner of room
            socket.broadcast.emit('add-room', [socket.id, data, lockedRooms.has(socket.id)]); // announce to all other clients about new room
        });

        // data = room name = owner client's id
        socket.on('join-room', (data: string)  => {
            if (userToId.has(socket.handshake.query.username)) {
                socket.emit('already-logged');
                const oldSocketID = userToId.get(socket.handshake.query.username);
                io.of('/').sockets.get(oldSocketID)?.disconnect(); // disconnect oldsocket
            }
            if (lockedRooms.has(idToUser.get(data))) {
                console.log('User tried to join locked game');
                return;
            }
            if (rooms.has(data)) {
                let ownerUsername = idToUser.get(data);
                socket.join(ownerUsername); // Join room as player
                socket.emit('init-players', Array.from(rooms.get(data)).map(id => [id, idToUser.get(id)])) // emit to client a list of others in room in form of [clientID, client username]

                idToUser.set(socket.id, socket.handshake.query.username); // map id to user
                userToId.set(socket.handshake.query.username, socket.id); // map user to id
                idToRoom.set(socket.id, data);
                rooms.get(data).add(socket.id); // add client to room set

                socket.emit('room-prompt', prompts[roomToPrompt.get(data)]); // send room prompt to client;
                socket.to(ownerUsername).emit('joined', [socket.id, socket.handshake.query.username]) // announce to other clients in room that this client [id, username] has joined
            } else {
                socket.emit('room-join-error');
            }
        });

        socket.on('owner-start-race', () => {
            // only room owners can start race
            //socket.broadcast.to(socket.id).emit('test');
            if (roomOwners.has(socket.id)) {
                socket.to(idToUser.get(socket.id)).emit('start-race');
                lockedRooms.add(socket.id);
                socket.broadcast.emit('room-locked', [socket.id, idToUser.get(socket.id)]);
                roomsFinish.set(socket.id, 0);
                roomsRaceData.set(socket.id, new Map());
                rooms.get(socket.id).forEach(element => {
                    roomsRaceData.get(socket.id).set(element, [0, 0]);
                });

                // send race data every second until race is over
                const sendData = setInterval(() => {
                    // stop once finished
                    if (!roomsFinish.has(socket.id)) {
                        clearInterval(sendData);
                    } else {
                        io.to(idToUser.get(socket.id)).emit('race-data', Array.from(roomsRaceData.get(socket.id))); // send [playerName, [wpm, %complete]]
                    }
                }, 1000);
            } else {
                // @TODO: Some error handling when non-owner calls
                console.log("tried starting room, but client not owner");
            }
        });

        socket.on('finish', () => {
            const ownerID = idToRoom.get(socket.id);
            roomsFinish.set(ownerID, roomsFinish.get(ownerID) + 1);
            // Check finish
            if (roomsFinish.get(ownerID) >= rooms.get(ownerID).size) {
                roomsFinish.delete(ownerID);
                lockedRooms.delete(ownerID);
                io.to(idToUser.get(ownerID)).emit('race-end');

                io.to(idToUser.get(ownerID)).emit('race-data', Array.from(roomsRaceData.get(ownerID))); // send [playerName, [wpm, %complete]]
                // any cause why not
                io.to(idToUser.get(ownerID)).emit('race-results', Array.from(roomsRaceData.get(ownerID)).map((player: any) => [idToUser.get(player[0]), player[1]])); // send [playerName, [wpm, %complete]]

                roomsRaceData.delete(ownerID);
                socket.broadcast.emit('room-unlocked', [ownerID, idToUser.get(ownerID)]);
            }
        });

        socket.on('race-reset', () => {
            socket.to(idToUser.get(socket.id)).emit('reset-race');
        });

        socket.on('owner-new-prompt', () => {
            const newPrompt = (roomToPrompt.get(socket.id) + 1) % prompts.length;
            roomToPrompt.set(socket.id, newPrompt);
            io.to(idToUser.get(socket.id)).emit('new-prompt', prompts[newPrompt]);
        });

        // data = [wpm, %complete]
        socket.on('my-stats', data => {
            const ownerID = idToRoom.get(socket.id);
            if (roomsRaceData.has(ownerID)) {
                roomsRaceData.get(ownerID).set(socket.id, data);
            } else {
                // @TODO: Error handling when we have no data to save to
                console.log("Tried adding data to map, but room not found");
            }
        });

        // Client could be room owner or player
        socket.on('disconnect', () => {
            if (roomOwners.has(socket.id)) {
                // disconnect all players
                rooms.get(socket.id).forEach(socketid => {
                    const currSocket = io.of('/').sockets.get(socketid);
                    currSocket?.emit('owner-left'); // emit to client that owner left
                    currSocket?.disconnect();
                    userToId.delete(idToUser.get(socketid)); // delete from user-id mapping
                    idToUser.delete(socketid); // delete all players from id-username mapping
                });
                rooms.delete(socket.id); // remove room from room set
                roomOwners.delete(socket.id); // remove from roomOwners set
                lockedRooms.delete(socket.id);
                roomToPrompt.delete(socket.id);
                roomsFinish.delete(socket.id);
                roomsRaceData.delete(socket.id);
                io.emit('room-deleted', socket.id) // alert any players that room is deleted
            } else {
                const roomName = idToRoom.get(socket.id);
                rooms.get(roomName)?.delete(socket.id) // remove client from room
                socket.to(idToUser.get(roomName)).emit('player-left', socket.id);

                // Check if client was in race, handle if was
                if (roomsFinish.has(roomName)) {
                    // Check if leaving finishes race
                    if (roomsFinish.get(roomName) >= rooms.get(roomName).size) {
                        roomsFinish.delete(roomName);
                        lockedRooms.delete(roomName);
                        io.to(idToUser.get(roomName)).emit('race-end', [roomName, idToUser.get(roomName)]);
                    }
                }
            }
            userToId.delete(socket.handshake.query.username); // delete user from username-id mapping
            idToUser.delete(socket.id); // delete user from id-username mapping
            idToRoom.delete(socket.id); // delete user from id-room mapping

            /* Testing Purposes */
            console.log("idToUser: " + idToUser.size);
            console.log("idToRoom: " + idToRoom.size);
            console.log("userToId: " + userToId.size);
            console.log("roomToPrompt: " + roomToPrompt.size);
            console.log("lockedRooms: " + lockedRooms.size);
            console.log("roomsFinish: " + roomsFinish.size);
            console.log("roomOwners: " + roomOwners.size);
            console.log("rooms: " + rooms.size);
        });
    });

    /*
    function setup(socket) {
        socket.emit('initializePlayers', Array.from(currentlyPlayingIdUser)); // sends info about current players in race, if any
        socket.emit('initializeRace', prompt); // sends prompt
        socket.to(currRoom).emit('new player', [socket.id, socket.handshake.query.username]); // announces to other players client has joined
        currentlyPlaying.add(socket);
        currentlyPlayingIdUser.set(socket.id, socket.handshake.query.username);
        raceScores.set(socket.id, 0);

        if (!startLockCountdown && currentlyPlaying.size > 1) {
            startLockCountdown = true;
            let i = 5;
            const lockdownTimer = setInterval(() => {
                if (!startLockCountdown) {
                    clearInterval(lockdownTimer);
                } else if (i < 1) {
                    clearInterval(lockdownTimer);
                    startLockCountdown = false;
                    lock = true;
                    io.to(currRoom).emit('start');
                    const updateTimer = setInterval(() => {
                        if (currentlyPlaying.size < 1) {
                            clearInterval(updateTimer);
                            lock = false;
                            startLockCountdown = false;
                            raceScores.clear();
                            for (let player of currentlyPlaying) {
                                player.emit('race finished');
                            }
                            let temp = currRoom;
                            currRoom = nextRoom;
                            nextRoom = temp;
                            currentlyPlayingIdUser.clear();
                            for (let waitingClient of currentlyWaiting) {
                                setup(waitingClient);
                            }
                            currentlyWaiting.clear();
                        } else {
                            io.to(currRoom).emit('update', Array.from(raceScores));
                        }
                    }, 1000);
                } else {
                    io.to(currRoom).emit('lock countdown', i);
                    i--;
                }
            }, 1000)
        }
    }
    */
    /*
    const race = new Map();
    const idToUser = new Map();
    let startLockCountdown = false;
    let lock = false;
    let room = "room";
    let waitingForNext = new Set<Socket>();
    let donePlayers = new Set();
    let currentPlayers = new Set<Socket>();
    const prompt = "This is a sent prompt from the server";

    io.on("connection", (socket: Socket) => {
        socket.join(room);
        socket.emit('joined room');
        socket.emit('initializePlayers', Array.from(idToUser)); // sends info about current players in race, if any
        if (lock) {
            socket.emit('locked');
            waitingForNext.add(socket);
        } else {
            setup(socket);
        }

        socket.on("disconnect", function() {
            // Send emit so clients can remove from screen, only if race has not started
            if (waitingForNext.has(socket)) {
                waitingForNext.delete(socket);
            } else {
                donePlayers.delete(socket.id);
                currentPlayers.delete(socket);
                if (!lock) {
                    socket.to(room).emit('removing player', socket.id);
                    race.delete(socket.id)
                }
                idToUser.delete(socket.id)
                if (currentPlayers.size < 2 && startLockCountdown) {
                    socket.to(room).emit('player left, not enough to start', socket.id);
                    startLockCountdown = false; // If in lockdown, we want to stop and wait for players
                }
            }
        });

        socket.on("update progress", (data) => {
            race.set(socket.id, data);
        })
        
        socket.on("done", (data) => {
            race.set(socket.id, data);
            donePlayers.add(socket.id);
        });
    });

    function setup(socket) {
        currentPlayers.add(socket);
        socket.emit('initializeRace', prompt); // sends prompt
        socket.to(room).emit('new player', [socket.id, socket.handshake.query.username]); // announces to other players client has joined
        idToUser.set(socket.id, socket.handshake.query.username);
        race.set(socket.id, 0);

        if (!startLockCountdown && currNumPlayers > 1) {
            startLockCountdown = true;
            let i = 5;
            const lockdownTimer = setInterval(() => {
                if (!startLockCountdown) {
                    clearInterval(lockdownTimer);
                } else if (i < 1) {
                    clearInterval(lockdownTimer);
                    startLockCountdown = false;
                    lock = true;
                    io.to(room).emit('start');
                    const updateTimer = setInterval(() => {
                        if (currNumPlayers < 1) {
                            clearInterval(updateTimer);
                            lock = false;
                            startLockCountdown = false;
                            race.clear();
                            idToUser.clear();
                            for (let player of currentPlayers) {
                                player.emit('race finished');

                            }
                            for (let waitingClient of waitingForNext) {
                                waitingClient.emit('test');
                                setup(waitingClient);
                            }
                            waitingForNext.clear();
                        } else {
                            io.to(room).emit('update', Array.from(race));
                        }
                    }, 1000);
                } else {
                    io.to(room).emit('lock countdown', i);
                    i--;
                }
            }, 1000)
        }
    }
    */

    const conn = await createConnection();
    conn.runMigrations();

    /*
    app.listen(APP_PORT, () => {
        console.log("Server running on port " + APP_PORT);
    });
    */

    httpServer.listen(APP_PORT);
};

main();