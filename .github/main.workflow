workflow "Test" {
  on = "push"
  resolves = "tests"
}

action "deps" {
  uses = "docker://node:10"
  runs = ["yarn", "install", "--frozen-lockfile"]
}

action "tests" {
  needs = ["deps"]
  uses = "docker://node:10-alpine"
  runs = ["npm", "test"]
}

workflow "Draft Release" {
  on = "push"
  resolves = "release-drafter"
}

action "release-drafter" {
  uses = "./"
  secrets = ["GITHUB_TOKEN"]
}