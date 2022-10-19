import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './app';
import {mutators} from 'replicache-quickstarts-shared';
import {HTTPRequestInfo, Replicache, PullerResult} from 'replicache';
import axios from "axios";
// import {createSpace, spaceExists} from './space';

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
  //   window.location.href = '/list/' + (await createSpace());
  //   return;
  }

  // URL layout is "/list/<listid>"
  const paths = pathname.split('/');
  const [, , listID] = paths;
  // if (
  //   listDir !== 'list' ||
  //   listID === undefined ||
  //   !(await spaceExists(listID))
  // ) {
  //   window.location.href = '/';
  //   return;
  // }

  // See https://doc.replicache.dev/licensing for how to get a license key.
  const licenseKey = import.meta.env.VITE_REPLICACHE_LICENSE_KEY;
  if (!licenseKey) {
    throw new Error('Missing VITE_REPLICACHE_LICENSE_KEY');
  }

  let patch: any[] = []
  let lastMutationID = 0
  let cookie: number | undefined = undefined
  const socket = new WebSocket(`wss://replicache-proxy.fly.dev/api/replicache/websocket/${listID}`)

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
    puller: async () => {
      const res: PullerResult = {
        httpRequestInfo: {
          httpStatusCode: 200,
          errorMessage: ""
        },
        response: {
          cookie,
          patch,
          lastMutationID
        }
      }
      patch = []
      return res
    },
    name: listID,
    mutators,
  });

  socket.onopen = async () => {
    //TODO: if there was a way to divine what the current client thinks the cookie is, we could
    //      send it here and prevent a whole resync on load. Unfortunately I can't find a way to get it
    //      without initiating a pull.
    socket.send(JSON.stringify({messageType: "hello", clientID: await r.clientID}))
  }

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data)
    if (data.message === "poke") {
      if (data.patch.length > 0) {
        patch = [...patch, ...data.patch]
        lastMutationID = data.lastMutationID
        cookie = data.cookie
        r.pull()
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
