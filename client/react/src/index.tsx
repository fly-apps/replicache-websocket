import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './app';
import {mutators} from 'replicache-quickstarts-shared';
import {HTTPRequestInfo, Replicache, PullerResult} from 'replicache';
import {createSpace, spaceExists} from './space';

async function init() {
  const {pathname} = window.location;

  // if (pathname === '/' || pathname === '') {
  //   window.location.href = '/list/' + (await createSpace());
  //   return;
  // }

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
