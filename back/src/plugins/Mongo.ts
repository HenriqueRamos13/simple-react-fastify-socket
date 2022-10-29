import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import fp from "fastify-plugin";
import mongoose from "mongoose";
import { UserModel, User } from "../db/mongo/models/User";
export interface Models {
  User: UserModel;
}
export interface MongoDbType {
  models: Models;
}

// define options
export interface MyPluginOptions {
  uri: string;
}
const ConnectDB: FastifyPluginAsync<MyPluginOptions> = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) => {
  try {
    mongoose.connection.on("connected", () => {
      fastify.log.info({ actor: "MongoDB" }, "connected");
    });
    mongoose.connection.on("disconnected", () => {
      fastify.log.error({ actor: "MongoDB" }, "disconnected");
    });

    const mongo = await mongoose.connect(options.uri);
    const models: Models = { User };
    fastify.decorate("mongo", { models });
  } catch (error) {
    console.error(error);
  }
};
export default fp(ConnectDB);
