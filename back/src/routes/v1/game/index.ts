import { FastifyInstance } from "fastify";
import { Socket } from "socket.io";

interface User {
  name: string;
  left: number;
  top: number;
}

let users: User[] = [];

export default function (fastify: FastifyInstance, opts: any, done: any) {
  fastify.ready((err) => {
    if (err) throw err;

    fastify.io.on("connection", (Socket: Socket) => {
      console.info("Socket connected!", Socket);

      if (Socket.handshake.auth.token !== "1234") {
        Socket.disconnect(true);
      }

      users.push({
        name: Socket.id,
        left: 0,
        top: 0,
      });

      console.log(users);

      Socket.on("disconnect", (data: any) => {
        console.info("Socket disconnected!", Socket.id);
        users.splice(
          users.findIndex((user) => user.name === Socket.id),
          1
        );
      });

      Socket.on("move", (data: any) => {
        console.log("AAAAA", Socket, data);

        const newU = users.map((u) => {
          if (u.name === Socket.id) {
            u.left = data.left;
            u.top = data.top;
          }
          return u;
        });

        fastify.io.emit("users", users);
      });

      Socket.on("join", (data: any) => {
        users.push({ name: Socket.id, left: data.left, top: data.top });
      });
    });
  });

  done();
}
