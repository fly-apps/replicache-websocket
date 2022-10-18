import type { MutatorDefs } from "replicache";
import type Express from "express";
import express from "express";
import { handleRequest } from "./endpoints/handle-request.js";
import { handlePoke } from "./endpoints/handle-poke.js";
import expressWs from 'express-ws';
import {getWsBackend} from "./backend/ws";

export interface ReplicacheServerOptions {
  mutators: MutatorDefs;
  port: number;
  host: string;
}

export class ReplicacheExpressServer {
  mutators?: MutatorDefs;
  port: number;
  host: string;
  options: ReplicacheServerOptions;

  private _app?: Express.Application;
  constructor(options: ReplicacheServerOptions) {
    const { mutators = {} as MutatorDefs, port, host } = options;
    this.options = options;
    this.mutators = mutators;
    this.port = port;
    this.host = host;
  }

  get app() {
    if (!this._app) {
      this._app = ReplicacheExpressServer.app(this.options);
    }
    return this._app;
  }

  static app(options: ReplicacheServerOptions): Express.Application {
    const {mutators = {} as MutatorDefs} = options;

    const errorHandler = (
        err: Error,
        _req: Express.Request,
        res: Express.Response,
        next: Express.NextFunction
    ) => {
      res.status(500).send(err.message);
      next(err);
    };

    if (process.env.REPLICACHE_EXPRESS_IS_PROXY) {
      const app = express()
      app.use(
          express.urlencoded({extended: true}),
          express.json(),
          errorHandler
      );
      return app
    }

    const {app} = expressWs(express());

    app.use(
        express.urlencoded({extended: true}),
        express.json(),
        errorHandler
    );

    if (!process.env.REPLICACHE_EXPRESS_IS_PROXY) {
      app.ws(`/api/replicache/websocket/:spaceID`, (ws, req, next) => {
        console.log("trying to handle websocket!!")
        const wsBackend = getWsBackend(mutators)
        ws.send("{\"data\":\"hello\"}")
        wsBackend.addClient(req.params.spaceID, ws)
        next()
      })

      app.post(
          "/api/replicache/:op",
          async (
              req: Express.Request,
              res: Express.Response,
              next: Express.NextFunction
          ) => {
            await handleRequest(req, res, next, mutators);
          }
      );
      app.get(
          "/api/replicache/poke",
          async (
              req: Express.Request,
              res: Express.Response
          ) => {
            await handlePoke(req, res);
          }
      );
    }

    return app;
  }

  start(
    callback: () => void
  ): ReplicacheExpressServer {
    const server = this.app.listen(this.options.port, this.options.host, callback);
    if (process.env.REPLICACHE_EXPRESS_IS_PROXY)
      server.on("upgrade", (req, socket, _) => {
        const id = req.url?.split("/")[req.url?.split("/").length - 1]
        console.log(`TRYING TO SEND REPLAY FOR ${id}`)
        const headers = [
            'HTTP/1.1 101 Switching Protocols',
            `fly-replay: app=replicache-backend;instance=${id}`,
        ];
        socket.end(headers.concat('\r\n').join('\r\n'));
        console.log(headers.concat('\r\n').join('\r\n'))
      })
    return this;
  }

  static start(
    options: ReplicacheServerOptions,
    callback: () => void
  ): ReplicacheExpressServer {
    const app = new ReplicacheExpressServer(options);
    return app.start(callback);
  }
}
