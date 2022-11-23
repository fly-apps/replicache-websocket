import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './app';
import {mutators} from 'replicache-quickstarts-shared';
import {HTTPRequestInfo, Replicache, PullerResult, Poke, PullResponse } from 'replicache';
import axios from "axios";

async function init() {
  const {pathname} = window.location;

  if (pathname === '/' || pathname === '') {
    //EDIT ME
    const options = await axios.get("https://replicache-proxy.fly.dev/api/machines")
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
        <React.StrictMode>
          <div>
            <h1>Fly.io Replicache demo</h1>
            <p>Choose a todo list to connect to. Each list is running on its own backend running on a Fly.io Machine.</p>
            <p>When you choose a list, your browser connects to a proxy that uses the Fly.io <a href="https://fly.io/docs/reference/fly-replay/">fly-replay</a> header to seamlessly connect your browser to the backend running the list you chose.</p>
            <ul>
              {options.data.map((machine: any) => {
                return <li key={machine}> <a href={`/list/${machine}`}>{machine}</a></li>
              })}
            </ul>
          </div>
        </React.StrictMode>,
    );
    return
  }

  const paths = pathname.split('/');
  const [, , listID] = paths;

  // See https://doc.replicache.dev/licensing for how to get a license key.
  const licenseKey = import.meta.env.VITE_REPLICACHE_LICENSE_KEY;
  if (!licenseKey) {
    throw new Error('Missing VITE_REPLICACHE_LICENSE_KEY');
  }

  const socket = new WebSocket(`wss://replicache-proxy.fly.dev/api/replicache/websocket/${listID}`)

  let prevCookie = 0;

  const r = new Replicache({
    licenseKey,
    pusher: async req => {
      const res: HTTPRequestInfo = {
        httpStatusCode: 200,
        errorMessage: ""
      }
      socket.send(JSON.stringify(await req.json()))
      return res
    },
    puller: async req => {
      const decodedReq = await req.json()
      const res: PullerResult = {
        httpRequestInfo: {
          httpStatusCode: 200,
          errorMessage: ""
        },
      }
      prevCookie = decodedReq.cookie
      return res
    },
    name: listID,
    mutators,
  });

  socket.onopen = async () => {
    await r.pull()
    socket.send(JSON.stringify({messageType: "hello", clientID: await r.clientID, cookie: prevCookie}))
  }

  socket.addEventListener("message", async (event) => {
    const data = JSON.parse(event.data)
    if (data.message === "poke") {
      if (data.patch.length > 0) {
        const {patch, lastMutationID, cookie} = data

        const res: PullResponse = {
          cookie,
          patch,
          lastMutationID
        }

        const poke: Poke = {
          baseCookie: prevCookie,
          pullResponse: res,
        }

        prevCookie = cookie

        await r.poke(poke)
      }
    }
  })

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App rep={r} />
    </React.StrictMode>,
  );
}
await init();
