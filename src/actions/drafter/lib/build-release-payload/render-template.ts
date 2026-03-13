import type { ParsedConfig } from '../../config'

export type Template = {
  [key: `$${Uppercase<string>}`]:
    | string
    | number
    | null
    | undefined
    | NestedTemplate
}
export type NestedTemplate = {
  template: string
  [key: `$${Uppercase<string>}`]:
    | string
    | number
    | null
    | undefined
    | NestedTemplate
}

/**
 * replaces all uppercase dollar templates with their string representation from object
 * if replacement is undefined in object the dollar template string is left untouched
 */
export const renderTemplate = (params: {
  template: string
  object: Template
  replacers?: ParsedConfig['replacers']
}) => {
  const { template, object, replacers } = params

  let input = template.replace(/(\$[A-Z_]+)/g, (_, k: string): string => {
    let result: string

    const isValidKey = (key: unknown): key is keyof typeof object =>
      (key as keyof typeof object) in object &&
      object[key as keyof typeof object] !== undefined &&
      object[key as keyof typeof object] !== null

    if (!isValidKey(k)) {
      result = k
    } else if (typeof object[k] === 'object') {
      const nested = object[k] as NestedTemplate
      result = renderTemplate({
        template: nested.template,
        object: nested,
      })
    } else {
      result = `${object[k]}`
    }
    return result
  })

  if (replacers) {
    for (const { search, replace } of replacers) {
      input = input.replace(search, replace)
    }
  }

  return input
}
