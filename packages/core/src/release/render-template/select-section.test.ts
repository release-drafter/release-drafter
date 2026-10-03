import { describe, expect, it } from 'vitest'
import { selectSection } from './select-section.ts'

describe('selectSection', () => {
  it.each(['\n', '\r\n', '\r'])(
    'preserves content and %j line endings',
    (newline) => {
      const body = [
        '# Intro',
        'Internal',
        '## Release information',
        '',
        'Public notes',
        '### Details',
        'Nested',
        '## Tests',
        'Private',
      ].join(newline)
      expect(selectSection(body, '## Release information')).toBe(
        ['', 'Public notes', '### Details', 'Nested', ''].join(newline),
      )
    },
  )

  it.each(['#', '##', '###', '####', '#####', '######'])(
    'selects %s headings by literal text and level',
    (hashes) => {
      const selector = `${hashes} Notes (API) [v2].*`
      expect(
        selectSection(`## Other\nPrivate\n${selector}\nPublic`, selector),
      ).toBe('Public')
      expect(
        selectSection(`${hashes} notes (API) [v2].*\nPrivate`, selector),
      ).toBeUndefined()
      expect(
        selectSection(`${hashes}# Notes (API) [v2].*\nPrivate`, selector),
      ).toBeUndefined()
    },
  )

  it('normalizes permitted indentation, heading whitespace and closing hashes', () => {
    expect(
      selectSection(
        '   ##\t Release information ###  \nPublic',
        '## Release information',
      ),
    ).toBe('Public')
    expect(
      selectSection(
        '## Release information\nPublic',
        '## Release information ###',
      ),
    ).toBe('Public')
    expect(selectSection('## C#\nPublic', '## C#')).toBe('Public')
  })

  it('selects only the first occurrence and stops at an equal or higher heading', () => {
    expect(selectSection('## Notes\nFirst\n## Notes\nSecond', '## Notes')).toBe(
      'First\n',
    )
    expect(selectSection('## Notes\nFirst\n# Other\nSecond', '## Notes')).toBe(
      'First\n',
    )
    expect(selectSection('## Notes\nFirst\n##\nSecond', '## Notes')).toBe(
      'First\n',
    )
    expect(selectSection('## Notes\nFirst\n# ###\nSecond', '## Notes')).toBe(
      'First\n',
    )
  })

  it.each(['## Notes', '## Notes\n', '## Notes\n## Other'])(
    'finds an empty section in %j',
    (body) => {
      expect(selectSection(body, '## Notes')).toBe('')
    },
  )

  it.each([
    '',
    '## Other\nPrivate',
    '## Notes extra\nPrivate',
    '##Notes\nPrivate',
    '> ## Notes\nPrivate',
    '    ## Notes\nPrivate',
    '\t## Notes\nPrivate',
    '\\## Notes\nPrivate',
    'Notes\n-----\nPrivate',
  ])('does not select absent or unsupported headings in %j', (body) => {
    expect(selectSection(body, '## Notes')).toBeUndefined()
  })

  it.each(['```', '~~~', '````', '~~~~'])(
    'ignores heading examples inside %s fences before and within the section',
    (fence) => {
      const example = `${fence}markdown\n## Notes\nExample\n${fence}\n`
      const content = `Real\n${fence}\n## Other\n<!--\n${fence}\nStill selected\n`
      expect(
        selectSection(
          `${example}## Notes\n${content}## Other\nPrivate`,
          '## Notes',
        ),
      ).toBe(content)
    },
  )

  it('requires a closing fence with matching character and sufficient length', () => {
    const content =
      '````\n## Other\n```\n## Other\n~~~~\n## Other\n```` suffix\n## Other\n`````\nPublic\n'
    expect(
      selectSection(`## Notes\n${content}## Other\nPrivate`, '## Notes'),
    ).toBe(content)
  })

  it('handles unclosed fences and invalid backtick info strings', () => {
    expect(selectSection('```\n## Notes\nPrivate', '## Notes')).toBeUndefined()
    expect(selectSection('```example`\n## Notes\nPublic', '## Notes')).toBe(
      'Public',
    )
  })

  it('ignores headings inside HTML comments and resumes after closing them', () => {
    const hidden =
      '<!--\n## Notes\nHidden\n-->\n<!-- closed --><!--\n## Notes\nHidden\n-->\n'
    const content = 'Public\n<!--\n## Other\nHidden boundary\n-->\nMore\n'
    expect(
      selectSection(
        `${hidden}## Notes\n${content}## Other\nPrivate`,
        '## Notes',
      ),
    ).toBe(content)
    expect(selectSection('<!--\n## Notes\nHidden', '## Notes')).toBeUndefined()
  })

  it('resets scanning state across calls', () => {
    expect(selectSection('<!--\n## Notes', '## Notes')).toBeUndefined()
    expect(selectSection('~~~\n## Notes', '## Notes')).toBeUndefined()
    expect(selectSection('## Notes\nPublic', '## Notes')).toBe('Public')
  })

  it('recognizes headings with trailing comments without leaking later sections', () => {
    expect(
      selectSection(
        '## Notes\nPublic\n## Checklist <!-- internal -->\nPrivate',
        '## Notes',
      ),
    ).toBe('Public\n')
    expect(
      selectSection(
        '## Notes <!-- internal -->\nPublic\n## Checklist\nPrivate',
        '## Notes <!-- internal -->',
      ),
    ).toBe('Public\n')
  })

  it.each(['`<!--`', '\\<!--', '``<!--``'])(
    'does not treat the literal marker %s as an unclosed comment',
    (marker) => {
      const content = `Document the ${marker} marker.\n`
      expect(
        selectSection(`## Notes\n${content}## Checklist\nPrivate`, '## Notes'),
      ).toBe(content)
    },
  )

  it('matches inline heading syntax literally', () => {
    expect(
      selectSection(
        '## **Release** information\nPublic',
        '## **Release** information',
      ),
    ).toBe('Public')
    expect(
      selectSection(
        '## **Release** information\nPublic',
        '## Release information',
      ),
    ).toBeUndefined()
  })
})
