import { w as setOutput, x as getInput } from "./config.js";
//#region packages/gh-actions/src/common/action-contract.ts
/** Define every action input name exactly once and require complete coverage. */
var defineActionInputNames = () => (names, ..._missing) => names;
/** Read the inputs declared by an action contract. */
var readActionInputs = (names) => Object.fromEntries(names.map((name) => [name, getInput(name) || void 0]));
/** Write every defined output through the names declared by the contract. */
var writeActionOutputs = (names, values) => {
	for (const name of names) {
		const value = values[name];
		if (value !== void 0) setOutput(name, value);
	}
};
//#endregion
export { readActionInputs as n, writeActionOutputs as r, defineActionInputNames as t };
