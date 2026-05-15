import { describe, expect, it } from 'vitest'
import type * as z from 'zod'
import { ZodError } from 'zod'
import { configSchema } from '#src/actions/drafter/config/index.ts'

type SuiteParams =
  | {
      parseInput: z.input<typeof configSchema>
      parseOutput?: z.output<typeof configSchema>
      parseValid: true
    }
  | {
      parseInput: unknown
      errorContains: string | string[]
      parseValid: false
    }

const template = '$CHANGES'

const suites: SuiteParams[] = [
  { parseInput: { template }, parseValid: true },
  {
    parseInput: { template, replacers: [{ search: '123', replace: '' }] },
    parseValid: true,
  },
  {
    parseInput: { template, replacers: [{ search: '/123/gi', replace: '' }] },
    parseValid: true,
  },
  {
    parseInput: {
      template,
      replacers: [{ search: '/123/gi', replace: '123' }],
    },
    parseValid: true,
  },
  { parseInput: { template, header: 'I am on top' }, parseValid: true },
  { parseInput: { template, footer: 'I am on bottm' }, parseValid: true },
  {
    parseInput: { template, header: 'I am on top', footer: 'I am on bottm' },
    parseValid: true,
  },
  {
    parseInput: { template, 'pull-request-limit': 49 },
    parseValid: true,
  },
  {
    parseInput: { template, 'exclude-paths': ['docs/'] },
    parseValid: true,
  },
  { parseInput: { template, 'history-limit': 17 }, parseValid: true },
  {
    parseInput: { template: true },
    errorContains: 'Invalid input: expected string, received boolean',
    parseValid: false,
  },
  {
    parseInput: { template: 1 },
    errorContains: 'Invalid input: expected string, received number',
    parseValid: false,
  },
  {
    parseInput: { template: ['👶'] },
    errorContains: 'Invalid input: expected string, received array',
    parseValid: false,
  },
  {
    parseInput: { template: { '👶': 'a' } },
    errorContains: 'Invalid input: expected string, received object',
    parseValid: false,
  },
  {
    parseInput: { template: null },
    errorContains: 'Invalid input: expected string, received null',
    parseValid: false,
  },
  {
    parseInput: { template, header: true },
    errorContains: 'Invalid input: expected string, received boolean',
    parseValid: false,
  },
  {
    parseInput: { template, header: 1 },
    errorContains: 'Invalid input: expected string, received number',
    parseValid: false,
  },
  {
    parseInput: { template, header: ['👶'] },
    errorContains: 'Invalid input: expected string, received array',
    parseValid: false,
  },
  {
    parseInput: { template, header: { '👶': 'a' } },
    errorContains: 'Invalid input: expected string, received object',
    parseValid: false,
  },
  {
    parseInput: { template, header: null },
    errorContains: 'Invalid input: expected string, received null',
    parseValid: false,
  },
  {
    parseInput: { template, footer: true },
    errorContains: 'Invalid input: expected string, received boolean',
    parseValid: false,
  },
  {
    parseInput: { template, footer: 1 },
    errorContains: 'Invalid input: expected string, received number',
    parseValid: false,
  },
  {
    parseInput: { template, footer: ['👶'] },
    errorContains: 'Invalid input: expected string, received array',
    parseValid: false,
  },
  {
    parseInput: { template, footer: { '👶': 'a' } },
    errorContains: 'Invalid input: expected string, received object',
    parseValid: false,
  },
  {
    parseInput: { template, footer: null },
    errorContains: 'Invalid input: expected string, received null',
    parseValid: false,
  },
  {
    parseInput: { template, 'category-template': ['## $TITLE'] },
    errorContains: 'Invalid input: expected string, received array',
    parseValid: false,
  },
  {
    parseInput: { template, 'category-template': null },
    errorContains: 'Invalid input: expected string, received null',
    parseValid: false,
  },
  {
    parseInput: {
      template,
      'change-template': ['* $TITLE (#$NUMBER) @$AUTHOR'],
    },
    errorContains: 'Invalid input: expected string, received array',
    parseValid: false,
  },
  {
    parseInput: { template, 'change-template': null },
    errorContains: 'Invalid input: expected string, received null',
    parseValid: false,
  },
  {
    parseInput: { template, 'change-title-escapes': ['<_*'] },
    errorContains: 'Invalid input: expected string, received array',
    parseValid: false,
  },
  {
    parseInput: { template, 'change-title-escapes': null },
    errorContains: 'Invalid input: expected string, received null',
    parseValid: false,
  },
  {
    parseInput: { template, replacers: [{ search: 123 }] },
    errorContains: [
      'Invalid input: expected string, received number',
      'Invalid input: expected string, received undefined',
    ],
    parseValid: false,
  },
  {
    parseInput: { template, replacers: [{ search: '123' }] },
    errorContains: 'Invalid input: expected string, received undefined',
    parseValid: false,
  },
  {
    parseInput: { template, replacers: [{ replace: 123 }] },
    errorContains: 'Invalid input: expected string, received number',
    parseValid: false,
  },
  {
    parseInput: { template, replacers: [{ search: '123', replace: 123 }] },
    errorContains: 'Invalid input: expected string, received number',
    parseValid: false,
  },
  {
    parseInput: { template, commitish: false },
    errorContains: 'Invalid input: expected string, received boolean',
    parseValid: false,
  },
  {
    parseInput: { template, 'pull-request-limit': 'forty nine' },
    errorContains: 'Invalid input: expected number, received string',
    parseValid: false,
  },
  {
    parseInput: { template, 'history-limit': 'seventeen' },
    errorContains: 'Invalid input: expected number, received string',
    parseValid: false,
  },
  {
    parseInput: {
      template,
      categories: [
        {
          title: '📝 Other Changes',
        },
      ],
    },
    parseValid: true,
  },
]

describe('schema parsing', () => {
  it.each<SuiteParams>(suites)(`$parseInput`, (params) => {
    const { parseInput, parseValid } = params
    const output = configSchema.safeParse(parseInput)
    expect(output.success).toBe(parseValid)
    if (parseValid) {
      expect(output.data).toMatchObject(params.parseOutput || parseInput)
    } else {
      expect(output.error).toBeInstanceOf(ZodError)
      if (Array.isArray(params.errorContains)) {
        for (const error of params.errorContains) {
          expect(output.error?.message).toContain(error)
        }
      } else {
        expect(output.error?.message).toContain(params.errorContains)
      }
    }
  })
})
