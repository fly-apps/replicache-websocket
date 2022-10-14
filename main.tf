terraform {
  required_providers {
    fly = {
      source = "fly-apps/fly"
      version = "0.0.18"
    }
  }
}

provider "fly" {
  useinternaltunnel    = true
  internaltunnelorg    = "personal"
  internaltunnelregion = "ewr"
}


