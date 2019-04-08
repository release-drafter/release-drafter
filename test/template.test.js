const { template } = require('../lib/template')

describe('template', () => {
  it('replaces $A with B', () => {
    const output = template('$A', { $A: 'B' })

    expect(output).toEqual('B')
  })

  it('replaces $MAJOR.$MINOR.$PATCH with 1.0.0', () => {
    const output = template('$MAJOR.$MINOR.$PATCH', {
      $MAJOR: 1,
      $MINOR: 0,
      $PATCH: 0
    })

    expect(output).toEqual('1.0.0')
  })

  it('replaces $CHANGES but leaves $NEXT_PATCH_VERSION', () => {
    const input = `# v$NEXT_PATCH_VERSION
    ## CHANGES

    $CHANGES
    `
    const output = template(input, {
      $CHANGES: 'NO CHANGES'
    })

    expect(output).toEqual(expect.stringContaining('v$NEXT_PATCH_VERSION'))
    expect(output).toEqual(expect.stringContaining('NO CHANGES'))
  })

  it('nested template', () => {
    const output = template('$NEXT_MAJOR_VERSION', {
      $NEXT_MAJOR_VERSION: {
        $MAJOR: 1,
        $MINOR: 0,
        $PATCH: 0,
        $THIRD: {
          $NEST: 'THIRD LEVEL',
          template: '$NEST'
        },
        template: '$MAJOR.$MINOR.$PATCH.$THIRD'
      }
    })

    expect(output).toEqual('1.0.0.THIRD LEVEL')
  })
})
