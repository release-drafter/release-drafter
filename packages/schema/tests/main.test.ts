import { jest } from '@jest/globals'
import fs from 'node:fs/promises'
import { schemaPath } from '../src/paths.js'
import { jsonSchema } from '../src/json-schema.js'
import { run } from '../src/main.js'

async function SchemaFromFile() {
	return await fs.readFile(schemaPath, 'utf8')
}

it('verify schema are the same', async () => {
	expect(JSON.parse(await SchemaFromFile())).toEqual(jsonSchema)
})

it('verify schema is written to file', async () => {
	const originalWriteFile = fs.writeFile
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	fs.writeFile = jest.fn()
	await run()
	expect(fs.writeFile).toHaveBeenCalledWith(schemaPath, await SchemaFromFile())
	fs.writeFile = originalWriteFile
})
