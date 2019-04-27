workflow "Push" {
  on = "push"
  resolves = ["Run Tests", "Draft Release"]
}

action "Install Dependencies" {
  uses = "docker://node:10"
  runs = ["yarn", "install", "--frozen-lockfile"]
}

action "Run Tests" {
  needs = ["Install Dependencies"]
  uses = "docker://node:10-alpine"
  runs = ["npm", "test"]
}

action "Draft Release" {
  uses = "./"
  secrets = ["GITHUB_TOKEN"]
}