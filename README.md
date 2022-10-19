# Setup
## Create your fly apps
```shell
# Create an app for the frontend
$ flyctl apps create my-example-frontend-app
$ flyctl ips allocate-v4 -a my-example-frontend-app
$ flyctl ips allocate-v6 -a my-example-frontend-app

# Create an app for the proxy
$ flyctl apps create my-example-proxy-app
$ flyctl ips allocate-v4 -a my-example-proxy-app
$ flyctl ips allocate-v6 -a my-example-proxy-app

# Create an app for the backend
$ flyctl apps create my-example-backend-app
$ flyctl ips allocate-v4 -a my-example-backend-app
$ flyctl ips allocate-v6 -a my-example-backend-app
```
## Set secrets
```shell
# Get your fly token
$ flyctl auth token
$ flyctl secrets set -a my-example-proxy-app FLY_API_TOKEN=yourtoken BACKEND_APP_NAME=my-example-backend-app
```
## Edit files
Edit `./client/react/src/index.tsx:15` and replace `replicache-proxy.fly.dev` with your proxy app name.
## Build the docker images
```shell
$ docker buildx build --platform linux/amd64 --push -t registry.fly.io/my-example-frontend-app:latest -f Dockerfile.frontend .
$ docker buildx build --platform linux/amd64 --push -t registry.fly.io/my-example-proxy-app:latest -f Dockerfile.proxy.
$ docker buildx build --platform linux/amd64 --push -t registry.fly.io/my-example-backend-app:latest -f Dockerfile.backend.
```
## Run your machines
```shell
# Create a few backend machines
$ flyctl m run -a my-example-backend-app -n backend-1 --memory 512 --cpus 2 -p 443:8080/tcp:http:tls registry.fly.io/my-example-backend-app:latest
$ flyctl m run -a my-example-backend-app -n backend-2 --memory 512 --cpus 2 -p 443:8080/tcp:http:tls registry.fly.io/my-example-backend-app:latest
$ flyctl m run -a my-example-backend-app -n backend-3 --memory 512 --cpus 2 -p 443:8080/tcp:http:tls registry.fly.io/my-example-backend-app:latest

# Create your proxy machine
$ flyctl m run -a my-example-proxy-app --memory 512 --cpus 2 registry.fly.io/my-example-proxy-app:latest 

# Create your frontend
$ flyctl m run -a my-example-frontend-app -n frontend-1 -p 443:80/tcp:http:tls registry.fly.io/my-example-frontend-app:latest  
```

## Check it out
Check it all out at `my-example-frontend-app.fly.dev`