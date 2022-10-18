terraform {
  required_providers {
    fly = {
      source = "fly-apps/fly"
      version = "0.0.20"
    }
  }
}

provider "fly" {
  useinternaltunnel    = true
  internaltunnelorg    = "personal"
  internaltunnelregion = "ewr"
}

resource "fly_app" "frontend_app" {
  name = "replicache-frontend"
}

resource "fly_ip" "frontendIP" {
  app        = fly_app.frontend_app.name
  type       = "v4"
  depends_on = [fly_app.frontend_app]
}

resource "fly_ip" "frontendIPV6" {
  app        = fly_app.frontend_app.name
  type       = "v6"
  depends_on = [fly_app.frontend_app]
}

resource "fly_app" "proxy_app" {
  name = "replicache-proxy"
}

resource "fly_ip" "proxyIP" {
  app        = fly_app.proxy_app.name
  type       = "v4"
  depends_on = [fly_app.proxy_app]
}

resource "fly_ip" "proxyIPV6" {
  app        = fly_app.proxy_app.name
  type       = "v6"
  depends_on = [fly_app.proxy_app]
}

resource "fly_app" "backend_app" {
  name = "replicache-backend"
}

resource "fly_ip" "backendIP" {
  app        = fly_app.backend_app.name
  type       = "v4"
  depends_on = [fly_app.backend_app]
}

resource "fly_ip" "backendIPV6" {
  app        = fly_app.backend_app.name
  type       = "v6"
  depends_on = [fly_app.backend_app]
}

#resource "fly_machine" "backendMachine1" {
#
#}