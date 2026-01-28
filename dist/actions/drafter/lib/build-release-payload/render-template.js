const renderTemplate = (params) => {
  const { template, object, replacers } = params;
  let input = template.replace(/(\$[A-Z_]+)/g, (_, k) => {
    let result;
    const isValidKey = (key) => key in object && object[key] !== void 0 && object[key] !== null;
    if (!isValidKey(k)) {
      result = k;
    } else if (typeof object[k] === "object") {
      result = renderTemplate({
        template: object[k].template,
        object: object[k]
      });
    } else {
      result = `${object[k]}`;
    }
    return result;
  });
  if (replacers) {
    for (const { search, replace } of replacers) {
      input = input.replace(search, replace);
    }
  }
  return input;
};
export {
  renderTemplate
};
