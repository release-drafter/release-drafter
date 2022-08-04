import { zodToJsonSchema } from 'zod-to-json-schema'
import { schema } from '@release-drafter/core'

function convertSchema() {
	const converted = zodToJsonSchema(schema(), 'ReleaseDrafter')
	// template is only required after deep merged, should not be required in the JSON schema
	// we should also remove the required field in case nothing remains after the filtering to keep draft04 compatibility
	// const requiredField = converted.required.filter(
	// 	(item: string) => item !== 'template',
	// )
	// if (requiredField.length > 0) {
	// 	converted.required = requiredField
	// } else {
	// 	delete converted.required
	// }
	return converted
}

export const jsonSchema = {
	title: 'JSON schema for Release Drafter yaml files',
	$id: 'https://raw.githubusercontent.com/release-drafter/release-drafter/master/schema.json',
	...convertSchema(),
}
