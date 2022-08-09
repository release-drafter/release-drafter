/* eslint-disable unicorn/no-null */
import { describe, it, expect } from '@jest/globals'
import { schema, validateSchema } from '../src/schema.js'
import { DEFAULT_CONFIG } from '../src/default-config.js'
import { ZodError } from 'zod'

const template = '$CHANGES'

const validConfigs = [
	[
		{ ...DEFAULT_CONFIG, template },
		{ ...DEFAULT_CONFIG, template },
	],
	[
		{
			...DEFAULT_CONFIG,
			template,
			replacers: [{ search: '123', replace: '' }],
		},
		{
			...DEFAULT_CONFIG,
			template,
			replacers: [{ search: /123/g, replace: '' }],
		},
	],
	[
		{
			...DEFAULT_CONFIG,
			template,
			replacers: [{ search: '/123/gi', replace: '' }],
		},
		{
			...DEFAULT_CONFIG,
			template,
			replacers: [{ search: /123/gi, replace: '' }],
		},
	],
	[
		{
			...DEFAULT_CONFIG,
			template,
			replacers: [{ search: '/123/gi', replace: '123' }],
		},
		{
			...DEFAULT_CONFIG,
			template,
			replacers: [{ search: /123/gi, replace: '123' }],
		},
	],
	[
		{ ...DEFAULT_CONFIG, template, header: 'I am on top' },
		{ ...DEFAULT_CONFIG, template, header: 'I am on top' },
	],
	[
		{ ...DEFAULT_CONFIG, template, footer: 'I am on bottm' },
		{ ...DEFAULT_CONFIG, template, footer: 'I am on bottm' },
	],
	[
		{
			...DEFAULT_CONFIG,
			template,
			header: 'I am on top',
			footer: 'I am on bottm',
		},
		{
			...DEFAULT_CONFIG,
			template,
			header: 'I am on top',
			footer: 'I am on bottm',
		},
	],
	[
		{
			...DEFAULT_CONFIG,
			autolabeler: [
				{
					label: 'label',
					files: ['file1', 'file2'],
					branch: ['/branch/'],
					title: ['/title/'],
					body: ['/body/'],
				},
			],
		},
		{
			...DEFAULT_CONFIG,
			autolabeler: [
				{
					label: 'label',
					files: ['file1', 'file2'],
					branch: [/branch/g],
					title: [/title/g],
					body: [/body/g],
				},
			],
		},
	],
]

const invalidConfigs = [
	[{ ...DEFAULT_CONFIG, template: true }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, template: 1 }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, template: ['👶'] }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, template: { '👶': 'a' } }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, template: null }, 'Expected string'],
	[
		{ ...DEFAULT_CONFIG, template: '' },
		'String must contain at least 1 character',
	],
	[{ ...DEFAULT_CONFIG, header: true }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, header: 1 }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, header: ['👶'] }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, header: { '👶': 'a' } }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, header: null }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, footer: true }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, footer: 1 }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, footer: ['👶'] }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, footer: { '👶': 'a' } }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, footer: null }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, categoryTemplate: ['## $TITLE'] }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, categoryTemplate: null }, 'Expected string'],
	[
		{ ...DEFAULT_CONFIG, changeTemplate: ['* $TITLE (#$NUMBER) @$AUTHOR'] },
		'Expected string',
	],
	[{ ...DEFAULT_CONFIG, changeTemplate: null }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, changeTitleEscapes: ['<_*'] }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, changeTitleEscapes: null }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, replacers: [{ search: 123 }] }, 'Expected string'],
	[{ ...DEFAULT_CONFIG, replacers: [{ search: '123' }] }, 'Invalid input'],
	[{ ...DEFAULT_CONFIG, replacers: [{ replace: 123 }] }, 'Required'],
	[
		{ ...DEFAULT_CONFIG, replacers: [{ search: '123', replace: 123 }] },
		'Invalid input',
	],
	[{ ...DEFAULT_CONFIG, commitish: false }, 'Expected string'],
]

describe('schema', () => {
	describe('valid', () => {
		for (const [number, [example, expected]] of validConfigs.entries()) {
			test(`${number + 1} is valid`, () => {
				const value = schema().parse(example)
				expect(value).toMatchObject(expected)
				if (value.replacers) {
					for (const [index, arrayValue] of value.replacers.entries())
						expect(arrayValue.search).toEqual(expected.replacers[index].search)
				}
			})
		}
	})

	describe('invalid', () => {
		for (const [number, [example, message]] of invalidConfigs.entries()) {
			it(`${number + 1} is invalid`, () => {
				const { success, error }: { success: boolean; error?: ZodError } =
					schema().safeParse(example)
				expect(success).toBe(false)
				expect(error).toBeDefined()
				expect(error?.issues[0].message).toMatch(message as string)
			})
		}
	})

	describe('validateSchema', () => {
		it('Multiple other categories', () => {
			expect(() => {
				schema().parse({
					template,
					categories: [
						{
							title: '📝 Other Changes',
						},

						{
							title: '📝 Yet Other Changes',
						},
					],
				})
			}).toThrowErrorMatchingInlineSnapshot(`
			"[
			  {
			    \\"code\\": \\"custom\\",
			    \\"message\\": \\"Multiple categories detected with no labels.\\\\nOnly one category with no labels is supported for uncategorized pull requests.\\",
			    \\"path\\": [
			      \\"categories\\"
			    ]
			  }
			]"
		`)
		})

		it('Single other categories', () => {
			const expected = {
				...DEFAULT_CONFIG,
				template,
				categories: [
					{
						title: '📝 Other Changes',
					},
				] as never[],
			}
			expect(
				validateSchema({ branch: 'main' } as never, expected),
			).toMatchObject(expected)
		})
	})
})
