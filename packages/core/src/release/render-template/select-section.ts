const parseHeading = (line: string) => {
  const match = /^ {0,3}(#{1,6})(?:[ \t]+(.*)|[ \t]*)$/.exec(line)
  if (!match) return undefined
  return {
    depth: match[1].length,
    text: (match[2] ?? '').replace(/(?:^|[ \t]+)#+[ \t]*$/, '').trim(),
  }
}

/** Selects the first matching hash-style section, preserving its raw contents and line endings. */
export const selectSection = (
  input: string,
  selector: string,
): string | undefined => {
  const selected = parseHeading(selector)
  if (!selected || !selected.text)
    throw new Error(
      'Section selectors must be nonempty hash-style headings, such as ## Release information',
    )
  let start: number | undefined
  let fence: { character: string; length: number } | undefined
  let inComment = false

  for (const match of input.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) {
    const line = match[0].replace(/(?:\r\n|\r|\n)$/, '')
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (fence) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence.character &&
        fenceMatch[1].length >= fence.length &&
        /^[ \t]*$/.test(fenceMatch[2])
      )
        fence = undefined
      continue
    }
    if (
      !inComment &&
      fenceMatch &&
      (fenceMatch[1][0] === '~' || !fenceMatch[2].includes('`'))
    ) {
      fence = { character: fenceMatch[1][0], length: fenceMatch[1].length }
      continue
    }

    // Only standalone comment blocks hide headings. Inline markers cannot
    // open a block, including markers in code spans or trailing heading comments.
    if (inComment || /^ {0,3}<!--/.test(line)) {
      let offset = 0
      while (offset < line.length) {
        const marker = inComment ? '-->' : '<!--'
        const index = line.indexOf(marker, offset)
        if (index === -1) break
        inComment = !inComment
        offset = index + marker.length
      }
      continue
    }

    const heading = parseHeading(line)
    if (!heading) continue
    if (start !== undefined && heading.depth <= selected.depth)
      return input.slice(start, match.index)
    if (
      start === undefined &&
      heading.depth === selected.depth &&
      heading.text === selected.text
    )
      start = match.index + match[0].length
  }
  return start === undefined ? undefined : input.slice(start)
}
