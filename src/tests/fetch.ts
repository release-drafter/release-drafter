export const requestUrl = (input: Parameters<typeof fetch>[0]): string =>
  input instanceof Request ? input.url : input.toString()

export const requestBody = (init: RequestInit | undefined): string => {
  if (typeof init?.body !== 'string') {
    throw new TypeError('Expected a string request body')
  }
  return init.body
}
