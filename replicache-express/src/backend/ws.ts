import WebSocket from "ws";
import {pull} from "./pull";
import {push} from "./push";
import type {MutatorDefs} from "replicache";
import {createSpace, spaceExists} from "./index";

export function getWsBackend<M extends MutatorDefs>(mutators: M) {
    const global = globalThis as unknown as {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _wsBackend: WsBackend<M>;
    };
    if (!global._wsBackend) {
        global._wsBackend = new WsBackend(mutators);
    }
    return global._wsBackend;
}

export class WrappedWebSocket {
    private _clientID: string | undefined
    private readonly _ws: WebSocket
    private _cookie: number | null

    constructor(ws: WebSocket) {
        this._ws = ws
        this._cookie = null
    }

    get ws() {
        return this._ws
    }

    set cookie(cookie: number | null) {
      this._cookie = cookie
    }

    get cookie() {
      return this._cookie
    }

    set clientID(clientID: string | undefined) {
        this._clientID = clientID
    }

    get clientID() {
        return this._clientID
    }
}

type ClientMap = Map<string, Set<WrappedWebSocket>>;

export class WsBackend<M extends MutatorDefs>{
    private _clients: ClientMap;
    private readonly _mutators: M

    constructor(mutators: M) {
        this._clients = new Map();
        this._mutators = mutators
    }

    public addClient(spaceID: string, client: WebSocket) {
        const clients = this._clients.get(spaceID)
        const wrapped = new WrappedWebSocket(client)
        if (!clients) {
            this._clients.set(spaceID, new Set<WrappedWebSocket>([wrapped]))
        } else {
            clients.add(wrapped)
        }
        client.on("message", async (rawData) => {
            if (!await spaceExists(spaceID)) await createSpace(spaceID)
            const data = JSON.parse(rawData.toString())
            if (!wrapped.clientID) wrapped.clientID = data.clientID
            console.log(data)
            if (data.messageType === "hello") {
                const {clientID, ws, cookie} = wrapped
                const req = {
                    clientID,
                    spaceID,
                    cookie
                }
                const resp = await pull(spaceID as string, req);
                if ("cookie" in resp) {
                    wrapped.cookie = resp.cookie === undefined ? null : Number(resp.cookie)
                }
                if (ws.readyState === WebSocket.OPEN) {
                    const realResp = {
                        message: "poke",
                        ...resp
                    }
                    ws.send(JSON.stringify(realResp))
                }
                return
            }
            await push(spaceID, data, this._mutators)
            await this.pokeSpace(spaceID)
        })
        client.on("close", () => {
            const clients = this._clients.get(spaceID)
            clients?.delete(wrapped)
        })
    }

    public async pokeSpace(spaceID: string) {
        const clients = this._clients.get(spaceID)
        if (!clients) throw new Error("Can't poke a space that has no clients")
        for (const client of clients) {
            if (!client.clientID) continue
            const {clientID, ws, cookie} = client
            const req = {
                clientID,
                spaceID,
                cookie
            }
            const resp = await pull(spaceID as string, req);
            if ("cookie" in resp) {
                client.cookie = resp.cookie === undefined ? null : Number(resp.cookie)
            }
            if (ws.readyState === WebSocket.OPEN) {
                const realResp = {
                    message: "poke",
                    ...resp
                }
                ws.send(JSON.stringify(realResp))
            }
        }
    }

}
