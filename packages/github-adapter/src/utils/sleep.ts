import { setTimeout as delay } from 'node:timers/promises'

export const sleep = (milliseconds: number) => delay(milliseconds)
