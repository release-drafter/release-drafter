import * as core from '@actions/core'

type StringKeyOf<Value> = Extract<keyof Value, string>

/** Define every action input name exactly once and require complete coverage. */
export const defineActionInputNames =
  <Input>() =>
  <const Names extends readonly StringKeyOf<Input>[]>(
    names: Names,
    ..._missing: Exclude<StringKeyOf<Input>, Names[number]> extends never
      ? []
      : [never]
  ): Names =>
    names

type InputValues<Names extends readonly string[]> = Record<
  Names[number],
  string | undefined
>

/** Read the inputs declared by an action contract. */
export const readActionInputs = <const Names extends readonly string[]>(
  names: Names,
): InputValues<Names> =>
  Object.fromEntries(
    names.map((name) => [name, core.getInput(name) || undefined]),
  ) as InputValues<Names>

type OutputValues<Names extends readonly string[]> = Record<
  Names[number],
  unknown
>

/** Write every defined output through the names declared by the contract. */
export const writeActionOutputs = <const Names extends readonly string[]>(
  names: Names,
  values: OutputValues<Names>,
): void => {
  for (const name of names as readonly Names[number][]) {
    const value = values[name]
    if (value !== undefined) core.setOutput(name, value)
  }
}
