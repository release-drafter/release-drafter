# Actions for trigger-pipeline

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