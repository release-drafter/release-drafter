import process$1 from "node:process";
import path, { basename, dirname, isAbsolute, join, normalize } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import "node:stream";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region node_modules/universal-user-agent/index.js
function getUserAgent() {
	if (typeof navigator === "object" && "userAgent" in navigator) return navigator.userAgent;
	if (typeof process === "object" && process.version !== void 0) return `Node.js/${process.version.substr(1)} (${process.platform}; ${process.arch})`;
	return "<environment undetectable>";
}
//#endregion
//#region node_modules/before-after-hook/lib/register.js
function register(state, name, method, options) {
	if (typeof method !== "function") throw new Error("method for before hook must be a function");
	if (!options) options = {};
	if (Array.isArray(name)) return name.reverse().reduce((callback, name) => {
		return register.bind(null, state, name, callback, options);
	}, method)();
	return Promise.resolve().then(() => {
		if (!state.registry[name]) return method(options);
		return state.registry[name].reduce((method, registered) => {
			return registered.hook.bind(null, method, options);
		}, method)();
	});
}
//#endregion
//#region node_modules/before-after-hook/lib/add.js
function addHook(state, kind, name, hook) {
	const orig = hook;
	if (!state.registry[name]) state.registry[name] = [];
	if (kind === "before") hook = (method, options) => {
		return Promise.resolve().then(orig.bind(null, options)).then(method.bind(null, options));
	};
	if (kind === "after") hook = (method, options) => {
		let result;
		return Promise.resolve().then(method.bind(null, options)).then((result_) => {
			result = result_;
			return orig(result, options);
		}).then(() => {
			return result;
		});
	};
	if (kind === "error") hook = (method, options) => {
		return Promise.resolve().then(method.bind(null, options)).catch((error) => {
			return orig(error, options);
		});
	};
	state.registry[name].push({
		hook,
		orig
	});
}
//#endregion
//#region node_modules/before-after-hook/lib/remove.js
function removeHook(state, name, method) {
	if (!state.registry[name]) return;
	const index = state.registry[name].map((registered) => {
		return registered.orig;
	}).indexOf(method);
	if (index === -1) return;
	state.registry[name].splice(index, 1);
}
//#endregion
//#region node_modules/before-after-hook/index.js
var bind = Function.bind;
var bindable = bind.bind(bind);
function bindApi(hook, state, name) {
	const removeHookRef = bindable(removeHook, null).apply(null, name ? [state, name] : [state]);
	hook.api = { remove: removeHookRef };
	hook.remove = removeHookRef;
	[
		"before",
		"error",
		"after",
		"wrap"
	].forEach((kind) => {
		const args = name ? [
			state,
			kind,
			name
		] : [state, kind];
		hook[kind] = hook.api[kind] = bindable(addHook, null).apply(null, args);
	});
}
function Singular() {
	const singularHookName = Symbol("Singular");
	const singularHookState = { registry: {} };
	const singularHook = register.bind(null, singularHookState, singularHookName);
	bindApi(singularHook, singularHookState, singularHookName);
	return singularHook;
}
function Collection$1() {
	const state = { registry: {} };
	const hook = register.bind(null, state);
	bindApi(hook, state);
	return hook;
}
var before_after_hook_default = {
	Singular,
	Collection: Collection$1
};
//#endregion
//#region node_modules/@octokit/endpoint/dist-bundle/index.js
var DEFAULTS = {
	method: "GET",
	baseUrl: "https://api.github.com",
	headers: {
		accept: "application/vnd.github.v3+json",
		"user-agent": `octokit-endpoint.js/0.0.0-development ${getUserAgent()}`
	},
	mediaType: { format: "" }
};
function lowercaseKeys(object) {
	if (!object) return {};
	return Object.keys(object).reduce((newObj, key) => {
		newObj[key.toLowerCase()] = object[key];
		return newObj;
	}, {});
}
function isPlainObject$2(value) {
	if (typeof value !== "object" || value === null) return false;
	if (Object.prototype.toString.call(value) !== "[object Object]") return false;
	const proto = Object.getPrototypeOf(value);
	if (proto === null) return true;
	const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
	return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
function mergeDeep(defaults, options) {
	const result = Object.assign({}, defaults);
	Object.keys(options).forEach((key) => {
		if (isPlainObject$2(options[key])) if (!(key in defaults)) Object.assign(result, { [key]: options[key] });
		else result[key] = mergeDeep(defaults[key], options[key]);
		else Object.assign(result, { [key]: options[key] });
	});
	return result;
}
function removeUndefinedProperties(obj) {
	for (const key in obj) if (obj[key] === void 0) delete obj[key];
	return obj;
}
function merge$2(defaults, route, options) {
	if (typeof route === "string") {
		let [method, url] = route.split(" ");
		options = Object.assign(url ? {
			method,
			url
		} : { url: method }, options);
	} else options = Object.assign({}, route);
	options.headers = lowercaseKeys(options.headers);
	removeUndefinedProperties(options);
	removeUndefinedProperties(options.headers);
	const mergedOptions = mergeDeep(defaults || {}, options);
	if (options.url === "/graphql") {
		if (defaults && defaults.mediaType.previews?.length) mergedOptions.mediaType.previews = defaults.mediaType.previews.filter((preview) => !mergedOptions.mediaType.previews.includes(preview)).concat(mergedOptions.mediaType.previews);
		mergedOptions.mediaType.previews = (mergedOptions.mediaType.previews || []).map((preview) => preview.replace(/-preview/, ""));
	}
	return mergedOptions;
}
function addQueryParameters(url, parameters) {
	const separator = /\?/.test(url) ? "&" : "?";
	const names = Object.keys(parameters);
	if (names.length === 0) return url;
	return url + separator + names.map((name) => {
		if (name === "q") return "q=" + parameters.q.split("+").map(encodeURIComponent).join("+");
		return `${name}=${encodeURIComponent(parameters[name])}`;
	}).join("&");
}
var urlVariableRegex = /\{[^{}}]+\}/g;
function removeNonChars(variableName) {
	return variableName.replace(/(?:^\W+)|(?:(?<!\W)\W+$)/g, "").split(/,/);
}
function extractUrlVariableNames(url) {
	const matches = url.match(urlVariableRegex);
	if (!matches) return [];
	return matches.map(removeNonChars).reduce((a, b) => a.concat(b), []);
}
function omit$1(object, keysToOmit) {
	const result = { __proto__: null };
	for (const key of Object.keys(object)) if (keysToOmit.indexOf(key) === -1) result[key] = object[key];
	return result;
}
function encodeReserved(str) {
	return str.split(/(%[0-9A-Fa-f]{2})/g).map(function(part) {
		if (!/%[0-9A-Fa-f]/.test(part)) part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
		return part;
	}).join("");
}
function encodeUnreserved(str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
		return "%" + c.charCodeAt(0).toString(16).toUpperCase();
	});
}
function encodeValue(operator, value, key) {
	value = operator === "+" || operator === "#" ? encodeReserved(value) : encodeUnreserved(value);
	if (key) return encodeUnreserved(key) + "=" + value;
	else return value;
}
function isDefined(value) {
	return value !== void 0 && value !== null;
}
function isKeyOperator(operator) {
	return operator === ";" || operator === "&" || operator === "?";
}
function getValues(context, operator, key, modifier) {
	var value = context[key], result = [];
	if (isDefined(value) && value !== "") if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		value = value.toString();
		if (modifier && modifier !== "*") value = value.substring(0, parseInt(modifier, 10));
		result.push(encodeValue(operator, value, isKeyOperator(operator) ? key : ""));
	} else if (modifier === "*") if (Array.isArray(value)) value.filter(isDefined).forEach(function(value2) {
		result.push(encodeValue(operator, value2, isKeyOperator(operator) ? key : ""));
	});
	else Object.keys(value).forEach(function(k) {
		if (isDefined(value[k])) result.push(encodeValue(operator, value[k], k));
	});
	else {
		const tmp = [];
		if (Array.isArray(value)) value.filter(isDefined).forEach(function(value2) {
			tmp.push(encodeValue(operator, value2));
		});
		else Object.keys(value).forEach(function(k) {
			if (isDefined(value[k])) {
				tmp.push(encodeUnreserved(k));
				tmp.push(encodeValue(operator, value[k].toString()));
			}
		});
		if (isKeyOperator(operator)) result.push(encodeUnreserved(key) + "=" + tmp.join(","));
		else if (tmp.length !== 0) result.push(tmp.join(","));
	}
	else if (operator === ";") {
		if (isDefined(value)) result.push(encodeUnreserved(key));
	} else if (value === "" && (operator === "&" || operator === "?")) result.push(encodeUnreserved(key) + "=");
	else if (value === "") result.push("");
	return result;
}
function parseUrl(template) {
	return { expand: expand.bind(null, template) };
}
function expand(template, context) {
	var operators = [
		"+",
		"#",
		".",
		"/",
		";",
		"?",
		"&"
	];
	template = template.replace(/\{([^\{\}]+)\}|([^\{\}]+)/g, function(_, expression, literal) {
		if (expression) {
			let operator = "";
			const values = [];
			if (operators.indexOf(expression.charAt(0)) !== -1) {
				operator = expression.charAt(0);
				expression = expression.substr(1);
			}
			expression.split(/,/g).forEach(function(variable) {
				var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
				values.push(getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
			});
			if (operator && operator !== "+") {
				var separator = ",";
				if (operator === "?") separator = "&";
				else if (operator !== "#") separator = operator;
				return (values.length !== 0 ? operator : "") + values.join(separator);
			} else return values.join(",");
		} else return encodeReserved(literal);
	});
	if (template === "/") return template;
	else return template.replace(/\/$/, "");
}
function parse$3(options) {
	let method = options.method.toUpperCase();
	let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
	let headers = Object.assign({}, options.headers);
	let body;
	let parameters = omit$1(options, [
		"method",
		"baseUrl",
		"url",
		"headers",
		"request",
		"mediaType"
	]);
	const urlVariableNames = extractUrlVariableNames(url);
	url = parseUrl(url).expand(parameters);
	if (!/^http/.test(url)) url = options.baseUrl + url;
	const remainingParameters = omit$1(parameters, Object.keys(options).filter((option) => urlVariableNames.includes(option)).concat("baseUrl"));
	if (!/application\/octet-stream/i.test(headers.accept)) {
		if (options.mediaType.format) headers.accept = headers.accept.split(/,/).map((format) => format.replace(/application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/, `application/vnd$1$2.${options.mediaType.format}`)).join(",");
		if (url.endsWith("/graphql")) {
			if (options.mediaType.previews?.length) headers.accept = (headers.accept.match(/(?<![\w-])[\w-]+(?=-preview)/g) || []).concat(options.mediaType.previews).map((preview) => {
				return `application/vnd.github.${preview}-preview${options.mediaType.format ? `.${options.mediaType.format}` : "+json"}`;
			}).join(",");
		}
	}
	if (["GET", "HEAD"].includes(method)) url = addQueryParameters(url, remainingParameters);
	else if ("data" in remainingParameters) body = remainingParameters.data;
	else if (Object.keys(remainingParameters).length) body = remainingParameters;
	if (!headers["content-type"] && typeof body !== "undefined") headers["content-type"] = "application/json; charset=utf-8";
	if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") body = "";
	return Object.assign({
		method,
		url,
		headers
	}, typeof body !== "undefined" ? { body } : null, options.request ? { request: options.request } : null);
}
function endpointWithDefaults(defaults, route, options) {
	return parse$3(merge$2(defaults, route, options));
}
function withDefaults$2(oldDefaults, newDefaults) {
	const DEFAULTS2 = merge$2(oldDefaults, newDefaults);
	const endpoint2 = endpointWithDefaults.bind(null, DEFAULTS2);
	return Object.assign(endpoint2, {
		DEFAULTS: DEFAULTS2,
		defaults: withDefaults$2.bind(null, DEFAULTS2),
		merge: merge$2.bind(null, DEFAULTS2),
		parse: parse$3
	});
}
var endpoint = withDefaults$2(null, DEFAULTS);
//#endregion
//#region node_modules/@octokit/request-error/dist-src/index.js
var import_fast_content_type_parse = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var NullObject = function NullObject() {};
	NullObject.prototype = Object.create(null);
	/**
	* RegExp to match *( ";" parameter ) in RFC 7231 sec 3.1.1.1
	*
	* parameter     = token "=" ( token / quoted-string )
	* token         = 1*tchar
	* tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
	*               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
	*               / DIGIT / ALPHA
	*               ; any VCHAR, except delimiters
	* quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
	* qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
	* obs-text      = %x80-FF
	* quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
	*/
	var paramRE = /; *([!#$%&'*+.^\w`|~-]+)=("(?:[\v\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\v\u0020-\u00ff])*"|[!#$%&'*+.^\w`|~-]+) */gu;
	/**
	* RegExp to match quoted-pair in RFC 7230 sec 3.2.6
	*
	* quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
	* obs-text    = %x80-FF
	*/
	var quotedPairRE = /\\([\v\u0020-\u00ff])/gu;
	/**
	* RegExp to match type in RFC 7231 sec 3.1.1.1
	*
	* media-type = type "/" subtype
	* type       = token
	* subtype    = token
	*/
	var mediaTypeRE = /^[!#$%&'*+.^\w|~-]+\/[!#$%&'*+.^\w|~-]+$/u;
	var defaultContentType = {
		type: "",
		parameters: new NullObject()
	};
	Object.freeze(defaultContentType.parameters);
	Object.freeze(defaultContentType);
	/**
	* Parse media type to object.
	*
	* @param {string|object} header
	* @return {Object}
	* @public
	*/
	function parse(header) {
		if (typeof header !== "string") throw new TypeError("argument header is required and must be a string");
		let index = header.indexOf(";");
		const type = index !== -1 ? header.slice(0, index).trim() : header.trim();
		if (mediaTypeRE.test(type) === false) throw new TypeError("invalid media type");
		const result = {
			type: type.toLowerCase(),
			parameters: new NullObject()
		};
		if (index === -1) return result;
		let key;
		let match;
		let value;
		paramRE.lastIndex = index;
		while (match = paramRE.exec(header)) {
			if (match.index !== index) throw new TypeError("invalid parameter format");
			index += match[0].length;
			key = match[1].toLowerCase();
			value = match[2];
			if (value[0] === "\"") {
				value = value.slice(1, value.length - 1);
				quotedPairRE.test(value) && (value = value.replace(quotedPairRE, "$1"));
			}
			result.parameters[key] = value;
		}
		if (index !== header.length) throw new TypeError("invalid parameter format");
		return result;
	}
	function safeParse(header) {
		if (typeof header !== "string") return defaultContentType;
		let index = header.indexOf(";");
		const type = index !== -1 ? header.slice(0, index).trim() : header.trim();
		if (mediaTypeRE.test(type) === false) return defaultContentType;
		const result = {
			type: type.toLowerCase(),
			parameters: new NullObject()
		};
		if (index === -1) return result;
		let key;
		let match;
		let value;
		paramRE.lastIndex = index;
		while (match = paramRE.exec(header)) {
			if (match.index !== index) return defaultContentType;
			index += match[0].length;
			key = match[1].toLowerCase();
			value = match[2];
			if (value[0] === "\"") {
				value = value.slice(1, value.length - 1);
				quotedPairRE.test(value) && (value = value.replace(quotedPairRE, "$1"));
			}
			result.parameters[key] = value;
		}
		if (index !== header.length) return defaultContentType;
		return result;
	}
	module.exports.default = {
		parse,
		safeParse
	};
	module.exports.parse = parse;
	module.exports.safeParse = safeParse;
	module.exports.defaultContentType = defaultContentType;
})))();
var RequestError = class extends Error {
	name;
	/**
	* http status code
	*/
	status;
	/**
	* Request options that lead to the error.
	*/
	request;
	/**
	* Response object if a response was received
	*/
	response;
	constructor(message, statusCode, options) {
		super(message, { cause: options.cause });
		this.name = "HttpError";
		this.status = Number.parseInt(statusCode);
		if (Number.isNaN(this.status)) this.status = 0;
		/* v8 ignore else -- @preserve -- Bug with vitest coverage where it sees an else branch that doesn't exist */
		if ("response" in options) this.response = options.response;
		const requestCopy = Object.assign({}, options.request);
		if (options.request.headers.authorization) requestCopy.headers = Object.assign({}, options.request.headers, { authorization: options.request.headers.authorization.replace(/(?<! ) .*$/, " [REDACTED]") });
		requestCopy.url = requestCopy.url.replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]").replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
		this.request = requestCopy;
	}
};
//#endregion
//#region node_modules/@octokit/request/dist-bundle/index.js
var defaults_default = { headers: { "user-agent": `octokit-request.js/10.0.7 ${getUserAgent()}` } };
function isPlainObject$1(value) {
	if (typeof value !== "object" || value === null) return false;
	if (Object.prototype.toString.call(value) !== "[object Object]") return false;
	const proto = Object.getPrototypeOf(value);
	if (proto === null) return true;
	const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
	return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
var noop$2 = () => "";
async function fetchWrapper(requestOptions) {
	const fetch = requestOptions.request?.fetch || globalThis.fetch;
	if (!fetch) throw new Error("fetch is not set. Please pass a fetch implementation as new Octokit({ request: { fetch }}). Learn more at https://github.com/octokit/octokit.js/#fetch-missing");
	const log = requestOptions.request?.log || console;
	const parseSuccessResponseBody = requestOptions.request?.parseSuccessResponseBody !== false;
	const body = isPlainObject$1(requestOptions.body) || Array.isArray(requestOptions.body) ? JSON.stringify(requestOptions.body) : requestOptions.body;
	const requestHeaders = Object.fromEntries(Object.entries(requestOptions.headers).map(([name, value]) => [name, String(value)]));
	let fetchResponse;
	try {
		fetchResponse = await fetch(requestOptions.url, {
			method: requestOptions.method,
			body,
			redirect: requestOptions.request?.redirect,
			headers: requestHeaders,
			signal: requestOptions.request?.signal,
			...requestOptions.body && { duplex: "half" }
		});
	} catch (error) {
		let message = "Unknown Error";
		if (error instanceof Error) {
			if (error.name === "AbortError") {
				error.status = 500;
				throw error;
			}
			message = error.message;
			if (error.name === "TypeError" && "cause" in error) {
				if (error.cause instanceof Error) message = error.cause.message;
				else if (typeof error.cause === "string") message = error.cause;
			}
		}
		const requestError = new RequestError(message, 500, { request: requestOptions });
		requestError.cause = error;
		throw requestError;
	}
	const status = fetchResponse.status;
	const url = fetchResponse.url;
	const responseHeaders = {};
	for (const [key, value] of fetchResponse.headers) responseHeaders[key] = value;
	const octokitResponse = {
		url,
		status,
		headers: responseHeaders,
		data: ""
	};
	if ("deprecation" in responseHeaders) {
		const matches = responseHeaders.link && responseHeaders.link.match(/<([^<>]+)>; rel="deprecation"/);
		const deprecationLink = matches && matches.pop();
		log.warn(`[@octokit/request] "${requestOptions.method} ${requestOptions.url}" is deprecated. It is scheduled to be removed on ${responseHeaders.sunset}${deprecationLink ? `. See ${deprecationLink}` : ""}`);
	}
	if (status === 204 || status === 205) return octokitResponse;
	if (requestOptions.method === "HEAD") {
		if (status < 400) return octokitResponse;
		throw new RequestError(fetchResponse.statusText, status, {
			response: octokitResponse,
			request: requestOptions
		});
	}
	if (status === 304) {
		octokitResponse.data = await getResponseData(fetchResponse);
		throw new RequestError("Not modified", status, {
			response: octokitResponse,
			request: requestOptions
		});
	}
	if (status >= 400) {
		octokitResponse.data = await getResponseData(fetchResponse);
		throw new RequestError(toErrorMessage(octokitResponse.data), status, {
			response: octokitResponse,
			request: requestOptions
		});
	}
	octokitResponse.data = parseSuccessResponseBody ? await getResponseData(fetchResponse) : fetchResponse.body;
	return octokitResponse;
}
async function getResponseData(response) {
	const contentType = response.headers.get("content-type");
	if (!contentType) return response.text().catch(noop$2);
	const mimetype = (0, import_fast_content_type_parse.safeParse)(contentType);
	if (isJSONResponse(mimetype)) {
		let text = "";
		try {
			text = await response.text();
			return JSON.parse(text);
		} catch (err) {
			return text;
		}
	} else if (mimetype.type.startsWith("text/") || mimetype.parameters.charset?.toLowerCase() === "utf-8") return response.text().catch(noop$2);
	else return response.arrayBuffer().catch(
		/* v8 ignore next -- @preserve */
		() => /* @__PURE__ */ new ArrayBuffer(0)
	);
}
function isJSONResponse(mimetype) {
	return mimetype.type === "application/json" || mimetype.type === "application/scim+json";
}
function toErrorMessage(data) {
	if (typeof data === "string") return data;
	if (data instanceof ArrayBuffer) return "Unknown error";
	if ("message" in data) {
		const suffix = "documentation_url" in data ? ` - ${data.documentation_url}` : "";
		return Array.isArray(data.errors) ? `${data.message}: ${data.errors.map((v) => JSON.stringify(v)).join(", ")}${suffix}` : `${data.message}${suffix}`;
	}
	return `Unknown error: ${JSON.stringify(data)}`;
}
function withDefaults$1(oldEndpoint, newDefaults) {
	const endpoint2 = oldEndpoint.defaults(newDefaults);
	const newApi = function(route, parameters) {
		const endpointOptions = endpoint2.merge(route, parameters);
		if (!endpointOptions.request || !endpointOptions.request.hook) return fetchWrapper(endpoint2.parse(endpointOptions));
		const request2 = (route2, parameters2) => {
			return fetchWrapper(endpoint2.parse(endpoint2.merge(route2, parameters2)));
		};
		Object.assign(request2, {
			endpoint: endpoint2,
			defaults: withDefaults$1.bind(null, endpoint2)
		});
		return endpointOptions.request.hook(request2, endpointOptions);
	};
	return Object.assign(newApi, {
		endpoint: endpoint2,
		defaults: withDefaults$1.bind(null, endpoint2)
	});
}
var request = withDefaults$1(endpoint, defaults_default);
/* v8 ignore next -- @preserve */
/* v8 ignore else -- @preserve */
//#endregion
//#region node_modules/@octokit/graphql/dist-bundle/index.js
var VERSION$4 = "0.0.0-development";
function _buildMessageForResponseErrors(data) {
	return `Request failed due to following response errors:
` + data.errors.map((e) => ` - ${e.message}`).join("\n");
}
var GraphqlResponseError = class extends Error {
	constructor(request2, headers, response) {
		super(_buildMessageForResponseErrors(response));
		this.request = request2;
		this.headers = headers;
		this.response = response;
		this.errors = response.errors;
		this.data = response.data;
		if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
	}
	name = "GraphqlResponseError";
	errors;
	data;
};
var NON_VARIABLE_OPTIONS = [
	"method",
	"baseUrl",
	"url",
	"headers",
	"request",
	"query",
	"mediaType",
	"operationName"
];
var FORBIDDEN_VARIABLE_OPTIONS = [
	"query",
	"method",
	"url"
];
var GHES_V3_SUFFIX_REGEX = /\/api\/v3\/?$/;
function graphql(request2, query, options) {
	if (options) {
		if (typeof query === "string" && "query" in options) return Promise.reject(/* @__PURE__ */ new Error(`[@octokit/graphql] "query" cannot be used as variable name`));
		for (const key in options) {
			if (!FORBIDDEN_VARIABLE_OPTIONS.includes(key)) continue;
			return Promise.reject(/* @__PURE__ */ new Error(`[@octokit/graphql] "${key}" cannot be used as variable name`));
		}
	}
	const parsedOptions = typeof query === "string" ? Object.assign({ query }, options) : query;
	const requestOptions = Object.keys(parsedOptions).reduce((result, key) => {
		if (NON_VARIABLE_OPTIONS.includes(key)) {
			result[key] = parsedOptions[key];
			return result;
		}
		if (!result.variables) result.variables = {};
		result.variables[key] = parsedOptions[key];
		return result;
	}, {});
	const baseUrl = parsedOptions.baseUrl || request2.endpoint.DEFAULTS.baseUrl;
	if (GHES_V3_SUFFIX_REGEX.test(baseUrl)) requestOptions.url = baseUrl.replace(GHES_V3_SUFFIX_REGEX, "/api/graphql");
	return request2(requestOptions).then((response) => {
		if (response.data.errors) {
			const headers = {};
			for (const key of Object.keys(response.headers)) headers[key] = response.headers[key];
			throw new GraphqlResponseError(requestOptions, headers, response.data);
		}
		return response.data.data;
	});
}
function withDefaults(request2, newDefaults) {
	const newRequest = request2.defaults(newDefaults);
	const newApi = (query, options) => {
		return graphql(newRequest, query, options);
	};
	return Object.assign(newApi, {
		defaults: withDefaults.bind(null, newRequest),
		endpoint: newRequest.endpoint
	});
}
withDefaults(request, {
	headers: { "user-agent": `octokit-graphql.js/${VERSION$4} ${getUserAgent()}` },
	method: "POST",
	url: "/graphql"
});
function withCustomRequest(customRequest) {
	return withDefaults(customRequest, {
		method: "POST",
		url: "/graphql"
	});
}
//#endregion
//#region node_modules/@octokit/auth-token/dist-bundle/index.js
var b64url = "(?:[a-zA-Z0-9_-]+)";
var sep = "\\.";
var jwtRE = new RegExp(`^${b64url}${sep}${b64url}${sep}${b64url}$`);
var isJWT = jwtRE.test.bind(jwtRE);
async function auth(token) {
	const isApp = isJWT(token);
	const isInstallation = token.startsWith("v1.") || token.startsWith("ghs_");
	const isUserToServer = token.startsWith("ghu_");
	return {
		type: "token",
		token,
		tokenType: isApp ? "app" : isInstallation ? "installation" : isUserToServer ? "user-to-server" : "oauth"
	};
}
function withAuthorizationPrefix(token) {
	if (token.split(/\./).length === 3) return `bearer ${token}`;
	return `token ${token}`;
}
async function hook(token, request, route, parameters) {
	const endpoint = request.endpoint.merge(route, parameters);
	endpoint.headers.authorization = withAuthorizationPrefix(token);
	return request(endpoint);
}
var createTokenAuth = function createTokenAuth2(token) {
	if (!token) throw new Error("[@octokit/auth-token] No token passed to createTokenAuth");
	if (typeof token !== "string") throw new Error("[@octokit/auth-token] Token passed to createTokenAuth is not a string");
	token = token.replace(/^(token|bearer) +/i, "");
	return Object.assign(auth.bind(null, token), { hook: hook.bind(null, token) });
};
//#endregion
//#region node_modules/@octokit/core/dist-src/version.js
var VERSION$3 = "7.0.6";
//#endregion
//#region node_modules/@octokit/core/dist-src/index.js
var noop$1 = () => {};
var consoleWarn = console.warn.bind(console);
var consoleError = console.error.bind(console);
function createLogger(logger = {}) {
	if (typeof logger.debug !== "function") logger.debug = noop$1;
	if (typeof logger.info !== "function") logger.info = noop$1;
	if (typeof logger.warn !== "function") logger.warn = consoleWarn;
	if (typeof logger.error !== "function") logger.error = consoleError;
	return logger;
}
var userAgentTrail = `octokit-core.js/${VERSION$3} ${getUserAgent()}`;
var Octokit = class {
	static VERSION = VERSION$3;
	static defaults(defaults) {
		const OctokitWithDefaults = class extends this {
			constructor(...args) {
				const options = args[0] || {};
				if (typeof defaults === "function") {
					super(defaults(options));
					return;
				}
				super(Object.assign({}, defaults, options, options.userAgent && defaults.userAgent ? { userAgent: `${options.userAgent} ${defaults.userAgent}` } : null));
			}
		};
		return OctokitWithDefaults;
	}
	static plugins = [];
	/**
	* Attach a plugin (or many) to your Octokit instance.
	*
	* @example
	* const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
	*/
	static plugin(...newPlugins) {
		const currentPlugins = this.plugins;
		const NewOctokit = class extends this {
			static plugins = currentPlugins.concat(newPlugins.filter((plugin) => !currentPlugins.includes(plugin)));
		};
		return NewOctokit;
	}
	constructor(options = {}) {
		const hook = new before_after_hook_default.Collection();
		const requestDefaults = {
			baseUrl: request.endpoint.DEFAULTS.baseUrl,
			headers: {},
			request: Object.assign({}, options.request, { hook: hook.bind(null, "request") }),
			mediaType: {
				previews: [],
				format: ""
			}
		};
		requestDefaults.headers["user-agent"] = options.userAgent ? `${options.userAgent} ${userAgentTrail}` : userAgentTrail;
		if (options.baseUrl) requestDefaults.baseUrl = options.baseUrl;
		if (options.previews) requestDefaults.mediaType.previews = options.previews;
		if (options.timeZone) requestDefaults.headers["time-zone"] = options.timeZone;
		this.request = request.defaults(requestDefaults);
		this.graphql = withCustomRequest(this.request).defaults(requestDefaults);
		this.log = createLogger(options.log);
		this.hook = hook;
		if (!options.authStrategy) if (!options.auth) this.auth = async () => ({ type: "unauthenticated" });
		else {
			const auth = createTokenAuth(options.auth);
			hook.wrap("request", auth.hook);
			this.auth = auth;
		}
		else {
			const { authStrategy, ...otherOptions } = options;
			const auth = authStrategy(Object.assign({
				request: this.request,
				log: this.log,
				octokit: this,
				octokitOptions: otherOptions
			}, options.auth));
			hook.wrap("request", auth.hook);
			this.auth = auth;
		}
		const classConstructor = this.constructor;
		for (let i = 0; i < classConstructor.plugins.length; ++i) Object.assign(this, classConstructor.plugins[i](this, options));
	}
	request;
	graphql;
	log;
	hook;
	auth;
};
//#endregion
//#region node_modules/@octokit/plugin-paginate-graphql/dist-bundle/index.js
var generateMessage = (path, cursorValue) => `The cursor at "${path.join(",")}" did not change its value "${cursorValue}" after a page transition. Please make sure your that your query is set up correctly.`;
var MissingCursorChange = class extends Error {
	constructor(pageInfo, cursorValue) {
		super(generateMessage(pageInfo.pathInQuery, cursorValue));
		this.pageInfo = pageInfo;
		this.cursorValue = cursorValue;
		if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
	}
	name = "MissingCursorChangeError";
};
var MissingPageInfo = class extends Error {
	constructor(response) {
		super(`No pageInfo property found in response. Please make sure to specify the pageInfo in your query. Response-Data: ${JSON.stringify(response, null, 2)}`);
		this.response = response;
		if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
	}
	name = "MissingPageInfo";
};
var isObject$1 = (value) => Object.prototype.toString.call(value) === "[object Object]";
function findPaginatedResourcePath(responseData) {
	const paginatedResourcePath = deepFindPathToProperty(responseData, "pageInfo");
	if (paginatedResourcePath.length === 0) throw new MissingPageInfo(responseData);
	return paginatedResourcePath;
}
var deepFindPathToProperty = (object, searchProp, path = []) => {
	for (const key of Object.keys(object)) {
		const currentPath = [...path, key];
		const currentValue = object[key];
		if (isObject$1(currentValue)) {
			if (currentValue.hasOwnProperty(searchProp)) return currentPath;
			const result = deepFindPathToProperty(currentValue, searchProp, currentPath);
			if (result.length > 0) return result;
		}
	}
	return [];
};
var get = (object, path) => {
	return path.reduce((current, nextProperty) => current[nextProperty], object);
};
var set$1 = (object, path, mutator) => {
	const lastProperty = path[path.length - 1];
	const parent = get(object, [...path].slice(0, -1));
	if (typeof mutator === "function") parent[lastProperty] = mutator(parent[lastProperty]);
	else parent[lastProperty] = mutator;
};
var extractPageInfos = (responseData) => {
	const pageInfoPath = findPaginatedResourcePath(responseData);
	return {
		pathInQuery: pageInfoPath,
		pageInfo: get(responseData, [...pageInfoPath, "pageInfo"])
	};
};
var isForwardSearch = (givenPageInfo) => {
	return givenPageInfo.hasOwnProperty("hasNextPage");
};
var getCursorFrom = (pageInfo) => isForwardSearch(pageInfo) ? pageInfo.endCursor : pageInfo.startCursor;
var hasAnotherPage = (pageInfo) => isForwardSearch(pageInfo) ? pageInfo.hasNextPage : pageInfo.hasPreviousPage;
var createIterator = (octokit) => {
	return (query, initialParameters = {}) => {
		let nextPageExists = true;
		let parameters = { ...initialParameters };
		return { [Symbol.asyncIterator]: () => ({ async next() {
			if (!nextPageExists) return {
				done: true,
				value: {}
			};
			const response = await octokit.graphql(query, parameters);
			const pageInfoContext = extractPageInfos(response);
			const nextCursorValue = getCursorFrom(pageInfoContext.pageInfo);
			nextPageExists = hasAnotherPage(pageInfoContext.pageInfo);
			if (nextPageExists && nextCursorValue === parameters.cursor) throw new MissingCursorChange(pageInfoContext, nextCursorValue);
			parameters = {
				...parameters,
				cursor: nextCursorValue
			};
			return {
				done: false,
				value: response
			};
		} }) };
	};
};
var mergeResponses = (response1, response2) => {
	if (Object.keys(response1).length === 0) return Object.assign(response1, response2);
	const path = findPaginatedResourcePath(response1);
	const nodesPath = [...path, "nodes"];
	const newNodes = get(response2, nodesPath);
	if (newNodes) set$1(response1, nodesPath, (values) => {
		return [...values, ...newNodes];
	});
	const edgesPath = [...path, "edges"];
	const newEdges = get(response2, edgesPath);
	if (newEdges) set$1(response1, edgesPath, (values) => {
		return [...values, ...newEdges];
	});
	const pageInfoPath = [...path, "pageInfo"];
	set$1(response1, pageInfoPath, get(response2, pageInfoPath));
	return response1;
};
var createPaginate = (octokit) => {
	const iterator = createIterator(octokit);
	return async (query, initialParameters = {}) => {
		let mergedResponse = {};
		for await (const response of iterator(query, initialParameters)) mergedResponse = mergeResponses(mergedResponse, response);
		return mergedResponse;
	};
};
function paginateGraphQL(octokit) {
	return { graphql: Object.assign(octokit.graphql, { paginate: Object.assign(createPaginate(octokit), { iterator: createIterator(octokit) }) }) };
}
//#endregion
//#region node_modules/@octokit/plugin-paginate-rest/dist-bundle/index.js
var VERSION$2 = "0.0.0-development";
function normalizePaginatedListResponse(response) {
	if (!response.data) return {
		...response,
		data: []
	};
	if (!(("total_count" in response.data || "total_commits" in response.data) && !("url" in response.data))) return response;
	const incompleteResults = response.data.incomplete_results;
	const repositorySelection = response.data.repository_selection;
	const totalCount = response.data.total_count;
	const totalCommits = response.data.total_commits;
	delete response.data.incomplete_results;
	delete response.data.repository_selection;
	delete response.data.total_count;
	delete response.data.total_commits;
	const namespaceKey = Object.keys(response.data)[0];
	response.data = response.data[namespaceKey];
	if (typeof incompleteResults !== "undefined") response.data.incomplete_results = incompleteResults;
	if (typeof repositorySelection !== "undefined") response.data.repository_selection = repositorySelection;
	response.data.total_count = totalCount;
	response.data.total_commits = totalCommits;
	return response;
}
function iterator(octokit, route, parameters) {
	const options = typeof route === "function" ? route.endpoint(parameters) : octokit.request.endpoint(route, parameters);
	const requestMethod = typeof route === "function" ? route : octokit.request;
	const method = options.method;
	const headers = options.headers;
	let url = options.url;
	return { [Symbol.asyncIterator]: () => ({ async next() {
		if (!url) return { done: true };
		try {
			const normalizedResponse = normalizePaginatedListResponse(await requestMethod({
				method,
				url,
				headers
			}));
			url = ((normalizedResponse.headers.link || "").match(/<([^<>]+)>;\s*rel="next"/) || [])[1];
			if (!url && "total_commits" in normalizedResponse.data) {
				const parsedUrl = new URL(normalizedResponse.url);
				const params = parsedUrl.searchParams;
				const page = parseInt(params.get("page") || "1", 10);
				if (page * parseInt(params.get("per_page") || "250", 10) < normalizedResponse.data.total_commits) {
					params.set("page", String(page + 1));
					url = parsedUrl.toString();
				}
			}
			return { value: normalizedResponse };
		} catch (error) {
			if (error.status !== 409) throw error;
			url = "";
			return { value: {
				status: 200,
				headers: {},
				data: []
			} };
		}
	} }) };
}
function paginate(octokit, route, parameters, mapFn) {
	if (typeof parameters === "function") {
		mapFn = parameters;
		parameters = void 0;
	}
	return gather(octokit, [], iterator(octokit, route, parameters)[Symbol.asyncIterator](), mapFn);
}
function gather(octokit, results, iterator2, mapFn) {
	return iterator2.next().then((result) => {
		if (result.done) return results;
		let earlyExit = false;
		function done() {
			earlyExit = true;
		}
		results = results.concat(mapFn ? mapFn(result.value, done) : result.value.data);
		if (earlyExit) return results;
		return gather(octokit, results, iterator2, mapFn);
	});
}
Object.assign(paginate, { iterator });
function paginateRest(octokit) {
	return { paginate: Object.assign(paginate.bind(null, octokit), { iterator: iterator.bind(null, octokit) }) };
}
paginateRest.VERSION = VERSION$2;
//#endregion
//#region node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/version.js
var VERSION$1 = "17.0.0";
//#endregion
//#region node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/generated/endpoints.js
var endpoints_default = {
	actions: {
		addCustomLabelsToSelfHostedRunnerForOrg: ["POST /orgs/{org}/actions/runners/{runner_id}/labels"],
		addCustomLabelsToSelfHostedRunnerForRepo: ["POST /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"],
		addRepoAccessToSelfHostedRunnerGroupInOrg: ["PUT /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}"],
		addSelectedRepoToOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"],
		addSelectedRepoToOrgVariable: ["PUT /orgs/{org}/actions/variables/{name}/repositories/{repository_id}"],
		approveWorkflowRun: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve"],
		cancelWorkflowRun: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel"],
		createEnvironmentVariable: ["POST /repos/{owner}/{repo}/environments/{environment_name}/variables"],
		createHostedRunnerForOrg: ["POST /orgs/{org}/actions/hosted-runners"],
		createOrUpdateEnvironmentSecret: ["PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"],
		createOrUpdateOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}"],
		createOrUpdateRepoSecret: ["PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
		createOrgVariable: ["POST /orgs/{org}/actions/variables"],
		createRegistrationTokenForOrg: ["POST /orgs/{org}/actions/runners/registration-token"],
		createRegistrationTokenForRepo: ["POST /repos/{owner}/{repo}/actions/runners/registration-token"],
		createRemoveTokenForOrg: ["POST /orgs/{org}/actions/runners/remove-token"],
		createRemoveTokenForRepo: ["POST /repos/{owner}/{repo}/actions/runners/remove-token"],
		createRepoVariable: ["POST /repos/{owner}/{repo}/actions/variables"],
		createWorkflowDispatch: ["POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches"],
		deleteActionsCacheById: ["DELETE /repos/{owner}/{repo}/actions/caches/{cache_id}"],
		deleteActionsCacheByKey: ["DELETE /repos/{owner}/{repo}/actions/caches{?key,ref}"],
		deleteArtifact: ["DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
		deleteCustomImageFromOrg: ["DELETE /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}"],
		deleteCustomImageVersionFromOrg: ["DELETE /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions/{version}"],
		deleteEnvironmentSecret: ["DELETE /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"],
		deleteEnvironmentVariable: ["DELETE /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"],
		deleteHostedRunnerForOrg: ["DELETE /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"],
		deleteOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}"],
		deleteOrgVariable: ["DELETE /orgs/{org}/actions/variables/{name}"],
		deleteRepoSecret: ["DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
		deleteRepoVariable: ["DELETE /repos/{owner}/{repo}/actions/variables/{name}"],
		deleteSelfHostedRunnerFromOrg: ["DELETE /orgs/{org}/actions/runners/{runner_id}"],
		deleteSelfHostedRunnerFromRepo: ["DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}"],
		deleteWorkflowRun: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}"],
		deleteWorkflowRunLogs: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}/logs"],
		disableSelectedRepositoryGithubActionsOrganization: ["DELETE /orgs/{org}/actions/permissions/repositories/{repository_id}"],
		disableWorkflow: ["PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable"],
		downloadArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}"],
		downloadJobLogsForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs"],
		downloadWorkflowRunAttemptLogs: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs"],
		downloadWorkflowRunLogs: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs"],
		enableSelectedRepositoryGithubActionsOrganization: ["PUT /orgs/{org}/actions/permissions/repositories/{repository_id}"],
		enableWorkflow: ["PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable"],
		forceCancelWorkflowRun: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel"],
		generateRunnerJitconfigForOrg: ["POST /orgs/{org}/actions/runners/generate-jitconfig"],
		generateRunnerJitconfigForRepo: ["POST /repos/{owner}/{repo}/actions/runners/generate-jitconfig"],
		getActionsCacheList: ["GET /repos/{owner}/{repo}/actions/caches"],
		getActionsCacheUsage: ["GET /repos/{owner}/{repo}/actions/cache/usage"],
		getActionsCacheUsageByRepoForOrg: ["GET /orgs/{org}/actions/cache/usage-by-repository"],
		getActionsCacheUsageForOrg: ["GET /orgs/{org}/actions/cache/usage"],
		getAllowedActionsOrganization: ["GET /orgs/{org}/actions/permissions/selected-actions"],
		getAllowedActionsRepository: ["GET /repos/{owner}/{repo}/actions/permissions/selected-actions"],
		getArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
		getCustomImageForOrg: ["GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}"],
		getCustomImageVersionForOrg: ["GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions/{version}"],
		getCustomOidcSubClaimForRepo: ["GET /repos/{owner}/{repo}/actions/oidc/customization/sub"],
		getEnvironmentPublicKey: ["GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key"],
		getEnvironmentSecret: ["GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"],
		getEnvironmentVariable: ["GET /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"],
		getGithubActionsDefaultWorkflowPermissionsOrganization: ["GET /orgs/{org}/actions/permissions/workflow"],
		getGithubActionsDefaultWorkflowPermissionsRepository: ["GET /repos/{owner}/{repo}/actions/permissions/workflow"],
		getGithubActionsPermissionsOrganization: ["GET /orgs/{org}/actions/permissions"],
		getGithubActionsPermissionsRepository: ["GET /repos/{owner}/{repo}/actions/permissions"],
		getHostedRunnerForOrg: ["GET /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"],
		getHostedRunnersGithubOwnedImagesForOrg: ["GET /orgs/{org}/actions/hosted-runners/images/github-owned"],
		getHostedRunnersLimitsForOrg: ["GET /orgs/{org}/actions/hosted-runners/limits"],
		getHostedRunnersMachineSpecsForOrg: ["GET /orgs/{org}/actions/hosted-runners/machine-sizes"],
		getHostedRunnersPartnerImagesForOrg: ["GET /orgs/{org}/actions/hosted-runners/images/partner"],
		getHostedRunnersPlatformsForOrg: ["GET /orgs/{org}/actions/hosted-runners/platforms"],
		getJobForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}"],
		getOrgPublicKey: ["GET /orgs/{org}/actions/secrets/public-key"],
		getOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}"],
		getOrgVariable: ["GET /orgs/{org}/actions/variables/{name}"],
		getPendingDeploymentsForRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"],
		getRepoPermissions: [
			"GET /repos/{owner}/{repo}/actions/permissions",
			{},
			{ renamed: ["actions", "getGithubActionsPermissionsRepository"] }
		],
		getRepoPublicKey: ["GET /repos/{owner}/{repo}/actions/secrets/public-key"],
		getRepoSecret: ["GET /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
		getRepoVariable: ["GET /repos/{owner}/{repo}/actions/variables/{name}"],
		getReviewsForRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals"],
		getSelfHostedRunnerForOrg: ["GET /orgs/{org}/actions/runners/{runner_id}"],
		getSelfHostedRunnerForRepo: ["GET /repos/{owner}/{repo}/actions/runners/{runner_id}"],
		getWorkflow: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}"],
		getWorkflowAccessToRepository: ["GET /repos/{owner}/{repo}/actions/permissions/access"],
		getWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}"],
		getWorkflowRunAttempt: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}"],
		getWorkflowRunUsage: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing"],
		getWorkflowUsage: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing"],
		listArtifactsForRepo: ["GET /repos/{owner}/{repo}/actions/artifacts"],
		listCustomImageVersionsForOrg: ["GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions"],
		listCustomImagesForOrg: ["GET /orgs/{org}/actions/hosted-runners/images/custom"],
		listEnvironmentSecrets: ["GET /repos/{owner}/{repo}/environments/{environment_name}/secrets"],
		listEnvironmentVariables: ["GET /repos/{owner}/{repo}/environments/{environment_name}/variables"],
		listGithubHostedRunnersInGroupForOrg: ["GET /orgs/{org}/actions/runner-groups/{runner_group_id}/hosted-runners"],
		listHostedRunnersForOrg: ["GET /orgs/{org}/actions/hosted-runners"],
		listJobsForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs"],
		listJobsForWorkflowRunAttempt: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs"],
		listLabelsForSelfHostedRunnerForOrg: ["GET /orgs/{org}/actions/runners/{runner_id}/labels"],
		listLabelsForSelfHostedRunnerForRepo: ["GET /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"],
		listOrgSecrets: ["GET /orgs/{org}/actions/secrets"],
		listOrgVariables: ["GET /orgs/{org}/actions/variables"],
		listRepoOrganizationSecrets: ["GET /repos/{owner}/{repo}/actions/organization-secrets"],
		listRepoOrganizationVariables: ["GET /repos/{owner}/{repo}/actions/organization-variables"],
		listRepoSecrets: ["GET /repos/{owner}/{repo}/actions/secrets"],
		listRepoVariables: ["GET /repos/{owner}/{repo}/actions/variables"],
		listRepoWorkflows: ["GET /repos/{owner}/{repo}/actions/workflows"],
		listRunnerApplicationsForOrg: ["GET /orgs/{org}/actions/runners/downloads"],
		listRunnerApplicationsForRepo: ["GET /repos/{owner}/{repo}/actions/runners/downloads"],
		listSelectedReposForOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}/repositories"],
		listSelectedReposForOrgVariable: ["GET /orgs/{org}/actions/variables/{name}/repositories"],
		listSelectedRepositoriesEnabledGithubActionsOrganization: ["GET /orgs/{org}/actions/permissions/repositories"],
		listSelfHostedRunnersForOrg: ["GET /orgs/{org}/actions/runners"],
		listSelfHostedRunnersForRepo: ["GET /repos/{owner}/{repo}/actions/runners"],
		listWorkflowRunArtifacts: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts"],
		listWorkflowRuns: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs"],
		listWorkflowRunsForRepo: ["GET /repos/{owner}/{repo}/actions/runs"],
		reRunJobForWorkflowRun: ["POST /repos/{owner}/{repo}/actions/jobs/{job_id}/rerun"],
		reRunWorkflow: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun"],
		reRunWorkflowFailedJobs: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs"],
		removeAllCustomLabelsFromSelfHostedRunnerForOrg: ["DELETE /orgs/{org}/actions/runners/{runner_id}/labels"],
		removeAllCustomLabelsFromSelfHostedRunnerForRepo: ["DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"],
		removeCustomLabelFromSelfHostedRunnerForOrg: ["DELETE /orgs/{org}/actions/runners/{runner_id}/labels/{name}"],
		removeCustomLabelFromSelfHostedRunnerForRepo: ["DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels/{name}"],
		removeSelectedRepoFromOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"],
		removeSelectedRepoFromOrgVariable: ["DELETE /orgs/{org}/actions/variables/{name}/repositories/{repository_id}"],
		reviewCustomGatesForRun: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/deployment_protection_rule"],
		reviewPendingDeploymentsForRun: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"],
		setAllowedActionsOrganization: ["PUT /orgs/{org}/actions/permissions/selected-actions"],
		setAllowedActionsRepository: ["PUT /repos/{owner}/{repo}/actions/permissions/selected-actions"],
		setCustomLabelsForSelfHostedRunnerForOrg: ["PUT /orgs/{org}/actions/runners/{runner_id}/labels"],
		setCustomLabelsForSelfHostedRunnerForRepo: ["PUT /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"],
		setCustomOidcSubClaimForRepo: ["PUT /repos/{owner}/{repo}/actions/oidc/customization/sub"],
		setGithubActionsDefaultWorkflowPermissionsOrganization: ["PUT /orgs/{org}/actions/permissions/workflow"],
		setGithubActionsDefaultWorkflowPermissionsRepository: ["PUT /repos/{owner}/{repo}/actions/permissions/workflow"],
		setGithubActionsPermissionsOrganization: ["PUT /orgs/{org}/actions/permissions"],
		setGithubActionsPermissionsRepository: ["PUT /repos/{owner}/{repo}/actions/permissions"],
		setSelectedReposForOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}/repositories"],
		setSelectedReposForOrgVariable: ["PUT /orgs/{org}/actions/variables/{name}/repositories"],
		setSelectedRepositoriesEnabledGithubActionsOrganization: ["PUT /orgs/{org}/actions/permissions/repositories"],
		setWorkflowAccessToRepository: ["PUT /repos/{owner}/{repo}/actions/permissions/access"],
		updateEnvironmentVariable: ["PATCH /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"],
		updateHostedRunnerForOrg: ["PATCH /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"],
		updateOrgVariable: ["PATCH /orgs/{org}/actions/variables/{name}"],
		updateRepoVariable: ["PATCH /repos/{owner}/{repo}/actions/variables/{name}"]
	},
	activity: {
		checkRepoIsStarredByAuthenticatedUser: ["GET /user/starred/{owner}/{repo}"],
		deleteRepoSubscription: ["DELETE /repos/{owner}/{repo}/subscription"],
		deleteThreadSubscription: ["DELETE /notifications/threads/{thread_id}/subscription"],
		getFeeds: ["GET /feeds"],
		getRepoSubscription: ["GET /repos/{owner}/{repo}/subscription"],
		getThread: ["GET /notifications/threads/{thread_id}"],
		getThreadSubscriptionForAuthenticatedUser: ["GET /notifications/threads/{thread_id}/subscription"],
		listEventsForAuthenticatedUser: ["GET /users/{username}/events"],
		listNotificationsForAuthenticatedUser: ["GET /notifications"],
		listOrgEventsForAuthenticatedUser: ["GET /users/{username}/events/orgs/{org}"],
		listPublicEvents: ["GET /events"],
		listPublicEventsForRepoNetwork: ["GET /networks/{owner}/{repo}/events"],
		listPublicEventsForUser: ["GET /users/{username}/events/public"],
		listPublicOrgEvents: ["GET /orgs/{org}/events"],
		listReceivedEventsForUser: ["GET /users/{username}/received_events"],
		listReceivedPublicEventsForUser: ["GET /users/{username}/received_events/public"],
		listRepoEvents: ["GET /repos/{owner}/{repo}/events"],
		listRepoNotificationsForAuthenticatedUser: ["GET /repos/{owner}/{repo}/notifications"],
		listReposStarredByAuthenticatedUser: ["GET /user/starred"],
		listReposStarredByUser: ["GET /users/{username}/starred"],
		listReposWatchedByUser: ["GET /users/{username}/subscriptions"],
		listStargazersForRepo: ["GET /repos/{owner}/{repo}/stargazers"],
		listWatchedReposForAuthenticatedUser: ["GET /user/subscriptions"],
		listWatchersForRepo: ["GET /repos/{owner}/{repo}/subscribers"],
		markNotificationsAsRead: ["PUT /notifications"],
		markRepoNotificationsAsRead: ["PUT /repos/{owner}/{repo}/notifications"],
		markThreadAsDone: ["DELETE /notifications/threads/{thread_id}"],
		markThreadAsRead: ["PATCH /notifications/threads/{thread_id}"],
		setRepoSubscription: ["PUT /repos/{owner}/{repo}/subscription"],
		setThreadSubscription: ["PUT /notifications/threads/{thread_id}/subscription"],
		starRepoForAuthenticatedUser: ["PUT /user/starred/{owner}/{repo}"],
		unstarRepoForAuthenticatedUser: ["DELETE /user/starred/{owner}/{repo}"]
	},
	apps: {
		addRepoToInstallation: [
			"PUT /user/installations/{installation_id}/repositories/{repository_id}",
			{},
			{ renamed: ["apps", "addRepoToInstallationForAuthenticatedUser"] }
		],
		addRepoToInstallationForAuthenticatedUser: ["PUT /user/installations/{installation_id}/repositories/{repository_id}"],
		checkToken: ["POST /applications/{client_id}/token"],
		createFromManifest: ["POST /app-manifests/{code}/conversions"],
		createInstallationAccessToken: ["POST /app/installations/{installation_id}/access_tokens"],
		deleteAuthorization: ["DELETE /applications/{client_id}/grant"],
		deleteInstallation: ["DELETE /app/installations/{installation_id}"],
		deleteToken: ["DELETE /applications/{client_id}/token"],
		getAuthenticated: ["GET /app"],
		getBySlug: ["GET /apps/{app_slug}"],
		getInstallation: ["GET /app/installations/{installation_id}"],
		getOrgInstallation: ["GET /orgs/{org}/installation"],
		getRepoInstallation: ["GET /repos/{owner}/{repo}/installation"],
		getSubscriptionPlanForAccount: ["GET /marketplace_listing/accounts/{account_id}"],
		getSubscriptionPlanForAccountStubbed: ["GET /marketplace_listing/stubbed/accounts/{account_id}"],
		getUserInstallation: ["GET /users/{username}/installation"],
		getWebhookConfigForApp: ["GET /app/hook/config"],
		getWebhookDelivery: ["GET /app/hook/deliveries/{delivery_id}"],
		listAccountsForPlan: ["GET /marketplace_listing/plans/{plan_id}/accounts"],
		listAccountsForPlanStubbed: ["GET /marketplace_listing/stubbed/plans/{plan_id}/accounts"],
		listInstallationReposForAuthenticatedUser: ["GET /user/installations/{installation_id}/repositories"],
		listInstallationRequestsForAuthenticatedApp: ["GET /app/installation-requests"],
		listInstallations: ["GET /app/installations"],
		listInstallationsForAuthenticatedUser: ["GET /user/installations"],
		listPlans: ["GET /marketplace_listing/plans"],
		listPlansStubbed: ["GET /marketplace_listing/stubbed/plans"],
		listReposAccessibleToInstallation: ["GET /installation/repositories"],
		listSubscriptionsForAuthenticatedUser: ["GET /user/marketplace_purchases"],
		listSubscriptionsForAuthenticatedUserStubbed: ["GET /user/marketplace_purchases/stubbed"],
		listWebhookDeliveries: ["GET /app/hook/deliveries"],
		redeliverWebhookDelivery: ["POST /app/hook/deliveries/{delivery_id}/attempts"],
		removeRepoFromInstallation: [
			"DELETE /user/installations/{installation_id}/repositories/{repository_id}",
			{},
			{ renamed: ["apps", "removeRepoFromInstallationForAuthenticatedUser"] }
		],
		removeRepoFromInstallationForAuthenticatedUser: ["DELETE /user/installations/{installation_id}/repositories/{repository_id}"],
		resetToken: ["PATCH /applications/{client_id}/token"],
		revokeInstallationAccessToken: ["DELETE /installation/token"],
		scopeToken: ["POST /applications/{client_id}/token/scoped"],
		suspendInstallation: ["PUT /app/installations/{installation_id}/suspended"],
		unsuspendInstallation: ["DELETE /app/installations/{installation_id}/suspended"],
		updateWebhookConfigForApp: ["PATCH /app/hook/config"]
	},
	billing: {
		getGithubActionsBillingOrg: ["GET /orgs/{org}/settings/billing/actions"],
		getGithubActionsBillingUser: ["GET /users/{username}/settings/billing/actions"],
		getGithubBillingPremiumRequestUsageReportOrg: ["GET /organizations/{org}/settings/billing/premium_request/usage"],
		getGithubBillingPremiumRequestUsageReportUser: ["GET /users/{username}/settings/billing/premium_request/usage"],
		getGithubBillingUsageReportOrg: ["GET /organizations/{org}/settings/billing/usage"],
		getGithubBillingUsageReportUser: ["GET /users/{username}/settings/billing/usage"],
		getGithubPackagesBillingOrg: ["GET /orgs/{org}/settings/billing/packages"],
		getGithubPackagesBillingUser: ["GET /users/{username}/settings/billing/packages"],
		getSharedStorageBillingOrg: ["GET /orgs/{org}/settings/billing/shared-storage"],
		getSharedStorageBillingUser: ["GET /users/{username}/settings/billing/shared-storage"]
	},
	campaigns: {
		createCampaign: ["POST /orgs/{org}/campaigns"],
		deleteCampaign: ["DELETE /orgs/{org}/campaigns/{campaign_number}"],
		getCampaignSummary: ["GET /orgs/{org}/campaigns/{campaign_number}"],
		listOrgCampaigns: ["GET /orgs/{org}/campaigns"],
		updateCampaign: ["PATCH /orgs/{org}/campaigns/{campaign_number}"]
	},
	checks: {
		create: ["POST /repos/{owner}/{repo}/check-runs"],
		createSuite: ["POST /repos/{owner}/{repo}/check-suites"],
		get: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}"],
		getSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}"],
		listAnnotations: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations"],
		listForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-runs"],
		listForSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs"],
		listSuitesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-suites"],
		rerequestRun: ["POST /repos/{owner}/{repo}/check-runs/{check_run_id}/rerequest"],
		rerequestSuite: ["POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest"],
		setSuitesPreferences: ["PATCH /repos/{owner}/{repo}/check-suites/preferences"],
		update: ["PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}"]
	},
	codeScanning: {
		commitAutofix: ["POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix/commits"],
		createAutofix: ["POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix"],
		createVariantAnalysis: ["POST /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses"],
		deleteAnalysis: ["DELETE /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}{?confirm_delete}"],
		deleteCodeqlDatabase: ["DELETE /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}"],
		getAlert: [
			"GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
			{},
			{ renamedParameters: { alert_id: "alert_number" } }
		],
		getAnalysis: ["GET /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}"],
		getAutofix: ["GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix"],
		getCodeqlDatabase: ["GET /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}"],
		getDefaultSetup: ["GET /repos/{owner}/{repo}/code-scanning/default-setup"],
		getSarif: ["GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}"],
		getVariantAnalysis: ["GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}"],
		getVariantAnalysisRepoTask: ["GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}/repos/{repo_owner}/{repo_name}"],
		listAlertInstances: ["GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances"],
		listAlertsForOrg: ["GET /orgs/{org}/code-scanning/alerts"],
		listAlertsForRepo: ["GET /repos/{owner}/{repo}/code-scanning/alerts"],
		listAlertsInstances: [
			"GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances",
			{},
			{ renamed: ["codeScanning", "listAlertInstances"] }
		],
		listCodeqlDatabases: ["GET /repos/{owner}/{repo}/code-scanning/codeql/databases"],
		listRecentAnalyses: ["GET /repos/{owner}/{repo}/code-scanning/analyses"],
		updateAlert: ["PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}"],
		updateDefaultSetup: ["PATCH /repos/{owner}/{repo}/code-scanning/default-setup"],
		uploadSarif: ["POST /repos/{owner}/{repo}/code-scanning/sarifs"]
	},
	codeSecurity: {
		attachConfiguration: ["POST /orgs/{org}/code-security/configurations/{configuration_id}/attach"],
		attachEnterpriseConfiguration: ["POST /enterprises/{enterprise}/code-security/configurations/{configuration_id}/attach"],
		createConfiguration: ["POST /orgs/{org}/code-security/configurations"],
		createConfigurationForEnterprise: ["POST /enterprises/{enterprise}/code-security/configurations"],
		deleteConfiguration: ["DELETE /orgs/{org}/code-security/configurations/{configuration_id}"],
		deleteConfigurationForEnterprise: ["DELETE /enterprises/{enterprise}/code-security/configurations/{configuration_id}"],
		detachConfiguration: ["DELETE /orgs/{org}/code-security/configurations/detach"],
		getConfiguration: ["GET /orgs/{org}/code-security/configurations/{configuration_id}"],
		getConfigurationForRepository: ["GET /repos/{owner}/{repo}/code-security-configuration"],
		getConfigurationsForEnterprise: ["GET /enterprises/{enterprise}/code-security/configurations"],
		getConfigurationsForOrg: ["GET /orgs/{org}/code-security/configurations"],
		getDefaultConfigurations: ["GET /orgs/{org}/code-security/configurations/defaults"],
		getDefaultConfigurationsForEnterprise: ["GET /enterprises/{enterprise}/code-security/configurations/defaults"],
		getRepositoriesForConfiguration: ["GET /orgs/{org}/code-security/configurations/{configuration_id}/repositories"],
		getRepositoriesForEnterpriseConfiguration: ["GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}/repositories"],
		getSingleConfigurationForEnterprise: ["GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}"],
		setConfigurationAsDefault: ["PUT /orgs/{org}/code-security/configurations/{configuration_id}/defaults"],
		setConfigurationAsDefaultForEnterprise: ["PUT /enterprises/{enterprise}/code-security/configurations/{configuration_id}/defaults"],
		updateConfiguration: ["PATCH /orgs/{org}/code-security/configurations/{configuration_id}"],
		updateEnterpriseConfiguration: ["PATCH /enterprises/{enterprise}/code-security/configurations/{configuration_id}"]
	},
	codesOfConduct: {
		getAllCodesOfConduct: ["GET /codes_of_conduct"],
		getConductCode: ["GET /codes_of_conduct/{key}"]
	},
	codespaces: {
		addRepositoryForSecretForAuthenticatedUser: ["PUT /user/codespaces/secrets/{secret_name}/repositories/{repository_id}"],
		addSelectedRepoToOrgSecret: ["PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}"],
		checkPermissionsForDevcontainer: ["GET /repos/{owner}/{repo}/codespaces/permissions_check"],
		codespaceMachinesForAuthenticatedUser: ["GET /user/codespaces/{codespace_name}/machines"],
		createForAuthenticatedUser: ["POST /user/codespaces"],
		createOrUpdateOrgSecret: ["PUT /orgs/{org}/codespaces/secrets/{secret_name}"],
		createOrUpdateRepoSecret: ["PUT /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"],
		createOrUpdateSecretForAuthenticatedUser: ["PUT /user/codespaces/secrets/{secret_name}"],
		createWithPrForAuthenticatedUser: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/codespaces"],
		createWithRepoForAuthenticatedUser: ["POST /repos/{owner}/{repo}/codespaces"],
		deleteForAuthenticatedUser: ["DELETE /user/codespaces/{codespace_name}"],
		deleteFromOrganization: ["DELETE /orgs/{org}/members/{username}/codespaces/{codespace_name}"],
		deleteOrgSecret: ["DELETE /orgs/{org}/codespaces/secrets/{secret_name}"],
		deleteRepoSecret: ["DELETE /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"],
		deleteSecretForAuthenticatedUser: ["DELETE /user/codespaces/secrets/{secret_name}"],
		exportForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/exports"],
		getCodespacesForUserInOrg: ["GET /orgs/{org}/members/{username}/codespaces"],
		getExportDetailsForAuthenticatedUser: ["GET /user/codespaces/{codespace_name}/exports/{export_id}"],
		getForAuthenticatedUser: ["GET /user/codespaces/{codespace_name}"],
		getOrgPublicKey: ["GET /orgs/{org}/codespaces/secrets/public-key"],
		getOrgSecret: ["GET /orgs/{org}/codespaces/secrets/{secret_name}"],
		getPublicKeyForAuthenticatedUser: ["GET /user/codespaces/secrets/public-key"],
		getRepoPublicKey: ["GET /repos/{owner}/{repo}/codespaces/secrets/public-key"],
		getRepoSecret: ["GET /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"],
		getSecretForAuthenticatedUser: ["GET /user/codespaces/secrets/{secret_name}"],
		listDevcontainersInRepositoryForAuthenticatedUser: ["GET /repos/{owner}/{repo}/codespaces/devcontainers"],
		listForAuthenticatedUser: ["GET /user/codespaces"],
		listInOrganization: [
			"GET /orgs/{org}/codespaces",
			{},
			{ renamedParameters: { org_id: "org" } }
		],
		listInRepositoryForAuthenticatedUser: ["GET /repos/{owner}/{repo}/codespaces"],
		listOrgSecrets: ["GET /orgs/{org}/codespaces/secrets"],
		listRepoSecrets: ["GET /repos/{owner}/{repo}/codespaces/secrets"],
		listRepositoriesForSecretForAuthenticatedUser: ["GET /user/codespaces/secrets/{secret_name}/repositories"],
		listSecretsForAuthenticatedUser: ["GET /user/codespaces/secrets"],
		listSelectedReposForOrgSecret: ["GET /orgs/{org}/codespaces/secrets/{secret_name}/repositories"],
		preFlightWithRepoForAuthenticatedUser: ["GET /repos/{owner}/{repo}/codespaces/new"],
		publishForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/publish"],
		removeRepositoryForSecretForAuthenticatedUser: ["DELETE /user/codespaces/secrets/{secret_name}/repositories/{repository_id}"],
		removeSelectedRepoFromOrgSecret: ["DELETE /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}"],
		repoMachinesForAuthenticatedUser: ["GET /repos/{owner}/{repo}/codespaces/machines"],
		setRepositoriesForSecretForAuthenticatedUser: ["PUT /user/codespaces/secrets/{secret_name}/repositories"],
		setSelectedReposForOrgSecret: ["PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories"],
		startForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/start"],
		stopForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/stop"],
		stopInOrganization: ["POST /orgs/{org}/members/{username}/codespaces/{codespace_name}/stop"],
		updateForAuthenticatedUser: ["PATCH /user/codespaces/{codespace_name}"]
	},
	copilot: {
		addCopilotSeatsForTeams: ["POST /orgs/{org}/copilot/billing/selected_teams"],
		addCopilotSeatsForUsers: ["POST /orgs/{org}/copilot/billing/selected_users"],
		cancelCopilotSeatAssignmentForTeams: ["DELETE /orgs/{org}/copilot/billing/selected_teams"],
		cancelCopilotSeatAssignmentForUsers: ["DELETE /orgs/{org}/copilot/billing/selected_users"],
		copilotMetricsForOrganization: ["GET /orgs/{org}/copilot/metrics"],
		copilotMetricsForTeam: ["GET /orgs/{org}/team/{team_slug}/copilot/metrics"],
		getCopilotOrganizationDetails: ["GET /orgs/{org}/copilot/billing"],
		getCopilotSeatDetailsForUser: ["GET /orgs/{org}/members/{username}/copilot"],
		listCopilotSeats: ["GET /orgs/{org}/copilot/billing/seats"]
	},
	credentials: { revoke: ["POST /credentials/revoke"] },
	dependabot: {
		addSelectedRepoToOrgSecret: ["PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}"],
		createOrUpdateOrgSecret: ["PUT /orgs/{org}/dependabot/secrets/{secret_name}"],
		createOrUpdateRepoSecret: ["PUT /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"],
		deleteOrgSecret: ["DELETE /orgs/{org}/dependabot/secrets/{secret_name}"],
		deleteRepoSecret: ["DELETE /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"],
		getAlert: ["GET /repos/{owner}/{repo}/dependabot/alerts/{alert_number}"],
		getOrgPublicKey: ["GET /orgs/{org}/dependabot/secrets/public-key"],
		getOrgSecret: ["GET /orgs/{org}/dependabot/secrets/{secret_name}"],
		getRepoPublicKey: ["GET /repos/{owner}/{repo}/dependabot/secrets/public-key"],
		getRepoSecret: ["GET /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"],
		listAlertsForEnterprise: ["GET /enterprises/{enterprise}/dependabot/alerts"],
		listAlertsForOrg: ["GET /orgs/{org}/dependabot/alerts"],
		listAlertsForRepo: ["GET /repos/{owner}/{repo}/dependabot/alerts"],
		listOrgSecrets: ["GET /orgs/{org}/dependabot/secrets"],
		listRepoSecrets: ["GET /repos/{owner}/{repo}/dependabot/secrets"],
		listSelectedReposForOrgSecret: ["GET /orgs/{org}/dependabot/secrets/{secret_name}/repositories"],
		removeSelectedRepoFromOrgSecret: ["DELETE /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}"],
		repositoryAccessForOrg: ["GET /organizations/{org}/dependabot/repository-access"],
		setRepositoryAccessDefaultLevel: ["PUT /organizations/{org}/dependabot/repository-access/default-level"],
		setSelectedReposForOrgSecret: ["PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories"],
		updateAlert: ["PATCH /repos/{owner}/{repo}/dependabot/alerts/{alert_number}"],
		updateRepositoryAccessForOrg: ["PATCH /organizations/{org}/dependabot/repository-access"]
	},
	dependencyGraph: {
		createRepositorySnapshot: ["POST /repos/{owner}/{repo}/dependency-graph/snapshots"],
		diffRange: ["GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}"],
		exportSbom: ["GET /repos/{owner}/{repo}/dependency-graph/sbom"]
	},
	emojis: { get: ["GET /emojis"] },
	enterpriseTeamMemberships: {
		add: ["PUT /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"],
		bulkAdd: ["POST /enterprises/{enterprise}/teams/{enterprise-team}/memberships/add"],
		bulkRemove: ["POST /enterprises/{enterprise}/teams/{enterprise-team}/memberships/remove"],
		get: ["GET /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"],
		list: ["GET /enterprises/{enterprise}/teams/{enterprise-team}/memberships"],
		remove: ["DELETE /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"]
	},
	enterpriseTeamOrganizations: {
		add: ["PUT /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"],
		bulkAdd: ["POST /enterprises/{enterprise}/teams/{enterprise-team}/organizations/add"],
		bulkRemove: ["POST /enterprises/{enterprise}/teams/{enterprise-team}/organizations/remove"],
		delete: ["DELETE /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"],
		getAssignment: ["GET /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"],
		getAssignments: ["GET /enterprises/{enterprise}/teams/{enterprise-team}/organizations"]
	},
	enterpriseTeams: {
		create: ["POST /enterprises/{enterprise}/teams"],
		delete: ["DELETE /enterprises/{enterprise}/teams/{team_slug}"],
		get: ["GET /enterprises/{enterprise}/teams/{team_slug}"],
		list: ["GET /enterprises/{enterprise}/teams"],
		update: ["PATCH /enterprises/{enterprise}/teams/{team_slug}"]
	},
	gists: {
		checkIsStarred: ["GET /gists/{gist_id}/star"],
		create: ["POST /gists"],
		createComment: ["POST /gists/{gist_id}/comments"],
		delete: ["DELETE /gists/{gist_id}"],
		deleteComment: ["DELETE /gists/{gist_id}/comments/{comment_id}"],
		fork: ["POST /gists/{gist_id}/forks"],
		get: ["GET /gists/{gist_id}"],
		getComment: ["GET /gists/{gist_id}/comments/{comment_id}"],
		getRevision: ["GET /gists/{gist_id}/{sha}"],
		list: ["GET /gists"],
		listComments: ["GET /gists/{gist_id}/comments"],
		listCommits: ["GET /gists/{gist_id}/commits"],
		listForUser: ["GET /users/{username}/gists"],
		listForks: ["GET /gists/{gist_id}/forks"],
		listPublic: ["GET /gists/public"],
		listStarred: ["GET /gists/starred"],
		star: ["PUT /gists/{gist_id}/star"],
		unstar: ["DELETE /gists/{gist_id}/star"],
		update: ["PATCH /gists/{gist_id}"],
		updateComment: ["PATCH /gists/{gist_id}/comments/{comment_id}"]
	},
	git: {
		createBlob: ["POST /repos/{owner}/{repo}/git/blobs"],
		createCommit: ["POST /repos/{owner}/{repo}/git/commits"],
		createRef: ["POST /repos/{owner}/{repo}/git/refs"],
		createTag: ["POST /repos/{owner}/{repo}/git/tags"],
		createTree: ["POST /repos/{owner}/{repo}/git/trees"],
		deleteRef: ["DELETE /repos/{owner}/{repo}/git/refs/{ref}"],
		getBlob: ["GET /repos/{owner}/{repo}/git/blobs/{file_sha}"],
		getCommit: ["GET /repos/{owner}/{repo}/git/commits/{commit_sha}"],
		getRef: ["GET /repos/{owner}/{repo}/git/ref/{ref}"],
		getTag: ["GET /repos/{owner}/{repo}/git/tags/{tag_sha}"],
		getTree: ["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"],
		listMatchingRefs: ["GET /repos/{owner}/{repo}/git/matching-refs/{ref}"],
		updateRef: ["PATCH /repos/{owner}/{repo}/git/refs/{ref}"]
	},
	gitignore: {
		getAllTemplates: ["GET /gitignore/templates"],
		getTemplate: ["GET /gitignore/templates/{name}"]
	},
	hostedCompute: {
		createNetworkConfigurationForOrg: ["POST /orgs/{org}/settings/network-configurations"],
		deleteNetworkConfigurationFromOrg: ["DELETE /orgs/{org}/settings/network-configurations/{network_configuration_id}"],
		getNetworkConfigurationForOrg: ["GET /orgs/{org}/settings/network-configurations/{network_configuration_id}"],
		getNetworkSettingsForOrg: ["GET /orgs/{org}/settings/network-settings/{network_settings_id}"],
		listNetworkConfigurationsForOrg: ["GET /orgs/{org}/settings/network-configurations"],
		updateNetworkConfigurationForOrg: ["PATCH /orgs/{org}/settings/network-configurations/{network_configuration_id}"]
	},
	interactions: {
		getRestrictionsForAuthenticatedUser: ["GET /user/interaction-limits"],
		getRestrictionsForOrg: ["GET /orgs/{org}/interaction-limits"],
		getRestrictionsForRepo: ["GET /repos/{owner}/{repo}/interaction-limits"],
		getRestrictionsForYourPublicRepos: [
			"GET /user/interaction-limits",
			{},
			{ renamed: ["interactions", "getRestrictionsForAuthenticatedUser"] }
		],
		removeRestrictionsForAuthenticatedUser: ["DELETE /user/interaction-limits"],
		removeRestrictionsForOrg: ["DELETE /orgs/{org}/interaction-limits"],
		removeRestrictionsForRepo: ["DELETE /repos/{owner}/{repo}/interaction-limits"],
		removeRestrictionsForYourPublicRepos: [
			"DELETE /user/interaction-limits",
			{},
			{ renamed: ["interactions", "removeRestrictionsForAuthenticatedUser"] }
		],
		setRestrictionsForAuthenticatedUser: ["PUT /user/interaction-limits"],
		setRestrictionsForOrg: ["PUT /orgs/{org}/interaction-limits"],
		setRestrictionsForRepo: ["PUT /repos/{owner}/{repo}/interaction-limits"],
		setRestrictionsForYourPublicRepos: [
			"PUT /user/interaction-limits",
			{},
			{ renamed: ["interactions", "setRestrictionsForAuthenticatedUser"] }
		]
	},
	issues: {
		addAssignees: ["POST /repos/{owner}/{repo}/issues/{issue_number}/assignees"],
		addBlockedByDependency: ["POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by"],
		addLabels: ["POST /repos/{owner}/{repo}/issues/{issue_number}/labels"],
		addSubIssue: ["POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues"],
		checkUserCanBeAssigned: ["GET /repos/{owner}/{repo}/assignees/{assignee}"],
		checkUserCanBeAssignedToIssue: ["GET /repos/{owner}/{repo}/issues/{issue_number}/assignees/{assignee}"],
		create: ["POST /repos/{owner}/{repo}/issues"],
		createComment: ["POST /repos/{owner}/{repo}/issues/{issue_number}/comments"],
		createLabel: ["POST /repos/{owner}/{repo}/labels"],
		createMilestone: ["POST /repos/{owner}/{repo}/milestones"],
		deleteComment: ["DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}"],
		deleteLabel: ["DELETE /repos/{owner}/{repo}/labels/{name}"],
		deleteMilestone: ["DELETE /repos/{owner}/{repo}/milestones/{milestone_number}"],
		get: ["GET /repos/{owner}/{repo}/issues/{issue_number}"],
		getComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}"],
		getEvent: ["GET /repos/{owner}/{repo}/issues/events/{event_id}"],
		getLabel: ["GET /repos/{owner}/{repo}/labels/{name}"],
		getMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}"],
		getParent: ["GET /repos/{owner}/{repo}/issues/{issue_number}/parent"],
		list: ["GET /issues"],
		listAssignees: ["GET /repos/{owner}/{repo}/assignees"],
		listComments: ["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"],
		listCommentsForRepo: ["GET /repos/{owner}/{repo}/issues/comments"],
		listDependenciesBlockedBy: ["GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by"],
		listDependenciesBlocking: ["GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking"],
		listEvents: ["GET /repos/{owner}/{repo}/issues/{issue_number}/events"],
		listEventsForRepo: ["GET /repos/{owner}/{repo}/issues/events"],
		listEventsForTimeline: ["GET /repos/{owner}/{repo}/issues/{issue_number}/timeline"],
		listForAuthenticatedUser: ["GET /user/issues"],
		listForOrg: ["GET /orgs/{org}/issues"],
		listForRepo: ["GET /repos/{owner}/{repo}/issues"],
		listLabelsForMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels"],
		listLabelsForRepo: ["GET /repos/{owner}/{repo}/labels"],
		listLabelsOnIssue: ["GET /repos/{owner}/{repo}/issues/{issue_number}/labels"],
		listMilestones: ["GET /repos/{owner}/{repo}/milestones"],
		listSubIssues: ["GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues"],
		lock: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/lock"],
		removeAllLabels: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels"],
		removeAssignees: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees"],
		removeDependencyBlockedBy: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by/{issue_id}"],
		removeLabel: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}"],
		removeSubIssue: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue"],
		reprioritizeSubIssue: ["PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority"],
		setLabels: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/labels"],
		unlock: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/lock"],
		update: ["PATCH /repos/{owner}/{repo}/issues/{issue_number}"],
		updateComment: ["PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}"],
		updateLabel: ["PATCH /repos/{owner}/{repo}/labels/{name}"],
		updateMilestone: ["PATCH /repos/{owner}/{repo}/milestones/{milestone_number}"]
	},
	licenses: {
		get: ["GET /licenses/{license}"],
		getAllCommonlyUsed: ["GET /licenses"],
		getForRepo: ["GET /repos/{owner}/{repo}/license"]
	},
	markdown: {
		render: ["POST /markdown"],
		renderRaw: ["POST /markdown/raw", { headers: { "content-type": "text/plain; charset=utf-8" } }]
	},
	meta: {
		get: ["GET /meta"],
		getAllVersions: ["GET /versions"],
		getOctocat: ["GET /octocat"],
		getZen: ["GET /zen"],
		root: ["GET /"]
	},
	migrations: {
		deleteArchiveForAuthenticatedUser: ["DELETE /user/migrations/{migration_id}/archive"],
		deleteArchiveForOrg: ["DELETE /orgs/{org}/migrations/{migration_id}/archive"],
		downloadArchiveForOrg: ["GET /orgs/{org}/migrations/{migration_id}/archive"],
		getArchiveForAuthenticatedUser: ["GET /user/migrations/{migration_id}/archive"],
		getStatusForAuthenticatedUser: ["GET /user/migrations/{migration_id}"],
		getStatusForOrg: ["GET /orgs/{org}/migrations/{migration_id}"],
		listForAuthenticatedUser: ["GET /user/migrations"],
		listForOrg: ["GET /orgs/{org}/migrations"],
		listReposForAuthenticatedUser: ["GET /user/migrations/{migration_id}/repositories"],
		listReposForOrg: ["GET /orgs/{org}/migrations/{migration_id}/repositories"],
		listReposForUser: [
			"GET /user/migrations/{migration_id}/repositories",
			{},
			{ renamed: ["migrations", "listReposForAuthenticatedUser"] }
		],
		startForAuthenticatedUser: ["POST /user/migrations"],
		startForOrg: ["POST /orgs/{org}/migrations"],
		unlockRepoForAuthenticatedUser: ["DELETE /user/migrations/{migration_id}/repos/{repo_name}/lock"],
		unlockRepoForOrg: ["DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock"]
	},
	oidc: {
		getOidcCustomSubTemplateForOrg: ["GET /orgs/{org}/actions/oidc/customization/sub"],
		updateOidcCustomSubTemplateForOrg: ["PUT /orgs/{org}/actions/oidc/customization/sub"]
	},
	orgs: {
		addSecurityManagerTeam: [
			"PUT /orgs/{org}/security-managers/teams/{team_slug}",
			{},
			{ deprecated: "octokit.rest.orgs.addSecurityManagerTeam() is deprecated, see https://docs.github.com/rest/orgs/security-managers#add-a-security-manager-team" }
		],
		assignTeamToOrgRole: ["PUT /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}"],
		assignUserToOrgRole: ["PUT /orgs/{org}/organization-roles/users/{username}/{role_id}"],
		blockUser: ["PUT /orgs/{org}/blocks/{username}"],
		cancelInvitation: ["DELETE /orgs/{org}/invitations/{invitation_id}"],
		checkBlockedUser: ["GET /orgs/{org}/blocks/{username}"],
		checkMembershipForUser: ["GET /orgs/{org}/members/{username}"],
		checkPublicMembershipForUser: ["GET /orgs/{org}/public_members/{username}"],
		convertMemberToOutsideCollaborator: ["PUT /orgs/{org}/outside_collaborators/{username}"],
		createArtifactStorageRecord: ["POST /orgs/{org}/artifacts/metadata/storage-record"],
		createInvitation: ["POST /orgs/{org}/invitations"],
		createIssueType: ["POST /orgs/{org}/issue-types"],
		createWebhook: ["POST /orgs/{org}/hooks"],
		customPropertiesForOrgsCreateOrUpdateOrganizationValues: ["PATCH /organizations/{org}/org-properties/values"],
		customPropertiesForOrgsGetOrganizationValues: ["GET /organizations/{org}/org-properties/values"],
		customPropertiesForReposCreateOrUpdateOrganizationDefinition: ["PUT /orgs/{org}/properties/schema/{custom_property_name}"],
		customPropertiesForReposCreateOrUpdateOrganizationDefinitions: ["PATCH /orgs/{org}/properties/schema"],
		customPropertiesForReposCreateOrUpdateOrganizationValues: ["PATCH /orgs/{org}/properties/values"],
		customPropertiesForReposDeleteOrganizationDefinition: ["DELETE /orgs/{org}/properties/schema/{custom_property_name}"],
		customPropertiesForReposGetOrganizationDefinition: ["GET /orgs/{org}/properties/schema/{custom_property_name}"],
		customPropertiesForReposGetOrganizationDefinitions: ["GET /orgs/{org}/properties/schema"],
		customPropertiesForReposGetOrganizationValues: ["GET /orgs/{org}/properties/values"],
		delete: ["DELETE /orgs/{org}"],
		deleteAttestationsBulk: ["POST /orgs/{org}/attestations/delete-request"],
		deleteAttestationsById: ["DELETE /orgs/{org}/attestations/{attestation_id}"],
		deleteAttestationsBySubjectDigest: ["DELETE /orgs/{org}/attestations/digest/{subject_digest}"],
		deleteIssueType: ["DELETE /orgs/{org}/issue-types/{issue_type_id}"],
		deleteWebhook: ["DELETE /orgs/{org}/hooks/{hook_id}"],
		disableSelectedRepositoryImmutableReleasesOrganization: ["DELETE /orgs/{org}/settings/immutable-releases/repositories/{repository_id}"],
		enableSelectedRepositoryImmutableReleasesOrganization: ["PUT /orgs/{org}/settings/immutable-releases/repositories/{repository_id}"],
		get: ["GET /orgs/{org}"],
		getImmutableReleasesSettings: ["GET /orgs/{org}/settings/immutable-releases"],
		getImmutableReleasesSettingsRepositories: ["GET /orgs/{org}/settings/immutable-releases/repositories"],
		getMembershipForAuthenticatedUser: ["GET /user/memberships/orgs/{org}"],
		getMembershipForUser: ["GET /orgs/{org}/memberships/{username}"],
		getOrgRole: ["GET /orgs/{org}/organization-roles/{role_id}"],
		getOrgRulesetHistory: ["GET /orgs/{org}/rulesets/{ruleset_id}/history"],
		getOrgRulesetVersion: ["GET /orgs/{org}/rulesets/{ruleset_id}/history/{version_id}"],
		getWebhook: ["GET /orgs/{org}/hooks/{hook_id}"],
		getWebhookConfigForOrg: ["GET /orgs/{org}/hooks/{hook_id}/config"],
		getWebhookDelivery: ["GET /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}"],
		list: ["GET /organizations"],
		listAppInstallations: ["GET /orgs/{org}/installations"],
		listArtifactStorageRecords: ["GET /orgs/{org}/artifacts/{subject_digest}/metadata/storage-records"],
		listAttestationRepositories: ["GET /orgs/{org}/attestations/repositories"],
		listAttestations: ["GET /orgs/{org}/attestations/{subject_digest}"],
		listAttestationsBulk: ["POST /orgs/{org}/attestations/bulk-list{?per_page,before,after}"],
		listBlockedUsers: ["GET /orgs/{org}/blocks"],
		listFailedInvitations: ["GET /orgs/{org}/failed_invitations"],
		listForAuthenticatedUser: ["GET /user/orgs"],
		listForUser: ["GET /users/{username}/orgs"],
		listInvitationTeams: ["GET /orgs/{org}/invitations/{invitation_id}/teams"],
		listIssueTypes: ["GET /orgs/{org}/issue-types"],
		listMembers: ["GET /orgs/{org}/members"],
		listMembershipsForAuthenticatedUser: ["GET /user/memberships/orgs"],
		listOrgRoleTeams: ["GET /orgs/{org}/organization-roles/{role_id}/teams"],
		listOrgRoleUsers: ["GET /orgs/{org}/organization-roles/{role_id}/users"],
		listOrgRoles: ["GET /orgs/{org}/organization-roles"],
		listOrganizationFineGrainedPermissions: ["GET /orgs/{org}/organization-fine-grained-permissions"],
		listOutsideCollaborators: ["GET /orgs/{org}/outside_collaborators"],
		listPatGrantRepositories: ["GET /orgs/{org}/personal-access-tokens/{pat_id}/repositories"],
		listPatGrantRequestRepositories: ["GET /orgs/{org}/personal-access-token-requests/{pat_request_id}/repositories"],
		listPatGrantRequests: ["GET /orgs/{org}/personal-access-token-requests"],
		listPatGrants: ["GET /orgs/{org}/personal-access-tokens"],
		listPendingInvitations: ["GET /orgs/{org}/invitations"],
		listPublicMembers: ["GET /orgs/{org}/public_members"],
		listSecurityManagerTeams: [
			"GET /orgs/{org}/security-managers",
			{},
			{ deprecated: "octokit.rest.orgs.listSecurityManagerTeams() is deprecated, see https://docs.github.com/rest/orgs/security-managers#list-security-manager-teams" }
		],
		listWebhookDeliveries: ["GET /orgs/{org}/hooks/{hook_id}/deliveries"],
		listWebhooks: ["GET /orgs/{org}/hooks"],
		pingWebhook: ["POST /orgs/{org}/hooks/{hook_id}/pings"],
		redeliverWebhookDelivery: ["POST /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"],
		removeMember: ["DELETE /orgs/{org}/members/{username}"],
		removeMembershipForUser: ["DELETE /orgs/{org}/memberships/{username}"],
		removeOutsideCollaborator: ["DELETE /orgs/{org}/outside_collaborators/{username}"],
		removePublicMembershipForAuthenticatedUser: ["DELETE /orgs/{org}/public_members/{username}"],
		removeSecurityManagerTeam: [
			"DELETE /orgs/{org}/security-managers/teams/{team_slug}",
			{},
			{ deprecated: "octokit.rest.orgs.removeSecurityManagerTeam() is deprecated, see https://docs.github.com/rest/orgs/security-managers#remove-a-security-manager-team" }
		],
		reviewPatGrantRequest: ["POST /orgs/{org}/personal-access-token-requests/{pat_request_id}"],
		reviewPatGrantRequestsInBulk: ["POST /orgs/{org}/personal-access-token-requests"],
		revokeAllOrgRolesTeam: ["DELETE /orgs/{org}/organization-roles/teams/{team_slug}"],
		revokeAllOrgRolesUser: ["DELETE /orgs/{org}/organization-roles/users/{username}"],
		revokeOrgRoleTeam: ["DELETE /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}"],
		revokeOrgRoleUser: ["DELETE /orgs/{org}/organization-roles/users/{username}/{role_id}"],
		setImmutableReleasesSettings: ["PUT /orgs/{org}/settings/immutable-releases"],
		setImmutableReleasesSettingsRepositories: ["PUT /orgs/{org}/settings/immutable-releases/repositories"],
		setMembershipForUser: ["PUT /orgs/{org}/memberships/{username}"],
		setPublicMembershipForAuthenticatedUser: ["PUT /orgs/{org}/public_members/{username}"],
		unblockUser: ["DELETE /orgs/{org}/blocks/{username}"],
		update: ["PATCH /orgs/{org}"],
		updateIssueType: ["PUT /orgs/{org}/issue-types/{issue_type_id}"],
		updateMembershipForAuthenticatedUser: ["PATCH /user/memberships/orgs/{org}"],
		updatePatAccess: ["POST /orgs/{org}/personal-access-tokens/{pat_id}"],
		updatePatAccesses: ["POST /orgs/{org}/personal-access-tokens"],
		updateWebhook: ["PATCH /orgs/{org}/hooks/{hook_id}"],
		updateWebhookConfigForOrg: ["PATCH /orgs/{org}/hooks/{hook_id}/config"]
	},
	packages: {
		deletePackageForAuthenticatedUser: ["DELETE /user/packages/{package_type}/{package_name}"],
		deletePackageForOrg: ["DELETE /orgs/{org}/packages/{package_type}/{package_name}"],
		deletePackageForUser: ["DELETE /users/{username}/packages/{package_type}/{package_name}"],
		deletePackageVersionForAuthenticatedUser: ["DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}"],
		deletePackageVersionForOrg: ["DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"],
		deletePackageVersionForUser: ["DELETE /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"],
		getAllPackageVersionsForAPackageOwnedByAnOrg: [
			"GET /orgs/{org}/packages/{package_type}/{package_name}/versions",
			{},
			{ renamed: ["packages", "getAllPackageVersionsForPackageOwnedByOrg"] }
		],
		getAllPackageVersionsForAPackageOwnedByTheAuthenticatedUser: [
			"GET /user/packages/{package_type}/{package_name}/versions",
			{},
			{ renamed: ["packages", "getAllPackageVersionsForPackageOwnedByAuthenticatedUser"] }
		],
		getAllPackageVersionsForPackageOwnedByAuthenticatedUser: ["GET /user/packages/{package_type}/{package_name}/versions"],
		getAllPackageVersionsForPackageOwnedByOrg: ["GET /orgs/{org}/packages/{package_type}/{package_name}/versions"],
		getAllPackageVersionsForPackageOwnedByUser: ["GET /users/{username}/packages/{package_type}/{package_name}/versions"],
		getPackageForAuthenticatedUser: ["GET /user/packages/{package_type}/{package_name}"],
		getPackageForOrganization: ["GET /orgs/{org}/packages/{package_type}/{package_name}"],
		getPackageForUser: ["GET /users/{username}/packages/{package_type}/{package_name}"],
		getPackageVersionForAuthenticatedUser: ["GET /user/packages/{package_type}/{package_name}/versions/{package_version_id}"],
		getPackageVersionForOrganization: ["GET /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"],
		getPackageVersionForUser: ["GET /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"],
		listDockerMigrationConflictingPackagesForAuthenticatedUser: ["GET /user/docker/conflicts"],
		listDockerMigrationConflictingPackagesForOrganization: ["GET /orgs/{org}/docker/conflicts"],
		listDockerMigrationConflictingPackagesForUser: ["GET /users/{username}/docker/conflicts"],
		listPackagesForAuthenticatedUser: ["GET /user/packages"],
		listPackagesForOrganization: ["GET /orgs/{org}/packages"],
		listPackagesForUser: ["GET /users/{username}/packages"],
		restorePackageForAuthenticatedUser: ["POST /user/packages/{package_type}/{package_name}/restore{?token}"],
		restorePackageForOrg: ["POST /orgs/{org}/packages/{package_type}/{package_name}/restore{?token}"],
		restorePackageForUser: ["POST /users/{username}/packages/{package_type}/{package_name}/restore{?token}"],
		restorePackageVersionForAuthenticatedUser: ["POST /user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"],
		restorePackageVersionForOrg: ["POST /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"],
		restorePackageVersionForUser: ["POST /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"]
	},
	privateRegistries: {
		createOrgPrivateRegistry: ["POST /orgs/{org}/private-registries"],
		deleteOrgPrivateRegistry: ["DELETE /orgs/{org}/private-registries/{secret_name}"],
		getOrgPrivateRegistry: ["GET /orgs/{org}/private-registries/{secret_name}"],
		getOrgPublicKey: ["GET /orgs/{org}/private-registries/public-key"],
		listOrgPrivateRegistries: ["GET /orgs/{org}/private-registries"],
		updateOrgPrivateRegistry: ["PATCH /orgs/{org}/private-registries/{secret_name}"]
	},
	projects: {
		addItemForOrg: ["POST /orgs/{org}/projectsV2/{project_number}/items"],
		addItemForUser: ["POST /users/{username}/projectsV2/{project_number}/items"],
		deleteItemForOrg: ["DELETE /orgs/{org}/projectsV2/{project_number}/items/{item_id}"],
		deleteItemForUser: ["DELETE /users/{username}/projectsV2/{project_number}/items/{item_id}"],
		getFieldForOrg: ["GET /orgs/{org}/projectsV2/{project_number}/fields/{field_id}"],
		getFieldForUser: ["GET /users/{username}/projectsV2/{project_number}/fields/{field_id}"],
		getForOrg: ["GET /orgs/{org}/projectsV2/{project_number}"],
		getForUser: ["GET /users/{username}/projectsV2/{project_number}"],
		getOrgItem: ["GET /orgs/{org}/projectsV2/{project_number}/items/{item_id}"],
		getUserItem: ["GET /users/{username}/projectsV2/{project_number}/items/{item_id}"],
		listFieldsForOrg: ["GET /orgs/{org}/projectsV2/{project_number}/fields"],
		listFieldsForUser: ["GET /users/{username}/projectsV2/{project_number}/fields"],
		listForOrg: ["GET /orgs/{org}/projectsV2"],
		listForUser: ["GET /users/{username}/projectsV2"],
		listItemsForOrg: ["GET /orgs/{org}/projectsV2/{project_number}/items"],
		listItemsForUser: ["GET /users/{username}/projectsV2/{project_number}/items"],
		updateItemForOrg: ["PATCH /orgs/{org}/projectsV2/{project_number}/items/{item_id}"],
		updateItemForUser: ["PATCH /users/{username}/projectsV2/{project_number}/items/{item_id}"]
	},
	pulls: {
		checkIfMerged: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
		create: ["POST /repos/{owner}/{repo}/pulls"],
		createReplyForReviewComment: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies"],
		createReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
		createReviewComment: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/comments"],
		deletePendingReview: ["DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"],
		deleteReviewComment: ["DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
		dismissReview: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals"],
		get: ["GET /repos/{owner}/{repo}/pulls/{pull_number}"],
		getReview: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"],
		getReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
		list: ["GET /repos/{owner}/{repo}/pulls"],
		listCommentsForReview: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments"],
		listCommits: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/commits"],
		listFiles: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"],
		listRequestedReviewers: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"],
		listReviewComments: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/comments"],
		listReviewCommentsForRepo: ["GET /repos/{owner}/{repo}/pulls/comments"],
		listReviews: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
		merge: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
		removeRequestedReviewers: ["DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"],
		requestReviewers: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"],
		submitReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events"],
		update: ["PATCH /repos/{owner}/{repo}/pulls/{pull_number}"],
		updateBranch: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch"],
		updateReview: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"],
		updateReviewComment: ["PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}"]
	},
	rateLimit: { get: ["GET /rate_limit"] },
	reactions: {
		createForCommitComment: ["POST /repos/{owner}/{repo}/comments/{comment_id}/reactions"],
		createForIssue: ["POST /repos/{owner}/{repo}/issues/{issue_number}/reactions"],
		createForIssueComment: ["POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"],
		createForPullRequestReviewComment: ["POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"],
		createForRelease: ["POST /repos/{owner}/{repo}/releases/{release_id}/reactions"],
		createForTeamDiscussionCommentInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"],
		createForTeamDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"],
		deleteForCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}"],
		deleteForIssue: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}"],
		deleteForIssueComment: ["DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}"],
		deleteForPullRequestComment: ["DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}"],
		deleteForRelease: ["DELETE /repos/{owner}/{repo}/releases/{release_id}/reactions/{reaction_id}"],
		deleteForTeamDiscussion: ["DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}"],
		deleteForTeamDiscussionComment: ["DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}"],
		listForCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}/reactions"],
		listForIssue: ["GET /repos/{owner}/{repo}/issues/{issue_number}/reactions"],
		listForIssueComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"],
		listForPullRequestReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"],
		listForRelease: ["GET /repos/{owner}/{repo}/releases/{release_id}/reactions"],
		listForTeamDiscussionCommentInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"],
		listForTeamDiscussionInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"]
	},
	repos: {
		acceptInvitation: [
			"PATCH /user/repository_invitations/{invitation_id}",
			{},
			{ renamed: ["repos", "acceptInvitationForAuthenticatedUser"] }
		],
		acceptInvitationForAuthenticatedUser: ["PATCH /user/repository_invitations/{invitation_id}"],
		addAppAccessRestrictions: [
			"POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
			{},
			{ mapToData: "apps" }
		],
		addCollaborator: ["PUT /repos/{owner}/{repo}/collaborators/{username}"],
		addStatusCheckContexts: [
			"POST /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
			{},
			{ mapToData: "contexts" }
		],
		addTeamAccessRestrictions: [
			"POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
			{},
			{ mapToData: "teams" }
		],
		addUserAccessRestrictions: [
			"POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
			{},
			{ mapToData: "users" }
		],
		cancelPagesDeployment: ["POST /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}/cancel"],
		checkAutomatedSecurityFixes: ["GET /repos/{owner}/{repo}/automated-security-fixes"],
		checkCollaborator: ["GET /repos/{owner}/{repo}/collaborators/{username}"],
		checkImmutableReleases: ["GET /repos/{owner}/{repo}/immutable-releases"],
		checkPrivateVulnerabilityReporting: ["GET /repos/{owner}/{repo}/private-vulnerability-reporting"],
		checkVulnerabilityAlerts: ["GET /repos/{owner}/{repo}/vulnerability-alerts"],
		codeownersErrors: ["GET /repos/{owner}/{repo}/codeowners/errors"],
		compareCommits: ["GET /repos/{owner}/{repo}/compare/{base}...{head}"],
		compareCommitsWithBasehead: ["GET /repos/{owner}/{repo}/compare/{basehead}"],
		createAttestation: ["POST /repos/{owner}/{repo}/attestations"],
		createAutolink: ["POST /repos/{owner}/{repo}/autolinks"],
		createCommitComment: ["POST /repos/{owner}/{repo}/commits/{commit_sha}/comments"],
		createCommitSignatureProtection: ["POST /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"],
		createCommitStatus: ["POST /repos/{owner}/{repo}/statuses/{sha}"],
		createDeployKey: ["POST /repos/{owner}/{repo}/keys"],
		createDeployment: ["POST /repos/{owner}/{repo}/deployments"],
		createDeploymentBranchPolicy: ["POST /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies"],
		createDeploymentProtectionRule: ["POST /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules"],
		createDeploymentStatus: ["POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"],
		createDispatchEvent: ["POST /repos/{owner}/{repo}/dispatches"],
		createForAuthenticatedUser: ["POST /user/repos"],
		createFork: ["POST /repos/{owner}/{repo}/forks"],
		createInOrg: ["POST /orgs/{org}/repos"],
		createOrUpdateEnvironment: ["PUT /repos/{owner}/{repo}/environments/{environment_name}"],
		createOrUpdateFileContents: ["PUT /repos/{owner}/{repo}/contents/{path}"],
		createOrgRuleset: ["POST /orgs/{org}/rulesets"],
		createPagesDeployment: ["POST /repos/{owner}/{repo}/pages/deployments"],
		createPagesSite: ["POST /repos/{owner}/{repo}/pages"],
		createRelease: ["POST /repos/{owner}/{repo}/releases"],
		createRepoRuleset: ["POST /repos/{owner}/{repo}/rulesets"],
		createUsingTemplate: ["POST /repos/{template_owner}/{template_repo}/generate"],
		createWebhook: ["POST /repos/{owner}/{repo}/hooks"],
		customPropertiesForReposCreateOrUpdateRepositoryValues: ["PATCH /repos/{owner}/{repo}/properties/values"],
		customPropertiesForReposGetRepositoryValues: ["GET /repos/{owner}/{repo}/properties/values"],
		declineInvitation: [
			"DELETE /user/repository_invitations/{invitation_id}",
			{},
			{ renamed: ["repos", "declineInvitationForAuthenticatedUser"] }
		],
		declineInvitationForAuthenticatedUser: ["DELETE /user/repository_invitations/{invitation_id}"],
		delete: ["DELETE /repos/{owner}/{repo}"],
		deleteAccessRestrictions: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"],
		deleteAdminBranchProtection: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"],
		deleteAnEnvironment: ["DELETE /repos/{owner}/{repo}/environments/{environment_name}"],
		deleteAutolink: ["DELETE /repos/{owner}/{repo}/autolinks/{autolink_id}"],
		deleteBranchProtection: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection"],
		deleteCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}"],
		deleteCommitSignatureProtection: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"],
		deleteDeployKey: ["DELETE /repos/{owner}/{repo}/keys/{key_id}"],
		deleteDeployment: ["DELETE /repos/{owner}/{repo}/deployments/{deployment_id}"],
		deleteDeploymentBranchPolicy: ["DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"],
		deleteFile: ["DELETE /repos/{owner}/{repo}/contents/{path}"],
		deleteInvitation: ["DELETE /repos/{owner}/{repo}/invitations/{invitation_id}"],
		deleteOrgRuleset: ["DELETE /orgs/{org}/rulesets/{ruleset_id}"],
		deletePagesSite: ["DELETE /repos/{owner}/{repo}/pages"],
		deletePullRequestReviewProtection: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"],
		deleteRelease: ["DELETE /repos/{owner}/{repo}/releases/{release_id}"],
		deleteReleaseAsset: ["DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}"],
		deleteRepoRuleset: ["DELETE /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
		deleteWebhook: ["DELETE /repos/{owner}/{repo}/hooks/{hook_id}"],
		disableAutomatedSecurityFixes: ["DELETE /repos/{owner}/{repo}/automated-security-fixes"],
		disableDeploymentProtectionRule: ["DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}"],
		disableImmutableReleases: ["DELETE /repos/{owner}/{repo}/immutable-releases"],
		disablePrivateVulnerabilityReporting: ["DELETE /repos/{owner}/{repo}/private-vulnerability-reporting"],
		disableVulnerabilityAlerts: ["DELETE /repos/{owner}/{repo}/vulnerability-alerts"],
		downloadArchive: [
			"GET /repos/{owner}/{repo}/zipball/{ref}",
			{},
			{ renamed: ["repos", "downloadZipballArchive"] }
		],
		downloadTarballArchive: ["GET /repos/{owner}/{repo}/tarball/{ref}"],
		downloadZipballArchive: ["GET /repos/{owner}/{repo}/zipball/{ref}"],
		enableAutomatedSecurityFixes: ["PUT /repos/{owner}/{repo}/automated-security-fixes"],
		enableImmutableReleases: ["PUT /repos/{owner}/{repo}/immutable-releases"],
		enablePrivateVulnerabilityReporting: ["PUT /repos/{owner}/{repo}/private-vulnerability-reporting"],
		enableVulnerabilityAlerts: ["PUT /repos/{owner}/{repo}/vulnerability-alerts"],
		generateReleaseNotes: ["POST /repos/{owner}/{repo}/releases/generate-notes"],
		get: ["GET /repos/{owner}/{repo}"],
		getAccessRestrictions: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"],
		getAdminBranchProtection: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"],
		getAllDeploymentProtectionRules: ["GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules"],
		getAllEnvironments: ["GET /repos/{owner}/{repo}/environments"],
		getAllStatusCheckContexts: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts"],
		getAllTopics: ["GET /repos/{owner}/{repo}/topics"],
		getAppsWithAccessToProtectedBranch: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps"],
		getAutolink: ["GET /repos/{owner}/{repo}/autolinks/{autolink_id}"],
		getBranch: ["GET /repos/{owner}/{repo}/branches/{branch}"],
		getBranchProtection: ["GET /repos/{owner}/{repo}/branches/{branch}/protection"],
		getBranchRules: ["GET /repos/{owner}/{repo}/rules/branches/{branch}"],
		getClones: ["GET /repos/{owner}/{repo}/traffic/clones"],
		getCodeFrequencyStats: ["GET /repos/{owner}/{repo}/stats/code_frequency"],
		getCollaboratorPermissionLevel: ["GET /repos/{owner}/{repo}/collaborators/{username}/permission"],
		getCombinedStatusForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/status"],
		getCommit: ["GET /repos/{owner}/{repo}/commits/{ref}"],
		getCommitActivityStats: ["GET /repos/{owner}/{repo}/stats/commit_activity"],
		getCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}"],
		getCommitSignatureProtection: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"],
		getCommunityProfileMetrics: ["GET /repos/{owner}/{repo}/community/profile"],
		getContent: ["GET /repos/{owner}/{repo}/contents/{path}"],
		getContributorsStats: ["GET /repos/{owner}/{repo}/stats/contributors"],
		getCustomDeploymentProtectionRule: ["GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}"],
		getDeployKey: ["GET /repos/{owner}/{repo}/keys/{key_id}"],
		getDeployment: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}"],
		getDeploymentBranchPolicy: ["GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"],
		getDeploymentStatus: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}"],
		getEnvironment: ["GET /repos/{owner}/{repo}/environments/{environment_name}"],
		getLatestPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/latest"],
		getLatestRelease: ["GET /repos/{owner}/{repo}/releases/latest"],
		getOrgRuleSuite: ["GET /orgs/{org}/rulesets/rule-suites/{rule_suite_id}"],
		getOrgRuleSuites: ["GET /orgs/{org}/rulesets/rule-suites"],
		getOrgRuleset: ["GET /orgs/{org}/rulesets/{ruleset_id}"],
		getOrgRulesets: ["GET /orgs/{org}/rulesets"],
		getPages: ["GET /repos/{owner}/{repo}/pages"],
		getPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/{build_id}"],
		getPagesDeployment: ["GET /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}"],
		getPagesHealthCheck: ["GET /repos/{owner}/{repo}/pages/health"],
		getParticipationStats: ["GET /repos/{owner}/{repo}/stats/participation"],
		getPullRequestReviewProtection: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"],
		getPunchCardStats: ["GET /repos/{owner}/{repo}/stats/punch_card"],
		getReadme: ["GET /repos/{owner}/{repo}/readme"],
		getReadmeInDirectory: ["GET /repos/{owner}/{repo}/readme/{dir}"],
		getRelease: ["GET /repos/{owner}/{repo}/releases/{release_id}"],
		getReleaseAsset: ["GET /repos/{owner}/{repo}/releases/assets/{asset_id}"],
		getReleaseByTag: ["GET /repos/{owner}/{repo}/releases/tags/{tag}"],
		getRepoRuleSuite: ["GET /repos/{owner}/{repo}/rulesets/rule-suites/{rule_suite_id}"],
		getRepoRuleSuites: ["GET /repos/{owner}/{repo}/rulesets/rule-suites"],
		getRepoRuleset: ["GET /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
		getRepoRulesetHistory: ["GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history"],
		getRepoRulesetVersion: ["GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history/{version_id}"],
		getRepoRulesets: ["GET /repos/{owner}/{repo}/rulesets"],
		getStatusChecksProtection: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"],
		getTeamsWithAccessToProtectedBranch: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams"],
		getTopPaths: ["GET /repos/{owner}/{repo}/traffic/popular/paths"],
		getTopReferrers: ["GET /repos/{owner}/{repo}/traffic/popular/referrers"],
		getUsersWithAccessToProtectedBranch: ["GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users"],
		getViews: ["GET /repos/{owner}/{repo}/traffic/views"],
		getWebhook: ["GET /repos/{owner}/{repo}/hooks/{hook_id}"],
		getWebhookConfigForRepo: ["GET /repos/{owner}/{repo}/hooks/{hook_id}/config"],
		getWebhookDelivery: ["GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}"],
		listActivities: ["GET /repos/{owner}/{repo}/activity"],
		listAttestations: ["GET /repos/{owner}/{repo}/attestations/{subject_digest}"],
		listAutolinks: ["GET /repos/{owner}/{repo}/autolinks"],
		listBranches: ["GET /repos/{owner}/{repo}/branches"],
		listBranchesForHeadCommit: ["GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head"],
		listCollaborators: ["GET /repos/{owner}/{repo}/collaborators"],
		listCommentsForCommit: ["GET /repos/{owner}/{repo}/commits/{commit_sha}/comments"],
		listCommitCommentsForRepo: ["GET /repos/{owner}/{repo}/comments"],
		listCommitStatusesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/statuses"],
		listCommits: ["GET /repos/{owner}/{repo}/commits"],
		listContributors: ["GET /repos/{owner}/{repo}/contributors"],
		listCustomDeploymentRuleIntegrations: ["GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps"],
		listDeployKeys: ["GET /repos/{owner}/{repo}/keys"],
		listDeploymentBranchPolicies: ["GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies"],
		listDeploymentStatuses: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"],
		listDeployments: ["GET /repos/{owner}/{repo}/deployments"],
		listForAuthenticatedUser: ["GET /user/repos"],
		listForOrg: ["GET /orgs/{org}/repos"],
		listForUser: ["GET /users/{username}/repos"],
		listForks: ["GET /repos/{owner}/{repo}/forks"],
		listInvitations: ["GET /repos/{owner}/{repo}/invitations"],
		listInvitationsForAuthenticatedUser: ["GET /user/repository_invitations"],
		listLanguages: ["GET /repos/{owner}/{repo}/languages"],
		listPagesBuilds: ["GET /repos/{owner}/{repo}/pages/builds"],
		listPublic: ["GET /repositories"],
		listPullRequestsAssociatedWithCommit: ["GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls"],
		listReleaseAssets: ["GET /repos/{owner}/{repo}/releases/{release_id}/assets"],
		listReleases: ["GET /repos/{owner}/{repo}/releases"],
		listTags: ["GET /repos/{owner}/{repo}/tags"],
		listTeams: ["GET /repos/{owner}/{repo}/teams"],
		listWebhookDeliveries: ["GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries"],
		listWebhooks: ["GET /repos/{owner}/{repo}/hooks"],
		merge: ["POST /repos/{owner}/{repo}/merges"],
		mergeUpstream: ["POST /repos/{owner}/{repo}/merge-upstream"],
		pingWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/pings"],
		redeliverWebhookDelivery: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"],
		removeAppAccessRestrictions: [
			"DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
			{},
			{ mapToData: "apps" }
		],
		removeCollaborator: ["DELETE /repos/{owner}/{repo}/collaborators/{username}"],
		removeStatusCheckContexts: [
			"DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
			{},
			{ mapToData: "contexts" }
		],
		removeStatusCheckProtection: ["DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"],
		removeTeamAccessRestrictions: [
			"DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
			{},
			{ mapToData: "teams" }
		],
		removeUserAccessRestrictions: [
			"DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
			{},
			{ mapToData: "users" }
		],
		renameBranch: ["POST /repos/{owner}/{repo}/branches/{branch}/rename"],
		replaceAllTopics: ["PUT /repos/{owner}/{repo}/topics"],
		requestPagesBuild: ["POST /repos/{owner}/{repo}/pages/builds"],
		setAdminBranchProtection: ["POST /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"],
		setAppAccessRestrictions: [
			"PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
			{},
			{ mapToData: "apps" }
		],
		setStatusCheckContexts: [
			"PUT /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
			{},
			{ mapToData: "contexts" }
		],
		setTeamAccessRestrictions: [
			"PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
			{},
			{ mapToData: "teams" }
		],
		setUserAccessRestrictions: [
			"PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
			{},
			{ mapToData: "users" }
		],
		testPushWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/tests"],
		transfer: ["POST /repos/{owner}/{repo}/transfer"],
		update: ["PATCH /repos/{owner}/{repo}"],
		updateBranchProtection: ["PUT /repos/{owner}/{repo}/branches/{branch}/protection"],
		updateCommitComment: ["PATCH /repos/{owner}/{repo}/comments/{comment_id}"],
		updateDeploymentBranchPolicy: ["PUT /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"],
		updateInformationAboutPagesSite: ["PUT /repos/{owner}/{repo}/pages"],
		updateInvitation: ["PATCH /repos/{owner}/{repo}/invitations/{invitation_id}"],
		updateOrgRuleset: ["PUT /orgs/{org}/rulesets/{ruleset_id}"],
		updatePullRequestReviewProtection: ["PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"],
		updateRelease: ["PATCH /repos/{owner}/{repo}/releases/{release_id}"],
		updateReleaseAsset: ["PATCH /repos/{owner}/{repo}/releases/assets/{asset_id}"],
		updateRepoRuleset: ["PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
		updateStatusCheckPotection: [
			"PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
			{},
			{ renamed: ["repos", "updateStatusCheckProtection"] }
		],
		updateStatusCheckProtection: ["PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"],
		updateWebhook: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}"],
		updateWebhookConfigForRepo: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}/config"],
		uploadReleaseAsset: ["POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}", { baseUrl: "https://uploads.github.com" }]
	},
	search: {
		code: ["GET /search/code"],
		commits: ["GET /search/commits"],
		issuesAndPullRequests: ["GET /search/issues"],
		labels: ["GET /search/labels"],
		repos: ["GET /search/repositories"],
		topics: ["GET /search/topics"],
		users: ["GET /search/users"]
	},
	secretScanning: {
		createPushProtectionBypass: ["POST /repos/{owner}/{repo}/secret-scanning/push-protection-bypasses"],
		getAlert: ["GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"],
		getScanHistory: ["GET /repos/{owner}/{repo}/secret-scanning/scan-history"],
		listAlertsForOrg: ["GET /orgs/{org}/secret-scanning/alerts"],
		listAlertsForRepo: ["GET /repos/{owner}/{repo}/secret-scanning/alerts"],
		listLocationsForAlert: ["GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations"],
		listOrgPatternConfigs: ["GET /orgs/{org}/secret-scanning/pattern-configurations"],
		updateAlert: ["PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"],
		updateOrgPatternConfigs: ["PATCH /orgs/{org}/secret-scanning/pattern-configurations"]
	},
	securityAdvisories: {
		createFork: ["POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/forks"],
		createPrivateVulnerabilityReport: ["POST /repos/{owner}/{repo}/security-advisories/reports"],
		createRepositoryAdvisory: ["POST /repos/{owner}/{repo}/security-advisories"],
		createRepositoryAdvisoryCveRequest: ["POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/cve"],
		getGlobalAdvisory: ["GET /advisories/{ghsa_id}"],
		getRepositoryAdvisory: ["GET /repos/{owner}/{repo}/security-advisories/{ghsa_id}"],
		listGlobalAdvisories: ["GET /advisories"],
		listOrgRepositoryAdvisories: ["GET /orgs/{org}/security-advisories"],
		listRepositoryAdvisories: ["GET /repos/{owner}/{repo}/security-advisories"],
		updateRepositoryAdvisory: ["PATCH /repos/{owner}/{repo}/security-advisories/{ghsa_id}"]
	},
	teams: {
		addOrUpdateMembershipForUserInOrg: ["PUT /orgs/{org}/teams/{team_slug}/memberships/{username}"],
		addOrUpdateRepoPermissionsInOrg: ["PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"],
		checkPermissionsForRepoInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"],
		create: ["POST /orgs/{org}/teams"],
		createDiscussionCommentInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"],
		createDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions"],
		deleteDiscussionCommentInOrg: ["DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"],
		deleteDiscussionInOrg: ["DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"],
		deleteInOrg: ["DELETE /orgs/{org}/teams/{team_slug}"],
		getByName: ["GET /orgs/{org}/teams/{team_slug}"],
		getDiscussionCommentInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"],
		getDiscussionInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"],
		getMembershipForUserInOrg: ["GET /orgs/{org}/teams/{team_slug}/memberships/{username}"],
		list: ["GET /orgs/{org}/teams"],
		listChildInOrg: ["GET /orgs/{org}/teams/{team_slug}/teams"],
		listDiscussionCommentsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"],
		listDiscussionsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions"],
		listForAuthenticatedUser: ["GET /user/teams"],
		listMembersInOrg: ["GET /orgs/{org}/teams/{team_slug}/members"],
		listPendingInvitationsInOrg: ["GET /orgs/{org}/teams/{team_slug}/invitations"],
		listReposInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos"],
		removeMembershipForUserInOrg: ["DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}"],
		removeRepoInOrg: ["DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"],
		updateDiscussionCommentInOrg: ["PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"],
		updateDiscussionInOrg: ["PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"],
		updateInOrg: ["PATCH /orgs/{org}/teams/{team_slug}"]
	},
	users: {
		addEmailForAuthenticated: [
			"POST /user/emails",
			{},
			{ renamed: ["users", "addEmailForAuthenticatedUser"] }
		],
		addEmailForAuthenticatedUser: ["POST /user/emails"],
		addSocialAccountForAuthenticatedUser: ["POST /user/social_accounts"],
		block: ["PUT /user/blocks/{username}"],
		checkBlocked: ["GET /user/blocks/{username}"],
		checkFollowingForUser: ["GET /users/{username}/following/{target_user}"],
		checkPersonIsFollowedByAuthenticated: ["GET /user/following/{username}"],
		createGpgKeyForAuthenticated: [
			"POST /user/gpg_keys",
			{},
			{ renamed: ["users", "createGpgKeyForAuthenticatedUser"] }
		],
		createGpgKeyForAuthenticatedUser: ["POST /user/gpg_keys"],
		createPublicSshKeyForAuthenticated: [
			"POST /user/keys",
			{},
			{ renamed: ["users", "createPublicSshKeyForAuthenticatedUser"] }
		],
		createPublicSshKeyForAuthenticatedUser: ["POST /user/keys"],
		createSshSigningKeyForAuthenticatedUser: ["POST /user/ssh_signing_keys"],
		deleteAttestationsBulk: ["POST /users/{username}/attestations/delete-request"],
		deleteAttestationsById: ["DELETE /users/{username}/attestations/{attestation_id}"],
		deleteAttestationsBySubjectDigest: ["DELETE /users/{username}/attestations/digest/{subject_digest}"],
		deleteEmailForAuthenticated: [
			"DELETE /user/emails",
			{},
			{ renamed: ["users", "deleteEmailForAuthenticatedUser"] }
		],
		deleteEmailForAuthenticatedUser: ["DELETE /user/emails"],
		deleteGpgKeyForAuthenticated: [
			"DELETE /user/gpg_keys/{gpg_key_id}",
			{},
			{ renamed: ["users", "deleteGpgKeyForAuthenticatedUser"] }
		],
		deleteGpgKeyForAuthenticatedUser: ["DELETE /user/gpg_keys/{gpg_key_id}"],
		deletePublicSshKeyForAuthenticated: [
			"DELETE /user/keys/{key_id}",
			{},
			{ renamed: ["users", "deletePublicSshKeyForAuthenticatedUser"] }
		],
		deletePublicSshKeyForAuthenticatedUser: ["DELETE /user/keys/{key_id}"],
		deleteSocialAccountForAuthenticatedUser: ["DELETE /user/social_accounts"],
		deleteSshSigningKeyForAuthenticatedUser: ["DELETE /user/ssh_signing_keys/{ssh_signing_key_id}"],
		follow: ["PUT /user/following/{username}"],
		getAuthenticated: ["GET /user"],
		getById: ["GET /user/{account_id}"],
		getByUsername: ["GET /users/{username}"],
		getContextForUser: ["GET /users/{username}/hovercard"],
		getGpgKeyForAuthenticated: [
			"GET /user/gpg_keys/{gpg_key_id}",
			{},
			{ renamed: ["users", "getGpgKeyForAuthenticatedUser"] }
		],
		getGpgKeyForAuthenticatedUser: ["GET /user/gpg_keys/{gpg_key_id}"],
		getPublicSshKeyForAuthenticated: [
			"GET /user/keys/{key_id}",
			{},
			{ renamed: ["users", "getPublicSshKeyForAuthenticatedUser"] }
		],
		getPublicSshKeyForAuthenticatedUser: ["GET /user/keys/{key_id}"],
		getSshSigningKeyForAuthenticatedUser: ["GET /user/ssh_signing_keys/{ssh_signing_key_id}"],
		list: ["GET /users"],
		listAttestations: ["GET /users/{username}/attestations/{subject_digest}"],
		listAttestationsBulk: ["POST /users/{username}/attestations/bulk-list{?per_page,before,after}"],
		listBlockedByAuthenticated: [
			"GET /user/blocks",
			{},
			{ renamed: ["users", "listBlockedByAuthenticatedUser"] }
		],
		listBlockedByAuthenticatedUser: ["GET /user/blocks"],
		listEmailsForAuthenticated: [
			"GET /user/emails",
			{},
			{ renamed: ["users", "listEmailsForAuthenticatedUser"] }
		],
		listEmailsForAuthenticatedUser: ["GET /user/emails"],
		listFollowedByAuthenticated: [
			"GET /user/following",
			{},
			{ renamed: ["users", "listFollowedByAuthenticatedUser"] }
		],
		listFollowedByAuthenticatedUser: ["GET /user/following"],
		listFollowersForAuthenticatedUser: ["GET /user/followers"],
		listFollowersForUser: ["GET /users/{username}/followers"],
		listFollowingForUser: ["GET /users/{username}/following"],
		listGpgKeysForAuthenticated: [
			"GET /user/gpg_keys",
			{},
			{ renamed: ["users", "listGpgKeysForAuthenticatedUser"] }
		],
		listGpgKeysForAuthenticatedUser: ["GET /user/gpg_keys"],
		listGpgKeysForUser: ["GET /users/{username}/gpg_keys"],
		listPublicEmailsForAuthenticated: [
			"GET /user/public_emails",
			{},
			{ renamed: ["users", "listPublicEmailsForAuthenticatedUser"] }
		],
		listPublicEmailsForAuthenticatedUser: ["GET /user/public_emails"],
		listPublicKeysForUser: ["GET /users/{username}/keys"],
		listPublicSshKeysForAuthenticated: [
			"GET /user/keys",
			{},
			{ renamed: ["users", "listPublicSshKeysForAuthenticatedUser"] }
		],
		listPublicSshKeysForAuthenticatedUser: ["GET /user/keys"],
		listSocialAccountsForAuthenticatedUser: ["GET /user/social_accounts"],
		listSocialAccountsForUser: ["GET /users/{username}/social_accounts"],
		listSshSigningKeysForAuthenticatedUser: ["GET /user/ssh_signing_keys"],
		listSshSigningKeysForUser: ["GET /users/{username}/ssh_signing_keys"],
		setPrimaryEmailVisibilityForAuthenticated: [
			"PATCH /user/email/visibility",
			{},
			{ renamed: ["users", "setPrimaryEmailVisibilityForAuthenticatedUser"] }
		],
		setPrimaryEmailVisibilityForAuthenticatedUser: ["PATCH /user/email/visibility"],
		unblock: ["DELETE /user/blocks/{username}"],
		unfollow: ["DELETE /user/following/{username}"],
		updateAuthenticated: ["PATCH /user"]
	}
};
//#endregion
//#region node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/endpoints-to-methods.js
var endpointMethodsMap = /* @__PURE__ */ new Map();
for (const [scope, endpoints] of Object.entries(endpoints_default)) for (const [methodName, endpoint] of Object.entries(endpoints)) {
	const [route, defaults, decorations] = endpoint;
	const [method, url] = route.split(/ /);
	const endpointDefaults = Object.assign({
		method,
		url
	}, defaults);
	if (!endpointMethodsMap.has(scope)) endpointMethodsMap.set(scope, /* @__PURE__ */ new Map());
	endpointMethodsMap.get(scope).set(methodName, {
		scope,
		methodName,
		endpointDefaults,
		decorations
	});
}
var handler = {
	has({ scope }, methodName) {
		return endpointMethodsMap.get(scope).has(methodName);
	},
	getOwnPropertyDescriptor(target, methodName) {
		return {
			value: this.get(target, methodName),
			configurable: true,
			writable: true,
			enumerable: true
		};
	},
	defineProperty(target, methodName, descriptor) {
		Object.defineProperty(target.cache, methodName, descriptor);
		return true;
	},
	deleteProperty(target, methodName) {
		delete target.cache[methodName];
		return true;
	},
	ownKeys({ scope }) {
		return [...endpointMethodsMap.get(scope).keys()];
	},
	set(target, methodName, value) {
		return target.cache[methodName] = value;
	},
	get({ octokit, scope, cache }, methodName) {
		if (cache[methodName]) return cache[methodName];
		const method = endpointMethodsMap.get(scope).get(methodName);
		if (!method) return;
		const { endpointDefaults, decorations } = method;
		if (decorations) cache[methodName] = decorate(octokit, scope, methodName, endpointDefaults, decorations);
		else cache[methodName] = octokit.request.defaults(endpointDefaults);
		return cache[methodName];
	}
};
function endpointsToMethods(octokit) {
	const newMethods = {};
	for (const scope of endpointMethodsMap.keys()) newMethods[scope] = new Proxy({
		octokit,
		scope,
		cache: {}
	}, handler);
	return newMethods;
}
function decorate(octokit, scope, methodName, defaults, decorations) {
	const requestWithDefaults = octokit.request.defaults(defaults);
	function withDecorations(...args) {
		let options = requestWithDefaults.endpoint.merge(...args);
		if (decorations.mapToData) {
			options = Object.assign({}, options, {
				data: options[decorations.mapToData],
				[decorations.mapToData]: void 0
			});
			return requestWithDefaults(options);
		}
		if (decorations.renamed) {
			const [newScope, newMethodName] = decorations.renamed;
			octokit.log.warn(`octokit.${scope}.${methodName}() has been renamed to octokit.${newScope}.${newMethodName}()`);
		}
		if (decorations.deprecated) octokit.log.warn(decorations.deprecated);
		if (decorations.renamedParameters) {
			const options2 = requestWithDefaults.endpoint.merge(...args);
			for (const [name, alias] of Object.entries(decorations.renamedParameters)) if (name in options2) {
				octokit.log.warn(`"${name}" parameter is deprecated for "octokit.${scope}.${methodName}()". Use "${alias}" instead`);
				if (!(alias in options2)) options2[alias] = options2[name];
				delete options2[name];
			}
			return requestWithDefaults(options2);
		}
		return requestWithDefaults(...args);
	}
	return Object.assign(withDecorations, requestWithDefaults);
}
//#endregion
//#region node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/index.js
function restEndpointMethods(octokit) {
	return { rest: endpointsToMethods(octokit) };
}
restEndpointMethods.VERSION = VERSION$1;
function legacyRestEndpointMethods(octokit) {
	const api = endpointsToMethods(octokit);
	return {
		...api,
		rest: api
	};
}
legacyRestEndpointMethods.VERSION = VERSION$1;
//#endregion
//#region node_modules/@octokit/plugin-retry/dist-bundle/index.js
var import_light = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This file contains the Bottleneck library (MIT), compiled to ES2017, and without Clustering support.
	* https://github.com/SGrondin/bottleneck
	*/
	(function(global, factory) {
		typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : global.Bottleneck = factory();
	})(exports, (function() {
		"use strict";
		var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
		function getCjsExportFromNamespace(n) {
			return n && n["default"] || n;
		}
		var load = function(received, defaults, onto = {}) {
			var k, ref, v;
			for (k in defaults) {
				v = defaults[k];
				onto[k] = (ref = received[k]) != null ? ref : v;
			}
			return onto;
		};
		var overwrite = function(received, defaults, onto = {}) {
			var k, v;
			for (k in received) {
				v = received[k];
				if (defaults[k] !== void 0) onto[k] = v;
			}
			return onto;
		};
		var parser = {
			load,
			overwrite
		};
		var DLList_1 = class DLList {
			constructor(incr, decr) {
				this.incr = incr;
				this.decr = decr;
				this._first = null;
				this._last = null;
				this.length = 0;
			}
			push(value) {
				var node;
				this.length++;
				if (typeof this.incr === "function") this.incr();
				node = {
					value,
					prev: this._last,
					next: null
				};
				if (this._last != null) {
					this._last.next = node;
					this._last = node;
				} else this._first = this._last = node;
			}
			shift() {
				var value;
				if (this._first == null) return;
				else {
					this.length--;
					if (typeof this.decr === "function") this.decr();
				}
				value = this._first.value;
				if ((this._first = this._first.next) != null) this._first.prev = null;
				else this._last = null;
				return value;
			}
			first() {
				if (this._first != null) return this._first.value;
			}
			getArray() {
				var node = this._first, ref, results = [];
				while (node != null) results.push((ref = node, node = node.next, ref.value));
				return results;
			}
			forEachShift(cb) {
				var node = this.shift();
				while (node != null) cb(node), node = this.shift();
			}
			debug() {
				var node = this._first, ref, ref1, ref2, results = [];
				while (node != null) results.push((ref = node, node = node.next, {
					value: ref.value,
					prev: (ref1 = ref.prev) != null ? ref1.value : void 0,
					next: (ref2 = ref.next) != null ? ref2.value : void 0
				}));
				return results;
			}
		};
		var Events_1 = class Events {
			constructor(instance) {
				this.instance = instance;
				this._events = {};
				if (this.instance.on != null || this.instance.once != null || this.instance.removeAllListeners != null) throw new Error("An Emitter already exists for this object");
				this.instance.on = (name, cb) => {
					return this._addListener(name, "many", cb);
				};
				this.instance.once = (name, cb) => {
					return this._addListener(name, "once", cb);
				};
				this.instance.removeAllListeners = (name = null) => {
					if (name != null) return delete this._events[name];
					else return this._events = {};
				};
			}
			_addListener(name, status, cb) {
				var base;
				if ((base = this._events)[name] == null) base[name] = [];
				this._events[name].push({
					cb,
					status
				});
				return this.instance;
			}
			listenerCount(name) {
				if (this._events[name] != null) return this._events[name].length;
				else return 0;
			}
			async trigger(name, ...args) {
				var e, promises;
				try {
					if (name !== "debug") this.trigger("debug", `Event triggered: ${name}`, args);
					if (this._events[name] == null) return;
					this._events[name] = this._events[name].filter(function(listener) {
						return listener.status !== "none";
					});
					promises = this._events[name].map(async (listener) => {
						var e, returned;
						if (listener.status === "none") return;
						if (listener.status === "once") listener.status = "none";
						try {
							returned = typeof listener.cb === "function" ? listener.cb(...args) : void 0;
							if (typeof (returned != null ? returned.then : void 0) === "function") return await returned;
							else return returned;
						} catch (error) {
							e = error;
							this.trigger("error", e);
							return null;
						}
					});
					return (await Promise.all(promises)).find(function(x) {
						return x != null;
					});
				} catch (error) {
					e = error;
					this.trigger("error", e);
					return null;
				}
			}
		};
		var DLList$1 = DLList_1, Events$1 = Events_1;
		var Queues_1 = class Queues {
			constructor(num_priorities) {
				this.Events = new Events$1(this);
				this._length = 0;
				this._lists = (function() {
					var j, ref, results = [];
					for (j = 1, ref = num_priorities; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? ++j : --j) results.push(new DLList$1((() => {
						return this.incr();
					}), (() => {
						return this.decr();
					})));
					return results;
				}).call(this);
			}
			incr() {
				if (this._length++ === 0) return this.Events.trigger("leftzero");
			}
			decr() {
				if (--this._length === 0) return this.Events.trigger("zero");
			}
			push(job) {
				return this._lists[job.options.priority].push(job);
			}
			queued(priority) {
				if (priority != null) return this._lists[priority].length;
				else return this._length;
			}
			shiftAll(fn) {
				return this._lists.forEach(function(list) {
					return list.forEachShift(fn);
				});
			}
			getFirst(arr = this._lists) {
				var j, len, list;
				for (j = 0, len = arr.length; j < len; j++) {
					list = arr[j];
					if (list.length > 0) return list;
				}
				return [];
			}
			shiftLastFrom(priority) {
				return this.getFirst(this._lists.slice(priority).reverse()).shift();
			}
		};
		var BottleneckError_1 = class BottleneckError extends Error {};
		var BottleneckError$1, DEFAULT_PRIORITY, Job, NUM_PRIORITIES = 10, parser$1;
		DEFAULT_PRIORITY = 5;
		parser$1 = parser;
		BottleneckError$1 = BottleneckError_1;
		Job = class Job {
			constructor(task, args, options, jobDefaults, rejectOnDrop, Events, _states, Promise) {
				this.task = task;
				this.args = args;
				this.rejectOnDrop = rejectOnDrop;
				this.Events = Events;
				this._states = _states;
				this.Promise = Promise;
				this.options = parser$1.load(options, jobDefaults);
				this.options.priority = this._sanitizePriority(this.options.priority);
				if (this.options.id === jobDefaults.id) this.options.id = `${this.options.id}-${this._randomIndex()}`;
				this.promise = new this.Promise((_resolve, _reject) => {
					this._resolve = _resolve;
					this._reject = _reject;
				});
				this.retryCount = 0;
			}
			_sanitizePriority(priority) {
				var sProperty = ~~priority !== priority ? DEFAULT_PRIORITY : priority;
				if (sProperty < 0) return 0;
				else if (sProperty > NUM_PRIORITIES - 1) return NUM_PRIORITIES - 1;
				else return sProperty;
			}
			_randomIndex() {
				return Math.random().toString(36).slice(2);
			}
			doDrop({ error, message = "This job has been dropped by Bottleneck" } = {}) {
				if (this._states.remove(this.options.id)) {
					if (this.rejectOnDrop) this._reject(error != null ? error : new BottleneckError$1(message));
					this.Events.trigger("dropped", {
						args: this.args,
						options: this.options,
						task: this.task,
						promise: this.promise
					});
					return true;
				} else return false;
			}
			_assertStatus(expected) {
				var status = this._states.jobStatus(this.options.id);
				if (!(status === expected || expected === "DONE" && status === null)) throw new BottleneckError$1(`Invalid job status ${status}, expected ${expected}. Please open an issue at https://github.com/SGrondin/bottleneck/issues`);
			}
			doReceive() {
				this._states.start(this.options.id);
				return this.Events.trigger("received", {
					args: this.args,
					options: this.options
				});
			}
			doQueue(reachedHWM, blocked) {
				this._assertStatus("RECEIVED");
				this._states.next(this.options.id);
				return this.Events.trigger("queued", {
					args: this.args,
					options: this.options,
					reachedHWM,
					blocked
				});
			}
			doRun() {
				if (this.retryCount === 0) {
					this._assertStatus("QUEUED");
					this._states.next(this.options.id);
				} else this._assertStatus("EXECUTING");
				return this.Events.trigger("scheduled", {
					args: this.args,
					options: this.options
				});
			}
			async doExecute(chained, clearGlobalState, run, free) {
				var error, eventInfo, passed;
				if (this.retryCount === 0) {
					this._assertStatus("RUNNING");
					this._states.next(this.options.id);
				} else this._assertStatus("EXECUTING");
				eventInfo = {
					args: this.args,
					options: this.options,
					retryCount: this.retryCount
				};
				this.Events.trigger("executing", eventInfo);
				try {
					passed = await (chained != null ? chained.schedule(this.options, this.task, ...this.args) : this.task(...this.args));
					if (clearGlobalState()) {
						this.doDone(eventInfo);
						await free(this.options, eventInfo);
						this._assertStatus("DONE");
						return this._resolve(passed);
					}
				} catch (error1) {
					error = error1;
					return this._onFailure(error, eventInfo, clearGlobalState, run, free);
				}
			}
			doExpire(clearGlobalState, run, free) {
				var error, eventInfo;
				if (this._states.jobStatus(this.options.id === "RUNNING")) this._states.next(this.options.id);
				this._assertStatus("EXECUTING");
				eventInfo = {
					args: this.args,
					options: this.options,
					retryCount: this.retryCount
				};
				error = new BottleneckError$1(`This job timed out after ${this.options.expiration} ms.`);
				return this._onFailure(error, eventInfo, clearGlobalState, run, free);
			}
			async _onFailure(error, eventInfo, clearGlobalState, run, free) {
				var retry, retryAfter;
				if (clearGlobalState()) {
					retry = await this.Events.trigger("failed", error, eventInfo);
					if (retry != null) {
						retryAfter = ~~retry;
						this.Events.trigger("retry", `Retrying ${this.options.id} after ${retryAfter} ms`, eventInfo);
						this.retryCount++;
						return run(retryAfter);
					} else {
						this.doDone(eventInfo);
						await free(this.options, eventInfo);
						this._assertStatus("DONE");
						return this._reject(error);
					}
				}
			}
			doDone(eventInfo) {
				this._assertStatus("EXECUTING");
				this._states.next(this.options.id);
				return this.Events.trigger("done", eventInfo);
			}
		};
		var Job_1 = Job;
		var BottleneckError$2, LocalDatastore, parser$2 = parser;
		BottleneckError$2 = BottleneckError_1;
		LocalDatastore = class LocalDatastore {
			constructor(instance, storeOptions, storeInstanceOptions) {
				this.instance = instance;
				this.storeOptions = storeOptions;
				this.clientId = this.instance._randomIndex();
				parser$2.load(storeInstanceOptions, storeInstanceOptions, this);
				this._nextRequest = this._lastReservoirRefresh = this._lastReservoirIncrease = Date.now();
				this._running = 0;
				this._done = 0;
				this._unblockTime = 0;
				this.ready = this.Promise.resolve();
				this.clients = {};
				this._startHeartbeat();
			}
			_startHeartbeat() {
				var base;
				if (this.heartbeat == null && (this.storeOptions.reservoirRefreshInterval != null && this.storeOptions.reservoirRefreshAmount != null || this.storeOptions.reservoirIncreaseInterval != null && this.storeOptions.reservoirIncreaseAmount != null)) return typeof (base = this.heartbeat = setInterval(() => {
					var amount, incr, maximum, now = Date.now(), reservoir;
					if (this.storeOptions.reservoirRefreshInterval != null && now >= this._lastReservoirRefresh + this.storeOptions.reservoirRefreshInterval) {
						this._lastReservoirRefresh = now;
						this.storeOptions.reservoir = this.storeOptions.reservoirRefreshAmount;
						this.instance._drainAll(this.computeCapacity());
					}
					if (this.storeOptions.reservoirIncreaseInterval != null && now >= this._lastReservoirIncrease + this.storeOptions.reservoirIncreaseInterval) {
						({reservoirIncreaseAmount: amount, reservoirIncreaseMaximum: maximum, reservoir} = this.storeOptions);
						this._lastReservoirIncrease = now;
						incr = maximum != null ? Math.min(amount, maximum - reservoir) : amount;
						if (incr > 0) {
							this.storeOptions.reservoir += incr;
							return this.instance._drainAll(this.computeCapacity());
						}
					}
				}, this.heartbeatInterval)).unref === "function" ? base.unref() : void 0;
				else return clearInterval(this.heartbeat);
			}
			async __publish__(message) {
				await this.yieldLoop();
				return this.instance.Events.trigger("message", message.toString());
			}
			async __disconnect__(flush) {
				await this.yieldLoop();
				clearInterval(this.heartbeat);
				return this.Promise.resolve();
			}
			yieldLoop(t = 0) {
				return new this.Promise(function(resolve, reject) {
					return setTimeout(resolve, t);
				});
			}
			computePenalty() {
				var ref;
				return (ref = this.storeOptions.penalty) != null ? ref : 15 * this.storeOptions.minTime || 5e3;
			}
			async __updateSettings__(options) {
				await this.yieldLoop();
				parser$2.overwrite(options, options, this.storeOptions);
				this._startHeartbeat();
				this.instance._drainAll(this.computeCapacity());
				return true;
			}
			async __running__() {
				await this.yieldLoop();
				return this._running;
			}
			async __queued__() {
				await this.yieldLoop();
				return this.instance.queued();
			}
			async __done__() {
				await this.yieldLoop();
				return this._done;
			}
			async __groupCheck__(time) {
				await this.yieldLoop();
				return this._nextRequest + this.timeout < time;
			}
			computeCapacity() {
				var maxConcurrent, reservoir;
				({maxConcurrent, reservoir} = this.storeOptions);
				if (maxConcurrent != null && reservoir != null) return Math.min(maxConcurrent - this._running, reservoir);
				else if (maxConcurrent != null) return maxConcurrent - this._running;
				else if (reservoir != null) return reservoir;
				else return null;
			}
			conditionsCheck(weight) {
				var capacity = this.computeCapacity();
				return capacity == null || weight <= capacity;
			}
			async __incrementReservoir__(incr) {
				var reservoir;
				await this.yieldLoop();
				reservoir = this.storeOptions.reservoir += incr;
				this.instance._drainAll(this.computeCapacity());
				return reservoir;
			}
			async __currentReservoir__() {
				await this.yieldLoop();
				return this.storeOptions.reservoir;
			}
			isBlocked(now) {
				return this._unblockTime >= now;
			}
			check(weight, now) {
				return this.conditionsCheck(weight) && this._nextRequest - now <= 0;
			}
			async __check__(weight) {
				var now;
				await this.yieldLoop();
				now = Date.now();
				return this.check(weight, now);
			}
			async __register__(index, weight, expiration) {
				var now, wait;
				await this.yieldLoop();
				now = Date.now();
				if (this.conditionsCheck(weight)) {
					this._running += weight;
					if (this.storeOptions.reservoir != null) this.storeOptions.reservoir -= weight;
					wait = Math.max(this._nextRequest - now, 0);
					this._nextRequest = now + wait + this.storeOptions.minTime;
					return {
						success: true,
						wait,
						reservoir: this.storeOptions.reservoir
					};
				} else return { success: false };
			}
			strategyIsBlock() {
				return this.storeOptions.strategy === 3;
			}
			async __submit__(queueLength, weight) {
				var blocked, now, reachedHWM;
				await this.yieldLoop();
				if (this.storeOptions.maxConcurrent != null && weight > this.storeOptions.maxConcurrent) throw new BottleneckError$2(`Impossible to add a job having a weight of ${weight} to a limiter having a maxConcurrent setting of ${this.storeOptions.maxConcurrent}`);
				now = Date.now();
				reachedHWM = this.storeOptions.highWater != null && queueLength === this.storeOptions.highWater && !this.check(weight, now);
				blocked = this.strategyIsBlock() && (reachedHWM || this.isBlocked(now));
				if (blocked) {
					this._unblockTime = now + this.computePenalty();
					this._nextRequest = this._unblockTime + this.storeOptions.minTime;
					this.instance._dropAllQueued();
				}
				return {
					reachedHWM,
					blocked,
					strategy: this.storeOptions.strategy
				};
			}
			async __free__(index, weight) {
				await this.yieldLoop();
				this._running -= weight;
				this._done += weight;
				this.instance._drainAll(this.computeCapacity());
				return { running: this._running };
			}
		};
		var LocalDatastore_1 = LocalDatastore;
		var BottleneckError$3 = BottleneckError_1;
		var States_1 = class States {
			constructor(status1) {
				this.status = status1;
				this._jobs = {};
				this.counts = this.status.map(function() {
					return 0;
				});
			}
			next(id) {
				var current = this._jobs[id], next = current + 1;
				if (current != null && next < this.status.length) {
					this.counts[current]--;
					this.counts[next]++;
					return this._jobs[id]++;
				} else if (current != null) {
					this.counts[current]--;
					return delete this._jobs[id];
				}
			}
			start(id) {
				var initial = 0;
				this._jobs[id] = initial;
				return this.counts[initial]++;
			}
			remove(id) {
				var current = this._jobs[id];
				if (current != null) {
					this.counts[current]--;
					delete this._jobs[id];
				}
				return current != null;
			}
			jobStatus(id) {
				var ref;
				return (ref = this.status[this._jobs[id]]) != null ? ref : null;
			}
			statusJobs(status) {
				var k, pos, ref, results, v;
				if (status != null) {
					pos = this.status.indexOf(status);
					if (pos < 0) throw new BottleneckError$3(`status must be one of ${this.status.join(", ")}`);
					ref = this._jobs;
					results = [];
					for (k in ref) {
						v = ref[k];
						if (v === pos) results.push(k);
					}
					return results;
				} else return Object.keys(this._jobs);
			}
			statusCounts() {
				return this.counts.reduce(((acc, v, i) => {
					acc[this.status[i]] = v;
					return acc;
				}), {});
			}
		};
		var DLList$2 = DLList_1;
		var Sync_1 = class Sync {
			constructor(name, Promise) {
				this.schedule = this.schedule.bind(this);
				this.name = name;
				this.Promise = Promise;
				this._running = 0;
				this._queue = new DLList$2();
			}
			isEmpty() {
				return this._queue.length === 0;
			}
			async _tryToRun() {
				var args, cb, error, reject, resolve, returned, task;
				if (this._running < 1 && this._queue.length > 0) {
					this._running++;
					({task, args, resolve, reject} = this._queue.shift());
					cb = await (async function() {
						try {
							returned = await task(...args);
							return function() {
								return resolve(returned);
							};
						} catch (error1) {
							error = error1;
							return function() {
								return reject(error);
							};
						}
					})();
					this._running--;
					this._tryToRun();
					return cb();
				}
			}
			schedule(task, ...args) {
				var promise, reject, resolve = reject = null;
				promise = new this.Promise(function(_resolve, _reject) {
					resolve = _resolve;
					return reject = _reject;
				});
				this._queue.push({
					task,
					args,
					resolve,
					reject
				});
				this._tryToRun();
				return promise;
			}
		};
		var version = "2.19.5";
		var version$2 = /*#__PURE__*/ Object.freeze({
			version,
			default: { version }
		});
		var require$$2 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
		var require$$3 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
		var require$$4 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
		var Events$2, Group, IORedisConnection$1, RedisConnection$1, Scripts$1, parser$3 = parser;
		Events$2 = Events_1;
		RedisConnection$1 = require$$2;
		IORedisConnection$1 = require$$3;
		Scripts$1 = require$$4;
		Group = (function() {
			class Group {
				constructor(limiterOptions = {}) {
					this.deleteKey = this.deleteKey.bind(this);
					this.limiterOptions = limiterOptions;
					parser$3.load(this.limiterOptions, this.defaults, this);
					this.Events = new Events$2(this);
					this.instances = {};
					this.Bottleneck = Bottleneck_1;
					this._startAutoCleanup();
					this.sharedConnection = this.connection != null;
					if (this.connection == null) {
						if (this.limiterOptions.datastore === "redis") this.connection = new RedisConnection$1(Object.assign({}, this.limiterOptions, { Events: this.Events }));
						else if (this.limiterOptions.datastore === "ioredis") this.connection = new IORedisConnection$1(Object.assign({}, this.limiterOptions, { Events: this.Events }));
					}
				}
				key(key = "") {
					var ref;
					return (ref = this.instances[key]) != null ? ref : (() => {
						var limiter = this.instances[key] = new this.Bottleneck(Object.assign(this.limiterOptions, {
							id: `${this.id}-${key}`,
							timeout: this.timeout,
							connection: this.connection
						}));
						this.Events.trigger("created", limiter, key);
						return limiter;
					})();
				}
				async deleteKey(key = "") {
					var deleted, instance = this.instances[key];
					if (this.connection) deleted = await this.connection.__runCommand__(["del", ...Scripts$1.allKeys(`${this.id}-${key}`)]);
					if (instance != null) {
						delete this.instances[key];
						await instance.disconnect();
					}
					return instance != null || deleted > 0;
				}
				limiters() {
					var k, ref = this.instances, results = [], v;
					for (k in ref) {
						v = ref[k];
						results.push({
							key: k,
							limiter: v
						});
					}
					return results;
				}
				keys() {
					return Object.keys(this.instances);
				}
				async clusterKeys() {
					var cursor, end, found, i, k, keys, len, next, start;
					if (this.connection == null) return this.Promise.resolve(this.keys());
					keys = [];
					cursor = null;
					start = `b_${this.id}-`.length;
					end = 9;
					while (cursor !== 0) {
						[next, found] = await this.connection.__runCommand__([
							"scan",
							cursor != null ? cursor : 0,
							"match",
							`b_${this.id}-*_settings`,
							"count",
							1e4
						]);
						cursor = ~~next;
						for (i = 0, len = found.length; i < len; i++) {
							k = found[i];
							keys.push(k.slice(start, -end));
						}
					}
					return keys;
				}
				_startAutoCleanup() {
					var base;
					clearInterval(this.interval);
					return typeof (base = this.interval = setInterval(async () => {
						var e, k, ref, results, time = Date.now(), v;
						ref = this.instances;
						results = [];
						for (k in ref) {
							v = ref[k];
							try {
								if (await v._store.__groupCheck__(time)) results.push(this.deleteKey(k));
								else results.push(void 0);
							} catch (error) {
								e = error;
								results.push(v.Events.trigger("error", e));
							}
						}
						return results;
					}, this.timeout / 2)).unref === "function" ? base.unref() : void 0;
				}
				updateSettings(options = {}) {
					parser$3.overwrite(options, this.defaults, this);
					parser$3.overwrite(options, options, this.limiterOptions);
					if (options.timeout != null) return this._startAutoCleanup();
				}
				disconnect(flush = true) {
					var ref;
					if (!this.sharedConnection) return (ref = this.connection) != null ? ref.disconnect(flush) : void 0;
				}
			}
			Group.prototype.defaults = {
				timeout: 1e3 * 60 * 5,
				connection: null,
				Promise,
				id: "group-key"
			};
			return Group;
		}).call(commonjsGlobal);
		var Group_1 = Group;
		var Batcher, Events$3, parser$4 = parser;
		Events$3 = Events_1;
		Batcher = (function() {
			class Batcher {
				constructor(options = {}) {
					this.options = options;
					parser$4.load(this.options, this.defaults, this);
					this.Events = new Events$3(this);
					this._arr = [];
					this._resetPromise();
					this._lastFlush = Date.now();
				}
				_resetPromise() {
					return this._promise = new this.Promise((res, rej) => {
						return this._resolve = res;
					});
				}
				_flush() {
					clearTimeout(this._timeout);
					this._lastFlush = Date.now();
					this._resolve();
					this.Events.trigger("batch", this._arr);
					this._arr = [];
					return this._resetPromise();
				}
				add(data) {
					var ret;
					this._arr.push(data);
					ret = this._promise;
					if (this._arr.length === this.maxSize) this._flush();
					else if (this.maxTime != null && this._arr.length === 1) this._timeout = setTimeout(() => {
						return this._flush();
					}, this.maxTime);
					return ret;
				}
			}
			Batcher.prototype.defaults = {
				maxTime: null,
				maxSize: null,
				Promise
			};
			return Batcher;
		}).call(commonjsGlobal);
		var Batcher_1 = Batcher;
		var require$$4$1 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
		var require$$8 = getCjsExportFromNamespace(version$2);
		var Bottleneck, DEFAULT_PRIORITY$1, Events$4, Job$1, LocalDatastore$1, NUM_PRIORITIES$1, Queues$1, RedisDatastore$1, States$1, Sync$1, parser$5, splice = [].splice;
		NUM_PRIORITIES$1 = 10;
		DEFAULT_PRIORITY$1 = 5;
		parser$5 = parser;
		Queues$1 = Queues_1;
		Job$1 = Job_1;
		LocalDatastore$1 = LocalDatastore_1;
		RedisDatastore$1 = require$$4$1;
		Events$4 = Events_1;
		States$1 = States_1;
		Sync$1 = Sync_1;
		Bottleneck = (function() {
			class Bottleneck {
				constructor(options = {}, ...invalid) {
					var storeInstanceOptions, storeOptions;
					this._addToQueue = this._addToQueue.bind(this);
					this._validateOptions(options, invalid);
					parser$5.load(options, this.instanceDefaults, this);
					this._queues = new Queues$1(NUM_PRIORITIES$1);
					this._scheduled = {};
					this._states = new States$1([
						"RECEIVED",
						"QUEUED",
						"RUNNING",
						"EXECUTING"
					].concat(this.trackDoneStatus ? ["DONE"] : []));
					this._limiter = null;
					this.Events = new Events$4(this);
					this._submitLock = new Sync$1("submit", this.Promise);
					this._registerLock = new Sync$1("register", this.Promise);
					storeOptions = parser$5.load(options, this.storeDefaults, {});
					this._store = (function() {
						if (this.datastore === "redis" || this.datastore === "ioredis" || this.connection != null) {
							storeInstanceOptions = parser$5.load(options, this.redisStoreDefaults, {});
							return new RedisDatastore$1(this, storeOptions, storeInstanceOptions);
						} else if (this.datastore === "local") {
							storeInstanceOptions = parser$5.load(options, this.localStoreDefaults, {});
							return new LocalDatastore$1(this, storeOptions, storeInstanceOptions);
						} else throw new Bottleneck.prototype.BottleneckError(`Invalid datastore type: ${this.datastore}`);
					}).call(this);
					this._queues.on("leftzero", () => {
						var ref;
						return (ref = this._store.heartbeat) != null ? typeof ref.ref === "function" ? ref.ref() : void 0 : void 0;
					});
					this._queues.on("zero", () => {
						var ref;
						return (ref = this._store.heartbeat) != null ? typeof ref.unref === "function" ? ref.unref() : void 0 : void 0;
					});
				}
				_validateOptions(options, invalid) {
					if (!(options != null && typeof options === "object" && invalid.length === 0)) throw new Bottleneck.prototype.BottleneckError("Bottleneck v2 takes a single object argument. Refer to https://github.com/SGrondin/bottleneck#upgrading-to-v2 if you're upgrading from Bottleneck v1.");
				}
				ready() {
					return this._store.ready;
				}
				clients() {
					return this._store.clients;
				}
				channel() {
					return `b_${this.id}`;
				}
				channel_client() {
					return `b_${this.id}_${this._store.clientId}`;
				}
				publish(message) {
					return this._store.__publish__(message);
				}
				disconnect(flush = true) {
					return this._store.__disconnect__(flush);
				}
				chain(_limiter) {
					this._limiter = _limiter;
					return this;
				}
				queued(priority) {
					return this._queues.queued(priority);
				}
				clusterQueued() {
					return this._store.__queued__();
				}
				empty() {
					return this.queued() === 0 && this._submitLock.isEmpty();
				}
				running() {
					return this._store.__running__();
				}
				done() {
					return this._store.__done__();
				}
				jobStatus(id) {
					return this._states.jobStatus(id);
				}
				jobs(status) {
					return this._states.statusJobs(status);
				}
				counts() {
					return this._states.statusCounts();
				}
				_randomIndex() {
					return Math.random().toString(36).slice(2);
				}
				check(weight = 1) {
					return this._store.__check__(weight);
				}
				_clearGlobalState(index) {
					if (this._scheduled[index] != null) {
						clearTimeout(this._scheduled[index].expiration);
						delete this._scheduled[index];
						return true;
					} else return false;
				}
				async _free(index, job, options, eventInfo) {
					var e, running;
					try {
						({running} = await this._store.__free__(index, options.weight));
						this.Events.trigger("debug", `Freed ${options.id}`, eventInfo);
						if (running === 0 && this.empty()) return this.Events.trigger("idle");
					} catch (error1) {
						e = error1;
						return this.Events.trigger("error", e);
					}
				}
				_run(index, job, wait) {
					var clearGlobalState, free, run;
					job.doRun();
					clearGlobalState = this._clearGlobalState.bind(this, index);
					run = this._run.bind(this, index, job);
					free = this._free.bind(this, index, job);
					return this._scheduled[index] = {
						timeout: setTimeout(() => {
							return job.doExecute(this._limiter, clearGlobalState, run, free);
						}, wait),
						expiration: job.options.expiration != null ? setTimeout(function() {
							return job.doExpire(clearGlobalState, run, free);
						}, wait + job.options.expiration) : void 0,
						job
					};
				}
				_drainOne(capacity) {
					return this._registerLock.schedule(() => {
						var args, index, next, options, queue;
						if (this.queued() === 0) return this.Promise.resolve(null);
						queue = this._queues.getFirst();
						({options, args} = next = queue.first());
						if (capacity != null && options.weight > capacity) return this.Promise.resolve(null);
						this.Events.trigger("debug", `Draining ${options.id}`, {
							args,
							options
						});
						index = this._randomIndex();
						return this._store.__register__(index, options.weight, options.expiration).then(({ success, wait, reservoir }) => {
							var empty;
							this.Events.trigger("debug", `Drained ${options.id}`, {
								success,
								args,
								options
							});
							if (success) {
								queue.shift();
								empty = this.empty();
								if (empty) this.Events.trigger("empty");
								if (reservoir === 0) this.Events.trigger("depleted", empty);
								this._run(index, next, wait);
								return this.Promise.resolve(options.weight);
							} else return this.Promise.resolve(null);
						});
					});
				}
				_drainAll(capacity, total = 0) {
					return this._drainOne(capacity).then((drained) => {
						var newCapacity;
						if (drained != null) {
							newCapacity = capacity != null ? capacity - drained : capacity;
							return this._drainAll(newCapacity, total + drained);
						} else return this.Promise.resolve(total);
					}).catch((e) => {
						return this.Events.trigger("error", e);
					});
				}
				_dropAllQueued(message) {
					return this._queues.shiftAll(function(job) {
						return job.doDrop({ message });
					});
				}
				stop(options = {}) {
					var done, waitForExecuting;
					options = parser$5.load(options, this.stopDefaults);
					waitForExecuting = (at) => {
						var finished = () => {
							var counts = this._states.counts;
							return counts[0] + counts[1] + counts[2] + counts[3] === at;
						};
						return new this.Promise((resolve, reject) => {
							if (finished()) return resolve();
							else return this.on("done", () => {
								if (finished()) {
									this.removeAllListeners("done");
									return resolve();
								}
							});
						});
					};
					done = options.dropWaitingJobs ? (this._run = function(index, next) {
						return next.doDrop({ message: options.dropErrorMessage });
					}, this._drainOne = () => {
						return this.Promise.resolve(null);
					}, this._registerLock.schedule(() => {
						return this._submitLock.schedule(() => {
							var k, ref = this._scheduled, v;
							for (k in ref) {
								v = ref[k];
								if (this.jobStatus(v.job.options.id) === "RUNNING") {
									clearTimeout(v.timeout);
									clearTimeout(v.expiration);
									v.job.doDrop({ message: options.dropErrorMessage });
								}
							}
							this._dropAllQueued(options.dropErrorMessage);
							return waitForExecuting(0);
						});
					})) : this.schedule({
						priority: NUM_PRIORITIES$1 - 1,
						weight: 0
					}, () => {
						return waitForExecuting(1);
					});
					this._receive = function(job) {
						return job._reject(new Bottleneck.prototype.BottleneckError(options.enqueueErrorMessage));
					};
					this.stop = () => {
						return this.Promise.reject(new Bottleneck.prototype.BottleneckError("stop() has already been called"));
					};
					return done;
				}
				async _addToQueue(job) {
					var args, blocked, error, options, reachedHWM, shifted, strategy;
					({args, options} = job);
					try {
						({reachedHWM, blocked, strategy} = await this._store.__submit__(this.queued(), options.weight));
					} catch (error1) {
						error = error1;
						this.Events.trigger("debug", `Could not queue ${options.id}`, {
							args,
							options,
							error
						});
						job.doDrop({ error });
						return false;
					}
					if (blocked) {
						job.doDrop();
						return true;
					} else if (reachedHWM) {
						shifted = strategy === Bottleneck.prototype.strategy.LEAK ? this._queues.shiftLastFrom(options.priority) : strategy === Bottleneck.prototype.strategy.OVERFLOW_PRIORITY ? this._queues.shiftLastFrom(options.priority + 1) : strategy === Bottleneck.prototype.strategy.OVERFLOW ? job : void 0;
						if (shifted != null) shifted.doDrop();
						if (shifted == null || strategy === Bottleneck.prototype.strategy.OVERFLOW) {
							if (shifted == null) job.doDrop();
							return reachedHWM;
						}
					}
					job.doQueue(reachedHWM, blocked);
					this._queues.push(job);
					await this._drainAll();
					return reachedHWM;
				}
				_receive(job) {
					if (this._states.jobStatus(job.options.id) != null) {
						job._reject(new Bottleneck.prototype.BottleneckError(`A job with the same id already exists (id=${job.options.id})`));
						return false;
					} else {
						job.doReceive();
						return this._submitLock.schedule(this._addToQueue, job);
					}
				}
				submit(...args) {
					var cb, fn, job, options, ref, ref1, task;
					if (typeof args[0] === "function") {
						ref = args, [fn, ...args] = ref, [cb] = splice.call(args, -1);
						options = parser$5.load({}, this.jobDefaults);
					} else {
						ref1 = args, [options, fn, ...args] = ref1, [cb] = splice.call(args, -1);
						options = parser$5.load(options, this.jobDefaults);
					}
					task = (...args) => {
						return new this.Promise(function(resolve, reject) {
							return fn(...args, function(...args) {
								return (args[0] != null ? reject : resolve)(args);
							});
						});
					};
					job = new Job$1(task, args, options, this.jobDefaults, this.rejectOnDrop, this.Events, this._states, this.Promise);
					job.promise.then(function(args) {
						return typeof cb === "function" ? cb(...args) : void 0;
					}).catch(function(args) {
						if (Array.isArray(args)) return typeof cb === "function" ? cb(...args) : void 0;
						else return typeof cb === "function" ? cb(args) : void 0;
					});
					return this._receive(job);
				}
				schedule(...args) {
					var job, options, task;
					if (typeof args[0] === "function") {
						[task, ...args] = args;
						options = {};
					} else [options, task, ...args] = args;
					job = new Job$1(task, args, options, this.jobDefaults, this.rejectOnDrop, this.Events, this._states, this.Promise);
					this._receive(job);
					return job.promise;
				}
				wrap(fn) {
					var schedule = this.schedule.bind(this), wrapped = function(...args) {
						return schedule(fn.bind(this), ...args);
					};
					wrapped.withOptions = function(options, ...args) {
						return schedule(options, fn, ...args);
					};
					return wrapped;
				}
				async updateSettings(options = {}) {
					await this._store.__updateSettings__(parser$5.overwrite(options, this.storeDefaults));
					parser$5.overwrite(options, this.instanceDefaults, this);
					return this;
				}
				currentReservoir() {
					return this._store.__currentReservoir__();
				}
				incrementReservoir(incr = 0) {
					return this._store.__incrementReservoir__(incr);
				}
			}
			Bottleneck.default = Bottleneck;
			Bottleneck.Events = Events$4;
			Bottleneck.version = Bottleneck.prototype.version = require$$8.version;
			Bottleneck.strategy = Bottleneck.prototype.strategy = {
				LEAK: 1,
				OVERFLOW: 2,
				OVERFLOW_PRIORITY: 4,
				BLOCK: 3
			};
			Bottleneck.BottleneckError = Bottleneck.prototype.BottleneckError = BottleneckError_1;
			Bottleneck.Group = Bottleneck.prototype.Group = Group_1;
			Bottleneck.RedisConnection = Bottleneck.prototype.RedisConnection = require$$2;
			Bottleneck.IORedisConnection = Bottleneck.prototype.IORedisConnection = require$$3;
			Bottleneck.Batcher = Bottleneck.prototype.Batcher = Batcher_1;
			Bottleneck.prototype.jobDefaults = {
				priority: DEFAULT_PRIORITY$1,
				weight: 1,
				expiration: null,
				id: "<no-id>"
			};
			Bottleneck.prototype.storeDefaults = {
				maxConcurrent: null,
				minTime: 0,
				highWater: null,
				strategy: Bottleneck.prototype.strategy.LEAK,
				penalty: null,
				reservoir: null,
				reservoirRefreshInterval: null,
				reservoirRefreshAmount: null,
				reservoirIncreaseInterval: null,
				reservoirIncreaseAmount: null,
				reservoirIncreaseMaximum: null
			};
			Bottleneck.prototype.localStoreDefaults = {
				Promise,
				timeout: null,
				heartbeatInterval: 250
			};
			Bottleneck.prototype.redisStoreDefaults = {
				Promise,
				timeout: null,
				heartbeatInterval: 5e3,
				clientTimeout: 1e4,
				Redis: null,
				clientOptions: {},
				clusterNodes: null,
				clearDatastore: false,
				connection: null
			};
			Bottleneck.prototype.instanceDefaults = {
				datastore: "local",
				connection: null,
				id: "<no-id>",
				rejectOnDrop: true,
				trackDoneStatus: false,
				Promise
			};
			Bottleneck.prototype.stopDefaults = {
				enqueueErrorMessage: "This limiter has been stopped and cannot accept new jobs.",
				dropWaitingJobs: true,
				dropErrorMessage: "This limiter has been stopped."
			};
			return Bottleneck;
		}).call(commonjsGlobal);
		var Bottleneck_1 = Bottleneck;
		return Bottleneck_1;
	}));
})))(), 1);
var VERSION = "0.0.0-development";
function isRequestError(error) {
	return error.request !== void 0;
}
async function errorRequest(state, octokit, error, options) {
	if (!isRequestError(error) || !error?.request.request) throw error;
	if (error.status >= 400 && !state.doNotRetry.includes(error.status)) {
		const retries = options.request.retries != null ? options.request.retries : state.retries;
		const retryAfter = Math.pow((options.request.retryCount || 0) + 1, 2);
		throw octokit.retry.retryRequest(error, retries, retryAfter);
	}
	throw error;
}
async function wrapRequest(state, octokit, request, options) {
	const limiter = new import_light.default();
	limiter.on("failed", function(error, info) {
		const maxRetries = ~~error.request.request?.retries;
		const after = ~~error.request.request?.retryAfter;
		options.request.retryCount = info.retryCount + 1;
		if (maxRetries > info.retryCount) return after * state.retryAfterBaseValue;
	});
	return limiter.schedule(requestWithGraphqlErrorHandling.bind(null, state, octokit, request), options);
}
async function requestWithGraphqlErrorHandling(state, octokit, request, options) {
	const response = await request(options);
	if (response.data && response.data.errors && response.data.errors.length > 0 && /Something went wrong while executing your query/.test(response.data.errors[0].message)) return errorRequest(state, octokit, new RequestError(response.data.errors[0].message, 500, {
		request: options,
		response
	}), options);
	return response;
}
function retry(octokit, octokitOptions) {
	const state = Object.assign({
		enabled: true,
		retryAfterBaseValue: 1e3,
		doNotRetry: [
			400,
			401,
			403,
			404,
			410,
			422,
			451
		],
		retries: 3
	}, octokitOptions.retry);
	const retryPlugin = { retry: { retryRequest: (error, retries, retryAfter) => {
		error.request.request = Object.assign({}, error.request.request, {
			retries,
			retryAfter
		});
		return error;
	} } };
	if (state.enabled) {
		octokit.hook.error("request", errorRequest.bind(null, state, retryPlugin));
		octokit.hook.wrap("request", wrapRequest.bind(null, state, retryPlugin));
	}
	return retryPlugin;
}
retry.VERSION = VERSION;
//#endregion
//#region src/common/logger.ts
var noop = () => {};
var noopLogger = {
	debug: noop,
	error: noop,
	info: noop,
	warning: noop
};
//#endregion
//#region src/common/get-octokit.ts
var GitHub = Octokit.plugin(restEndpointMethods, paginateRest, paginateGraphQL, retry);
var getOctokit = (token = process$1.env.GITHUB_TOKEN || "", options = {}) => {
	const logger = options.logger ?? noopLogger;
	return new GitHub({
		auth: token,
		baseUrl: options.baseUrl ?? process$1.env.GITHUB_API_URL,
		log: {
			debug: logger.debug,
			error: logger.error,
			info: logger.info,
			warn: logger.warning
		}
	});
};
//#endregion
//#region node_modules/yaml/browser/dist/nodes/identity.js
var ALIAS = Symbol.for("yaml.alias");
var DOC = Symbol.for("yaml.document");
var MAP = Symbol.for("yaml.map");
var PAIR = Symbol.for("yaml.pair");
var SCALAR$1 = Symbol.for("yaml.scalar");
var SEQ = Symbol.for("yaml.seq");
var NODE_TYPE = Symbol.for("yaml.node.type");
var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR$1;
var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
function isCollection(node) {
	if (node && typeof node === "object") switch (node[NODE_TYPE]) {
		case MAP:
		case SEQ: return true;
	}
	return false;
}
function isNode(node) {
	if (node && typeof node === "object") switch (node[NODE_TYPE]) {
		case ALIAS:
		case MAP:
		case SCALAR$1:
		case SEQ: return true;
	}
	return false;
}
var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
//#endregion
//#region node_modules/yaml/browser/dist/visit.js
var BREAK$1 = Symbol("break visit");
var SKIP$1 = Symbol("skip children");
var REMOVE$1 = Symbol("remove node");
/**
* Apply a visitor to an AST node or document.
*
* Walks through the tree (depth-first) starting from `node`, calling a
* `visitor` function with three arguments:
*   - `key`: For sequence values and map `Pair`, the node's index in the
*     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
*     `null` for the root node.
*   - `node`: The current node.
*   - `path`: The ancestry of the current node.
*
* The return value of the visitor may be used to control the traversal:
*   - `undefined` (default): Do nothing and continue
*   - `visit.SKIP`: Do not visit the children of this node, continue with next
*     sibling
*   - `visit.BREAK`: Terminate traversal completely
*   - `visit.REMOVE`: Remove the current node, then continue with the next one
*   - `Node`: Replace the current node, then continue by visiting it
*   - `number`: While iterating the items of a sequence or map, set the index
*     of the next step. This is useful especially if the index of the current
*     node has changed.
*
* If `visitor` is a single function, it will be called with all values
* encountered in the tree, including e.g. `null` values. Alternatively,
* separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
* `Alias` and `Scalar` node. To define the same visitor function for more than
* one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
* and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
* specific defined one will be used for each node.
*/
function visit$1(node, visitor) {
	const visitor_ = initVisitor(visitor);
	if (isDocument(node)) {
		if (visit_(null, node.contents, visitor_, Object.freeze([node])) === REMOVE$1) node.contents = null;
	} else visit_(null, node, visitor_, Object.freeze([]));
}
/** Terminate visit traversal completely */
visit$1.BREAK = BREAK$1;
/** Do not visit the children of the current node */
visit$1.SKIP = SKIP$1;
/** Remove the current node */
visit$1.REMOVE = REMOVE$1;
function visit_(key, node, visitor, path) {
	const ctrl = callVisitor(key, node, visitor, path);
	if (isNode(ctrl) || isPair(ctrl)) {
		replaceNode(key, path, ctrl);
		return visit_(key, ctrl, visitor, path);
	}
	if (typeof ctrl !== "symbol") {
		if (isCollection(node)) {
			path = Object.freeze(path.concat(node));
			for (let i = 0; i < node.items.length; ++i) {
				const ci = visit_(i, node.items[i], visitor, path);
				if (typeof ci === "number") i = ci - 1;
				else if (ci === BREAK$1) return BREAK$1;
				else if (ci === REMOVE$1) {
					node.items.splice(i, 1);
					i -= 1;
				}
			}
		} else if (isPair(node)) {
			path = Object.freeze(path.concat(node));
			const ck = visit_("key", node.key, visitor, path);
			if (ck === BREAK$1) return BREAK$1;
			else if (ck === REMOVE$1) node.key = null;
			const cv = visit_("value", node.value, visitor, path);
			if (cv === BREAK$1) return BREAK$1;
			else if (cv === REMOVE$1) node.value = null;
		}
	}
	return ctrl;
}
/**
* Apply an async visitor to an AST node or document.
*
* Walks through the tree (depth-first) starting from `node`, calling a
* `visitor` function with three arguments:
*   - `key`: For sequence values and map `Pair`, the node's index in the
*     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
*     `null` for the root node.
*   - `node`: The current node.
*   - `path`: The ancestry of the current node.
*
* The return value of the visitor may be used to control the traversal:
*   - `Promise`: Must resolve to one of the following values
*   - `undefined` (default): Do nothing and continue
*   - `visit.SKIP`: Do not visit the children of this node, continue with next
*     sibling
*   - `visit.BREAK`: Terminate traversal completely
*   - `visit.REMOVE`: Remove the current node, then continue with the next one
*   - `Node`: Replace the current node, then continue by visiting it
*   - `number`: While iterating the items of a sequence or map, set the index
*     of the next step. This is useful especially if the index of the current
*     node has changed.
*
* If `visitor` is a single function, it will be called with all values
* encountered in the tree, including e.g. `null` values. Alternatively,
* separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
* `Alias` and `Scalar` node. To define the same visitor function for more than
* one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
* and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
* specific defined one will be used for each node.
*/
async function visitAsync(node, visitor) {
	const visitor_ = initVisitor(visitor);
	if (isDocument(node)) {
		if (await visitAsync_(null, node.contents, visitor_, Object.freeze([node])) === REMOVE$1) node.contents = null;
	} else await visitAsync_(null, node, visitor_, Object.freeze([]));
}
/** Terminate visit traversal completely */
visitAsync.BREAK = BREAK$1;
/** Do not visit the children of the current node */
visitAsync.SKIP = SKIP$1;
/** Remove the current node */
visitAsync.REMOVE = REMOVE$1;
async function visitAsync_(key, node, visitor, path) {
	const ctrl = await callVisitor(key, node, visitor, path);
	if (isNode(ctrl) || isPair(ctrl)) {
		replaceNode(key, path, ctrl);
		return visitAsync_(key, ctrl, visitor, path);
	}
	if (typeof ctrl !== "symbol") {
		if (isCollection(node)) {
			path = Object.freeze(path.concat(node));
			for (let i = 0; i < node.items.length; ++i) {
				const ci = await visitAsync_(i, node.items[i], visitor, path);
				if (typeof ci === "number") i = ci - 1;
				else if (ci === BREAK$1) return BREAK$1;
				else if (ci === REMOVE$1) {
					node.items.splice(i, 1);
					i -= 1;
				}
			}
		} else if (isPair(node)) {
			path = Object.freeze(path.concat(node));
			const ck = await visitAsync_("key", node.key, visitor, path);
			if (ck === BREAK$1) return BREAK$1;
			else if (ck === REMOVE$1) node.key = null;
			const cv = await visitAsync_("value", node.value, visitor, path);
			if (cv === BREAK$1) return BREAK$1;
			else if (cv === REMOVE$1) node.value = null;
		}
	}
	return ctrl;
}
function initVisitor(visitor) {
	if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) return Object.assign({
		Alias: visitor.Node,
		Map: visitor.Node,
		Scalar: visitor.Node,
		Seq: visitor.Node
	}, visitor.Value && {
		Map: visitor.Value,
		Scalar: visitor.Value,
		Seq: visitor.Value
	}, visitor.Collection && {
		Map: visitor.Collection,
		Seq: visitor.Collection
	}, visitor);
	return visitor;
}
function callVisitor(key, node, visitor, path) {
	if (typeof visitor === "function") return visitor(key, node, path);
	if (isMap(node)) return visitor.Map?.(key, node, path);
	if (isSeq(node)) return visitor.Seq?.(key, node, path);
	if (isPair(node)) return visitor.Pair?.(key, node, path);
	if (isScalar(node)) return visitor.Scalar?.(key, node, path);
	if (isAlias(node)) return visitor.Alias?.(key, node, path);
}
function replaceNode(key, path, node) {
	const parent = path[path.length - 1];
	if (isCollection(parent)) parent.items[key] = node;
	else if (isPair(parent)) if (key === "key") parent.key = node;
	else parent.value = node;
	else if (isDocument(parent)) parent.contents = node;
	else {
		const pt = isAlias(parent) ? "alias" : "scalar";
		throw new Error(`Cannot replace node with ${pt} parent`);
	}
}
//#endregion
//#region node_modules/yaml/browser/dist/doc/directives.js
var escapeChars = {
	"!": "%21",
	",": "%2C",
	"[": "%5B",
	"]": "%5D",
	"{": "%7B",
	"}": "%7D"
};
var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
var Directives = class Directives {
	constructor(yaml, tags) {
		/**
		* The directives-end/doc-start marker `---`. If `null`, a marker may still be
		* included in the document's stringified representation.
		*/
		this.docStart = null;
		/** The doc-end marker `...`.  */
		this.docEnd = false;
		this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
		this.tags = Object.assign({}, Directives.defaultTags, tags);
	}
	clone() {
		const copy = new Directives(this.yaml, this.tags);
		copy.docStart = this.docStart;
		return copy;
	}
	/**
	* During parsing, get a Directives instance for the current document and
	* update the stream state according to the current version's spec.
	*/
	atDocument() {
		const res = new Directives(this.yaml, this.tags);
		switch (this.yaml.version) {
			case "1.1":
				this.atNextDocument = true;
				break;
			case "1.2":
				this.atNextDocument = false;
				this.yaml = {
					explicit: Directives.defaultYaml.explicit,
					version: "1.2"
				};
				this.tags = Object.assign({}, Directives.defaultTags);
				break;
		}
		return res;
	}
	/**
	* @param onError - May be called even if the action was successful
	* @returns `true` on success
	*/
	add(line, onError) {
		if (this.atNextDocument) {
			this.yaml = {
				explicit: Directives.defaultYaml.explicit,
				version: "1.1"
			};
			this.tags = Object.assign({}, Directives.defaultTags);
			this.atNextDocument = false;
		}
		const parts = line.trim().split(/[ \t]+/);
		const name = parts.shift();
		switch (name) {
			case "%TAG": {
				if (parts.length !== 2) {
					onError(0, "%TAG directive should contain exactly two parts");
					if (parts.length < 2) return false;
				}
				const [handle, prefix] = parts;
				this.tags[handle] = prefix;
				return true;
			}
			case "%YAML": {
				this.yaml.explicit = true;
				if (parts.length !== 1) {
					onError(0, "%YAML directive should contain exactly one part");
					return false;
				}
				const [version] = parts;
				if (version === "1.1" || version === "1.2") {
					this.yaml.version = version;
					return true;
				} else {
					const isValid = /^\d+\.\d+$/.test(version);
					onError(6, `Unsupported YAML version ${version}`, isValid);
					return false;
				}
			}
			default:
				onError(0, `Unknown directive ${name}`, true);
				return false;
		}
	}
	/**
	* Resolves a tag, matching handles to those defined in %TAG directives.
	*
	* @returns Resolved tag, which may also be the non-specific tag `'!'` or a
	*   `'!local'` tag, or `null` if unresolvable.
	*/
	tagName(source, onError) {
		if (source === "!") return "!";
		if (source[0] !== "!") {
			onError(`Not a valid tag: ${source}`);
			return null;
		}
		if (source[1] === "<") {
			const verbatim = source.slice(2, -1);
			if (verbatim === "!" || verbatim === "!!") {
				onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
				return null;
			}
			if (source[source.length - 1] !== ">") onError("Verbatim tags must end with a >");
			return verbatim;
		}
		const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
		if (!suffix) onError(`The ${source} tag has no suffix`);
		const prefix = this.tags[handle];
		if (prefix) try {
			return prefix + decodeURIComponent(suffix);
		} catch (error) {
			onError(String(error));
			return null;
		}
		if (handle === "!") return source;
		onError(`Could not resolve tag: ${source}`);
		return null;
	}
	/**
	* Given a fully resolved tag, returns its printable string form,
	* taking into account current tag prefixes and defaults.
	*/
	tagString(tag) {
		for (const [handle, prefix] of Object.entries(this.tags)) if (tag.startsWith(prefix)) return handle + escapeTagName(tag.substring(prefix.length));
		return tag[0] === "!" ? tag : `!<${tag}>`;
	}
	toString(doc) {
		const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
		const tagEntries = Object.entries(this.tags);
		let tagNames;
		if (doc && tagEntries.length > 0 && isNode(doc.contents)) {
			const tags = {};
			visit$1(doc.contents, (_key, node) => {
				if (isNode(node) && node.tag) tags[node.tag] = true;
			});
			tagNames = Object.keys(tags);
		} else tagNames = [];
		for (const [handle, prefix] of tagEntries) {
			if (handle === "!!" && prefix === "tag:yaml.org,2002:") continue;
			if (!doc || tagNames.some((tn) => tn.startsWith(prefix))) lines.push(`%TAG ${handle} ${prefix}`);
		}
		return lines.join("\n");
	}
};
Directives.defaultYaml = {
	explicit: false,
	version: "1.2"
};
Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
//#endregion
//#region node_modules/yaml/browser/dist/doc/anchors.js
/**
* Verify that the input string is a valid anchor.
*
* Will throw on errors.
*/
function anchorIsValid(anchor) {
	if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
		const msg = `Anchor must not contain whitespace or control characters: ${JSON.stringify(anchor)}`;
		throw new Error(msg);
	}
	return true;
}
function anchorNames(root) {
	const anchors = /* @__PURE__ */ new Set();
	visit$1(root, { Value(_key, node) {
		if (node.anchor) anchors.add(node.anchor);
	} });
	return anchors;
}
/** Find a new anchor name with the given `prefix` and a one-indexed suffix. */
function findNewAnchor(prefix, exclude) {
	for (let i = 1;; ++i) {
		const name = `${prefix}${i}`;
		if (!exclude.has(name)) return name;
	}
}
function createNodeAnchors(doc, prefix) {
	const aliasObjects = [];
	const sourceObjects = /* @__PURE__ */ new Map();
	let prevAnchors = null;
	return {
		onAnchor: (source) => {
			aliasObjects.push(source);
			prevAnchors ?? (prevAnchors = anchorNames(doc));
			const anchor = findNewAnchor(prefix, prevAnchors);
			prevAnchors.add(anchor);
			return anchor;
		},
		/**
		* With circular references, the source node is only resolved after all
		* of its child nodes are. This is why anchors are set only after all of
		* the nodes have been created.
		*/
		setAnchors: () => {
			for (const source of aliasObjects) {
				const ref = sourceObjects.get(source);
				if (typeof ref === "object" && ref.anchor && (isScalar(ref.node) || isCollection(ref.node))) ref.node.anchor = ref.anchor;
				else {
					const error = /* @__PURE__ */ new Error("Failed to resolve repeated object (this should not happen)");
					error.source = source;
					throw error;
				}
			}
		},
		sourceObjects
	};
}
//#endregion
//#region node_modules/yaml/browser/dist/doc/applyReviver.js
/**
* Applies the JSON.parse reviver algorithm as defined in the ECMA-262 spec,
* in section 24.5.1.1 "Runtime Semantics: InternalizeJSONProperty" of the
* 2021 edition: https://tc39.es/ecma262/#sec-json.parse
*
* Includes extensions for handling Map and Set objects.
*/
function applyReviver(reviver, obj, key, val) {
	if (val && typeof val === "object") if (Array.isArray(val)) for (let i = 0, len = val.length; i < len; ++i) {
		const v0 = val[i];
		const v1 = applyReviver(reviver, val, String(i), v0);
		if (v1 === void 0) delete val[i];
		else if (v1 !== v0) val[i] = v1;
	}
	else if (val instanceof Map) for (const k of Array.from(val.keys())) {
		const v0 = val.get(k);
		const v1 = applyReviver(reviver, val, k, v0);
		if (v1 === void 0) val.delete(k);
		else if (v1 !== v0) val.set(k, v1);
	}
	else if (val instanceof Set) for (const v0 of Array.from(val)) {
		const v1 = applyReviver(reviver, val, v0, v0);
		if (v1 === void 0) val.delete(v0);
		else if (v1 !== v0) {
			val.delete(v0);
			val.add(v1);
		}
	}
	else for (const [k, v0] of Object.entries(val)) {
		const v1 = applyReviver(reviver, val, k, v0);
		if (v1 === void 0) delete val[k];
		else if (v1 !== v0) val[k] = v1;
	}
	return reviver.call(obj, key, val);
}
//#endregion
//#region node_modules/yaml/browser/dist/nodes/toJS.js
/**
* Recursively convert any node or its contents to native JavaScript
*
* @param value - The input value
* @param arg - If `value` defines a `toJSON()` method, use this
*   as its first argument
* @param ctx - Conversion context, originally set in Document#toJS(). If
*   `{ keep: true }` is not set, output should be suitable for JSON
*   stringification.
*/
function toJS(value, arg, ctx) {
	if (Array.isArray(value)) return value.map((v, i) => toJS(v, String(i), ctx));
	if (value && typeof value.toJSON === "function") {
		if (!ctx || !hasAnchor(value)) return value.toJSON(arg, ctx);
		const data = {
			aliasCount: 0,
			count: 1,
			res: void 0
		};
		ctx.anchors.set(value, data);
		ctx.onCreate = (res) => {
			data.res = res;
			delete ctx.onCreate;
		};
		const res = value.toJSON(arg, ctx);
		if (ctx.onCreate) ctx.onCreate(res);
		return res;
	}
	if (typeof value === "bigint" && !ctx?.keep) return Number(value);
	return value;
}
//#endregion
//#region node_modules/yaml/browser/dist/nodes/Node.js
var NodeBase = class {
	constructor(type) {
		Object.defineProperty(this, NODE_TYPE, { value: type });
	}
	/** Create a copy of this node.  */
	clone() {
		const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
		if (this.range) copy.range = this.range.slice();
		return copy;
	}
	/** A plain JavaScript representation of this node. */
	toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
		if (!isDocument(doc)) throw new TypeError("A document argument is required");
		const ctx = {
			anchors: /* @__PURE__ */ new Map(),
			doc,
			keep: true,
			mapAsMap: mapAsMap === true,
			mapKeyWarned: false,
			maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
		};
		const res = toJS(this, "", ctx);
		if (typeof onAnchor === "function") for (const { count, res } of ctx.anchors.values()) onAnchor(res, count);
		return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/nodes/Alias.js
var Alias = class extends NodeBase {
	constructor(source) {
		super(ALIAS);
		this.source = source;
		Object.defineProperty(this, "tag", { set() {
			throw new Error("Alias nodes cannot have tags");
		} });
	}
	/**
	* Resolve the value of this alias within `doc`, finding the last
	* instance of the `source` anchor before this node.
	*/
	resolve(doc, ctx) {
		if (ctx?.maxAliasCount === 0) throw new ReferenceError("Alias resolution is disabled");
		let nodes;
		if (ctx?.aliasResolveCache) nodes = ctx.aliasResolveCache;
		else {
			nodes = [];
			visit$1(doc, { Node: (_key, node) => {
				if (isAlias(node) || hasAnchor(node)) nodes.push(node);
			} });
			if (ctx) ctx.aliasResolveCache = nodes;
		}
		let found = void 0;
		for (const node of nodes) {
			if (node === this) break;
			if (node.anchor === this.source) found = node;
		}
		return found;
	}
	toJSON(_arg, ctx) {
		if (!ctx) return { source: this.source };
		const { anchors, doc, maxAliasCount } = ctx;
		const source = this.resolve(doc, ctx);
		if (!source) {
			const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
			throw new ReferenceError(msg);
		}
		let data = anchors.get(source);
		if (!data) {
			toJS(source, null, ctx);
			data = anchors.get(source);
		}
		/* istanbul ignore if */
		if (data?.res === void 0) throw new ReferenceError("This should not happen: Alias anchor was not resolved?");
		if (maxAliasCount >= 0) {
			data.count += 1;
			if (data.aliasCount === 0) data.aliasCount = getAliasCount(doc, source, anchors);
			if (data.count * data.aliasCount > maxAliasCount) throw new ReferenceError("Excessive alias count indicates a resource exhaustion attack");
		}
		return data.res;
	}
	toString(ctx, _onComment, _onChompKeep) {
		const src = `*${this.source}`;
		if (ctx) {
			anchorIsValid(this.source);
			if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
				const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
				throw new Error(msg);
			}
			if (ctx.implicitKey) return `${src} `;
		}
		return src;
	}
};
function getAliasCount(doc, node, anchors) {
	if (isAlias(node)) {
		const source = node.resolve(doc);
		const anchor = anchors && source && anchors.get(source);
		return anchor ? anchor.count * anchor.aliasCount : 0;
	} else if (isCollection(node)) {
		let count = 0;
		for (const item of node.items) {
			const c = getAliasCount(doc, item, anchors);
			if (c > count) count = c;
		}
		return count;
	} else if (isPair(node)) {
		const kc = getAliasCount(doc, node.key, anchors);
		const vc = getAliasCount(doc, node.value, anchors);
		return Math.max(kc, vc);
	}
	return 1;
}
//#endregion
//#region node_modules/yaml/browser/dist/nodes/Scalar.js
var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
var Scalar = class extends NodeBase {
	constructor(value) {
		super(SCALAR$1);
		this.value = value;
	}
	toJSON(arg, ctx) {
		return ctx?.keep ? this.value : toJS(this.value, arg, ctx);
	}
	toString() {
		return String(this.value);
	}
};
Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
Scalar.PLAIN = "PLAIN";
Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
//#endregion
//#region node_modules/yaml/browser/dist/doc/createNode.js
var defaultTagPrefix = "tag:yaml.org,2002:";
function findTagObject(value, tagName, tags) {
	if (tagName) {
		const match = tags.filter((t) => t.tag === tagName);
		const tagObj = match.find((t) => !t.format) ?? match[0];
		if (!tagObj) throw new Error(`Tag ${tagName} not found`);
		return tagObj;
	}
	return tags.find((t) => t.identify?.(value) && !t.format);
}
function createNode(value, tagName, ctx) {
	if (isDocument(value)) value = value.contents;
	if (isNode(value)) return value;
	if (isPair(value)) {
		const map = ctx.schema[MAP].createNode?.(ctx.schema, null, ctx);
		map.items.push(value);
		return map;
	}
	if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) value = value.valueOf();
	const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
	let ref = void 0;
	if (aliasDuplicateObjects && value && typeof value === "object") {
		ref = sourceObjects.get(value);
		if (ref) {
			ref.anchor ?? (ref.anchor = onAnchor(value));
			return new Alias(ref.anchor);
		} else {
			ref = {
				anchor: null,
				node: null
			};
			sourceObjects.set(value, ref);
		}
	}
	if (tagName?.startsWith("!!")) tagName = defaultTagPrefix + tagName.slice(2);
	let tagObj = findTagObject(value, tagName, schema.tags);
	if (!tagObj) {
		if (value && typeof value.toJSON === "function") value = value.toJSON();
		if (!value || typeof value !== "object") {
			const node = new Scalar(value);
			if (ref) ref.node = node;
			return node;
		}
		tagObj = value instanceof Map ? schema[MAP] : Symbol.iterator in Object(value) ? schema[SEQ] : schema[MAP];
	}
	if (onTagObj) {
		onTagObj(tagObj);
		delete ctx.onTagObj;
	}
	const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar(value);
	if (tagName) node.tag = tagName;
	else if (!tagObj.default) node.tag = tagObj.tag;
	if (ref) ref.node = node;
	return node;
}
//#endregion
//#region node_modules/yaml/browser/dist/nodes/Collection.js
function collectionFromPath(schema, path, value) {
	let v = value;
	for (let i = path.length - 1; i >= 0; --i) {
		const k = path[i];
		if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
			const a = [];
			a[k] = v;
			v = a;
		} else v = /* @__PURE__ */ new Map([[k, v]]);
	}
	return createNode(v, void 0, {
		aliasDuplicateObjects: false,
		keepUndefined: false,
		onAnchor: () => {
			throw new Error("This should not happen, please report a bug.");
		},
		schema,
		sourceObjects: /* @__PURE__ */ new Map()
	});
}
var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
var Collection = class extends NodeBase {
	constructor(type, schema) {
		super(type);
		Object.defineProperty(this, "schema", {
			value: schema,
			configurable: true,
			enumerable: false,
			writable: true
		});
	}
	/**
	* Create a copy of this collection.
	*
	* @param schema - If defined, overwrites the original's schema
	*/
	clone(schema) {
		const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
		if (schema) copy.schema = schema;
		copy.items = copy.items.map((it) => isNode(it) || isPair(it) ? it.clone(schema) : it);
		if (this.range) copy.range = this.range.slice();
		return copy;
	}
	/**
	* Adds a value to the collection. For `!!map` and `!!omap` the value must
	* be a Pair instance or a `{ key, value }` object, which may not have a key
	* that already exists in the map.
	*/
	addIn(path, value) {
		if (isEmptyPath(path)) this.add(value);
		else {
			const [key, ...rest] = path;
			const node = this.get(key, true);
			if (isCollection(node)) node.addIn(rest, value);
			else if (node === void 0 && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));
			else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
		}
	}
	/**
	* Removes a value from the collection.
	* @returns `true` if the item was found and removed.
	*/
	deleteIn(path) {
		const [key, ...rest] = path;
		if (rest.length === 0) return this.delete(key);
		const node = this.get(key, true);
		if (isCollection(node)) return node.deleteIn(rest);
		else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
	}
	/**
	* Returns item at `key`, or `undefined` if not found. By default unwraps
	* scalar values from their surrounding node; to disable set `keepScalar` to
	* `true` (collections are always returned intact).
	*/
	getIn(path, keepScalar) {
		const [key, ...rest] = path;
		const node = this.get(key, true);
		if (rest.length === 0) return !keepScalar && isScalar(node) ? node.value : node;
		else return isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
	}
	hasAllNullValues(allowScalar) {
		return this.items.every((node) => {
			if (!isPair(node)) return false;
			const n = node.value;
			return n == null || allowScalar && isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
		});
	}
	/**
	* Checks if the collection includes a value with the key `key`.
	*/
	hasIn(path) {
		const [key, ...rest] = path;
		if (rest.length === 0) return this.has(key);
		const node = this.get(key, true);
		return isCollection(node) ? node.hasIn(rest) : false;
	}
	/**
	* Sets a value in this collection. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*/
	setIn(path, value) {
		const [key, ...rest] = path;
		if (rest.length === 0) this.set(key, value);
		else {
			const node = this.get(key, true);
			if (isCollection(node)) node.setIn(rest, value);
			else if (node === void 0 && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));
			else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
		}
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/stringify/stringifyComment.js
/**
* Stringifies a comment.
*
* Empty comment lines are left empty,
* lines consisting of a single space are replaced by `#`,
* and all other lines are prefixed with a `#`.
*/
var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
function indentComment(comment, indent) {
	if (/^\n+$/.test(comment)) return comment.substring(1);
	return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
}
var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
//#endregion
//#region node_modules/yaml/browser/dist/stringify/foldFlowLines.js
var FOLD_FLOW = "flow";
var FOLD_BLOCK = "block";
var FOLD_QUOTED = "quoted";
/**
* Tries to keep input at up to `lineWidth` characters, splitting only on spaces
* not followed by newlines or spaces unless `mode` is `'quoted'`. Lines are
* terminated with `\n` and started with `indent`.
*/
function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
	if (!lineWidth || lineWidth < 0) return text;
	if (lineWidth < minContentWidth) minContentWidth = 0;
	const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
	if (text.length <= endStep) return text;
	const folds = [];
	const escapedFolds = {};
	let end = lineWidth - indent.length;
	if (typeof indentAtStart === "number") if (indentAtStart > lineWidth - Math.max(2, minContentWidth)) folds.push(0);
	else end = lineWidth - indentAtStart;
	let split = void 0;
	let prev = void 0;
	let overflow = false;
	let i = -1;
	let escStart = -1;
	let escEnd = -1;
	if (mode === "block") {
		i = consumeMoreIndentedLines(text, i, indent.length);
		if (i !== -1) end = i + endStep;
	}
	for (let ch; ch = text[i += 1];) {
		if (mode === "quoted" && ch === "\\") {
			escStart = i;
			switch (text[i + 1]) {
				case "x":
					i += 3;
					break;
				case "u":
					i += 5;
					break;
				case "U":
					i += 9;
					break;
				default: i += 1;
			}
			escEnd = i;
		}
		if (ch === "\n") {
			if (mode === "block") i = consumeMoreIndentedLines(text, i, indent.length);
			end = i + indent.length + endStep;
			split = void 0;
		} else {
			if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
				const next = text[i + 1];
				if (next && next !== " " && next !== "\n" && next !== "	") split = i;
			}
			if (i >= end) if (split) {
				folds.push(split);
				end = split + endStep;
				split = void 0;
			} else if (mode === "quoted") {
				while (prev === " " || prev === "	") {
					prev = ch;
					ch = text[i += 1];
					overflow = true;
				}
				const j = i > escEnd + 1 ? i - 2 : escStart - 1;
				if (escapedFolds[j]) return text;
				folds.push(j);
				escapedFolds[j] = true;
				end = j + endStep;
				split = void 0;
			} else overflow = true;
		}
		prev = ch;
	}
	if (overflow && onOverflow) onOverflow();
	if (folds.length === 0) return text;
	if (onFold) onFold();
	let res = text.slice(0, folds[0]);
	for (let i = 0; i < folds.length; ++i) {
		const fold = folds[i];
		const end = folds[i + 1] || text.length;
		if (fold === 0) res = `\n${indent}${text.slice(0, end)}`;
		else {
			if (mode === "quoted" && escapedFolds[fold]) res += `${text[fold]}\\`;
			res += `\n${indent}${text.slice(fold + 1, end)}`;
		}
	}
	return res;
}
/**
* Presumes `i + 1` is at the start of a line
* @returns index of last newline in more-indented block
*/
function consumeMoreIndentedLines(text, i, indent) {
	let end = i;
	let start = i + 1;
	let ch = text[start];
	while (ch === " " || ch === "	") if (i < start + indent) ch = text[++i];
	else {
		do
			ch = text[++i];
		while (ch && ch !== "\n");
		end = i;
		start = i + 1;
		ch = text[start];
	}
	return end;
}
//#endregion
//#region node_modules/yaml/browser/dist/stringify/stringifyString.js
var getFoldOptions = (ctx, isBlock) => ({
	indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
	lineWidth: ctx.options.lineWidth,
	minContentWidth: ctx.options.minContentWidth
});
var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
function lineLengthOverLimit(str, lineWidth, indentLength) {
	if (!lineWidth || lineWidth < 0) return false;
	const limit = lineWidth - indentLength;
	const strLen = str.length;
	if (strLen <= limit) return false;
	for (let i = 0, start = 0; i < strLen; ++i) if (str[i] === "\n") {
		if (i - start > limit) return true;
		start = i + 1;
		if (strLen - start <= limit) return false;
	}
	return true;
}
function doubleQuotedString(value, ctx) {
	const json = JSON.stringify(value);
	if (ctx.options.doubleQuotedAsJSON) return json;
	const { implicitKey } = ctx;
	const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
	const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
	let str = "";
	let start = 0;
	for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
		if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
			str += json.slice(start, i) + "\\ ";
			i += 1;
			start = i;
			ch = "\\";
		}
		if (ch === "\\") switch (json[i + 1]) {
			case "u":
				{
					str += json.slice(start, i);
					const code = json.substr(i + 2, 4);
					switch (code) {
						case "0000":
							str += "\\0";
							break;
						case "0007":
							str += "\\a";
							break;
						case "000b":
							str += "\\v";
							break;
						case "001b":
							str += "\\e";
							break;
						case "0085":
							str += "\\N";
							break;
						case "00a0":
							str += "\\_";
							break;
						case "2028":
							str += "\\L";
							break;
						case "2029":
							str += "\\P";
							break;
						default: if (code.substr(0, 2) === "00") str += "\\x" + code.substr(2);
						else str += json.substr(i, 6);
					}
					i += 5;
					start = i + 1;
				}
				break;
			case "n":
				if (implicitKey || json[i + 2] === "\"" || json.length < minMultiLineLength) i += 1;
				else {
					str += json.slice(start, i) + "\n\n";
					while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== "\"") {
						str += "\n";
						i += 2;
					}
					str += indent;
					if (json[i + 2] === " ") str += "\\";
					i += 1;
					start = i + 1;
				}
				break;
			default: i += 1;
		}
	}
	str = start ? str + json.slice(start) : json;
	return implicitKey ? str : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx, false));
}
function singleQuotedString(value, ctx) {
	if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value)) return doubleQuotedString(value, ctx);
	const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
	const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&\n${indent}`) + "'";
	return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function quotedString(value, ctx) {
	const { singleQuote } = ctx.options;
	let qs;
	if (singleQuote === false) qs = doubleQuotedString;
	else {
		const hasDouble = value.includes("\"");
		const hasSingle = value.includes("'");
		if (hasDouble && !hasSingle) qs = singleQuotedString;
		else if (hasSingle && !hasDouble) qs = doubleQuotedString;
		else qs = singleQuote ? singleQuotedString : doubleQuotedString;
	}
	return qs(value, ctx);
}
var blockEndNewlines;
try {
	blockEndNewlines = /* @__PURE__ */ new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
} catch {
	blockEndNewlines = /\n+(?!\n|$)/g;
}
function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
	const { blockQuote, commentString, lineWidth } = ctx.options;
	if (!blockQuote || /\n[\t ]+$/.test(value)) return quotedString(value, ctx);
	const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
	const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.BLOCK_FOLDED ? false : type === Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
	if (!value) return literal ? "|\n" : ">\n";
	let chomp;
	let endStart;
	for (endStart = value.length; endStart > 0; --endStart) {
		const ch = value[endStart - 1];
		if (ch !== "\n" && ch !== "	" && ch !== " ") break;
	}
	let end = value.substring(endStart);
	const endNlPos = end.indexOf("\n");
	if (endNlPos === -1) chomp = "-";
	else if (value === end || endNlPos !== end.length - 1) {
		chomp = "+";
		if (onChompKeep) onChompKeep();
	} else chomp = "";
	if (end) {
		value = value.slice(0, -end.length);
		if (end[end.length - 1] === "\n") end = end.slice(0, -1);
		end = end.replace(blockEndNewlines, `$&${indent}`);
	}
	let startWithSpace = false;
	let startEnd;
	let startNlPos = -1;
	for (startEnd = 0; startEnd < value.length; ++startEnd) {
		const ch = value[startEnd];
		if (ch === " ") startWithSpace = true;
		else if (ch === "\n") startNlPos = startEnd;
		else break;
	}
	let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
	if (start) {
		value = value.substring(start.length);
		start = start.replace(/\n+/g, `$&${indent}`);
	}
	let header = (startWithSpace ? indent ? "2" : "1" : "") + chomp;
	if (comment) {
		header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
		if (onComment) onComment();
	}
	if (!literal) {
		const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
		let literalFallback = false;
		const foldOptions = getFoldOptions(ctx, true);
		if (blockQuote !== "folded" && type !== Scalar.BLOCK_FOLDED) foldOptions.onOverflow = () => {
			literalFallback = true;
		};
		const body = foldFlowLines(`${start}${foldedValue}${end}`, indent, FOLD_BLOCK, foldOptions);
		if (!literalFallback) return `>${header}\n${indent}${body}`;
	}
	value = value.replace(/\n+/g, `$&${indent}`);
	return `|${header}\n${indent}${start}${value}${end}`;
}
function plainString(item, ctx, onComment, onChompKeep) {
	const { type, value } = item;
	const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
	if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) return quotedString(value, ctx);
	if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
	if (!implicitKey && !inFlow && type !== Scalar.PLAIN && value.includes("\n")) return blockString(item, ctx, onComment, onChompKeep);
	if (containsDocumentMarker(value)) {
		if (indent === "") {
			ctx.forceBlockIndent = true;
			return blockString(item, ctx, onComment, onChompKeep);
		} else if (implicitKey && indent === indentStep) return quotedString(value, ctx);
	}
	const str = value.replace(/\n+/g, `$&\n${indent}`);
	if (actualString) {
		const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
		const { compat, tags } = ctx.doc.schema;
		if (tags.some(test) || compat?.some(test)) return quotedString(value, ctx);
	}
	return implicitKey ? str : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function stringifyString(item, ctx, onComment, onChompKeep) {
	const { implicitKey, inFlow } = ctx;
	const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
	let { type } = item;
	if (type !== Scalar.QUOTE_DOUBLE) {
		if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value)) type = Scalar.QUOTE_DOUBLE;
	}
	const _stringify = (_type) => {
		switch (_type) {
			case Scalar.BLOCK_FOLDED:
			case Scalar.BLOCK_LITERAL: return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
			case Scalar.QUOTE_DOUBLE: return doubleQuotedString(ss.value, ctx);
			case Scalar.QUOTE_SINGLE: return singleQuotedString(ss.value, ctx);
			case Scalar.PLAIN: return plainString(ss, ctx, onComment, onChompKeep);
			default: return null;
		}
	};
	let res = _stringify(type);
	if (res === null) {
		const { defaultKeyType, defaultStringType } = ctx.options;
		const t = implicitKey && defaultKeyType || defaultStringType;
		res = _stringify(t);
		if (res === null) throw new Error(`Unsupported default string type ${t}`);
	}
	return res;
}
//#endregion
//#region node_modules/yaml/browser/dist/stringify/stringify.js
function createStringifyContext(doc, options) {
	const opt = Object.assign({
		blockQuote: true,
		commentString: stringifyComment,
		defaultKeyType: null,
		defaultStringType: "PLAIN",
		directives: null,
		doubleQuotedAsJSON: false,
		doubleQuotedMinMultiLineLength: 40,
		falseStr: "false",
		flowCollectionPadding: true,
		indentSeq: true,
		lineWidth: 80,
		minContentWidth: 20,
		nullStr: "null",
		simpleKeys: false,
		singleQuote: null,
		trailingComma: false,
		trueStr: "true",
		verifyAliasOrder: true
	}, doc.schema.toStringOptions, options);
	let inFlow;
	switch (opt.collectionStyle) {
		case "block":
			inFlow = false;
			break;
		case "flow":
			inFlow = true;
			break;
		default: inFlow = null;
	}
	return {
		anchors: /* @__PURE__ */ new Set(),
		doc,
		flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
		indent: "",
		indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
		inFlow,
		options: opt
	};
}
function getTagObject(tags, item) {
	if (item.tag) {
		const match = tags.filter((t) => t.tag === item.tag);
		if (match.length > 0) return match.find((t) => t.format === item.format) ?? match[0];
	}
	let tagObj = void 0;
	let obj;
	if (isScalar(item)) {
		obj = item.value;
		let match = tags.filter((t) => t.identify?.(obj));
		if (match.length > 1) {
			const testMatch = match.filter((t) => t.test);
			if (testMatch.length > 0) match = testMatch;
		}
		tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
	} else {
		obj = item;
		tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
	}
	if (!tagObj) {
		const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
		throw new Error(`Tag not resolved for ${name} value`);
	}
	return tagObj;
}
function stringifyProps(node, tagObj, { anchors, doc }) {
	if (!doc.directives) return "";
	const props = [];
	const anchor = (isScalar(node) || isCollection(node)) && node.anchor;
	if (anchor && anchorIsValid(anchor)) {
		anchors.add(anchor);
		props.push(`&${anchor}`);
	}
	const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
	if (tag) props.push(doc.directives.tagString(tag));
	return props.join(" ");
}
function stringify(item, ctx, onComment, onChompKeep) {
	if (isPair(item)) return item.toString(ctx, onComment, onChompKeep);
	if (isAlias(item)) {
		if (ctx.doc.directives) return item.toString(ctx);
		if (ctx.resolvedAliases?.has(item)) throw new TypeError(`Cannot stringify circular structure without alias nodes`);
		else {
			if (ctx.resolvedAliases) ctx.resolvedAliases.add(item);
			else ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
			item = item.resolve(ctx.doc);
		}
	}
	let tagObj = void 0;
	const node = isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
	tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
	const props = stringifyProps(node, tagObj, ctx);
	if (props.length > 0) ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
	const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : isScalar(node) ? stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
	if (!props) return str;
	return isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}\n${ctx.indent}${str}`;
}
//#endregion
//#region node_modules/yaml/browser/dist/stringify/stringifyPair.js
function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
	const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
	let keyComment = isNode(key) && key.comment || null;
	if (simpleKeys) {
		if (keyComment) throw new Error("With simple keys, key nodes cannot have comments");
		if (isCollection(key) || !isNode(key) && typeof key === "object") throw new Error("With simple keys, collection cannot be used as a key value");
	}
	let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || isCollection(key) || (isScalar(key) ? key.type === Scalar.BLOCK_FOLDED || key.type === Scalar.BLOCK_LITERAL : typeof key === "object"));
	ctx = Object.assign({}, ctx, {
		allNullValues: false,
		implicitKey: !explicitKey && (simpleKeys || !allNullValues),
		indent: indent + indentStep
	});
	let keyCommentDone = false;
	let chompKeep = false;
	let str = stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
	if (!explicitKey && !ctx.inFlow && str.length > 1024) {
		if (simpleKeys) throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
		explicitKey = true;
	}
	if (ctx.inFlow) {
		if (allNullValues || value == null) {
			if (keyCommentDone && onComment) onComment();
			return str === "" ? "?" : explicitKey ? `? ${str}` : str;
		}
	} else if (allNullValues && !simpleKeys || value == null && explicitKey) {
		str = `? ${str}`;
		if (keyComment && !keyCommentDone) str += lineComment(str, ctx.indent, commentString(keyComment));
		else if (chompKeep && onChompKeep) onChompKeep();
		return str;
	}
	if (keyCommentDone) keyComment = null;
	if (explicitKey) {
		if (keyComment) str += lineComment(str, ctx.indent, commentString(keyComment));
		str = `? ${str}\n${indent}:`;
	} else {
		str = `${str}:`;
		if (keyComment) str += lineComment(str, ctx.indent, commentString(keyComment));
	}
	let vsb, vcb, valueComment;
	if (isNode(value)) {
		vsb = !!value.spaceBefore;
		vcb = value.commentBefore;
		valueComment = value.comment;
	} else {
		vsb = false;
		vcb = null;
		valueComment = null;
		if (value && typeof value === "object") value = doc.createNode(value);
	}
	ctx.implicitKey = false;
	if (!explicitKey && !keyComment && isScalar(value)) ctx.indentAtStart = str.length + 1;
	chompKeep = false;
	if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && isSeq(value) && !value.flow && !value.tag && !value.anchor) ctx.indent = ctx.indent.substring(2);
	let valueCommentDone = false;
	const valueStr = stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
	let ws = " ";
	if (keyComment || vsb || vcb) {
		ws = vsb ? "\n" : "";
		if (vcb) {
			const cs = commentString(vcb);
			ws += `\n${indentComment(cs, ctx.indent)}`;
		}
		if (valueStr === "" && !ctx.inFlow) {
			if (ws === "\n" && valueComment) ws = "\n\n";
		} else ws += `\n${ctx.indent}`;
	} else if (!explicitKey && isCollection(value)) {
		const vs0 = valueStr[0];
		const nl0 = valueStr.indexOf("\n");
		const hasNewline = nl0 !== -1;
		const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
		if (hasNewline || !flow) {
			let hasPropsLine = false;
			if (hasNewline && (vs0 === "&" || vs0 === "!")) {
				let sp0 = valueStr.indexOf(" ");
				if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") sp0 = valueStr.indexOf(" ", sp0 + 1);
				if (sp0 === -1 || nl0 < sp0) hasPropsLine = true;
			}
			if (!hasPropsLine) ws = `\n${ctx.indent}`;
		}
	} else if (valueStr === "" || valueStr[0] === "\n") ws = "";
	str += ws + valueStr;
	if (ctx.inFlow) {
		if (valueCommentDone && onComment) onComment();
	} else if (valueComment && !valueCommentDone) str += lineComment(str, ctx.indent, commentString(valueComment));
	else if (chompKeep && onChompKeep) onChompKeep();
	return str;
}
//#endregion
//#region node_modules/yaml/browser/dist/log.js
function warn(logLevel, warning) {
	if (logLevel === "debug" || logLevel === "warn") console.warn(warning);
}
//#endregion
//#region node_modules/yaml/browser/dist/schema/yaml-1.1/merge.js
var MERGE_KEY = "<<";
var merge$1 = {
	identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
	default: "key",
	tag: "tag:yaml.org,2002:merge",
	test: /^<<$/,
	resolve: () => Object.assign(new Scalar(Symbol(MERGE_KEY)), { addToJSMap: addMergeToJSMap }),
	stringify: () => MERGE_KEY
};
var isMergeKey = (ctx, key) => (merge$1.identify(key) || isScalar(key) && (!key.type || key.type === Scalar.PLAIN) && merge$1.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge$1.tag && tag.default);
function addMergeToJSMap(ctx, map, value) {
	const source = resolveAliasValue(ctx, value);
	if (isSeq(source)) for (const it of source.items) mergeValue(ctx, map, it);
	else if (Array.isArray(source)) for (const it of source) mergeValue(ctx, map, it);
	else mergeValue(ctx, map, source);
}
function mergeValue(ctx, map, value) {
	const source = resolveAliasValue(ctx, value);
	if (!isMap(source)) throw new Error("Merge sources must be maps or map aliases");
	const srcMap = source.toJSON(null, ctx, Map);
	for (const [key, value] of srcMap) if (map instanceof Map) {
		if (!map.has(key)) map.set(key, value);
	} else if (map instanceof Set) map.add(key);
	else if (!Object.prototype.hasOwnProperty.call(map, key)) Object.defineProperty(map, key, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
	return map;
}
function resolveAliasValue(ctx, value) {
	return ctx && isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
}
//#endregion
//#region node_modules/yaml/browser/dist/nodes/addPairToJSMap.js
function addPairToJSMap(ctx, map, { key, value }) {
	if (isNode(key) && key.addToJSMap) key.addToJSMap(ctx, map, value);
	else if (isMergeKey(ctx, key)) addMergeToJSMap(ctx, map, value);
	else {
		const jsKey = toJS(key, "", ctx);
		if (map instanceof Map) map.set(jsKey, toJS(value, jsKey, ctx));
		else if (map instanceof Set) map.add(jsKey);
		else {
			const stringKey = stringifyKey(key, jsKey, ctx);
			const jsValue = toJS(value, stringKey, ctx);
			if (stringKey in map) Object.defineProperty(map, stringKey, {
				value: jsValue,
				writable: true,
				enumerable: true,
				configurable: true
			});
			else map[stringKey] = jsValue;
		}
	}
	return map;
}
function stringifyKey(key, jsKey, ctx) {
	if (jsKey === null) return "";
	if (typeof jsKey !== "object") return String(jsKey);
	if (isNode(key) && ctx?.doc) {
		const strCtx = createStringifyContext(ctx.doc, {});
		strCtx.anchors = /* @__PURE__ */ new Set();
		for (const node of ctx.anchors.keys()) strCtx.anchors.add(node.anchor);
		strCtx.inFlow = true;
		strCtx.inStringifyKey = true;
		const strKey = key.toString(strCtx);
		if (!ctx.mapKeyWarned) {
			let jsonStr = JSON.stringify(strKey);
			if (jsonStr.length > 40) jsonStr = jsonStr.substring(0, 36) + "...\"";
			warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
			ctx.mapKeyWarned = true;
		}
		return strKey;
	}
	return JSON.stringify(jsKey);
}
//#endregion
//#region node_modules/yaml/browser/dist/nodes/Pair.js
function createPair(key, value, ctx) {
	return new Pair(createNode(key, void 0, ctx), createNode(value, void 0, ctx));
}
var Pair = class Pair {
	constructor(key, value = null) {
		Object.defineProperty(this, NODE_TYPE, { value: PAIR });
		this.key = key;
		this.value = value;
	}
	clone(schema) {
		let { key, value } = this;
		if (isNode(key)) key = key.clone(schema);
		if (isNode(value)) value = value.clone(schema);
		return new Pair(key, value);
	}
	toJSON(_, ctx) {
		return addPairToJSMap(ctx, ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {}, this);
	}
	toString(ctx, onComment, onChompKeep) {
		return ctx?.doc ? stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/stringify/stringifyCollection.js
function stringifyCollection(collection, ctx, options) {
	return (ctx.inFlow ?? collection.flow ? stringifyFlowCollection : stringifyBlockCollection)(collection, ctx, options);
}
function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
	const { indent, options: { commentString } } = ctx;
	const itemCtx = Object.assign({}, ctx, {
		indent: itemIndent,
		type: null
	});
	let chompKeep = false;
	const lines = [];
	for (let i = 0; i < items.length; ++i) {
		const item = items[i];
		let comment = null;
		if (isNode(item)) {
			if (!chompKeep && item.spaceBefore) lines.push("");
			addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
			if (item.comment) comment = item.comment;
		} else if (isPair(item)) {
			const ik = isNode(item.key) ? item.key : null;
			if (ik) {
				if (!chompKeep && ik.spaceBefore) lines.push("");
				addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
			}
		}
		chompKeep = false;
		let str = stringify(item, itemCtx, () => comment = null, () => chompKeep = true);
		if (comment) str += lineComment(str, itemIndent, commentString(comment));
		if (chompKeep && comment) chompKeep = false;
		lines.push(blockItemPrefix + str);
	}
	let str;
	if (lines.length === 0) str = flowChars.start + flowChars.end;
	else {
		str = lines[0];
		for (let i = 1; i < lines.length; ++i) {
			const line = lines[i];
			str += line ? `\n${indent}${line}` : "\n";
		}
	}
	if (comment) {
		str += "\n" + indentComment(commentString(comment), indent);
		if (onComment) onComment();
	} else if (chompKeep && onChompKeep) onChompKeep();
	return str;
}
function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
	const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
	itemIndent += indentStep;
	const itemCtx = Object.assign({}, ctx, {
		indent: itemIndent,
		inFlow: true,
		type: null
	});
	let reqNewline = false;
	let linesAtValue = 0;
	const lines = [];
	for (let i = 0; i < items.length; ++i) {
		const item = items[i];
		let comment = null;
		if (isNode(item)) {
			if (item.spaceBefore) lines.push("");
			addCommentBefore(ctx, lines, item.commentBefore, false);
			if (item.comment) comment = item.comment;
		} else if (isPair(item)) {
			const ik = isNode(item.key) ? item.key : null;
			if (ik) {
				if (ik.spaceBefore) lines.push("");
				addCommentBefore(ctx, lines, ik.commentBefore, false);
				if (ik.comment) reqNewline = true;
			}
			const iv = isNode(item.value) ? item.value : null;
			if (iv) {
				if (iv.comment) comment = iv.comment;
				if (iv.commentBefore) reqNewline = true;
			} else if (item.value == null && ik?.comment) comment = ik.comment;
		}
		if (comment) reqNewline = true;
		let str = stringify(item, itemCtx, () => comment = null);
		reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
		if (i < items.length - 1) str += ",";
		else if (ctx.options.trailingComma) {
			if (ctx.options.lineWidth > 0) reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
			if (reqNewline) str += ",";
		}
		if (comment) str += lineComment(str, itemIndent, commentString(comment));
		lines.push(str);
		linesAtValue = lines.length;
	}
	const { start, end } = flowChars;
	if (lines.length === 0) return start + end;
	else {
		if (!reqNewline) {
			const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
			reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
		}
		if (reqNewline) {
			let str = start;
			for (const line of lines) str += line ? `\n${indentStep}${indent}${line}` : "\n";
			return `${str}\n${indent}${end}`;
		} else return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
	}
}
function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
	if (comment && chompKeep) comment = comment.replace(/^\n+/, "");
	if (comment) {
		const ic = indentComment(commentString(comment), indent);
		lines.push(ic.trimStart());
	}
}
//#endregion
//#region node_modules/yaml/browser/dist/nodes/YAMLMap.js
function findPair(items, key) {
	const k = isScalar(key) ? key.value : key;
	for (const it of items) if (isPair(it)) {
		if (it.key === key || it.key === k) return it;
		if (isScalar(it.key) && it.key.value === k) return it;
	}
}
var YAMLMap = class extends Collection {
	static get tagName() {
		return "tag:yaml.org,2002:map";
	}
	constructor(schema) {
		super(MAP, schema);
		this.items = [];
	}
	/**
	* A generic collection parsing method that can be extended
	* to other node classes that inherit from YAMLMap
	*/
	static from(schema, obj, ctx) {
		const { keepUndefined, replacer } = ctx;
		const map = new this(schema);
		const add = (key, value) => {
			if (typeof replacer === "function") value = replacer.call(obj, key, value);
			else if (Array.isArray(replacer) && !replacer.includes(key)) return;
			if (value !== void 0 || keepUndefined) map.items.push(createPair(key, value, ctx));
		};
		if (obj instanceof Map) for (const [key, value] of obj) add(key, value);
		else if (obj && typeof obj === "object") for (const key of Object.keys(obj)) add(key, obj[key]);
		if (typeof schema.sortMapEntries === "function") map.items.sort(schema.sortMapEntries);
		return map;
	}
	/**
	* Adds a value to the collection.
	*
	* @param overwrite - If not set `true`, using a key that is already in the
	*   collection will throw. Otherwise, overwrites the previous value.
	*/
	add(pair, overwrite) {
		let _pair;
		if (isPair(pair)) _pair = pair;
		else if (!pair || typeof pair !== "object" || !("key" in pair)) _pair = new Pair(pair, pair?.value);
		else _pair = new Pair(pair.key, pair.value);
		const prev = findPair(this.items, _pair.key);
		const sortEntries = this.schema?.sortMapEntries;
		if (prev) {
			if (!overwrite) throw new Error(`Key ${_pair.key} already set`);
			if (isScalar(prev.value) && isScalarValue(_pair.value)) prev.value.value = _pair.value;
			else prev.value = _pair.value;
		} else if (sortEntries) {
			const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
			if (i === -1) this.items.push(_pair);
			else this.items.splice(i, 0, _pair);
		} else this.items.push(_pair);
	}
	delete(key) {
		const it = findPair(this.items, key);
		if (!it) return false;
		return this.items.splice(this.items.indexOf(it), 1).length > 0;
	}
	get(key, keepScalar) {
		const node = findPair(this.items, key)?.value;
		return (!keepScalar && isScalar(node) ? node.value : node) ?? void 0;
	}
	has(key) {
		return !!findPair(this.items, key);
	}
	set(key, value) {
		this.add(new Pair(key, value), true);
	}
	/**
	* @param ctx - Conversion context, originally set in Document#toJS()
	* @param {Class} Type - If set, forces the returned collection type
	* @returns Instance of Type, Map, or Object
	*/
	toJSON(_, ctx, Type) {
		const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
		if (ctx?.onCreate) ctx.onCreate(map);
		for (const item of this.items) addPairToJSMap(ctx, map, item);
		return map;
	}
	toString(ctx, onComment, onChompKeep) {
		if (!ctx) return JSON.stringify(this);
		for (const item of this.items) if (!isPair(item)) throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
		if (!ctx.allNullValues && this.hasAllNullValues(false)) ctx = Object.assign({}, ctx, { allNullValues: true });
		return stringifyCollection(this, ctx, {
			blockItemPrefix: "",
			flowChars: {
				start: "{",
				end: "}"
			},
			itemIndent: ctx.indent || "",
			onChompKeep,
			onComment
		});
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/common/map.js
var map = {
	collection: "map",
	default: true,
	nodeClass: YAMLMap,
	tag: "tag:yaml.org,2002:map",
	resolve(map, onError) {
		if (!isMap(map)) onError("Expected a mapping for this tag");
		return map;
	},
	createNode: (schema, obj, ctx) => YAMLMap.from(schema, obj, ctx)
};
//#endregion
//#region node_modules/yaml/browser/dist/nodes/YAMLSeq.js
var YAMLSeq = class extends Collection {
	static get tagName() {
		return "tag:yaml.org,2002:seq";
	}
	constructor(schema) {
		super(SEQ, schema);
		this.items = [];
	}
	add(value) {
		this.items.push(value);
	}
	/**
	* Removes a value from the collection.
	*
	* `key` must contain a representation of an integer for this to succeed.
	* It may be wrapped in a `Scalar`.
	*
	* @returns `true` if the item was found and removed.
	*/
	delete(key) {
		const idx = asItemIndex(key);
		if (typeof idx !== "number") return false;
		return this.items.splice(idx, 1).length > 0;
	}
	get(key, keepScalar) {
		const idx = asItemIndex(key);
		if (typeof idx !== "number") return void 0;
		const it = this.items[idx];
		return !keepScalar && isScalar(it) ? it.value : it;
	}
	/**
	* Checks if the collection includes a value with the key `key`.
	*
	* `key` must contain a representation of an integer for this to succeed.
	* It may be wrapped in a `Scalar`.
	*/
	has(key) {
		const idx = asItemIndex(key);
		return typeof idx === "number" && idx < this.items.length;
	}
	/**
	* Sets a value in this collection. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*
	* If `key` does not contain a representation of an integer, this will throw.
	* It may be wrapped in a `Scalar`.
	*/
	set(key, value) {
		const idx = asItemIndex(key);
		if (typeof idx !== "number") throw new Error(`Expected a valid index, not ${key}.`);
		const prev = this.items[idx];
		if (isScalar(prev) && isScalarValue(value)) prev.value = value;
		else this.items[idx] = value;
	}
	toJSON(_, ctx) {
		const seq = [];
		if (ctx?.onCreate) ctx.onCreate(seq);
		let i = 0;
		for (const item of this.items) seq.push(toJS(item, String(i++), ctx));
		return seq;
	}
	toString(ctx, onComment, onChompKeep) {
		if (!ctx) return JSON.stringify(this);
		return stringifyCollection(this, ctx, {
			blockItemPrefix: "- ",
			flowChars: {
				start: "[",
				end: "]"
			},
			itemIndent: (ctx.indent || "") + "  ",
			onChompKeep,
			onComment
		});
	}
	static from(schema, obj, ctx) {
		const { replacer } = ctx;
		const seq = new this(schema);
		if (obj && Symbol.iterator in Object(obj)) {
			let i = 0;
			for (let it of obj) {
				if (typeof replacer === "function") {
					const key = obj instanceof Set ? it : String(i++);
					it = replacer.call(obj, key, it);
				}
				seq.items.push(createNode(it, void 0, ctx));
			}
		}
		return seq;
	}
};
function asItemIndex(key) {
	let idx = isScalar(key) ? key.value : key;
	if (idx && typeof idx === "string") idx = Number(idx);
	return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
}
//#endregion
//#region node_modules/yaml/browser/dist/schema/common/seq.js
var seq = {
	collection: "seq",
	default: true,
	nodeClass: YAMLSeq,
	tag: "tag:yaml.org,2002:seq",
	resolve(seq, onError) {
		if (!isSeq(seq)) onError("Expected a sequence for this tag");
		return seq;
	},
	createNode: (schema, obj, ctx) => YAMLSeq.from(schema, obj, ctx)
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/common/string.js
var string$2 = {
	identify: (value) => typeof value === "string",
	default: true,
	tag: "tag:yaml.org,2002:str",
	resolve: (str) => str,
	stringify(item, ctx, onComment, onChompKeep) {
		ctx = Object.assign({ actualString: true }, ctx);
		return stringifyString(item, ctx, onComment, onChompKeep);
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/common/null.js
var nullTag = {
	identify: (value) => value == null,
	createNode: () => new Scalar(null),
	default: true,
	tag: "tag:yaml.org,2002:null",
	test: /^(?:~|[Nn]ull|NULL)?$/,
	resolve: () => new Scalar(null),
	stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/core/bool.js
var boolTag = {
	identify: (value) => typeof value === "boolean",
	default: true,
	tag: "tag:yaml.org,2002:bool",
	test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
	resolve: (str) => new Scalar(str[0] === "t" || str[0] === "T"),
	stringify({ source, value }, ctx) {
		if (source && boolTag.test.test(source)) {
			if (value === (source[0] === "t" || source[0] === "T")) return source;
		}
		return value ? ctx.options.trueStr : ctx.options.falseStr;
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/stringify/stringifyNumber.js
function stringifyNumber({ format, minFractionDigits, tag, value }) {
	if (typeof value === "bigint") return String(value);
	const num = typeof value === "number" ? value : Number(value);
	if (!isFinite(num)) return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
	let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
	if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
		let i = n.indexOf(".");
		if (i < 0) {
			i = n.length;
			n += ".";
		}
		let d = minFractionDigits - (n.length - i - 1);
		while (d-- > 0) n += "0";
	}
	return n;
}
//#endregion
//#region node_modules/yaml/browser/dist/schema/core/float.js
var floatNaN$1 = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
	resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
	stringify: stringifyNumber
};
var floatExp$1 = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	format: "EXP",
	test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
	resolve: (str) => parseFloat(str),
	stringify(node) {
		const num = Number(node.value);
		return isFinite(num) ? num.toExponential() : stringifyNumber(node);
	}
};
var float$1 = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
	resolve(str) {
		const node = new Scalar(parseFloat(str));
		const dot = str.indexOf(".");
		if (dot !== -1 && str[str.length - 1] === "0") node.minFractionDigits = str.length - dot - 1;
		return node;
	},
	stringify: stringifyNumber
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/core/int.js
var intIdentify$2 = (value) => typeof value === "bigint" || Number.isInteger(value);
var intResolve$1 = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
function intStringify$1(node, radix, prefix) {
	const { value } = node;
	if (intIdentify$2(value) && value >= 0) return prefix + value.toString(radix);
	return stringifyNumber(node);
}
var intOct$1 = {
	identify: (value) => intIdentify$2(value) && value >= 0,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "OCT",
	test: /^0o[0-7]+$/,
	resolve: (str, _onError, opt) => intResolve$1(str, 2, 8, opt),
	stringify: (node) => intStringify$1(node, 8, "0o")
};
var int$2 = {
	identify: intIdentify$2,
	default: true,
	tag: "tag:yaml.org,2002:int",
	test: /^[-+]?[0-9]+$/,
	resolve: (str, _onError, opt) => intResolve$1(str, 0, 10, opt),
	stringify: stringifyNumber
};
var intHex$1 = {
	identify: (value) => intIdentify$2(value) && value >= 0,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "HEX",
	test: /^0x[0-9a-fA-F]+$/,
	resolve: (str, _onError, opt) => intResolve$1(str, 2, 16, opt),
	stringify: (node) => intStringify$1(node, 16, "0x")
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/core/schema.js
var schema$2 = [
	map,
	seq,
	string$2,
	nullTag,
	boolTag,
	intOct$1,
	int$2,
	intHex$1,
	floatNaN$1,
	floatExp$1,
	float$1
];
//#endregion
//#region node_modules/yaml/browser/dist/schema/json/schema.js
function intIdentify$1(value) {
	return typeof value === "bigint" || Number.isInteger(value);
}
var stringifyJSON = ({ value }) => JSON.stringify(value);
var jsonScalars = [
	{
		identify: (value) => typeof value === "string",
		default: true,
		tag: "tag:yaml.org,2002:str",
		resolve: (str) => str,
		stringify: stringifyJSON
	},
	{
		identify: (value) => value == null,
		createNode: () => new Scalar(null),
		default: true,
		tag: "tag:yaml.org,2002:null",
		test: /^null$/,
		resolve: () => null,
		stringify: stringifyJSON
	},
	{
		identify: (value) => typeof value === "boolean",
		default: true,
		tag: "tag:yaml.org,2002:bool",
		test: /^true$|^false$/,
		resolve: (str) => str === "true",
		stringify: stringifyJSON
	},
	{
		identify: intIdentify$1,
		default: true,
		tag: "tag:yaml.org,2002:int",
		test: /^-?(?:0|[1-9][0-9]*)$/,
		resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
		stringify: ({ value }) => intIdentify$1(value) ? value.toString() : JSON.stringify(value)
	},
	{
		identify: (value) => typeof value === "number",
		default: true,
		tag: "tag:yaml.org,2002:float",
		test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
		resolve: (str) => parseFloat(str),
		stringify: stringifyJSON
	}
];
var schema$1 = [map, seq].concat(jsonScalars, {
	default: true,
	tag: "",
	test: /^/,
	resolve(str, onError) {
		onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
		return str;
	}
});
//#endregion
//#region node_modules/yaml/browser/dist/schema/yaml-1.1/binary.js
var binary = {
	identify: (value) => value instanceof Uint8Array,
	default: false,
	tag: "tag:yaml.org,2002:binary",
	/**
	* Returns a Buffer in node and an Uint8Array in browsers
	*
	* To use the resulting buffer as an image, you'll want to do something like:
	*
	*   const blob = new Blob([buffer], { type: 'image/jpeg' })
	*   document.querySelector('#photo').src = URL.createObjectURL(blob)
	*/
	resolve(src, onError) {
		if (typeof atob === "function") {
			const str = atob(src.replace(/[\n\r]/g, ""));
			const buffer = new Uint8Array(str.length);
			for (let i = 0; i < str.length; ++i) buffer[i] = str.charCodeAt(i);
			return buffer;
		} else {
			onError("This environment does not support reading binary tags; either Buffer or atob is required");
			return src;
		}
	},
	stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
		if (!value) return "";
		const buf = value;
		let str;
		if (typeof btoa === "function") {
			let s = "";
			for (let i = 0; i < buf.length; ++i) s += String.fromCharCode(buf[i]);
			str = btoa(s);
		} else throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
		type ?? (type = Scalar.BLOCK_LITERAL);
		if (type !== Scalar.QUOTE_DOUBLE) {
			const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
			const n = Math.ceil(str.length / lineWidth);
			const lines = new Array(n);
			for (let i = 0, o = 0; i < n; ++i, o += lineWidth) lines[i] = str.substr(o, lineWidth);
			str = lines.join(type === Scalar.BLOCK_LITERAL ? "\n" : " ");
		}
		return stringifyString({
			comment,
			type,
			value: str
		}, ctx, onComment, onChompKeep);
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/yaml-1.1/pairs.js
function resolvePairs(seq, onError) {
	if (isSeq(seq)) for (let i = 0; i < seq.items.length; ++i) {
		let item = seq.items[i];
		if (isPair(item)) continue;
		else if (isMap(item)) {
			if (item.items.length > 1) onError("Each pair must have its own sequence indicator");
			const pair = item.items[0] || new Pair(new Scalar(null));
			if (item.commentBefore) pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}\n${pair.key.commentBefore}` : item.commentBefore;
			if (item.comment) {
				const cn = pair.value ?? pair.key;
				cn.comment = cn.comment ? `${item.comment}\n${cn.comment}` : item.comment;
			}
			item = pair;
		}
		seq.items[i] = isPair(item) ? item : new Pair(item);
	}
	else onError("Expected a sequence for this tag");
	return seq;
}
function createPairs(schema, iterable, ctx) {
	const { replacer } = ctx;
	const pairs = new YAMLSeq(schema);
	pairs.tag = "tag:yaml.org,2002:pairs";
	let i = 0;
	if (iterable && Symbol.iterator in Object(iterable)) for (let it of iterable) {
		if (typeof replacer === "function") it = replacer.call(iterable, String(i++), it);
		let key, value;
		if (Array.isArray(it)) if (it.length === 2) {
			key = it[0];
			value = it[1];
		} else throw new TypeError(`Expected [key, value] tuple: ${it}`);
		else if (it && it instanceof Object) {
			const keys = Object.keys(it);
			if (keys.length === 1) {
				key = keys[0];
				value = it[key];
			} else throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
		} else key = it;
		pairs.items.push(createPair(key, value, ctx));
	}
	return pairs;
}
var pairs = {
	collection: "seq",
	default: false,
	tag: "tag:yaml.org,2002:pairs",
	resolve: resolvePairs,
	createNode: createPairs
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/yaml-1.1/omap.js
var YAMLOMap = class YAMLOMap extends YAMLSeq {
	constructor() {
		super();
		this.add = YAMLMap.prototype.add.bind(this);
		this.delete = YAMLMap.prototype.delete.bind(this);
		this.get = YAMLMap.prototype.get.bind(this);
		this.has = YAMLMap.prototype.has.bind(this);
		this.set = YAMLMap.prototype.set.bind(this);
		this.tag = YAMLOMap.tag;
	}
	/**
	* If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
	* but TypeScript won't allow widening the signature of a child method.
	*/
	toJSON(_, ctx) {
		if (!ctx) return super.toJSON(_);
		const map = /* @__PURE__ */ new Map();
		if (ctx?.onCreate) ctx.onCreate(map);
		for (const pair of this.items) {
			let key, value;
			if (isPair(pair)) {
				key = toJS(pair.key, "", ctx);
				value = toJS(pair.value, key, ctx);
			} else key = toJS(pair, "", ctx);
			if (map.has(key)) throw new Error("Ordered maps must not include duplicate keys");
			map.set(key, value);
		}
		return map;
	}
	static from(schema, iterable, ctx) {
		const pairs = createPairs(schema, iterable, ctx);
		const omap = new this();
		omap.items = pairs.items;
		return omap;
	}
};
YAMLOMap.tag = "tag:yaml.org,2002:omap";
var omap = {
	collection: "seq",
	identify: (value) => value instanceof Map,
	nodeClass: YAMLOMap,
	default: false,
	tag: "tag:yaml.org,2002:omap",
	resolve(seq, onError) {
		const pairs = resolvePairs(seq, onError);
		const seenKeys = [];
		for (const { key } of pairs.items) if (isScalar(key)) if (seenKeys.includes(key.value)) onError(`Ordered maps must not include duplicate keys: ${key.value}`);
		else seenKeys.push(key.value);
		return Object.assign(new YAMLOMap(), pairs);
	},
	createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/yaml-1.1/bool.js
function boolStringify({ value, source }, ctx) {
	if (source && (value ? trueTag : falseTag).test.test(source)) return source;
	return value ? ctx.options.trueStr : ctx.options.falseStr;
}
var trueTag = {
	identify: (value) => value === true,
	default: true,
	tag: "tag:yaml.org,2002:bool",
	test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
	resolve: () => new Scalar(true),
	stringify: boolStringify
};
var falseTag = {
	identify: (value) => value === false,
	default: true,
	tag: "tag:yaml.org,2002:bool",
	test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
	resolve: () => new Scalar(false),
	stringify: boolStringify
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/yaml-1.1/float.js
var floatNaN = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
	resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
	stringify: stringifyNumber
};
var floatExp = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	format: "EXP",
	test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
	resolve: (str) => parseFloat(str.replace(/_/g, "")),
	stringify(node) {
		const num = Number(node.value);
		return isFinite(num) ? num.toExponential() : stringifyNumber(node);
	}
};
var float = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
	resolve(str) {
		const node = new Scalar(parseFloat(str.replace(/_/g, "")));
		const dot = str.indexOf(".");
		if (dot !== -1) {
			const f = str.substring(dot + 1).replace(/_/g, "");
			if (f[f.length - 1] === "0") node.minFractionDigits = f.length;
		}
		return node;
	},
	stringify: stringifyNumber
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/yaml-1.1/int.js
var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
function intResolve(str, offset, radix, { intAsBigInt }) {
	const sign = str[0];
	if (sign === "-" || sign === "+") offset += 1;
	str = str.substring(offset).replace(/_/g, "");
	if (intAsBigInt) {
		switch (radix) {
			case 2:
				str = `0b${str}`;
				break;
			case 8:
				str = `0o${str}`;
				break;
			case 16:
				str = `0x${str}`;
				break;
		}
		const n = BigInt(str);
		return sign === "-" ? BigInt(-1) * n : n;
	}
	const n = parseInt(str, radix);
	return sign === "-" ? -1 * n : n;
}
function intStringify(node, radix, prefix) {
	const { value } = node;
	if (intIdentify(value)) {
		const str = value.toString(radix);
		return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
	}
	return stringifyNumber(node);
}
var intBin = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "BIN",
	test: /^[-+]?0b[0-1_]+$/,
	resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
	stringify: (node) => intStringify(node, 2, "0b")
};
var intOct = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "OCT",
	test: /^[-+]?0[0-7_]+$/,
	resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
	stringify: (node) => intStringify(node, 8, "0")
};
var int$1 = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	test: /^[-+]?[0-9][0-9_]*$/,
	resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
	stringify: stringifyNumber
};
var intHex = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "HEX",
	test: /^[-+]?0x[0-9a-fA-F_]+$/,
	resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
	stringify: (node) => intStringify(node, 16, "0x")
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/yaml-1.1/set.js
var YAMLSet = class YAMLSet extends YAMLMap {
	constructor(schema) {
		super(schema);
		this.tag = YAMLSet.tag;
	}
	add(key) {
		let pair;
		if (isPair(key)) pair = key;
		else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null) pair = new Pair(key.key, null);
		else pair = new Pair(key, null);
		if (!findPair(this.items, pair.key)) this.items.push(pair);
	}
	/**
	* If `keepPair` is `true`, returns the Pair matching `key`.
	* Otherwise, returns the value of that Pair's key.
	*/
	get(key, keepPair) {
		const pair = findPair(this.items, key);
		return !keepPair && isPair(pair) ? isScalar(pair.key) ? pair.key.value : pair.key : pair;
	}
	set(key, value) {
		if (typeof value !== "boolean") throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
		const prev = findPair(this.items, key);
		if (prev && !value) this.items.splice(this.items.indexOf(prev), 1);
		else if (!prev && value) this.items.push(new Pair(key));
	}
	toJSON(_, ctx) {
		return super.toJSON(_, ctx, Set);
	}
	toString(ctx, onComment, onChompKeep) {
		if (!ctx) return JSON.stringify(this);
		if (this.hasAllNullValues(true)) return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
		else throw new Error("Set items must all have null values");
	}
	static from(schema, iterable, ctx) {
		const { replacer } = ctx;
		const set = new this(schema);
		if (iterable && Symbol.iterator in Object(iterable)) for (let value of iterable) {
			if (typeof replacer === "function") value = replacer.call(iterable, value, value);
			set.items.push(createPair(value, null, ctx));
		}
		return set;
	}
};
YAMLSet.tag = "tag:yaml.org,2002:set";
var set = {
	collection: "map",
	identify: (value) => value instanceof Set,
	nodeClass: YAMLSet,
	default: false,
	tag: "tag:yaml.org,2002:set",
	createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
	resolve(map, onError) {
		if (isMap(map)) if (map.hasAllNullValues(true)) return Object.assign(new YAMLSet(), map);
		else onError("Set items must all have null values");
		else onError("Expected a mapping for this tag");
		return map;
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/yaml-1.1/timestamp.js
/** Internal types handle bigint as number, because TS can't figure it out. */
function parseSexagesimal(str, asBigInt) {
	const sign = str[0];
	const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
	const num = (n) => asBigInt ? BigInt(n) : Number(n);
	const res = parts.replace(/_/g, "").split(":").reduce((res, p) => res * num(60) + num(p), num(0));
	return sign === "-" ? num(-1) * res : res;
}
/**
* hhhh:mm:ss.sss
*
* Internal types handle bigint as number, because TS can't figure it out.
*/
function stringifySexagesimal(node) {
	let { value } = node;
	let num = (n) => n;
	if (typeof value === "bigint") num = (n) => BigInt(n);
	else if (isNaN(value) || !isFinite(value)) return stringifyNumber(node);
	let sign = "";
	if (value < 0) {
		sign = "-";
		value *= num(-1);
	}
	const _60 = num(60);
	const parts = [value % _60];
	if (value < 60) parts.unshift(0);
	else {
		value = (value - parts[0]) / _60;
		parts.unshift(value % _60);
		if (value >= 60) {
			value = (value - parts[0]) / _60;
			parts.unshift(value);
		}
	}
	return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
}
var intTime = {
	identify: (value) => typeof value === "bigint" || Number.isInteger(value),
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "TIME",
	test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
	resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
	stringify: stringifySexagesimal
};
var floatTime = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	format: "TIME",
	test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
	resolve: (str) => parseSexagesimal(str, false),
	stringify: stringifySexagesimal
};
var timestamp = {
	identify: (value) => value instanceof Date,
	default: true,
	tag: "tag:yaml.org,2002:timestamp",
	test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
	resolve(str) {
		const match = str.match(timestamp.test);
		if (!match) throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
		const [, year, month, day, hour, minute, second] = match.map(Number);
		const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
		let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
		const tz = match[8];
		if (tz && tz !== "Z") {
			let d = parseSexagesimal(tz, false);
			if (Math.abs(d) < 30) d *= 60;
			date -= 6e4 * d;
		}
		return new Date(date);
	},
	stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
};
//#endregion
//#region node_modules/yaml/browser/dist/schema/yaml-1.1/schema.js
var schema = [
	map,
	seq,
	string$2,
	nullTag,
	trueTag,
	falseTag,
	intBin,
	intOct,
	int$1,
	intHex,
	floatNaN,
	floatExp,
	float,
	binary,
	merge$1,
	omap,
	pairs,
	set,
	intTime,
	floatTime,
	timestamp
];
//#endregion
//#region node_modules/yaml/browser/dist/schema/tags.js
var schemas = /* @__PURE__ */ new Map([
	["core", schema$2],
	["failsafe", [
		map,
		seq,
		string$2
	]],
	["json", schema$1],
	["yaml11", schema],
	["yaml-1.1", schema]
]);
var tagsByName = {
	binary,
	bool: boolTag,
	float: float$1,
	floatExp: floatExp$1,
	floatNaN: floatNaN$1,
	floatTime,
	int: int$2,
	intHex: intHex$1,
	intOct: intOct$1,
	intTime,
	map,
	merge: merge$1,
	null: nullTag,
	omap,
	pairs,
	seq,
	set,
	timestamp
};
var coreKnownTags = {
	"tag:yaml.org,2002:binary": binary,
	"tag:yaml.org,2002:merge": merge$1,
	"tag:yaml.org,2002:omap": omap,
	"tag:yaml.org,2002:pairs": pairs,
	"tag:yaml.org,2002:set": set,
	"tag:yaml.org,2002:timestamp": timestamp
};
function getTags(customTags, schemaName, addMergeTag) {
	const schemaTags = schemas.get(schemaName);
	if (schemaTags && !customTags) return addMergeTag && !schemaTags.includes(merge$1) ? schemaTags.concat(merge$1) : schemaTags.slice();
	let tags = schemaTags;
	if (!tags) if (Array.isArray(customTags)) tags = [];
	else {
		const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
		throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
	}
	if (Array.isArray(customTags)) for (const tag of customTags) tags = tags.concat(tag);
	else if (typeof customTags === "function") tags = customTags(tags.slice());
	if (addMergeTag) tags = tags.concat(merge$1);
	return tags.reduce((tags, tag) => {
		const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
		if (!tagObj) {
			const tagName = JSON.stringify(tag);
			const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
			throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
		}
		if (!tags.includes(tagObj)) tags.push(tagObj);
		return tags;
	}, []);
}
//#endregion
//#region node_modules/yaml/browser/dist/schema/Schema.js
var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
var Schema = class Schema {
	constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
		this.compat = Array.isArray(compat) ? getTags(compat, "compat") : compat ? getTags(null, compat) : null;
		this.name = typeof schema === "string" && schema || "core";
		this.knownTags = resolveKnownTags ? coreKnownTags : {};
		this.tags = getTags(customTags, this.name, merge);
		this.toStringOptions = toStringDefaults ?? null;
		Object.defineProperty(this, MAP, { value: map });
		Object.defineProperty(this, SCALAR$1, { value: string$2 });
		Object.defineProperty(this, SEQ, { value: seq });
		this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
	}
	clone() {
		const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
		copy.tags = this.tags.slice();
		return copy;
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/stringify/stringifyDocument.js
function stringifyDocument(doc, options) {
	const lines = [];
	let hasDirectives = options.directives === true;
	if (options.directives !== false && doc.directives) {
		const dir = doc.directives.toString(doc);
		if (dir) {
			lines.push(dir);
			hasDirectives = true;
		} else if (doc.directives.docStart) hasDirectives = true;
	}
	if (hasDirectives) lines.push("---");
	const ctx = createStringifyContext(doc, options);
	const { commentString } = ctx.options;
	if (doc.commentBefore) {
		if (lines.length !== 1) lines.unshift("");
		const cs = commentString(doc.commentBefore);
		lines.unshift(indentComment(cs, ""));
	}
	let chompKeep = false;
	let contentComment = null;
	if (doc.contents) {
		if (isNode(doc.contents)) {
			if (doc.contents.spaceBefore && hasDirectives) lines.push("");
			if (doc.contents.commentBefore) {
				const cs = commentString(doc.contents.commentBefore);
				lines.push(indentComment(cs, ""));
			}
			ctx.forceBlockIndent = !!doc.comment;
			contentComment = doc.contents.comment;
		}
		const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
		let body = stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
		if (contentComment) body += lineComment(body, "", commentString(contentComment));
		if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") lines[lines.length - 1] = `--- ${body}`;
		else lines.push(body);
	} else lines.push(stringify(doc.contents, ctx));
	if (doc.directives?.docEnd) if (doc.comment) {
		const cs = commentString(doc.comment);
		if (cs.includes("\n")) {
			lines.push("...");
			lines.push(indentComment(cs, ""));
		} else lines.push(`... ${cs}`);
	} else lines.push("...");
	else {
		let dc = doc.comment;
		if (dc && chompKeep) dc = dc.replace(/^\n+/, "");
		if (dc) {
			if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "") lines.push("");
			lines.push(indentComment(commentString(dc), ""));
		}
	}
	return lines.join("\n") + "\n";
}
//#endregion
//#region node_modules/yaml/browser/dist/doc/Document.js
var Document = class Document {
	constructor(value, replacer, options) {
		/** A comment before this Document */
		this.commentBefore = null;
		/** A comment immediately after this Document */
		this.comment = null;
		/** Errors encountered during parsing. */
		this.errors = [];
		/** Warnings encountered during parsing. */
		this.warnings = [];
		Object.defineProperty(this, NODE_TYPE, { value: DOC });
		let _replacer = null;
		if (typeof replacer === "function" || Array.isArray(replacer)) _replacer = replacer;
		else if (options === void 0 && replacer) {
			options = replacer;
			replacer = void 0;
		}
		const opt = Object.assign({
			intAsBigInt: false,
			keepSourceTokens: false,
			logLevel: "warn",
			prettyErrors: true,
			strict: true,
			stringKeys: false,
			uniqueKeys: true,
			version: "1.2"
		}, options);
		this.options = opt;
		let { version } = opt;
		if (options?._directives) {
			this.directives = options._directives.atDocument();
			if (this.directives.yaml.explicit) version = this.directives.yaml.version;
		} else this.directives = new Directives({ version });
		this.setSchema(version, options);
		this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
	}
	/**
	* Create a deep copy of this Document and its contents.
	*
	* Custom Node values that inherit from `Object` still refer to their original instances.
	*/
	clone() {
		const copy = Object.create(Document.prototype, { [NODE_TYPE]: { value: DOC } });
		copy.commentBefore = this.commentBefore;
		copy.comment = this.comment;
		copy.errors = this.errors.slice();
		copy.warnings = this.warnings.slice();
		copy.options = Object.assign({}, this.options);
		if (this.directives) copy.directives = this.directives.clone();
		copy.schema = this.schema.clone();
		copy.contents = isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
		if (this.range) copy.range = this.range.slice();
		return copy;
	}
	/** Adds a value to the document. */
	add(value) {
		if (assertCollection(this.contents)) this.contents.add(value);
	}
	/** Adds a value to the document. */
	addIn(path, value) {
		if (assertCollection(this.contents)) this.contents.addIn(path, value);
	}
	/**
	* Create a new `Alias` node, ensuring that the target `node` has the required anchor.
	*
	* If `node` already has an anchor, `name` is ignored.
	* Otherwise, the `node.anchor` value will be set to `name`,
	* or if an anchor with that name is already present in the document,
	* `name` will be used as a prefix for a new unique anchor.
	* If `name` is undefined, the generated anchor will use 'a' as a prefix.
	*/
	createAlias(node, name) {
		if (!node.anchor) {
			const prev = anchorNames(this);
			node.anchor = !name || prev.has(name) ? findNewAnchor(name || "a", prev) : name;
		}
		return new Alias(node.anchor);
	}
	createNode(value, replacer, options) {
		let _replacer = void 0;
		if (typeof replacer === "function") {
			value = replacer.call({ "": value }, "", value);
			_replacer = replacer;
		} else if (Array.isArray(replacer)) {
			const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
			const asStr = replacer.filter(keyToStr).map(String);
			if (asStr.length > 0) replacer = replacer.concat(asStr);
			_replacer = replacer;
		} else if (options === void 0 && replacer) {
			options = replacer;
			replacer = void 0;
		}
		const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
		const { onAnchor, setAnchors, sourceObjects } = createNodeAnchors(this, anchorPrefix || "a");
		const ctx = {
			aliasDuplicateObjects: aliasDuplicateObjects ?? true,
			keepUndefined: keepUndefined ?? false,
			onAnchor,
			onTagObj,
			replacer: _replacer,
			schema: this.schema,
			sourceObjects
		};
		const node = createNode(value, tag, ctx);
		if (flow && isCollection(node)) node.flow = true;
		setAnchors();
		return node;
	}
	/**
	* Convert a key and a value into a `Pair` using the current schema,
	* recursively wrapping all values as `Scalar` or `Collection` nodes.
	*/
	createPair(key, value, options = {}) {
		return new Pair(this.createNode(key, null, options), this.createNode(value, null, options));
	}
	/**
	* Removes a value from the document.
	* @returns `true` if the item was found and removed.
	*/
	delete(key) {
		return assertCollection(this.contents) ? this.contents.delete(key) : false;
	}
	/**
	* Removes a value from the document.
	* @returns `true` if the item was found and removed.
	*/
	deleteIn(path) {
		if (isEmptyPath(path)) {
			if (this.contents == null) return false;
			this.contents = null;
			return true;
		}
		return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
	}
	/**
	* Returns item at `key`, or `undefined` if not found. By default unwraps
	* scalar values from their surrounding node; to disable set `keepScalar` to
	* `true` (collections are always returned intact).
	*/
	get(key, keepScalar) {
		return isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
	}
	/**
	* Returns item at `path`, or `undefined` if not found. By default unwraps
	* scalar values from their surrounding node; to disable set `keepScalar` to
	* `true` (collections are always returned intact).
	*/
	getIn(path, keepScalar) {
		if (isEmptyPath(path)) return !keepScalar && isScalar(this.contents) ? this.contents.value : this.contents;
		return isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
	}
	/**
	* Checks if the document includes a value with the key `key`.
	*/
	has(key) {
		return isCollection(this.contents) ? this.contents.has(key) : false;
	}
	/**
	* Checks if the document includes a value at `path`.
	*/
	hasIn(path) {
		if (isEmptyPath(path)) return this.contents !== void 0;
		return isCollection(this.contents) ? this.contents.hasIn(path) : false;
	}
	/**
	* Sets a value in this document. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*/
	set(key, value) {
		if (this.contents == null) this.contents = collectionFromPath(this.schema, [key], value);
		else if (assertCollection(this.contents)) this.contents.set(key, value);
	}
	/**
	* Sets a value in this document. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*/
	setIn(path, value) {
		if (isEmptyPath(path)) this.contents = value;
		else if (this.contents == null) this.contents = collectionFromPath(this.schema, Array.from(path), value);
		else if (assertCollection(this.contents)) this.contents.setIn(path, value);
	}
	/**
	* Change the YAML version and schema used by the document.
	* A `null` version disables support for directives, explicit tags, anchors, and aliases.
	* It also requires the `schema` option to be given as a `Schema` instance value.
	*
	* Overrides all previously set schema options.
	*/
	setSchema(version, options = {}) {
		if (typeof version === "number") version = String(version);
		let opt;
		switch (version) {
			case "1.1":
				if (this.directives) this.directives.yaml.version = "1.1";
				else this.directives = new Directives({ version: "1.1" });
				opt = {
					resolveKnownTags: false,
					schema: "yaml-1.1"
				};
				break;
			case "1.2":
			case "next":
				if (this.directives) this.directives.yaml.version = version;
				else this.directives = new Directives({ version });
				opt = {
					resolveKnownTags: true,
					schema: "core"
				};
				break;
			case null:
				if (this.directives) delete this.directives;
				opt = null;
				break;
			default: {
				const sv = JSON.stringify(version);
				throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
			}
		}
		if (options.schema instanceof Object) this.schema = options.schema;
		else if (opt) this.schema = new Schema(Object.assign(opt, options));
		else throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
	}
	toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
		const ctx = {
			anchors: /* @__PURE__ */ new Map(),
			doc: this,
			keep: !json,
			mapAsMap: mapAsMap === true,
			mapKeyWarned: false,
			maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
		};
		const res = toJS(this.contents, jsonArg ?? "", ctx);
		if (typeof onAnchor === "function") for (const { count, res } of ctx.anchors.values()) onAnchor(res, count);
		return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
	}
	/**
	* A JSON representation of the document `contents`.
	*
	* @param jsonArg Used by `JSON.stringify` to indicate the array index or
	*   property name.
	*/
	toJSON(jsonArg, onAnchor) {
		return this.toJS({
			json: true,
			jsonArg,
			mapAsMap: false,
			onAnchor
		});
	}
	/** A YAML representation of the document. */
	toString(options = {}) {
		if (this.errors.length > 0) throw new Error("Document with errors cannot be stringified");
		if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
			const s = JSON.stringify(options.indent);
			throw new Error(`"indent" option must be a positive integer, not ${s}`);
		}
		return stringifyDocument(this, options);
	}
};
function assertCollection(contents) {
	if (isCollection(contents)) return true;
	throw new Error("Expected a YAML collection as document contents");
}
//#endregion
//#region node_modules/yaml/browser/dist/errors.js
var YAMLError = class extends Error {
	constructor(name, pos, code, message) {
		super();
		this.name = name;
		this.code = code;
		this.message = message;
		this.pos = pos;
	}
};
var YAMLParseError = class extends YAMLError {
	constructor(pos, code, message) {
		super("YAMLParseError", pos, code, message);
	}
};
var YAMLWarning = class extends YAMLError {
	constructor(pos, code, message) {
		super("YAMLWarning", pos, code, message);
	}
};
var prettifyError$1 = (src, lc) => (error) => {
	if (error.pos[0] === -1) return;
	error.linePos = error.pos.map((pos) => lc.linePos(pos));
	const { line, col } = error.linePos[0];
	error.message += ` at line ${line}, column ${col}`;
	let ci = col - 1;
	let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
	if (ci >= 60 && lineStr.length > 80) {
		const trimStart = Math.min(ci - 39, lineStr.length - 79);
		lineStr = "…" + lineStr.substring(trimStart);
		ci -= trimStart - 1;
	}
	if (lineStr.length > 80) lineStr = lineStr.substring(0, 79) + "…";
	if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
		let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
		if (prev.length > 80) prev = prev.substring(0, 79) + "…\n";
		lineStr = prev + lineStr;
	}
	if (/[^ ]/.test(lineStr)) {
		let count = 1;
		const end = error.linePos[1];
		if (end?.line === line && end.col > col) count = Math.max(1, Math.min(end.col - col, 80 - ci));
		const pointer = " ".repeat(ci) + "^".repeat(count);
		error.message += `:\n\n${lineStr}\n${pointer}\n`;
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/compose/resolve-props.js
function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
	let spaceBefore = false;
	let atNewline = startOnNewline;
	let hasSpace = startOnNewline;
	let comment = "";
	let commentSep = "";
	let hasNewline = false;
	let reqSpace = false;
	let tab = null;
	let anchor = null;
	let tag = null;
	let newlineAfterProp = null;
	let comma = null;
	let found = null;
	let start = null;
	for (const token of tokens) {
		if (reqSpace) {
			if (token.type !== "space" && token.type !== "newline" && token.type !== "comma") onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
			reqSpace = false;
		}
		if (tab) {
			if (atNewline && token.type !== "comment" && token.type !== "newline") onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
			tab = null;
		}
		switch (token.type) {
			case "space":
				if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) tab = token;
				hasSpace = true;
				break;
			case "comment": {
				if (!hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
				const cb = token.source.substring(1) || " ";
				if (!comment) comment = cb;
				else comment += commentSep + cb;
				commentSep = "";
				atNewline = false;
				break;
			}
			case "newline":
				if (atNewline) {
					if (comment) comment += token.source;
					else if (!found || indicator !== "seq-item-ind") spaceBefore = true;
				} else commentSep += token.source;
				atNewline = true;
				hasNewline = true;
				if (anchor || tag) newlineAfterProp = token;
				hasSpace = true;
				break;
			case "anchor":
				if (anchor) onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
				if (token.source.endsWith(":")) onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
				anchor = token;
				start ?? (start = token.offset);
				atNewline = false;
				hasSpace = false;
				reqSpace = true;
				break;
			case "tag":
				if (tag) onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
				tag = token;
				start ?? (start = token.offset);
				atNewline = false;
				hasSpace = false;
				reqSpace = true;
				break;
			case indicator:
				if (anchor || tag) onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
				if (found) onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
				found = token;
				atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
				hasSpace = false;
				break;
			case "comma": if (flow) {
				if (comma) onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
				comma = token;
				atNewline = false;
				hasSpace = false;
				break;
			}
			default:
				onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
				atNewline = false;
				hasSpace = false;
		}
	}
	const last = tokens[tokens.length - 1];
	const end = last ? last.offset + last.source.length : offset;
	if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
	if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq")) onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
	return {
		comma,
		found,
		spaceBefore,
		comment,
		hasNewline,
		anchor,
		tag,
		newlineAfterProp,
		end,
		start: start ?? end
	};
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/util-contains-newline.js
function containsNewline(key) {
	if (!key) return null;
	switch (key.type) {
		case "alias":
		case "scalar":
		case "double-quoted-scalar":
		case "single-quoted-scalar":
			if (key.source.includes("\n")) return true;
			if (key.end) {
				for (const st of key.end) if (st.type === "newline") return true;
			}
			return false;
		case "flow-collection":
			for (const it of key.items) {
				for (const st of it.start) if (st.type === "newline") return true;
				if (it.sep) {
					for (const st of it.sep) if (st.type === "newline") return true;
				}
				if (containsNewline(it.key) || containsNewline(it.value)) return true;
			}
			return false;
		default: return true;
	}
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/util-flow-indent-check.js
function flowIndentCheck(indent, fc, onError) {
	if (fc?.type === "flow-collection") {
		const end = fc.end[0];
		if (end.indent === indent && (end.source === "]" || end.source === "}") && containsNewline(fc)) onError(end, "BAD_INDENT", "Flow end indicator should be more indented than parent", true);
	}
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/util-map-includes.js
function mapIncludes(ctx, items, search) {
	const { uniqueKeys } = ctx.options;
	if (uniqueKeys === false) return false;
	const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || isScalar(a) && isScalar(b) && a.value === b.value;
	return items.some((pair) => isEqual(pair.key, search));
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/resolve-block-map.js
var startColMsg = "All mapping items must start at the same column";
function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
	const map = new ((tag?.nodeClass) ?? YAMLMap)(ctx.schema);
	if (ctx.atRoot) ctx.atRoot = false;
	let offset = bm.offset;
	let commentEnd = null;
	for (const collItem of bm.items) {
		const { start, key, sep, value } = collItem;
		const keyProps = resolveProps(start, {
			indicator: "explicit-key-ind",
			next: key ?? sep?.[0],
			offset,
			onError,
			parentIndent: bm.indent,
			startOnNewline: true
		});
		const implicitKey = !keyProps.found;
		if (implicitKey) {
			if (key) {
				if (key.type === "block-seq") onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
				else if ("indent" in key && key.indent !== bm.indent) onError(offset, "BAD_INDENT", startColMsg);
			}
			if (!keyProps.anchor && !keyProps.tag && !sep) {
				commentEnd = keyProps.end;
				if (keyProps.comment) if (map.comment) map.comment += "\n" + keyProps.comment;
				else map.comment = keyProps.comment;
				continue;
			}
			if (keyProps.newlineAfterProp || containsNewline(key)) onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
		} else if (keyProps.found?.indent !== bm.indent) onError(offset, "BAD_INDENT", startColMsg);
		ctx.atKey = true;
		const keyStart = keyProps.end;
		const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
		if (ctx.schema.compat) flowIndentCheck(bm.indent, key, onError);
		ctx.atKey = false;
		if (mapIncludes(ctx, map.items, keyNode)) onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
		const valueProps = resolveProps(sep ?? [], {
			indicator: "map-value-ind",
			next: value,
			offset: keyNode.range[2],
			onError,
			parentIndent: bm.indent,
			startOnNewline: !key || key.type === "block-scalar"
		});
		offset = valueProps.end;
		if (valueProps.found) {
			if (implicitKey) {
				if (value?.type === "block-map" && !valueProps.hasNewline) onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
				if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024) onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
			}
			const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
			if (ctx.schema.compat) flowIndentCheck(bm.indent, value, onError);
			offset = valueNode.range[2];
			const pair = new Pair(keyNode, valueNode);
			if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
			map.items.push(pair);
		} else {
			if (implicitKey) onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
			if (valueProps.comment) if (keyNode.comment) keyNode.comment += "\n" + valueProps.comment;
			else keyNode.comment = valueProps.comment;
			const pair = new Pair(keyNode);
			if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
			map.items.push(pair);
		}
	}
	if (commentEnd && commentEnd < offset) onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
	map.range = [
		bm.offset,
		offset,
		commentEnd ?? offset
	];
	return map;
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/resolve-block-seq.js
function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
	const seq = new ((tag?.nodeClass) ?? YAMLSeq)(ctx.schema);
	if (ctx.atRoot) ctx.atRoot = false;
	if (ctx.atKey) ctx.atKey = false;
	let offset = bs.offset;
	let commentEnd = null;
	for (const { start, value } of bs.items) {
		const props = resolveProps(start, {
			indicator: "seq-item-ind",
			next: value,
			offset,
			onError,
			parentIndent: bs.indent,
			startOnNewline: true
		});
		if (!props.found) if (props.anchor || props.tag || value) if (value?.type === "block-seq") onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
		else onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
		else {
			commentEnd = props.end;
			if (props.comment) seq.comment = props.comment;
			continue;
		}
		const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
		if (ctx.schema.compat) flowIndentCheck(bs.indent, value, onError);
		offset = node.range[2];
		seq.items.push(node);
	}
	seq.range = [
		bs.offset,
		offset,
		commentEnd ?? offset
	];
	return seq;
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/resolve-end.js
function resolveEnd(end, offset, reqSpace, onError) {
	let comment = "";
	if (end) {
		let hasSpace = false;
		let sep = "";
		for (const token of end) {
			const { source, type } = token;
			switch (type) {
				case "space":
					hasSpace = true;
					break;
				case "comment": {
					if (reqSpace && !hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
					const cb = source.substring(1) || " ";
					if (!comment) comment = cb;
					else comment += sep + cb;
					sep = "";
					break;
				}
				case "newline":
					if (comment) sep += source;
					hasSpace = true;
					break;
				default: onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
			}
			offset += source.length;
		}
	}
	return {
		comment,
		offset
	};
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/resolve-flow-collection.js
var blockMsg = "Block collections are not allowed within flow collections";
var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
	const isMap = fc.start.source === "{";
	const fcName = isMap ? "flow map" : "flow sequence";
	const coll = new ((tag?.nodeClass) ?? (isMap ? YAMLMap : YAMLSeq))(ctx.schema);
	coll.flow = true;
	const atRoot = ctx.atRoot;
	if (atRoot) ctx.atRoot = false;
	if (ctx.atKey) ctx.atKey = false;
	let offset = fc.offset + fc.start.source.length;
	for (let i = 0; i < fc.items.length; ++i) {
		const collItem = fc.items[i];
		const { start, key, sep, value } = collItem;
		const props = resolveProps(start, {
			flow: fcName,
			indicator: "explicit-key-ind",
			next: key ?? sep?.[0],
			offset,
			onError,
			parentIndent: fc.indent,
			startOnNewline: false
		});
		if (!props.found) {
			if (!props.anchor && !props.tag && !sep && !value) {
				if (i === 0 && props.comma) onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
				else if (i < fc.items.length - 1) onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
				if (props.comment) if (coll.comment) coll.comment += "\n" + props.comment;
				else coll.comment = props.comment;
				offset = props.end;
				continue;
			}
			if (!isMap && ctx.options.strict && containsNewline(key)) onError(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
		}
		if (i === 0) {
			if (props.comma) onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
		} else {
			if (!props.comma) onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
			if (props.comment) {
				let prevItemComment = "";
				loop: for (const st of start) switch (st.type) {
					case "comma":
					case "space": break;
					case "comment":
						prevItemComment = st.source.substring(1);
						break loop;
					default: break loop;
				}
				if (prevItemComment) {
					let prev = coll.items[coll.items.length - 1];
					if (isPair(prev)) prev = prev.value ?? prev.key;
					if (prev.comment) prev.comment += "\n" + prevItemComment;
					else prev.comment = prevItemComment;
					props.comment = props.comment.substring(prevItemComment.length + 1);
				}
			}
		}
		if (!isMap && !sep && !props.found) {
			const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
			coll.items.push(valueNode);
			offset = valueNode.range[2];
			if (isBlock(value)) onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
		} else {
			ctx.atKey = true;
			const keyStart = props.end;
			const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
			if (isBlock(key)) onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
			ctx.atKey = false;
			const valueProps = resolveProps(sep ?? [], {
				flow: fcName,
				indicator: "map-value-ind",
				next: value,
				offset: keyNode.range[2],
				onError,
				parentIndent: fc.indent,
				startOnNewline: false
			});
			if (valueProps.found) {
				if (!isMap && !props.found && ctx.options.strict) {
					if (sep) for (const st of sep) {
						if (st === valueProps.found) break;
						if (st.type === "newline") {
							onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
							break;
						}
					}
					if (props.start < valueProps.found.offset - 1024) onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
				}
			} else if (value) if ("source" in value && value.source?.[0] === ":") onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
			else onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
			const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
			if (valueNode) {
				if (isBlock(value)) onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
			} else if (valueProps.comment) if (keyNode.comment) keyNode.comment += "\n" + valueProps.comment;
			else keyNode.comment = valueProps.comment;
			const pair = new Pair(keyNode, valueNode);
			if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
			if (isMap) {
				const map = coll;
				if (mapIncludes(ctx, map.items, keyNode)) onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
				map.items.push(pair);
			} else {
				const map = new YAMLMap(ctx.schema);
				map.flow = true;
				map.items.push(pair);
				const endRange = (valueNode ?? keyNode).range;
				map.range = [
					keyNode.range[0],
					endRange[1],
					endRange[2]
				];
				coll.items.push(map);
			}
			offset = valueNode ? valueNode.range[2] : valueProps.end;
		}
	}
	const expectedEnd = isMap ? "}" : "]";
	const [ce, ...ee] = fc.end;
	let cePos = offset;
	if (ce?.source === expectedEnd) cePos = ce.offset + ce.source.length;
	else {
		const name = fcName[0].toUpperCase() + fcName.substring(1);
		const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
		onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
		if (ce && ce.source.length !== 1) ee.unshift(ce);
	}
	if (ee.length > 0) {
		const end = resolveEnd(ee, cePos, ctx.options.strict, onError);
		if (end.comment) if (coll.comment) coll.comment += "\n" + end.comment;
		else coll.comment = end.comment;
		coll.range = [
			fc.offset,
			cePos,
			end.offset
		];
	} else coll.range = [
		fc.offset,
		cePos,
		cePos
	];
	return coll;
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/compose-collection.js
function resolveCollection(CN, ctx, token, onError, tagName, tag) {
	const coll = token.type === "block-map" ? resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection(CN, ctx, token, onError, tag);
	const Coll = coll.constructor;
	if (tagName === "!" || tagName === Coll.tagName) {
		coll.tag = Coll.tagName;
		return coll;
	}
	if (tagName) coll.tag = tagName;
	return coll;
}
function composeCollection(CN, ctx, token, props, onError) {
	const tagToken = props.tag;
	const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
	if (token.type === "block-seq") {
		const { anchor, newlineAfterProp: nl } = props;
		const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
		if (lastProp && (!nl || nl.offset < lastProp.offset)) onError(lastProp, "MISSING_CHAR", "Missing newline after block sequence props");
	}
	const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
	if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.tagName && expType === "seq") return resolveCollection(CN, ctx, token, onError, tagName);
	let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
	if (!tag) {
		const kt = ctx.schema.knownTags[tagName];
		if (kt?.collection === expType) {
			ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
			tag = kt;
		} else {
			if (kt) onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
			else onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
			return resolveCollection(CN, ctx, token, onError, tagName);
		}
	}
	const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
	const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
	const node = isNode(res) ? res : new Scalar(res);
	node.range = coll.range;
	node.tag = tagName;
	if (tag?.format) node.format = tag.format;
	return node;
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/resolve-block-scalar.js
function resolveBlockScalar(ctx, scalar, onError) {
	const start = scalar.offset;
	const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
	if (!header) return {
		value: "",
		type: null,
		comment: "",
		range: [
			start,
			start,
			start
		]
	};
	const type = header.mode === ">" ? Scalar.BLOCK_FOLDED : Scalar.BLOCK_LITERAL;
	const lines = scalar.source ? splitLines(scalar.source) : [];
	let chompStart = lines.length;
	for (let i = lines.length - 1; i >= 0; --i) {
		const content = lines[i][1];
		if (content === "" || content === "\r") chompStart = i;
		else break;
	}
	if (chompStart === 0) {
		const value = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
		let end = start + header.length;
		if (scalar.source) end += scalar.source.length;
		return {
			value,
			type,
			comment: header.comment,
			range: [
				start,
				end,
				end
			]
		};
	}
	let trimIndent = scalar.indent + header.indent;
	let offset = scalar.offset + header.length;
	let contentStart = 0;
	for (let i = 0; i < chompStart; ++i) {
		const [indent, content] = lines[i];
		if (content === "" || content === "\r") {
			if (header.indent === 0 && indent.length > trimIndent) trimIndent = indent.length;
		} else {
			if (indent.length < trimIndent) onError(offset + indent.length, "MISSING_CHAR", "Block scalars with more-indented leading empty lines must use an explicit indentation indicator");
			if (header.indent === 0) trimIndent = indent.length;
			contentStart = i;
			if (trimIndent === 0 && !ctx.atRoot) onError(offset, "BAD_INDENT", "Block scalar values in collections must be indented");
			break;
		}
		offset += indent.length + content.length + 1;
	}
	for (let i = lines.length - 1; i >= chompStart; --i) if (lines[i][0].length > trimIndent) chompStart = i + 1;
	let value = "";
	let sep = "";
	let prevMoreIndented = false;
	for (let i = 0; i < contentStart; ++i) value += lines[i][0].slice(trimIndent) + "\n";
	for (let i = contentStart; i < chompStart; ++i) {
		let [indent, content] = lines[i];
		offset += indent.length + content.length + 1;
		const crlf = content[content.length - 1] === "\r";
		if (crlf) content = content.slice(0, -1);
		/* istanbul ignore if already caught in lexer */
		if (content && indent.length < trimIndent) {
			const message = `Block scalar lines must not be less indented than their ${header.indent ? "explicit indentation indicator" : "first line"}`;
			onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
			indent = "";
		}
		if (type === Scalar.BLOCK_LITERAL) {
			value += sep + indent.slice(trimIndent) + content;
			sep = "\n";
		} else if (indent.length > trimIndent || content[0] === "	") {
			if (sep === " ") sep = "\n";
			else if (!prevMoreIndented && sep === "\n") sep = "\n\n";
			value += sep + indent.slice(trimIndent) + content;
			sep = "\n";
			prevMoreIndented = true;
		} else if (content === "") if (sep === "\n") value += "\n";
		else sep = "\n";
		else {
			value += sep + content;
			sep = " ";
			prevMoreIndented = false;
		}
	}
	switch (header.chomp) {
		case "-": break;
		case "+":
			for (let i = chompStart; i < lines.length; ++i) value += "\n" + lines[i][0].slice(trimIndent);
			if (value[value.length - 1] !== "\n") value += "\n";
			break;
		default: value += "\n";
	}
	const end = start + header.length + scalar.source.length;
	return {
		value,
		type,
		comment: header.comment,
		range: [
			start,
			end,
			end
		]
	};
}
function parseBlockScalarHeader({ offset, props }, strict, onError) {
	/* istanbul ignore if should not happen */
	if (props[0].type !== "block-scalar-header") {
		onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
		return null;
	}
	const { source } = props[0];
	const mode = source[0];
	let indent = 0;
	let chomp = "";
	let error = -1;
	for (let i = 1; i < source.length; ++i) {
		const ch = source[i];
		if (!chomp && (ch === "-" || ch === "+")) chomp = ch;
		else {
			const n = Number(ch);
			if (!indent && n) indent = n;
			else if (error === -1) error = offset + i;
		}
	}
	if (error !== -1) onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
	let hasSpace = false;
	let comment = "";
	let length = source.length;
	for (let i = 1; i < props.length; ++i) {
		const token = props[i];
		switch (token.type) {
			case "space": hasSpace = true;
			case "newline":
				length += token.source.length;
				break;
			case "comment":
				if (strict && !hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
				length += token.source.length;
				comment = token.source.substring(1);
				break;
			case "error":
				onError(token, "UNEXPECTED_TOKEN", token.message);
				length += token.source.length;
				break;
			/* istanbul ignore next should not happen */
			default: {
				onError(token, "UNEXPECTED_TOKEN", `Unexpected token in block scalar header: ${token.type}`);
				const ts = token.source;
				if (ts && typeof ts === "string") length += ts.length;
			}
		}
	}
	return {
		mode,
		indent,
		chomp,
		comment,
		length
	};
}
/** @returns Array of lines split up as `[indent, content]` */
function splitLines(source) {
	const split = source.split(/\n( *)/);
	const first = split[0];
	const m = first.match(/^( *)/);
	const lines = [m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first]];
	for (let i = 1; i < split.length; i += 2) lines.push([split[i], split[i + 1]]);
	return lines;
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/resolve-flow-scalar.js
function resolveFlowScalar(scalar, strict, onError) {
	const { offset, type, source, end } = scalar;
	let _type;
	let value;
	const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
	switch (type) {
		case "scalar":
			_type = Scalar.PLAIN;
			value = plainValue(source, _onError);
			break;
		case "single-quoted-scalar":
			_type = Scalar.QUOTE_SINGLE;
			value = singleQuotedValue(source, _onError);
			break;
		case "double-quoted-scalar":
			_type = Scalar.QUOTE_DOUBLE;
			value = doubleQuotedValue(source, _onError);
			break;
		/* istanbul ignore next should not happen */
		default:
			onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
			return {
				value: "",
				type: null,
				comment: "",
				range: [
					offset,
					offset + source.length,
					offset + source.length
				]
			};
	}
	const valueEnd = offset + source.length;
	const re = resolveEnd(end, valueEnd, strict, onError);
	return {
		value,
		type: _type,
		comment: re.comment,
		range: [
			offset,
			valueEnd,
			re.offset
		]
	};
}
function plainValue(source, onError) {
	let badChar = "";
	switch (source[0]) {
		/* istanbul ignore next should not happen */
		case "	":
			badChar = "a tab character";
			break;
		case ",":
			badChar = "flow indicator character ,";
			break;
		case "%":
			badChar = "directive indicator character %";
			break;
		case "|":
		case ">":
			badChar = `block scalar indicator ${source[0]}`;
			break;
		case "@":
		case "`":
			badChar = `reserved character ${source[0]}`;
			break;
	}
	if (badChar) onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
	return foldLines(source);
}
function singleQuotedValue(source, onError) {
	if (source[source.length - 1] !== "'" || source.length === 1) onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
	return foldLines(source.slice(1, -1)).replace(/''/g, "'");
}
function foldLines(source) {
	/**
	* The negative lookbehind here and in the `re` RegExp is to
	* prevent causing a polynomial search time in certain cases.
	*
	* The try-catch is for Safari, which doesn't support this yet:
	* https://caniuse.com/js-regexp-lookbehind
	*/
	let first, line;
	try {
		first = /* @__PURE__ */ new RegExp("(.*?)(?<![ 	])[ 	]*\r?\n", "sy");
		line = /* @__PURE__ */ new RegExp("[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n", "sy");
	} catch {
		first = /(.*?)[ \t]*\r?\n/sy;
		line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
	}
	let match = first.exec(source);
	if (!match) return source;
	let res = match[1];
	let sep = " ";
	let pos = first.lastIndex;
	line.lastIndex = pos;
	while (match = line.exec(source)) {
		if (match[1] === "") if (sep === "\n") res += sep;
		else sep = "\n";
		else {
			res += sep + match[1];
			sep = " ";
		}
		pos = line.lastIndex;
	}
	const last = /[ \t]*(.*)/sy;
	last.lastIndex = pos;
	match = last.exec(source);
	return res + sep + (match?.[1] ?? "");
}
function doubleQuotedValue(source, onError) {
	let res = "";
	for (let i = 1; i < source.length - 1; ++i) {
		const ch = source[i];
		if (ch === "\r" && source[i + 1] === "\n") continue;
		if (ch === "\n") {
			const { fold, offset } = foldNewline(source, i);
			res += fold;
			i = offset;
		} else if (ch === "\\") {
			let next = source[++i];
			const cc = escapeCodes[next];
			if (cc) res += cc;
			else if (next === "\n") {
				next = source[i + 1];
				while (next === " " || next === "	") next = source[++i + 1];
			} else if (next === "\r" && source[i + 1] === "\n") {
				next = source[++i + 1];
				while (next === " " || next === "	") next = source[++i + 1];
			} else if (next === "x" || next === "u" || next === "U") {
				const length = next === "x" ? 2 : next === "u" ? 4 : 8;
				res += parseCharCode(source, i + 1, length, onError);
				i += length;
			} else {
				const raw = source.substr(i - 1, 2);
				onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
				res += raw;
			}
		} else if (ch === " " || ch === "	") {
			const wsStart = i;
			let next = source[i + 1];
			while (next === " " || next === "	") next = source[++i + 1];
			if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n")) res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
		} else res += ch;
	}
	if (source[source.length - 1] !== "\"" || source.length === 1) onError(source.length, "MISSING_CHAR", "Missing closing \"quote");
	return res;
}
/**
* Fold a single newline into a space, multiple newlines to N - 1 newlines.
* Presumes `source[offset] === '\n'`
*/
function foldNewline(source, offset) {
	let fold = "";
	let ch = source[offset + 1];
	while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
		if (ch === "\r" && source[offset + 2] !== "\n") break;
		if (ch === "\n") fold += "\n";
		offset += 1;
		ch = source[offset + 1];
	}
	if (!fold) fold = " ";
	return {
		fold,
		offset
	};
}
var escapeCodes = {
	"0": "\0",
	a: "\x07",
	b: "\b",
	e: "\x1B",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "	",
	v: "\v",
	N: "",
	_: "\xA0",
	L: "\u2028",
	P: "\u2029",
	" ": " ",
	"\"": "\"",
	"/": "/",
	"\\": "\\",
	"	": "	"
};
function parseCharCode(source, offset, length, onError) {
	const cc = source.substr(offset, length);
	const code = cc.length === length && /^[0-9a-fA-F]+$/.test(cc) ? parseInt(cc, 16) : NaN;
	try {
		return String.fromCodePoint(code);
	} catch {
		const raw = source.substr(offset - 2, length + 2);
		onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
		return raw;
	}
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/compose-scalar.js
function composeScalar(ctx, token, tagToken, onError) {
	const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar(ctx, token, onError) : resolveFlowScalar(token, ctx.options.strict, onError);
	const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
	let tag;
	if (ctx.options.stringKeys && ctx.atKey) tag = ctx.schema[SCALAR$1];
	else if (tagName) tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
	else if (token.type === "scalar") tag = findScalarTagByTest(ctx, value, token, onError);
	else tag = ctx.schema[SCALAR$1];
	let scalar;
	try {
		const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
		scalar = isScalar(res) ? res : new Scalar(res);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
		scalar = new Scalar(value);
	}
	scalar.range = range;
	scalar.source = value;
	if (type) scalar.type = type;
	if (tagName) scalar.tag = tagName;
	if (tag.format) scalar.format = tag.format;
	if (comment) scalar.comment = comment;
	return scalar;
}
function findScalarTagByName(schema, value, tagName, tagToken, onError) {
	if (tagName === "!") return schema[SCALAR$1];
	const matchWithTest = [];
	for (const tag of schema.tags) if (!tag.collection && tag.tag === tagName) if (tag.default && tag.test) matchWithTest.push(tag);
	else return tag;
	for (const tag of matchWithTest) if (tag.test?.test(value)) return tag;
	const kt = schema.knownTags[tagName];
	if (kt && !kt.collection) {
		schema.tags.push(Object.assign({}, kt, {
			default: false,
			test: void 0
		}));
		return kt;
	}
	onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
	return schema[SCALAR$1];
}
function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
	const tag = schema.tags.find((tag) => (tag.default === true || atKey && tag.default === "key") && tag.test?.test(value)) || schema[SCALAR$1];
	if (schema.compat) {
		const compat = schema.compat.find((tag) => tag.default && tag.test?.test(value)) ?? schema[SCALAR$1];
		if (tag.tag !== compat.tag) onError(token, "TAG_RESOLVE_FAILED", `Value may be parsed as either ${directives.tagString(tag.tag)} or ${directives.tagString(compat.tag)}`, true);
	}
	return tag;
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/util-empty-scalar-position.js
function emptyScalarPosition(offset, before, pos) {
	if (before) {
		pos ?? (pos = before.length);
		for (let i = pos - 1; i >= 0; --i) {
			let st = before[i];
			switch (st.type) {
				case "space":
				case "comment":
				case "newline":
					offset -= st.source.length;
					continue;
			}
			st = before[++i];
			while (st?.type === "space") {
				offset += st.source.length;
				st = before[++i];
			}
			break;
		}
	}
	return offset;
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/compose-node.js
var CN = {
	composeNode,
	composeEmptyNode
};
function composeNode(ctx, token, props, onError) {
	const atKey = ctx.atKey;
	const { spaceBefore, comment, anchor, tag } = props;
	let node;
	let isSrcToken = true;
	switch (token.type) {
		case "alias":
			node = composeAlias(ctx, token, onError);
			if (anchor || tag) onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
			break;
		case "scalar":
		case "single-quoted-scalar":
		case "double-quoted-scalar":
		case "block-scalar":
			node = composeScalar(ctx, token, tag, onError);
			if (anchor) node.anchor = anchor.source.substring(1);
			break;
		case "block-map":
		case "block-seq":
		case "flow-collection":
			try {
				node = composeCollection(CN, ctx, token, props, onError);
				if (anchor) node.anchor = anchor.source.substring(1);
			} catch (error) {
				onError(token, "RESOURCE_EXHAUSTION", error instanceof Error ? error.message : String(error));
			}
			break;
		default:
			onError(token, "UNEXPECTED_TOKEN", token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`);
			isSrcToken = false;
	}
	node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
	if (anchor && node.anchor === "") onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
	if (atKey && ctx.options.stringKeys && (!isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) onError(tag ?? token, "NON_STRING_KEY", "With stringKeys, all keys must be strings");
	if (spaceBefore) node.spaceBefore = true;
	if (comment) if (token.type === "scalar" && token.source === "") node.comment = comment;
	else node.commentBefore = comment;
	if (ctx.options.keepSourceTokens && isSrcToken) node.srcToken = token;
	return node;
}
function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
	const node = composeScalar(ctx, {
		type: "scalar",
		offset: emptyScalarPosition(offset, before, pos),
		indent: -1,
		source: ""
	}, tag, onError);
	if (anchor) {
		node.anchor = anchor.source.substring(1);
		if (node.anchor === "") onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
	}
	if (spaceBefore) node.spaceBefore = true;
	if (comment) {
		node.comment = comment;
		node.range[2] = end;
	}
	return node;
}
function composeAlias({ options }, { offset, source, end }, onError) {
	const alias = new Alias(source.substring(1));
	if (alias.source === "") onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
	if (alias.source.endsWith(":")) onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
	const valueEnd = offset + source.length;
	const re = resolveEnd(end, valueEnd, options.strict, onError);
	alias.range = [
		offset,
		valueEnd,
		re.offset
	];
	if (re.comment) alias.comment = re.comment;
	return alias;
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/compose-doc.js
function composeDoc(options, directives, { offset, start, value, end }, onError) {
	const doc = new Document(void 0, Object.assign({ _directives: directives }, options));
	const ctx = {
		atKey: false,
		atRoot: true,
		directives: doc.directives,
		options: doc.options,
		schema: doc.schema
	};
	const props = resolveProps(start, {
		indicator: "doc-start",
		next: value ?? end?.[0],
		offset,
		onError,
		parentIndent: 0,
		startOnNewline: true
	});
	if (props.found) {
		doc.directives.docStart = true;
		if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline) onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
	}
	doc.contents = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
	const contentEnd = doc.contents.range[2];
	const re = resolveEnd(end, contentEnd, false, onError);
	if (re.comment) doc.comment = re.comment;
	doc.range = [
		offset,
		contentEnd,
		re.offset
	];
	return doc;
}
//#endregion
//#region node_modules/yaml/browser/dist/compose/composer.js
function getErrorPos(src) {
	if (typeof src === "number") return [src, src + 1];
	if (Array.isArray(src)) return src.length === 2 ? src : [src[0], src[1]];
	const { offset, source } = src;
	return [offset, offset + (typeof source === "string" ? source.length : 1)];
}
function parsePrelude(prelude) {
	let comment = "";
	let atComment = false;
	let afterEmptyLine = false;
	for (let i = 0; i < prelude.length; ++i) {
		const source = prelude[i];
		switch (source[0]) {
			case "#":
				comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
				atComment = true;
				afterEmptyLine = false;
				break;
			case "%":
				if (prelude[i + 1]?.[0] !== "#") i += 1;
				atComment = false;
				break;
			default:
				if (!atComment) afterEmptyLine = true;
				atComment = false;
		}
	}
	return {
		comment,
		afterEmptyLine
	};
}
/**
* Compose a stream of CST nodes into a stream of YAML Documents.
*
* ```ts
* import { Composer, Parser } from 'yaml'
*
* const src: string = ...
* const tokens = new Parser().parse(src)
* const docs = new Composer().compose(tokens)
* ```
*/
var Composer = class {
	constructor(options = {}) {
		this.doc = null;
		this.atDirectives = false;
		this.prelude = [];
		this.errors = [];
		this.warnings = [];
		this.onError = (source, code, message, warning) => {
			const pos = getErrorPos(source);
			if (warning) this.warnings.push(new YAMLWarning(pos, code, message));
			else this.errors.push(new YAMLParseError(pos, code, message));
		};
		this.directives = new Directives({ version: options.version || "1.2" });
		this.options = options;
	}
	decorate(doc, afterDoc) {
		const { comment, afterEmptyLine } = parsePrelude(this.prelude);
		if (comment) {
			const dc = doc.contents;
			if (afterDoc) doc.comment = doc.comment ? `${doc.comment}\n${comment}` : comment;
			else if (afterEmptyLine || doc.directives.docStart || !dc) doc.commentBefore = comment;
			else if (isCollection(dc) && !dc.flow && dc.items.length > 0) {
				let it = dc.items[0];
				if (isPair(it)) it = it.key;
				const cb = it.commentBefore;
				it.commentBefore = cb ? `${comment}\n${cb}` : comment;
			} else {
				const cb = dc.commentBefore;
				dc.commentBefore = cb ? `${comment}\n${cb}` : comment;
			}
		}
		if (afterDoc) {
			for (let i = 0; i < this.errors.length; ++i) doc.errors.push(this.errors[i]);
			for (let i = 0; i < this.warnings.length; ++i) doc.warnings.push(this.warnings[i]);
		} else {
			doc.errors = this.errors;
			doc.warnings = this.warnings;
		}
		this.prelude = [];
		this.errors = [];
		this.warnings = [];
	}
	/**
	* Current stream status information.
	*
	* Mostly useful at the end of input for an empty stream.
	*/
	streamInfo() {
		return {
			comment: parsePrelude(this.prelude).comment,
			directives: this.directives,
			errors: this.errors,
			warnings: this.warnings
		};
	}
	/**
	* Compose tokens into documents.
	*
	* @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
	* @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
	*/
	*compose(tokens, forceDoc = false, endOffset = -1) {
		for (const token of tokens) yield* this.next(token);
		yield* this.end(forceDoc, endOffset);
	}
	/** Advance the composer by one CST token. */
	*next(token) {
		switch (token.type) {
			case "directive":
				this.directives.add(token.source, (offset, message, warning) => {
					const pos = getErrorPos(token);
					pos[0] += offset;
					this.onError(pos, "BAD_DIRECTIVE", message, warning);
				});
				this.prelude.push(token.source);
				this.atDirectives = true;
				break;
			case "document": {
				const doc = composeDoc(this.options, this.directives, token, this.onError);
				if (this.atDirectives && !doc.directives.docStart) this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
				this.decorate(doc, false);
				if (this.doc) yield this.doc;
				this.doc = doc;
				this.atDirectives = false;
				break;
			}
			case "byte-order-mark":
			case "space": break;
			case "comment":
			case "newline":
				this.prelude.push(token.source);
				break;
			case "error": {
				const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
				const error = new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
				if (this.atDirectives || !this.doc) this.errors.push(error);
				else this.doc.errors.push(error);
				break;
			}
			case "doc-end": {
				if (!this.doc) {
					this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", "Unexpected doc-end without preceding document"));
					break;
				}
				this.doc.directives.docEnd = true;
				const end = resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
				this.decorate(this.doc, true);
				if (end.comment) {
					const dc = this.doc.comment;
					this.doc.comment = dc ? `${dc}\n${end.comment}` : end.comment;
				}
				this.doc.range[2] = end.offset;
				break;
			}
			default: this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
		}
	}
	/**
	* Call at end of input to yield any remaining document.
	*
	* @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
	* @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
	*/
	*end(forceDoc = false, endOffset = -1) {
		if (this.doc) {
			this.decorate(this.doc, true);
			yield this.doc;
			this.doc = null;
		} else if (forceDoc) {
			const doc = new Document(void 0, Object.assign({ _directives: this.directives }, this.options));
			if (this.atDirectives) this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
			doc.range = [
				0,
				endOffset,
				endOffset
			];
			this.decorate(doc, false);
			yield doc;
		}
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/parse/cst-visit.js
var BREAK = Symbol("break visit");
var SKIP = Symbol("skip children");
var REMOVE = Symbol("remove item");
/**
* Apply a visitor to a CST document or item.
*
* Walks through the tree (depth-first) starting from the root, calling a
* `visitor` function with two arguments when entering each item:
*   - `item`: The current item, which included the following members:
*     - `start: SourceToken[]` – Source tokens before the key or value,
*       possibly including its anchor or tag.
*     - `key?: Token | null` – Set for pair values. May then be `null`, if
*       the key before the `:` separator is empty.
*     - `sep?: SourceToken[]` – Source tokens between the key and the value,
*       which should include the `:` map value indicator if `value` is set.
*     - `value?: Token` – The value of a sequence item, or of a map pair.
*   - `path`: The steps from the root to the current node, as an array of
*     `['key' | 'value', number]` tuples.
*
* The return value of the visitor may be used to control the traversal:
*   - `undefined` (default): Do nothing and continue
*   - `visit.SKIP`: Do not visit the children of this token, continue with
*      next sibling
*   - `visit.BREAK`: Terminate traversal completely
*   - `visit.REMOVE`: Remove the current item, then continue with the next one
*   - `number`: Set the index of the next step. This is useful especially if
*     the index of the current token has changed.
*   - `function`: Define the next visitor for this item. After the original
*     visitor is called on item entry, next visitors are called after handling
*     a non-empty `key` and when exiting the item.
*/
function visit(cst, visitor) {
	if ("type" in cst && cst.type === "document") cst = {
		start: cst.start,
		value: cst.value
	};
	_visit(Object.freeze([]), cst, visitor);
}
/** Terminate visit traversal completely */
visit.BREAK = BREAK;
/** Do not visit the children of the current item */
visit.SKIP = SKIP;
/** Remove the current item */
visit.REMOVE = REMOVE;
/** Find the item at `path` from `cst` as the root */
visit.itemAtPath = (cst, path) => {
	let item = cst;
	for (const [field, index] of path) {
		const tok = item?.[field];
		if (tok && "items" in tok) item = tok.items[index];
		else return void 0;
	}
	return item;
};
/**
* Get the immediate parent collection of the item at `path` from `cst` as the root.
*
* Throws an error if the collection is not found, which should never happen if the item itself exists.
*/
visit.parentCollection = (cst, path) => {
	const parent = visit.itemAtPath(cst, path.slice(0, -1));
	const field = path[path.length - 1][0];
	const coll = parent?.[field];
	if (coll && "items" in coll) return coll;
	throw new Error("Parent collection not found");
};
function _visit(path, item, visitor) {
	let ctrl = visitor(item, path);
	if (typeof ctrl === "symbol") return ctrl;
	for (const field of ["key", "value"]) {
		const token = item[field];
		if (token && "items" in token) {
			for (let i = 0; i < token.items.length; ++i) {
				const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
				if (typeof ci === "number") i = ci - 1;
				else if (ci === BREAK) return BREAK;
				else if (ci === REMOVE) {
					token.items.splice(i, 1);
					i -= 1;
				}
			}
			if (typeof ctrl === "function" && field === "key") ctrl = ctrl(item, path);
		}
	}
	return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
}
/** Identify the type of a lexer token. May return `null` for unknown tokens. */
function tokenType(source) {
	switch (source) {
		case "﻿": return "byte-order-mark";
		case "": return "doc-mode";
		case "": return "flow-error-end";
		case "": return "scalar";
		case "---": return "doc-start";
		case "...": return "doc-end";
		case "":
		case "\n":
		case "\r\n": return "newline";
		case "-": return "seq-item-ind";
		case "?": return "explicit-key-ind";
		case ":": return "map-value-ind";
		case "{": return "flow-map-start";
		case "}": return "flow-map-end";
		case "[": return "flow-seq-start";
		case "]": return "flow-seq-end";
		case ",": return "comma";
	}
	switch (source[0]) {
		case " ":
		case "	": return "space";
		case "#": return "comment";
		case "%": return "directive-line";
		case "*": return "alias";
		case "&": return "anchor";
		case "!": return "tag";
		case "'": return "single-quoted-scalar";
		case "\"": return "double-quoted-scalar";
		case "|":
		case ">": return "block-scalar-header";
	}
	return null;
}
//#endregion
//#region node_modules/yaml/browser/dist/parse/lexer.js
function isEmpty(ch) {
	switch (ch) {
		case void 0:
		case " ":
		case "\n":
		case "\r":
		case "	": return true;
		default: return false;
	}
}
var hexDigits = /* @__PURE__ */ new Set("0123456789ABCDEFabcdef");
var tagChars = /* @__PURE__ */ new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
var flowIndicatorChars = /* @__PURE__ */ new Set(",[]{}");
var invalidAnchorChars = /* @__PURE__ */ new Set(" ,[]{}\n\r	");
var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
/**
* Splits an input string into lexical tokens, i.e. smaller strings that are
* easily identifiable by `tokens.tokenType()`.
*
* Lexing starts always in a "stream" context. Incomplete input may be buffered
* until a complete token can be emitted.
*
* In addition to slices of the original input, the following control characters
* may also be emitted:
*
* - `\x02` (Start of Text): A document starts with the next token
* - `\x18` (Cancel): Unexpected end of flow-mode (indicates an error)
* - `\x1f` (Unit Separator): Next token is a scalar value
* - `\u{FEFF}` (Byte order mark): Emitted separately outside documents
*/
var Lexer = class {
	constructor() {
		/**
		* Flag indicating whether the end of the current buffer marks the end of
		* all input
		*/
		this.atEnd = false;
		/**
		* Explicit indent set in block scalar header, as an offset from the current
		* minimum indent, so e.g. set to 1 from a header `|2+`. Set to -1 if not
		* explicitly set.
		*/
		this.blockScalarIndent = -1;
		/**
		* Block scalars that include a + (keep) chomping indicator in their header
		* include trailing empty lines, which are otherwise excluded from the
		* scalar's contents.
		*/
		this.blockScalarKeep = false;
		/** Current input */
		this.buffer = "";
		/**
		* Flag noting whether the map value indicator : can immediately follow this
		* node within a flow context.
		*/
		this.flowKey = false;
		/** Count of surrounding flow collection levels. */
		this.flowLevel = 0;
		/**
		* Minimum level of indentation required for next lines to be parsed as a
		* part of the current scalar value.
		*/
		this.indentNext = 0;
		/** Indentation level of the current line. */
		this.indentValue = 0;
		/** Position of the next \n character. */
		this.lineEndPos = null;
		/** Stores the state of the lexer if reaching the end of incpomplete input */
		this.next = null;
		/** A pointer to `buffer`; the current position of the lexer. */
		this.pos = 0;
	}
	/**
	* Generate YAML tokens from the `source` string. If `incomplete`,
	* a part of the last line may be left as a buffer for the next call.
	*
	* @returns A generator of lexical tokens
	*/
	*lex(source, incomplete = false) {
		if (source) {
			if (typeof source !== "string") throw TypeError("source is not a string");
			this.buffer = this.buffer ? this.buffer + source : source;
			this.lineEndPos = null;
		}
		this.atEnd = !incomplete;
		let next = this.next ?? "stream";
		while (next && (incomplete || this.hasChars(1))) next = yield* this.parseNext(next);
	}
	atLineEnd() {
		let i = this.pos;
		let ch = this.buffer[i];
		while (ch === " " || ch === "	") ch = this.buffer[++i];
		if (!ch || ch === "#" || ch === "\n") return true;
		if (ch === "\r") return this.buffer[i + 1] === "\n";
		return false;
	}
	charAt(n) {
		return this.buffer[this.pos + n];
	}
	continueScalar(offset) {
		let ch = this.buffer[offset];
		if (this.indentNext > 0) {
			let indent = 0;
			while (ch === " ") ch = this.buffer[++indent + offset];
			if (ch === "\r") {
				const next = this.buffer[indent + offset + 1];
				if (next === "\n" || !next && !this.atEnd) return offset + indent + 1;
			}
			return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
		}
		if (ch === "-" || ch === ".") {
			const dt = this.buffer.substr(offset, 3);
			if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3])) return -1;
		}
		return offset;
	}
	getLine() {
		let end = this.lineEndPos;
		if (typeof end !== "number" || end !== -1 && end < this.pos) {
			end = this.buffer.indexOf("\n", this.pos);
			this.lineEndPos = end;
		}
		if (end === -1) return this.atEnd ? this.buffer.substring(this.pos) : null;
		if (this.buffer[end - 1] === "\r") end -= 1;
		return this.buffer.substring(this.pos, end);
	}
	hasChars(n) {
		return this.pos + n <= this.buffer.length;
	}
	setNext(state) {
		this.buffer = this.buffer.substring(this.pos);
		this.pos = 0;
		this.lineEndPos = null;
		this.next = state;
		return null;
	}
	peek(n) {
		return this.buffer.substr(this.pos, n);
	}
	*parseNext(next) {
		switch (next) {
			case "stream": return yield* this.parseStream();
			case "line-start": return yield* this.parseLineStart();
			case "block-start": return yield* this.parseBlockStart();
			case "doc": return yield* this.parseDocument();
			case "flow": return yield* this.parseFlowCollection();
			case "quoted-scalar": return yield* this.parseQuotedScalar();
			case "block-scalar": return yield* this.parseBlockScalar();
			case "plain-scalar": return yield* this.parsePlainScalar();
		}
	}
	*parseStream() {
		let line = this.getLine();
		if (line === null) return this.setNext("stream");
		if (line[0] === "﻿") {
			yield* this.pushCount(1);
			line = line.substring(1);
		}
		if (line[0] === "%") {
			let dirEnd = line.length;
			let cs = line.indexOf("#");
			while (cs !== -1) {
				const ch = line[cs - 1];
				if (ch === " " || ch === "	") {
					dirEnd = cs - 1;
					break;
				} else cs = line.indexOf("#", cs + 1);
			}
			while (true) {
				const ch = line[dirEnd - 1];
				if (ch === " " || ch === "	") dirEnd -= 1;
				else break;
			}
			const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
			yield* this.pushCount(line.length - n);
			this.pushNewline();
			return "stream";
		}
		if (this.atLineEnd()) {
			const sp = yield* this.pushSpaces(true);
			yield* this.pushCount(line.length - sp);
			yield* this.pushNewline();
			return "stream";
		}
		yield "";
		return yield* this.parseLineStart();
	}
	*parseLineStart() {
		const ch = this.charAt(0);
		if (!ch && !this.atEnd) return this.setNext("line-start");
		if (ch === "-" || ch === ".") {
			if (!this.atEnd && !this.hasChars(4)) return this.setNext("line-start");
			const s = this.peek(3);
			if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
				yield* this.pushCount(3);
				this.indentValue = 0;
				this.indentNext = 0;
				return s === "---" ? "doc" : "stream";
			}
		}
		this.indentValue = yield* this.pushSpaces(false);
		if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1))) this.indentNext = this.indentValue;
		return yield* this.parseBlockStart();
	}
	*parseBlockStart() {
		const [ch0, ch1] = this.peek(2);
		if (!ch1 && !this.atEnd) return this.setNext("block-start");
		if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
			const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
			this.indentNext = this.indentValue + 1;
			this.indentValue += n;
			return "block-start";
		}
		return "doc";
	}
	*parseDocument() {
		yield* this.pushSpaces(true);
		const line = this.getLine();
		if (line === null) return this.setNext("doc");
		let n = yield* this.pushIndicators();
		switch (line[n]) {
			case "#": yield* this.pushCount(line.length - n);
			case void 0:
				yield* this.pushNewline();
				return yield* this.parseLineStart();
			case "{":
			case "[":
				yield* this.pushCount(1);
				this.flowKey = false;
				this.flowLevel = 1;
				return "flow";
			case "}":
			case "]":
				yield* this.pushCount(1);
				return "doc";
			case "*":
				yield* this.pushUntil(isNotAnchorChar);
				return "doc";
			case "\"":
			case "'": return yield* this.parseQuotedScalar();
			case "|":
			case ">":
				n += yield* this.parseBlockScalarHeader();
				n += yield* this.pushSpaces(true);
				yield* this.pushCount(line.length - n);
				yield* this.pushNewline();
				return yield* this.parseBlockScalar();
			default: return yield* this.parsePlainScalar();
		}
	}
	*parseFlowCollection() {
		let nl, sp;
		let indent = -1;
		do {
			nl = yield* this.pushNewline();
			if (nl > 0) {
				sp = yield* this.pushSpaces(false);
				this.indentValue = indent = sp;
			} else sp = 0;
			sp += yield* this.pushSpaces(true);
		} while (nl + sp > 0);
		const line = this.getLine();
		if (line === null) return this.setNext("flow");
		if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
			if (!(indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}"))) {
				this.flowLevel = 0;
				yield "";
				return yield* this.parseLineStart();
			}
		}
		let n = 0;
		while (line[n] === ",") {
			n += yield* this.pushCount(1);
			n += yield* this.pushSpaces(true);
			this.flowKey = false;
		}
		n += yield* this.pushIndicators();
		switch (line[n]) {
			case void 0: return "flow";
			case "#":
				yield* this.pushCount(line.length - n);
				return "flow";
			case "{":
			case "[":
				yield* this.pushCount(1);
				this.flowKey = false;
				this.flowLevel += 1;
				return "flow";
			case "}":
			case "]":
				yield* this.pushCount(1);
				this.flowKey = true;
				this.flowLevel -= 1;
				return this.flowLevel ? "flow" : "doc";
			case "*":
				yield* this.pushUntil(isNotAnchorChar);
				return "flow";
			case "\"":
			case "'":
				this.flowKey = true;
				return yield* this.parseQuotedScalar();
			case ":": {
				const next = this.charAt(1);
				if (this.flowKey || isEmpty(next) || next === ",") {
					this.flowKey = false;
					yield* this.pushCount(1);
					yield* this.pushSpaces(true);
					return "flow";
				}
			}
			default:
				this.flowKey = false;
				return yield* this.parsePlainScalar();
		}
	}
	*parseQuotedScalar() {
		const quote = this.charAt(0);
		let end = this.buffer.indexOf(quote, this.pos + 1);
		if (quote === "'") while (end !== -1 && this.buffer[end + 1] === "'") end = this.buffer.indexOf("'", end + 2);
		else while (end !== -1) {
			let n = 0;
			while (this.buffer[end - 1 - n] === "\\") n += 1;
			if (n % 2 === 0) break;
			end = this.buffer.indexOf("\"", end + 1);
		}
		const qb = this.buffer.substring(0, end);
		let nl = qb.indexOf("\n", this.pos);
		if (nl !== -1) {
			while (nl !== -1) {
				const cs = this.continueScalar(nl + 1);
				if (cs === -1) break;
				nl = qb.indexOf("\n", cs);
			}
			if (nl !== -1) end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
		}
		if (end === -1) {
			if (!this.atEnd) return this.setNext("quoted-scalar");
			end = this.buffer.length;
		}
		yield* this.pushToIndex(end + 1, false);
		return this.flowLevel ? "flow" : "doc";
	}
	*parseBlockScalarHeader() {
		this.blockScalarIndent = -1;
		this.blockScalarKeep = false;
		let i = this.pos;
		while (true) {
			const ch = this.buffer[++i];
			if (ch === "+") this.blockScalarKeep = true;
			else if (ch > "0" && ch <= "9") this.blockScalarIndent = Number(ch) - 1;
			else if (ch !== "-") break;
		}
		return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
	}
	*parseBlockScalar() {
		let nl = this.pos - 1;
		let indent = 0;
		let ch;
		loop: for (let i = this.pos; ch = this.buffer[i]; ++i) switch (ch) {
			case " ":
				indent += 1;
				break;
			case "\n":
				nl = i;
				indent = 0;
				break;
			case "\r": {
				const next = this.buffer[i + 1];
				if (!next && !this.atEnd) return this.setNext("block-scalar");
				if (next === "\n") break;
			}
			default: break loop;
		}
		if (!ch && !this.atEnd) return this.setNext("block-scalar");
		if (indent >= this.indentNext) {
			if (this.blockScalarIndent === -1) this.indentNext = indent;
			else this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
			do {
				const cs = this.continueScalar(nl + 1);
				if (cs === -1) break;
				nl = this.buffer.indexOf("\n", cs);
			} while (nl !== -1);
			if (nl === -1) {
				if (!this.atEnd) return this.setNext("block-scalar");
				nl = this.buffer.length;
			}
		}
		let i = nl + 1;
		ch = this.buffer[i];
		while (ch === " ") ch = this.buffer[++i];
		if (ch === "	") {
			while (ch === "	" || ch === " " || ch === "\r" || ch === "\n") ch = this.buffer[++i];
			nl = i - 1;
		} else if (!this.blockScalarKeep) do {
			let i = nl - 1;
			let ch = this.buffer[i];
			if (ch === "\r") ch = this.buffer[--i];
			const lastChar = i;
			while (ch === " ") ch = this.buffer[--i];
			if (ch === "\n" && i >= this.pos && i + 1 + indent > lastChar) nl = i;
			else break;
		} while (true);
		yield "";
		yield* this.pushToIndex(nl + 1, true);
		return yield* this.parseLineStart();
	}
	*parsePlainScalar() {
		const inFlow = this.flowLevel > 0;
		let end = this.pos - 1;
		let i = this.pos - 1;
		let ch;
		while (ch = this.buffer[++i]) if (ch === ":") {
			const next = this.buffer[i + 1];
			if (isEmpty(next) || inFlow && flowIndicatorChars.has(next)) break;
			end = i;
		} else if (isEmpty(ch)) {
			let next = this.buffer[i + 1];
			if (ch === "\r") if (next === "\n") {
				i += 1;
				ch = "\n";
				next = this.buffer[i + 1];
			} else end = i;
			if (next === "#" || inFlow && flowIndicatorChars.has(next)) break;
			if (ch === "\n") {
				const cs = this.continueScalar(i + 1);
				if (cs === -1) break;
				i = Math.max(i, cs - 2);
			}
		} else {
			if (inFlow && flowIndicatorChars.has(ch)) break;
			end = i;
		}
		if (!ch && !this.atEnd) return this.setNext("plain-scalar");
		yield "";
		yield* this.pushToIndex(end + 1, true);
		return inFlow ? "flow" : "doc";
	}
	*pushCount(n) {
		if (n > 0) {
			yield this.buffer.substr(this.pos, n);
			this.pos += n;
			return n;
		}
		return 0;
	}
	*pushToIndex(i, allowEmpty) {
		const s = this.buffer.slice(this.pos, i);
		if (s) {
			yield s;
			this.pos += s.length;
			return s.length;
		} else if (allowEmpty) yield "";
		return 0;
	}
	*pushIndicators() {
		let n = 0;
		loop: while (true) {
			switch (this.charAt(0)) {
				case "!":
					n += yield* this.pushTag();
					n += yield* this.pushSpaces(true);
					continue loop;
				case "&":
					n += yield* this.pushUntil(isNotAnchorChar);
					n += yield* this.pushSpaces(true);
					continue loop;
				case "-":
				case "?":
				case ":": {
					const inFlow = this.flowLevel > 0;
					const ch1 = this.charAt(1);
					if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
						if (!inFlow) this.indentNext = this.indentValue + 1;
						else if (this.flowKey) this.flowKey = false;
						n += yield* this.pushCount(1);
						n += yield* this.pushSpaces(true);
						continue loop;
					}
				}
			}
			break loop;
		}
		return n;
	}
	*pushTag() {
		if (this.charAt(1) === "<") {
			let i = this.pos + 2;
			let ch = this.buffer[i];
			while (!isEmpty(ch) && ch !== ">") ch = this.buffer[++i];
			return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
		} else {
			let i = this.pos + 1;
			let ch = this.buffer[i];
			while (ch) if (tagChars.has(ch)) ch = this.buffer[++i];
			else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) ch = this.buffer[i += 3];
			else break;
			return yield* this.pushToIndex(i, false);
		}
	}
	*pushNewline() {
		const ch = this.buffer[this.pos];
		if (ch === "\n") return yield* this.pushCount(1);
		else if (ch === "\r" && this.charAt(1) === "\n") return yield* this.pushCount(2);
		else return 0;
	}
	*pushSpaces(allowTabs) {
		let i = this.pos - 1;
		let ch;
		do
			ch = this.buffer[++i];
		while (ch === " " || allowTabs && ch === "	");
		const n = i - this.pos;
		if (n > 0) {
			yield this.buffer.substr(this.pos, n);
			this.pos = i;
		}
		return n;
	}
	*pushUntil(test) {
		let i = this.pos;
		let ch = this.buffer[i];
		while (!test(ch)) ch = this.buffer[++i];
		return yield* this.pushToIndex(i, false);
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/parse/line-counter.js
/**
* Tracks newlines during parsing in order to provide an efficient API for
* determining the one-indexed `{ line, col }` position for any offset
* within the input.
*/
var LineCounter = class {
	constructor() {
		this.lineStarts = [];
		/**
		* Should be called in ascending order. Otherwise, call
		* `lineCounter.lineStarts.sort()` before calling `linePos()`.
		*/
		this.addNewLine = (offset) => this.lineStarts.push(offset);
		/**
		* Performs a binary search and returns the 1-indexed { line, col }
		* position of `offset`. If `line === 0`, `addNewLine` has never been
		* called or `offset` is before the first known newline.
		*/
		this.linePos = (offset) => {
			let low = 0;
			let high = this.lineStarts.length;
			while (low < high) {
				const mid = low + high >> 1;
				if (this.lineStarts[mid] < offset) low = mid + 1;
				else high = mid;
			}
			if (this.lineStarts[low] === offset) return {
				line: low + 1,
				col: 1
			};
			if (low === 0) return {
				line: 0,
				col: offset
			};
			const start = this.lineStarts[low - 1];
			return {
				line: low,
				col: offset - start + 1
			};
		};
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/parse/parser.js
function includesToken(list, type) {
	for (let i = 0; i < list.length; ++i) if (list[i].type === type) return true;
	return false;
}
function findNonEmptyIndex(list) {
	for (let i = 0; i < list.length; ++i) switch (list[i].type) {
		case "space":
		case "comment":
		case "newline": break;
		default: return i;
	}
	return -1;
}
function isFlowToken(token) {
	switch (token?.type) {
		case "alias":
		case "scalar":
		case "single-quoted-scalar":
		case "double-quoted-scalar":
		case "flow-collection": return true;
		default: return false;
	}
}
function getPrevProps(parent) {
	switch (parent.type) {
		case "document": return parent.start;
		case "block-map": {
			const it = parent.items[parent.items.length - 1];
			return it.sep ?? it.start;
		}
		case "block-seq": return parent.items[parent.items.length - 1].start;
		/* istanbul ignore next should not happen */
		default: return [];
	}
}
/** Note: May modify input array */
function getFirstKeyStartProps(prev) {
	if (prev.length === 0) return [];
	let i = prev.length;
	loop: while (--i >= 0) switch (prev[i].type) {
		case "doc-start":
		case "explicit-key-ind":
		case "map-value-ind":
		case "seq-item-ind":
		case "newline": break loop;
	}
	while (prev[++i]?.type === "space");
	return prev.splice(i, prev.length);
}
function arrayPushArray(target, source) {
	if (source.length < 1e5) Array.prototype.push.apply(target, source);
	else for (let i = 0; i < source.length; ++i) target.push(source[i]);
}
function fixFlowSeqItems(fc) {
	if (fc.start.type === "flow-seq-start") {
		for (const it of fc.items) if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
			if (it.key) it.value = it.key;
			delete it.key;
			if (isFlowToken(it.value)) if (it.value.end) arrayPushArray(it.value.end, it.sep);
			else it.value.end = it.sep;
			else arrayPushArray(it.start, it.sep);
			delete it.sep;
		}
	}
}
/**
* A YAML concrete syntax tree (CST) parser
*
* ```ts
* const src: string = ...
* for (const token of new Parser().parse(src)) {
*   // token: Token
* }
* ```
*
* To use the parser with a user-provided lexer:
*
* ```ts
* function* parse(source: string, lexer: Lexer) {
*   const parser = new Parser()
*   for (const lexeme of lexer.lex(source))
*     yield* parser.next(lexeme)
*   yield* parser.end()
* }
*
* const src: string = ...
* const lexer = new Lexer()
* for (const token of parse(src, lexer)) {
*   // token: Token
* }
* ```
*/
var Parser = class {
	/**
	* @param onNewLine - If defined, called separately with the start position of
	*   each new line (in `parse()`, including the start of input).
	*/
	constructor(onNewLine) {
		/** If true, space and sequence indicators count as indentation */
		this.atNewLine = true;
		/** If true, next token is a scalar value */
		this.atScalar = false;
		/** Current indentation level */
		this.indent = 0;
		/** Current offset since the start of parsing */
		this.offset = 0;
		/** On the same line with a block map key */
		this.onKeyLine = false;
		/** Top indicates the node that's currently being built */
		this.stack = [];
		/** The source of the current token, set in parse() */
		this.source = "";
		/** The type of the current token, set in parse() */
		this.type = "";
		this.lexer = new Lexer();
		this.onNewLine = onNewLine;
	}
	/**
	* Parse `source` as a YAML stream.
	* If `incomplete`, a part of the last line may be left as a buffer for the next call.
	*
	* Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
	*
	* @returns A generator of tokens representing each directive, document, and other structure.
	*/
	*parse(source, incomplete = false) {
		if (this.onNewLine && this.offset === 0) this.onNewLine(0);
		for (const lexeme of this.lexer.lex(source, incomplete)) yield* this.next(lexeme);
		if (!incomplete) yield* this.end();
	}
	/**
	* Advance the parser by the `source` of one lexical token.
	*/
	*next(source) {
		this.source = source;
		if (this.atScalar) {
			this.atScalar = false;
			yield* this.step();
			this.offset += source.length;
			return;
		}
		const type = tokenType(source);
		if (!type) {
			const message = `Not a YAML token: ${source}`;
			yield* this.pop({
				type: "error",
				offset: this.offset,
				message,
				source
			});
			this.offset += source.length;
		} else if (type === "scalar") {
			this.atNewLine = false;
			this.atScalar = true;
			this.type = "scalar";
		} else {
			this.type = type;
			yield* this.step();
			switch (type) {
				case "newline":
					this.atNewLine = true;
					this.indent = 0;
					if (this.onNewLine) this.onNewLine(this.offset + source.length);
					break;
				case "space":
					if (this.atNewLine && source[0] === " ") this.indent += source.length;
					break;
				case "explicit-key-ind":
				case "map-value-ind":
				case "seq-item-ind":
					if (this.atNewLine) this.indent += source.length;
					break;
				case "doc-mode":
				case "flow-error-end": return;
				default: this.atNewLine = false;
			}
			this.offset += source.length;
		}
	}
	/** Call at end of input to push out any remaining constructions */
	*end() {
		while (this.stack.length > 0) yield* this.pop();
	}
	get sourceToken() {
		return {
			type: this.type,
			offset: this.offset,
			indent: this.indent,
			source: this.source
		};
	}
	*step() {
		const top = this.peek(1);
		if (this.type === "doc-end" && top?.type !== "doc-end") {
			while (this.stack.length > 0) yield* this.pop();
			this.stack.push({
				type: "doc-end",
				offset: this.offset,
				source: this.source
			});
			return;
		}
		if (!top) return yield* this.stream();
		switch (top.type) {
			case "document": return yield* this.document(top);
			case "alias":
			case "scalar":
			case "single-quoted-scalar":
			case "double-quoted-scalar": return yield* this.scalar(top);
			case "block-scalar": return yield* this.blockScalar(top);
			case "block-map": return yield* this.blockMap(top);
			case "block-seq": return yield* this.blockSequence(top);
			case "flow-collection": return yield* this.flowCollection(top);
			case "doc-end": return yield* this.documentEnd(top);
		}
		/* istanbul ignore next should not happen */
		yield* this.pop();
	}
	peek(n) {
		return this.stack[this.stack.length - n];
	}
	*pop(error) {
		const token = error ?? this.stack.pop();
		/* istanbul ignore if should not happen */
		if (!token) yield {
			type: "error",
			offset: this.offset,
			source: "",
			message: "Tried to pop an empty stack"
		};
		else if (this.stack.length === 0) yield token;
		else {
			const top = this.peek(1);
			if (token.type === "block-scalar") token.indent = "indent" in top ? top.indent : 0;
			else if (token.type === "flow-collection" && top.type === "document") token.indent = 0;
			if (token.type === "flow-collection") fixFlowSeqItems(token);
			switch (top.type) {
				case "document":
					top.value = token;
					break;
				case "block-scalar":
					top.props.push(token);
					break;
				case "block-map": {
					const it = top.items[top.items.length - 1];
					if (it.value) {
						top.items.push({
							start: [],
							key: token,
							sep: []
						});
						this.onKeyLine = true;
						return;
					} else if (it.sep) it.value = token;
					else {
						Object.assign(it, {
							key: token,
							sep: []
						});
						this.onKeyLine = !it.explicitKey;
						return;
					}
					break;
				}
				case "block-seq": {
					const it = top.items[top.items.length - 1];
					if (it.value) top.items.push({
						start: [],
						value: token
					});
					else it.value = token;
					break;
				}
				case "flow-collection": {
					const it = top.items[top.items.length - 1];
					if (!it || it.value) top.items.push({
						start: [],
						key: token,
						sep: []
					});
					else if (it.sep) it.value = token;
					else Object.assign(it, {
						key: token,
						sep: []
					});
					return;
				}
				/* istanbul ignore next should not happen */
				default:
					yield* this.pop();
					yield* this.pop(token);
			}
			if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
				const last = token.items[token.items.length - 1];
				if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
					if (top.type === "document") top.end = last.start;
					else top.items.push({ start: last.start });
					token.items.splice(-1, 1);
				}
			}
		}
	}
	*stream() {
		switch (this.type) {
			case "directive-line":
				yield {
					type: "directive",
					offset: this.offset,
					source: this.source
				};
				return;
			case "byte-order-mark":
			case "space":
			case "comment":
			case "newline":
				yield this.sourceToken;
				return;
			case "doc-mode":
			case "doc-start": {
				const doc = {
					type: "document",
					offset: this.offset,
					start: []
				};
				if (this.type === "doc-start") doc.start.push(this.sourceToken);
				this.stack.push(doc);
				return;
			}
		}
		yield {
			type: "error",
			offset: this.offset,
			message: `Unexpected ${this.type} token in YAML stream`,
			source: this.source
		};
	}
	*document(doc) {
		if (doc.value) return yield* this.lineEnd(doc);
		switch (this.type) {
			case "doc-start":
				if (findNonEmptyIndex(doc.start) !== -1) {
					yield* this.pop();
					yield* this.step();
				} else doc.start.push(this.sourceToken);
				return;
			case "anchor":
			case "tag":
			case "space":
			case "comment":
			case "newline":
				doc.start.push(this.sourceToken);
				return;
		}
		const bv = this.startBlockValue(doc);
		if (bv) this.stack.push(bv);
		else yield {
			type: "error",
			offset: this.offset,
			message: `Unexpected ${this.type} token in YAML document`,
			source: this.source
		};
	}
	*scalar(scalar) {
		if (this.type === "map-value-ind") {
			const start = getFirstKeyStartProps(getPrevProps(this.peek(2)));
			let sep;
			if (scalar.end) {
				sep = scalar.end;
				sep.push(this.sourceToken);
				delete scalar.end;
			} else sep = [this.sourceToken];
			const map = {
				type: "block-map",
				offset: scalar.offset,
				indent: scalar.indent,
				items: [{
					start,
					key: scalar,
					sep
				}]
			};
			this.onKeyLine = true;
			this.stack[this.stack.length - 1] = map;
		} else yield* this.lineEnd(scalar);
	}
	*blockScalar(scalar) {
		switch (this.type) {
			case "space":
			case "comment":
			case "newline":
				scalar.props.push(this.sourceToken);
				return;
			case "scalar":
				scalar.source = this.source;
				this.atNewLine = true;
				this.indent = 0;
				if (this.onNewLine) {
					let nl = this.source.indexOf("\n") + 1;
					while (nl !== 0) {
						this.onNewLine(this.offset + nl);
						nl = this.source.indexOf("\n", nl) + 1;
					}
				}
				yield* this.pop();
				break;
			/* istanbul ignore next should not happen */
			default:
				yield* this.pop();
				yield* this.step();
		}
	}
	*blockMap(map) {
		const it = map.items[map.items.length - 1];
		switch (this.type) {
			case "newline":
				this.onKeyLine = false;
				if (it.value) {
					const end = "end" in it.value ? it.value.end : void 0;
					if ((Array.isArray(end) ? end[end.length - 1] : void 0)?.type === "comment") end?.push(this.sourceToken);
					else map.items.push({ start: [this.sourceToken] });
				} else if (it.sep) it.sep.push(this.sourceToken);
				else it.start.push(this.sourceToken);
				return;
			case "space":
			case "comment":
				if (it.value) map.items.push({ start: [this.sourceToken] });
				else if (it.sep) it.sep.push(this.sourceToken);
				else {
					if (this.atIndentedComment(it.start, map.indent)) {
						const end = map.items[map.items.length - 2]?.value?.end;
						if (Array.isArray(end)) {
							arrayPushArray(end, it.start);
							end.push(this.sourceToken);
							map.items.pop();
							return;
						}
					}
					it.start.push(this.sourceToken);
				}
				return;
		}
		if (this.indent >= map.indent) {
			const atMapIndent = !this.onKeyLine && this.indent === map.indent;
			const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
			let start = [];
			if (atNextItem && it.sep && !it.value) {
				const nl = [];
				for (let i = 0; i < it.sep.length; ++i) {
					const st = it.sep[i];
					switch (st.type) {
						case "newline":
							nl.push(i);
							break;
						case "space": break;
						case "comment":
							if (st.indent > map.indent) nl.length = 0;
							break;
						default: nl.length = 0;
					}
				}
				if (nl.length >= 2) start = it.sep.splice(nl[1]);
			}
			switch (this.type) {
				case "anchor":
				case "tag":
					if (atNextItem || it.value) {
						start.push(this.sourceToken);
						map.items.push({ start });
						this.onKeyLine = true;
					} else if (it.sep) it.sep.push(this.sourceToken);
					else it.start.push(this.sourceToken);
					return;
				case "explicit-key-ind":
					if (!it.sep && !it.explicitKey) {
						it.start.push(this.sourceToken);
						it.explicitKey = true;
					} else if (atNextItem || it.value) {
						start.push(this.sourceToken);
						map.items.push({
							start,
							explicitKey: true
						});
					} else this.stack.push({
						type: "block-map",
						offset: this.offset,
						indent: this.indent,
						items: [{
							start: [this.sourceToken],
							explicitKey: true
						}]
					});
					this.onKeyLine = true;
					return;
				case "map-value-ind":
					if (it.explicitKey) if (!it.sep) if (includesToken(it.start, "newline")) Object.assign(it, {
						key: null,
						sep: [this.sourceToken]
					});
					else {
						const start = getFirstKeyStartProps(it.start);
						this.stack.push({
							type: "block-map",
							offset: this.offset,
							indent: this.indent,
							items: [{
								start,
								key: null,
								sep: [this.sourceToken]
							}]
						});
					}
					else if (it.value) map.items.push({
						start: [],
						key: null,
						sep: [this.sourceToken]
					});
					else if (includesToken(it.sep, "map-value-ind")) this.stack.push({
						type: "block-map",
						offset: this.offset,
						indent: this.indent,
						items: [{
							start,
							key: null,
							sep: [this.sourceToken]
						}]
					});
					else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
						const start = getFirstKeyStartProps(it.start);
						const key = it.key;
						const sep = it.sep;
						sep.push(this.sourceToken);
						delete it.key;
						delete it.sep;
						this.stack.push({
							type: "block-map",
							offset: this.offset,
							indent: this.indent,
							items: [{
								start,
								key,
								sep
							}]
						});
					} else if (start.length > 0) it.sep = it.sep.concat(start, this.sourceToken);
					else it.sep.push(this.sourceToken);
					else if (!it.sep) Object.assign(it, {
						key: null,
						sep: [this.sourceToken]
					});
					else if (it.value || atNextItem) map.items.push({
						start,
						key: null,
						sep: [this.sourceToken]
					});
					else if (includesToken(it.sep, "map-value-ind")) this.stack.push({
						type: "block-map",
						offset: this.offset,
						indent: this.indent,
						items: [{
							start: [],
							key: null,
							sep: [this.sourceToken]
						}]
					});
					else it.sep.push(this.sourceToken);
					this.onKeyLine = true;
					return;
				case "alias":
				case "scalar":
				case "single-quoted-scalar":
				case "double-quoted-scalar": {
					const fs = this.flowScalar(this.type);
					if (atNextItem || it.value) {
						map.items.push({
							start,
							key: fs,
							sep: []
						});
						this.onKeyLine = true;
					} else if (it.sep) this.stack.push(fs);
					else {
						Object.assign(it, {
							key: fs,
							sep: []
						});
						this.onKeyLine = true;
					}
					return;
				}
				default: {
					const bv = this.startBlockValue(map);
					if (bv) {
						if (bv.type === "block-seq") {
							if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
								yield* this.pop({
									type: "error",
									offset: this.offset,
									message: "Unexpected block-seq-ind on same line with key",
									source: this.source
								});
								return;
							}
						} else if (atMapIndent) map.items.push({ start });
						this.stack.push(bv);
						return;
					}
				}
			}
		}
		yield* this.pop();
		yield* this.step();
	}
	*blockSequence(seq) {
		const it = seq.items[seq.items.length - 1];
		switch (this.type) {
			case "newline":
				if (it.value) {
					const end = "end" in it.value ? it.value.end : void 0;
					if ((Array.isArray(end) ? end[end.length - 1] : void 0)?.type === "comment") end?.push(this.sourceToken);
					else seq.items.push({ start: [this.sourceToken] });
				} else it.start.push(this.sourceToken);
				return;
			case "space":
			case "comment":
				if (it.value) seq.items.push({ start: [this.sourceToken] });
				else {
					if (this.atIndentedComment(it.start, seq.indent)) {
						const end = seq.items[seq.items.length - 2]?.value?.end;
						if (Array.isArray(end)) {
							arrayPushArray(end, it.start);
							end.push(this.sourceToken);
							seq.items.pop();
							return;
						}
					}
					it.start.push(this.sourceToken);
				}
				return;
			case "anchor":
			case "tag":
				if (it.value || this.indent <= seq.indent) break;
				it.start.push(this.sourceToken);
				return;
			case "seq-item-ind":
				if (this.indent !== seq.indent) break;
				if (it.value || includesToken(it.start, "seq-item-ind")) seq.items.push({ start: [this.sourceToken] });
				else it.start.push(this.sourceToken);
				return;
		}
		if (this.indent > seq.indent) {
			const bv = this.startBlockValue(seq);
			if (bv) {
				this.stack.push(bv);
				return;
			}
		}
		yield* this.pop();
		yield* this.step();
	}
	*flowCollection(fc) {
		const it = fc.items[fc.items.length - 1];
		if (this.type === "flow-error-end") {
			let top;
			do {
				yield* this.pop();
				top = this.peek(1);
			} while (top?.type === "flow-collection");
		} else if (fc.end.length === 0) {
			switch (this.type) {
				case "comma":
				case "explicit-key-ind":
					if (!it || it.sep) fc.items.push({ start: [this.sourceToken] });
					else it.start.push(this.sourceToken);
					return;
				case "map-value-ind":
					if (!it || it.value) fc.items.push({
						start: [],
						key: null,
						sep: [this.sourceToken]
					});
					else if (it.sep) it.sep.push(this.sourceToken);
					else Object.assign(it, {
						key: null,
						sep: [this.sourceToken]
					});
					return;
				case "space":
				case "comment":
				case "newline":
				case "anchor":
				case "tag":
					if (!it || it.value) fc.items.push({ start: [this.sourceToken] });
					else if (it.sep) it.sep.push(this.sourceToken);
					else it.start.push(this.sourceToken);
					return;
				case "alias":
				case "scalar":
				case "single-quoted-scalar":
				case "double-quoted-scalar": {
					const fs = this.flowScalar(this.type);
					if (!it || it.value) fc.items.push({
						start: [],
						key: fs,
						sep: []
					});
					else if (it.sep) this.stack.push(fs);
					else Object.assign(it, {
						key: fs,
						sep: []
					});
					return;
				}
				case "flow-map-end":
				case "flow-seq-end":
					fc.end.push(this.sourceToken);
					return;
			}
			const bv = this.startBlockValue(fc);
			/* istanbul ignore else should not happen */
			if (bv) this.stack.push(bv);
			else {
				yield* this.pop();
				yield* this.step();
			}
		} else {
			const parent = this.peek(2);
			if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
				yield* this.pop();
				yield* this.step();
			} else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
				const start = getFirstKeyStartProps(getPrevProps(parent));
				fixFlowSeqItems(fc);
				const sep = fc.end.splice(1, fc.end.length);
				sep.push(this.sourceToken);
				const map = {
					type: "block-map",
					offset: fc.offset,
					indent: fc.indent,
					items: [{
						start,
						key: fc,
						sep
					}]
				};
				this.onKeyLine = true;
				this.stack[this.stack.length - 1] = map;
			} else yield* this.lineEnd(fc);
		}
	}
	flowScalar(type) {
		if (this.onNewLine) {
			let nl = this.source.indexOf("\n") + 1;
			while (nl !== 0) {
				this.onNewLine(this.offset + nl);
				nl = this.source.indexOf("\n", nl) + 1;
			}
		}
		return {
			type,
			offset: this.offset,
			indent: this.indent,
			source: this.source
		};
	}
	startBlockValue(parent) {
		switch (this.type) {
			case "alias":
			case "scalar":
			case "single-quoted-scalar":
			case "double-quoted-scalar": return this.flowScalar(this.type);
			case "block-scalar-header": return {
				type: "block-scalar",
				offset: this.offset,
				indent: this.indent,
				props: [this.sourceToken],
				source: ""
			};
			case "flow-map-start":
			case "flow-seq-start": return {
				type: "flow-collection",
				offset: this.offset,
				indent: this.indent,
				start: this.sourceToken,
				items: [],
				end: []
			};
			case "seq-item-ind": return {
				type: "block-seq",
				offset: this.offset,
				indent: this.indent,
				items: [{ start: [this.sourceToken] }]
			};
			case "explicit-key-ind": {
				this.onKeyLine = true;
				const start = getFirstKeyStartProps(getPrevProps(parent));
				start.push(this.sourceToken);
				return {
					type: "block-map",
					offset: this.offset,
					indent: this.indent,
					items: [{
						start,
						explicitKey: true
					}]
				};
			}
			case "map-value-ind": {
				this.onKeyLine = true;
				const start = getFirstKeyStartProps(getPrevProps(parent));
				return {
					type: "block-map",
					offset: this.offset,
					indent: this.indent,
					items: [{
						start,
						key: null,
						sep: [this.sourceToken]
					}]
				};
			}
		}
		return null;
	}
	atIndentedComment(start, indent) {
		if (this.type !== "comment") return false;
		if (this.indent <= indent) return false;
		return start.every((st) => st.type === "newline" || st.type === "space");
	}
	*documentEnd(docEnd) {
		if (this.type !== "doc-mode") {
			if (docEnd.end) docEnd.end.push(this.sourceToken);
			else docEnd.end = [this.sourceToken];
			if (this.type === "newline") yield* this.pop();
		}
	}
	*lineEnd(token) {
		switch (this.type) {
			case "comma":
			case "doc-start":
			case "doc-end":
			case "flow-seq-end":
			case "flow-map-end":
			case "map-value-ind":
				yield* this.pop();
				yield* this.step();
				break;
			case "newline": this.onKeyLine = false;
			default:
				if (token.end) token.end.push(this.sourceToken);
				else token.end = [this.sourceToken];
				if (this.type === "newline") yield* this.pop();
		}
	}
};
//#endregion
//#region node_modules/yaml/browser/dist/public-api.js
function parseOptions(options) {
	const prettyErrors = options.prettyErrors !== false;
	return {
		lineCounter: options.lineCounter || prettyErrors && new LineCounter() || null,
		prettyErrors
	};
}
/** Parse an input string into a single YAML.Document */
function parseDocument(source, options = {}) {
	const { lineCounter, prettyErrors } = parseOptions(options);
	const parser = new Parser(lineCounter?.addNewLine);
	const composer = new Composer(options);
	let doc = null;
	for (const _doc of composer.compose(parser.parse(source), true, source.length)) if (!doc) doc = _doc;
	else if (doc.options.logLevel !== "silent") {
		doc.errors.push(new YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
		break;
	}
	if (prettyErrors && lineCounter) {
		doc.errors.forEach(prettifyError$1(source, lineCounter));
		doc.warnings.forEach(prettifyError$1(source, lineCounter));
	}
	return doc;
}
function parse$2(src, reviver, options) {
	let _reviver = void 0;
	if (typeof reviver === "function") _reviver = reviver;
	else if (options === void 0 && reviver && typeof reviver === "object") options = reviver;
	const doc = parseDocument(src, options);
	if (!doc) return null;
	doc.warnings.forEach((warning) => warn(doc.options.logLevel, warning));
	if (doc.errors.length > 0) if (doc.options.logLevel !== "silent") throw doc.errors[0];
	else doc.errors = [];
	return doc.toJS(Object.assign({ reviver: _reviver }, options));
}
//#endregion
//#region node_modules/zod/v4/core/core.js
var _a$1;
function $constructor(name, initializer, params) {
	function init(inst, def) {
		if (!inst._zod) Object.defineProperty(inst, "_zod", {
			value: {
				def,
				constr: _,
				traits: /* @__PURE__ */ new Set()
			},
			enumerable: false
		});
		if (inst._zod.traits.has(name)) return;
		inst._zod.traits.add(name);
		initializer(inst, def);
		const proto = _.prototype;
		const keys = Object.keys(proto);
		for (let i = 0; i < keys.length; i++) {
			const k = keys[i];
			if (!(k in inst)) inst[k] = proto[k].bind(inst);
		}
	}
	const Parent = params?.Parent ?? Object;
	class Definition extends Parent {}
	Object.defineProperty(Definition, "name", { value: name });
	function _(def) {
		var _a;
		const inst = params?.Parent ? new Definition() : this;
		init(inst, def);
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		for (const fn of inst._zod.deferred) fn();
		return inst;
	}
	Object.defineProperty(_, "init", { value: init });
	Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
		if (params?.Parent && inst instanceof params.Parent) return true;
		return inst?._zod?.traits?.has(name);
	} });
	Object.defineProperty(_, "name", { value: name });
	return _;
}
var $ZodAsyncError = class extends Error {
	constructor() {
		super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
	}
};
var $ZodEncodeError = class extends Error {
	constructor(name) {
		super(`Encountered unidirectional transform during encode: ${name}`);
		this.name = "ZodEncodeError";
	}
};
(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
var globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
	if (newConfig) Object.assign(globalConfig, newConfig);
	return globalConfig;
}
//#endregion
//#region node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
	const numericValues = Object.values(entries).filter((v) => typeof v === "number");
	return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
}
function jsonStringifyReplacer(_, value) {
	if (typeof value === "bigint") return value.toString();
	return value;
}
function cached(getter) {
	return { get value() {
		{
			const value = getter();
			Object.defineProperty(this, "value", { value });
			return value;
		}
		throw new Error("cached value already set");
	} };
}
function nullish(input) {
	return input === null || input === void 0;
}
function cleanRegex(source) {
	const start = source.startsWith("^") ? 1 : 0;
	const end = source.endsWith("$") ? source.length - 1 : source.length;
	return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
	const ratio = val / step;
	const roundedRatio = Math.round(ratio);
	const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
	if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
	return ratio - roundedRatio;
}
var EVALUATING = /* @__PURE__*/ Symbol("evaluating");
function defineLazy(object, key, getter) {
	let value = void 0;
	Object.defineProperty(object, key, {
		get() {
			if (value === EVALUATING) return;
			if (value === void 0) {
				value = EVALUATING;
				value = getter();
			}
			return value;
		},
		set(v) {
			Object.defineProperty(object, key, { value: v });
		},
		configurable: true
	});
}
function assignProp(target, prop, value) {
	Object.defineProperty(target, prop, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}
function mergeDefs(...defs) {
	const mergedDescriptors = {};
	for (const def of defs) {
		const descriptors = Object.getOwnPropertyDescriptors(def);
		Object.assign(mergedDescriptors, descriptors);
	}
	return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
	return JSON.stringify(str);
}
function slugify(input) {
	return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
	return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = /* @__PURE__*/ cached(() => {
	if (globalConfig.jitless) return false;
	if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
	try {
		new Function("");
		return true;
	} catch (_) {
		return false;
	}
});
function isPlainObject(o) {
	if (isObject(o) === false) return false;
	const ctor = o.constructor;
	if (ctor === void 0) return true;
	if (typeof ctor !== "function") return true;
	const prot = ctor.prototype;
	if (isObject(prot) === false) return false;
	if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
	return true;
}
function shallowClone(o) {
	if (isPlainObject(o)) return { ...o };
	if (Array.isArray(o)) return [...o];
	if (o instanceof Map) return new Map(o);
	if (o instanceof Set) return new Set(o);
	return o;
}
var propertyKeyTypes = /* @__PURE__*/ new Set([
	"string",
	"number",
	"symbol"
]);
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
	const cl = new inst._zod.constr(def ?? inst._zod.def);
	if (!def || params?.parent) cl._zod.parent = inst;
	return cl;
}
function normalizeParams(_params) {
	const params = _params;
	if (!params) return {};
	if (typeof params === "string") return { error: () => params };
	if (params?.message !== void 0) {
		if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
		params.error = params.message;
	}
	delete params.message;
	if (typeof params.error === "string") return {
		...params,
		error: () => params.error
	};
	return params;
}
function optionalKeys(shape) {
	return Object.keys(shape).filter((k) => {
		return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
	});
}
var NUMBER_FORMAT_RANGES = {
	safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function pick(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = {};
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				newShape[key] = currDef.shape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	}));
}
function omit(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = { ...schema._zod.def.shape };
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				delete newShape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	}));
}
function extend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) {
		const existingShape = schema._zod.def.shape;
		for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
	}
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const _shape = {
			...schema._zod.def.shape,
			...shape
		};
		assignProp(this, "shape", _shape);
		return _shape;
	} }));
}
function safeExtend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const _shape = {
			...schema._zod.def.shape,
			...shape
		};
		assignProp(this, "shape", _shape);
		return _shape;
	} }));
}
function merge(a, b) {
	if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
	return clone(a, mergeDefs(a._zod.def, {
		get shape() {
			const _shape = {
				...a._zod.def.shape,
				...b._zod.def.shape
			};
			assignProp(this, "shape", _shape);
			return _shape;
		},
		get catchall() {
			return b._zod.def.catchall;
		},
		checks: b._zod.def.checks ?? []
	}));
}
function partial(Class, schema, mask) {
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const oldShape = schema._zod.def.shape;
			const shape = { ...oldShape };
			if (mask) for (const key in mask) {
				if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				shape[key] = Class ? new Class({
					type: "optional",
					innerType: oldShape[key]
				}) : oldShape[key];
			}
			else for (const key in oldShape) shape[key] = Class ? new Class({
				type: "optional",
				innerType: oldShape[key]
			}) : oldShape[key];
			assignProp(this, "shape", shape);
			return shape;
		},
		checks: []
	}));
}
function required(Class, schema, mask) {
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const oldShape = schema._zod.def.shape;
		const shape = { ...oldShape };
		if (mask) for (const key in mask) {
			if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
			if (!mask[key]) continue;
			shape[key] = new Class({
				type: "nonoptional",
				innerType: oldShape[key]
			});
		}
		else for (const key in oldShape) shape[key] = new Class({
			type: "nonoptional",
			innerType: oldShape[key]
		});
		assignProp(this, "shape", shape);
		return shape;
	} }));
}
function aborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
	return false;
}
function explicitlyAborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
	return false;
}
function prefixIssues(path, issues) {
	return issues.map((iss) => {
		var _a;
		(_a = iss).path ?? (_a.path = []);
		iss.path.unshift(path);
		return iss;
	});
}
function unwrapMessage(message) {
	return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config) {
	const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
	const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
	rest.path ?? (rest.path = []);
	rest.message = message;
	if (ctx?.reportInput) rest.input = _input;
	return rest;
}
function getLengthableOrigin(input) {
	if (Array.isArray(input)) return "array";
	if (typeof input === "string") return "string";
	return "unknown";
}
function issue(...args) {
	const [iss, input, inst] = args;
	if (typeof iss === "string") return {
		message: iss,
		code: "custom",
		input,
		inst
	};
	return { ...iss };
}
//#endregion
//#region node_modules/zod/v4/core/errors.js
var initializer$1 = (inst, def) => {
	inst.name = "$ZodError";
	Object.defineProperty(inst, "_zod", {
		value: inst._zod,
		enumerable: false
	});
	Object.defineProperty(inst, "issues", {
		value: def,
		enumerable: false
	});
	inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
	Object.defineProperty(inst, "toString", {
		value: () => inst.message,
		enumerable: false
	});
};
var $ZodError = $constructor("$ZodError", initializer$1);
var $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
function flattenError(error, mapper = (issue) => issue.message) {
	const fieldErrors = {};
	const formErrors = [];
	for (const sub of error.issues) if (sub.path.length > 0) {
		fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
		fieldErrors[sub.path[0]].push(mapper(sub));
	} else formErrors.push(mapper(sub));
	return {
		formErrors,
		fieldErrors
	};
}
function formatError(error, mapper = (issue) => issue.message) {
	const fieldErrors = { _errors: [] };
	const processError = (error, path = []) => {
		for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
		else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
		else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
		else {
			const fullpath = [...path, ...issue.path];
			if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
			else {
				let curr = fieldErrors;
				let i = 0;
				while (i < fullpath.length) {
					const el = fullpath[i];
					if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
					else {
						curr[el] = curr[el] || { _errors: [] };
						curr[el]._errors.push(mapper(issue));
					}
					curr = curr[el];
					i++;
				}
			}
		}
	};
	processError(error);
	return fieldErrors;
}
/** Format a ZodError as a human-readable string in the following form.
*
* From
*
* ```ts
* ZodError {
*   issues: [
*     {
*       expected: 'string',
*       code: 'invalid_type',
*       path: [ 'username' ],
*       message: 'Invalid input: expected string'
*     },
*     {
*       expected: 'number',
*       code: 'invalid_type',
*       path: [ 'favoriteNumbers', 1 ],
*       message: 'Invalid input: expected number'
*     }
*   ];
* }
* ```
*
* to
*
* ```
* username
*   ✖ Expected number, received string at "username
* favoriteNumbers[0]
*   ✖ Invalid input: expected number
* ```
*/
function toDotPath(_path) {
	const segs = [];
	const path = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
	for (const seg of path) if (typeof seg === "number") segs.push(`[${seg}]`);
	else if (typeof seg === "symbol") segs.push(`[${JSON.stringify(String(seg))}]`);
	else if (/[^\w$]/.test(seg)) segs.push(`[${JSON.stringify(seg)}]`);
	else {
		if (segs.length) segs.push(".");
		segs.push(seg);
	}
	return segs.join("");
}
function prettifyError(error) {
	const lines = [];
	const issues = [...error.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
	for (const issue of issues) {
		lines.push(`✖ ${issue.message}`);
		if (issue.path?.length) lines.push(`  → at ${toDotPath(issue.path)}`);
	}
	return lines.join("\n");
}
//#endregion
//#region node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	if (result.issues.length) {
		const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, _params?.callee);
		throw e;
	}
	return result.value;
};
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true
	} : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	if (result.issues.length) {
		const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, params?.callee);
		throw e;
	}
	return result.value;
};
var _safeParse = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length ? {
		success: false,
		error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
var safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true
	} : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length ? {
		success: false,
		error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
var safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
var _encode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _parse(_Err)(schema, value, ctx);
};
var _decode = (_Err) => (schema, value, _ctx) => {
	return _parse(_Err)(schema, value, _ctx);
};
var _encodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _parseAsync(_Err)(schema, value, ctx);
};
var _decodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _parseAsync(_Err)(schema, value, _ctx);
};
var _safeEncode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _safeParse(_Err)(schema, value, ctx);
};
var _safeDecode = (_Err) => (schema, value, _ctx) => {
	return _safeParse(_Err)(schema, value, _ctx);
};
var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _safeParseAsync(_Err)(schema, value, ctx);
};
var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _safeParseAsync(_Err)(schema, value, _ctx);
};
//#endregion
//#region node_modules/zod/v4/core/regexes.js
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link cuid2} instead.
* See https://github.com/paralleldrive/cuid.
*/
var cuid = /^[cC][0-9a-z]{6,}$/;
var cuid2 = /^[0-9a-z]+$/;
var ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
var xid = /^[0-9a-vA-V]{20}$/;
var ksuid = /^[A-Za-z0-9]{27}$/;
var nanoid = /^[a-zA-Z0-9_-]{21}$/;
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
var duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
*
* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
var uuid = (version) => {
	if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
	return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
/** Practical email validation */
var email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
var _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
	return new RegExp(_emoji$1, "u");
}
var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var base64url = /^[A-Za-z0-9_-]*$/;
var httpProtocol = /^https?$/;
var e164 = /^\+[1-9]\d{6,14}$/;
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
function timeSource(args) {
	const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
	return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function time$1(args) {
	return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
	const time = timeSource({ precision: args.precision });
	const opts = ["Z"];
	if (args.local) opts.push("");
	if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
	const timeRegex = `${time}(?:${opts.join("|")})`;
	return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var string$1 = (params) => {
	const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
	return new RegExp(`^${regex}$`);
};
var integer = /^-?\d+$/;
var number$1 = /^-?\d+(?:\.\d+)?$/;
var boolean$1 = /^(?:true|false)$/i;
var _null$2 = /^null$/i;
var lowercase = /^[^A-Z]*$/;
var uppercase = /^[^a-z]*$/;
//#endregion
//#region node_modules/zod/v4/core/checks.js
var $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
	var _a;
	inst._zod ?? (inst._zod = {});
	inst._zod.def = def;
	(_a = inst._zod).onattach ?? (_a.onattach = []);
});
var numericOriginMap = {
	number: "number",
	bigint: "bigint",
	object: "date"
};
var $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
		if (def.value < curr) if (def.inclusive) bag.maximum = def.value;
		else bag.exclusiveMaximum = def.value;
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
		if (def.value > curr) if (def.inclusive) bag.minimum = def.value;
		else bag.exclusiveMinimum = def.value;
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst) => {
		var _a;
		(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
	});
	inst._zod.check = (payload) => {
		if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
		if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
		payload.issues.push({
			origin: typeof payload.value,
			code: "not_multiple_of",
			divisor: def.value,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
	$ZodCheck.init(inst, def);
	def.format = def.format || "float64";
	const isInt = def.format?.includes("int");
	const origin = isInt ? "int" : "number";
	const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.format = def.format;
		bag.minimum = minimum;
		bag.maximum = maximum;
		if (isInt) bag.pattern = integer;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (isInt) {
			if (!Number.isInteger(input)) {
				payload.issues.push({
					expected: origin,
					format: def.format,
					code: "invalid_type",
					continue: false,
					input,
					inst
				});
				return;
			}
			if (!Number.isSafeInteger(input)) {
				if (input > 0) payload.issues.push({
					input,
					code: "too_big",
					maximum: Number.MAX_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				else payload.issues.push({
					input,
					code: "too_small",
					minimum: Number.MIN_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				return;
			}
		}
		if (input < minimum) payload.issues.push({
			origin: "number",
			input,
			code: "too_small",
			minimum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
		if (input > maximum) payload.issues.push({
			origin: "number",
			input,
			code: "too_big",
			maximum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
		if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.length <= def.maximum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: def.maximum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
		if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.length >= def.minimum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: def.minimum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.minimum = def.length;
		bag.maximum = def.length;
		bag.length = def.length;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		const length = input.length;
		if (length === def.length) return;
		const origin = getLengthableOrigin(input);
		const tooBig = length > def.length;
		payload.issues.push({
			origin,
			...tooBig ? {
				code: "too_big",
				maximum: def.length
			} : {
				code: "too_small",
				minimum: def.length
			},
			inclusive: true,
			exact: true,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
	var _a, _b;
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.format = def.format;
		if (def.pattern) {
			bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
			bag.patterns.add(def.pattern);
		}
	});
	if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: def.format,
			input: payload.value,
			...def.pattern ? { pattern: def.pattern.toString() } : {},
			inst,
			continue: !def.abort
		});
	});
	else (_b = inst._zod).check ?? (_b.check = () => {});
});
var $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: payload.value,
			pattern: def.pattern.toString(),
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
	def.pattern ?? (def.pattern = lowercase);
	$ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
	def.pattern ?? (def.pattern = uppercase);
	$ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
	$ZodCheck.init(inst, def);
	const escapedRegex = escapeRegex(def.includes);
	const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
	def.pattern = pattern;
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.includes(def.includes, def.position)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: def.includes,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.startsWith(def.prefix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: def.prefix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.endsWith(def.suffix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: def.suffix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		payload.value = def.tx(payload.value);
	};
});
//#endregion
//#region node_modules/zod/v4/core/doc.js
var Doc = class {
	constructor(args = []) {
		this.content = [];
		this.indent = 0;
		if (this) this.args = args;
	}
	indented(fn) {
		this.indent += 1;
		fn(this);
		this.indent -= 1;
	}
	write(arg) {
		if (typeof arg === "function") {
			arg(this, { execution: "sync" });
			arg(this, { execution: "async" });
			return;
		}
		const lines = arg.split("\n").filter((x) => x);
		const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
		const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
		for (const line of dedented) this.content.push(line);
	}
	compile() {
		const F = Function;
		const args = this?.args;
		const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
		return new F(...args, lines.join("\n"));
	}
};
//#endregion
//#region node_modules/zod/v4/core/versions.js
var version = {
	major: 4,
	minor: 4,
	patch: 3
};
//#endregion
//#region node_modules/zod/v4/core/schemas.js
var $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
	var _a;
	inst ?? (inst = {});
	inst._zod.def = def;
	inst._zod.bag = inst._zod.bag || {};
	inst._zod.version = version;
	const checks = [...inst._zod.def.checks ?? []];
	if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
	for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
	if (checks.length === 0) {
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred?.push(() => {
			inst._zod.run = inst._zod.parse;
		});
	} else {
		const runChecks = (payload, checks, ctx) => {
			let isAborted = aborted(payload);
			let asyncResult;
			for (const ch of checks) {
				if (ch._zod.def.when) {
					if (explicitlyAborted(payload)) continue;
					if (!ch._zod.def.when(payload)) continue;
				} else if (isAborted) continue;
				const currLen = payload.issues.length;
				const _ = ch._zod.check(payload);
				if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
				if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
					await _;
					if (payload.issues.length === currLen) return;
					if (!isAborted) isAborted = aborted(payload, currLen);
				});
				else {
					if (payload.issues.length === currLen) continue;
					if (!isAborted) isAborted = aborted(payload, currLen);
				}
			}
			if (asyncResult) return asyncResult.then(() => {
				return payload;
			});
			return payload;
		};
		const handleCanaryResult = (canary, payload, ctx) => {
			if (aborted(canary)) {
				canary.aborted = true;
				return canary;
			}
			const checkResult = runChecks(payload, checks, ctx);
			if (checkResult instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
			}
			return inst._zod.parse(checkResult, ctx);
		};
		inst._zod.run = (payload, ctx) => {
			if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
			if (ctx.direction === "backward") {
				const canary = inst._zod.parse({
					value: payload.value,
					issues: []
				}, {
					...ctx,
					skipChecks: true
				});
				if (canary instanceof Promise) return canary.then((canary) => {
					return handleCanaryResult(canary, payload, ctx);
				});
				return handleCanaryResult(canary, payload, ctx);
			}
			const result = inst._zod.parse(payload, ctx);
			if (result instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return result.then((result) => runChecks(result, checks, ctx));
			}
			return runChecks(result, checks, ctx);
		};
	}
	defineLazy(inst, "~standard", () => ({
		validate: (value) => {
			try {
				const r = safeParse$1(inst, value);
				return r.success ? { value: r.data } : { issues: r.error?.issues };
			} catch (_) {
				return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
			}
		},
		vendor: "zod",
		version: 1
	}));
});
var $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
	inst._zod.parse = (payload, _) => {
		if (def.coerce) try {
			payload.value = String(payload.value);
		} catch (_) {}
		if (typeof payload.value === "string") return payload;
		payload.issues.push({
			expected: "string",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
var $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	$ZodString.init(inst, def);
});
var $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
	def.pattern ?? (def.pattern = guid);
	$ZodStringFormat.init(inst, def);
});
var $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
	if (def.version) {
		const v = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		}[def.version];
		if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
		def.pattern ?? (def.pattern = uuid(v));
	} else def.pattern ?? (def.pattern = uuid());
	$ZodStringFormat.init(inst, def);
});
var $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
	def.pattern ?? (def.pattern = email);
	$ZodStringFormat.init(inst, def);
});
var $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		try {
			const trimmed = payload.value.trim();
			if (!def.normalize && def.protocol?.source === httpProtocol.source) {
				if (!/^https?:\/\//i.test(trimmed)) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						note: "Invalid URL format",
						input: payload.value,
						inst,
						continue: !def.abort
					});
					return;
				}
			}
			const url = new URL(trimmed);
			if (def.hostname) {
				def.hostname.lastIndex = 0;
				if (!def.hostname.test(url.hostname)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid hostname",
					pattern: def.hostname.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.protocol) {
				def.protocol.lastIndex = 0;
				if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid protocol",
					pattern: def.protocol.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.normalize) payload.value = url.href;
			else payload.value = trimmed;
			return;
		} catch (_) {
			payload.issues.push({
				code: "invalid_format",
				format: "url",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
var $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
	def.pattern ?? (def.pattern = emoji());
	$ZodStringFormat.init(inst, def);
});
var $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
	def.pattern ?? (def.pattern = nanoid);
	$ZodStringFormat.init(inst, def);
});
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
* See https://github.com/paralleldrive/cuid.
*/
var $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
	def.pattern ?? (def.pattern = cuid);
	$ZodStringFormat.init(inst, def);
});
var $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
	def.pattern ?? (def.pattern = cuid2);
	$ZodStringFormat.init(inst, def);
});
var $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
	def.pattern ?? (def.pattern = ulid);
	$ZodStringFormat.init(inst, def);
});
var $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
	def.pattern ?? (def.pattern = xid);
	$ZodStringFormat.init(inst, def);
});
var $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
	def.pattern ?? (def.pattern = ksuid);
	$ZodStringFormat.init(inst, def);
});
var $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
	def.pattern ?? (def.pattern = datetime$1(def));
	$ZodStringFormat.init(inst, def);
});
var $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
	def.pattern ?? (def.pattern = date$1);
	$ZodStringFormat.init(inst, def);
});
var $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
	def.pattern ?? (def.pattern = time$1(def));
	$ZodStringFormat.init(inst, def);
});
var $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
	def.pattern ?? (def.pattern = duration$1);
	$ZodStringFormat.init(inst, def);
});
var $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
	def.pattern ?? (def.pattern = ipv4);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.format = `ipv4`;
});
var $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
	def.pattern ?? (def.pattern = ipv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.format = `ipv6`;
	inst._zod.check = (payload) => {
		try {
			new URL(`http://[${payload.value}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "ipv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
var $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv4);
	$ZodStringFormat.init(inst, def);
});
var $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		const parts = payload.value.split("/");
		try {
			if (parts.length !== 2) throw new Error();
			const [address, prefix] = parts;
			if (!prefix) throw new Error();
			const prefixNum = Number(prefix);
			if (`${prefixNum}` !== prefix) throw new Error();
			if (prefixNum < 0 || prefixNum > 128) throw new Error();
			new URL(`http://[${address}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "cidrv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
function isValidBase64(data) {
	if (data === "") return true;
	if (/\s/.test(data)) return false;
	if (data.length % 4 !== 0) return false;
	try {
		atob(data);
		return true;
	} catch {
		return false;
	}
}
var $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
	def.pattern ?? (def.pattern = base64);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.contentEncoding = "base64";
	inst._zod.check = (payload) => {
		if (isValidBase64(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
function isValidBase64URL(data) {
	if (!base64url.test(data)) return false;
	const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
	return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}
var $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
	def.pattern ?? (def.pattern = base64url);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.contentEncoding = "base64url";
	inst._zod.check = (payload) => {
		if (isValidBase64URL(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
	def.pattern ?? (def.pattern = e164);
	$ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
	try {
		const tokensParts = token.split(".");
		if (tokensParts.length !== 3) return false;
		const [header] = tokensParts;
		if (!header) return false;
		const parsedHeader = JSON.parse(atob(header));
		if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
		if (!parsedHeader.alg) return false;
		if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
		return true;
	} catch {
		return false;
	}
}
var $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidJWT(payload.value, def.alg)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Number(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
		const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
		payload.issues.push({
			expected: "number",
			code: "invalid_type",
			input,
			inst,
			...received ? { received } : {}
		});
		return payload;
	};
});
var $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
	$ZodCheckNumberFormat.init(inst, def);
	$ZodNumber.init(inst, def);
});
var $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = boolean$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Boolean(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "boolean") return payload;
		payload.issues.push({
			expected: "boolean",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
var $ZodNull = /*@__PURE__*/ $constructor("$ZodNull", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = _null$2;
	inst._zod.values = /* @__PURE__ */ new Set([null]);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (input === null) return payload;
		payload.issues.push({
			expected: "null",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
var $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
var $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		payload.issues.push({
			expected: "never",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
function handleArrayResult(result, final, index) {
	if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
	final.value[index] = result.value;
}
var $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!Array.isArray(input)) {
			payload.issues.push({
				expected: "array",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = Array(input.length);
		const proms = [];
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const result = def.element._zod.run({
				value: item,
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
			else handleArrayResult(result, payload, i);
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
	const isPresent = key in input;
	if (result.issues.length) {
		if (isOptionalIn && isOptionalOut && !isPresent) return;
		final.issues.push(...prefixIssues(key, result.issues));
	}
	if (!isPresent && !isOptionalIn) {
		if (!result.issues.length) final.issues.push({
			code: "invalid_type",
			expected: "nonoptional",
			input: void 0,
			path: [key]
		});
		return;
	}
	if (result.value === void 0) {
		if (isPresent) final.value[key] = void 0;
	} else final.value[key] = result.value;
}
function normalizeDef(def) {
	const keys = Object.keys(def.shape);
	for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
	const okeys = optionalKeys(def.shape);
	return {
		...def,
		keys,
		keySet: new Set(keys),
		numKeys: keys.length,
		optionalKeys: new Set(okeys)
	};
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
	const unrecognized = [];
	const keySet = def.keySet;
	const _catchall = def.catchall._zod;
	const t = _catchall.def.type;
	const isOptionalIn = _catchall.optin === "optional";
	const isOptionalOut = _catchall.optout === "optional";
	for (const key in input) {
		if (key === "__proto__") continue;
		if (keySet.has(key)) continue;
		if (t === "never") {
			unrecognized.push(key);
			continue;
		}
		const r = _catchall.run({
			value: input[key],
			issues: []
		}, ctx);
		if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
		else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
	}
	if (unrecognized.length) payload.issues.push({
		code: "unrecognized_keys",
		keys: unrecognized,
		input,
		inst
	});
	if (!proms.length) return payload;
	return Promise.all(proms).then(() => {
		return payload;
	});
}
var $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
	$ZodType.init(inst, def);
	if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
		const sh = def.shape;
		Object.defineProperty(def, "shape", { get: () => {
			const newSh = { ...sh };
			Object.defineProperty(def, "shape", { value: newSh });
			return newSh;
		} });
	}
	const _normalized = cached(() => normalizeDef(def));
	defineLazy(inst._zod, "propValues", () => {
		const shape = def.shape;
		const propValues = {};
		for (const key in shape) {
			const field = shape[key]._zod;
			if (field.values) {
				propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
				for (const v of field.values) propValues[key].add(v);
			}
		}
		return propValues;
	});
	const isObject$3 = isObject;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$3(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = {};
		const proms = [];
		const shape = value.shape;
		for (const key of value.keys) {
			const el = shape[key];
			const isOptionalIn = el._zod.optin === "optional";
			const isOptionalOut = el._zod.optout === "optional";
			const r = el._zod.run({
				value: input[key],
				issues: []
			}, ctx);
			if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
			else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
		}
		if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
		return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
	};
});
var $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
	$ZodObject.init(inst, def);
	const superParse = inst._zod.parse;
	const _normalized = cached(() => normalizeDef(def));
	const generateFastpass = (shape) => {
		const doc = new Doc([
			"shape",
			"payload",
			"ctx"
		]);
		const normalized = _normalized.value;
		const parseStr = (key) => {
			const k = esc(key);
			return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
		};
		doc.write(`const input = payload.value;`);
		const ids = Object.create(null);
		let counter = 0;
		for (const key of normalized.keys) ids[key] = `key_${counter++}`;
		doc.write(`const newResult = {};`);
		for (const key of normalized.keys) {
			const id = ids[key];
			const k = esc(key);
			const schema = shape[key];
			const isOptionalIn = schema?._zod?.optin === "optional";
			const isOptionalOut = schema?._zod?.optout === "optional";
			doc.write(`const ${id} = ${parseStr(key)};`);
			if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
			else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
			else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
		}
		doc.write(`payload.value = newResult;`);
		doc.write(`return payload;`);
		const fn = doc.compile();
		return (payload, ctx) => fn(shape, payload, ctx);
	};
	let fastpass;
	const isObject$2 = isObject;
	const jit = !globalConfig.jitless;
	const fastEnabled = jit && allowsEval.value;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$2(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
			if (!fastpass) fastpass = generateFastpass(def.shape);
			payload = fastpass(payload, ctx);
			if (!catchall) return payload;
			return handleCatchall([], input, payload, ctx, value, inst);
		}
		return superParse(payload, ctx);
	};
});
function handleUnionResults(results, final, inst, ctx) {
	for (const result of results) if (result.issues.length === 0) {
		final.value = result.value;
		return final;
	}
	const nonaborted = results.filter((r) => !aborted(r));
	if (nonaborted.length === 1) {
		final.value = nonaborted[0].value;
		return nonaborted[0];
	}
	final.issues.push({
		code: "invalid_union",
		input: final.value,
		inst,
		errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	});
	return final;
}
var $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "values", () => {
		if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
	});
	defineLazy(inst._zod, "pattern", () => {
		if (def.options.every((o) => o._zod.pattern)) {
			const patterns = def.options.map((o) => o._zod.pattern);
			return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
		}
	});
	const first = def.options.length === 1 ? def.options[0]._zod.run : null;
	inst._zod.parse = (payload, ctx) => {
		if (first) return first(payload, ctx);
		let async = false;
		const results = [];
		for (const option of def.options) {
			const result = option._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) {
				results.push(result);
				async = true;
			} else {
				if (result.issues.length === 0) return result;
				results.push(result);
			}
		}
		if (!async) return handleUnionResults(results, payload, inst, ctx);
		return Promise.all(results).then((results) => {
			return handleUnionResults(results, payload, inst, ctx);
		});
	};
});
var $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		const left = def.left._zod.run({
			value: input,
			issues: []
		}, ctx);
		const right = def.right._zod.run({
			value: input,
			issues: []
		}, ctx);
		if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
			return handleIntersectionResults(payload, left, right);
		});
		return handleIntersectionResults(payload, left, right);
	};
});
function mergeValues(a, b) {
	if (a === b) return {
		valid: true,
		data: a
	};
	if (a instanceof Date && b instanceof Date && +a === +b) return {
		valid: true,
		data: a
	};
	if (isPlainObject(a) && isPlainObject(b)) {
		const bKeys = Object.keys(b);
		const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
		const newObj = {
			...a,
			...b
		};
		for (const key of sharedKeys) {
			const sharedValue = mergeValues(a[key], b[key]);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
			};
			newObj[key] = sharedValue.data;
		}
		return {
			valid: true,
			data: newObj
		};
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return {
			valid: false,
			mergeErrorPath: []
		};
		const newArray = [];
		for (let index = 0; index < a.length; index++) {
			const itemA = a[index];
			const itemB = b[index];
			const sharedValue = mergeValues(itemA, itemB);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
			};
			newArray.push(sharedValue.data);
		}
		return {
			valid: true,
			data: newArray
		};
	}
	return {
		valid: false,
		mergeErrorPath: []
	};
}
function handleIntersectionResults(result, left, right) {
	const unrecKeys = /* @__PURE__ */ new Map();
	let unrecIssue;
	for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
		unrecIssue ?? (unrecIssue = iss);
		for (const k of iss.keys) {
			if (!unrecKeys.has(k)) unrecKeys.set(k, {});
			unrecKeys.get(k).l = true;
		}
	} else result.issues.push(iss);
	for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
		if (!unrecKeys.has(k)) unrecKeys.set(k, {});
		unrecKeys.get(k).r = true;
	}
	else result.issues.push(iss);
	const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
	if (bothKeys.length && unrecIssue) result.issues.push({
		...unrecIssue,
		keys: bothKeys
	});
	if (aborted(result)) return result;
	const merged = mergeValues(left.value, right.value);
	if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
	result.value = merged.data;
	return result;
}
var $ZodRecord = /*@__PURE__*/ $constructor("$ZodRecord", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!isPlainObject(input)) {
			payload.issues.push({
				expected: "record",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		const proms = [];
		const values = def.keyType._zod.values;
		if (values) {
			payload.value = {};
			const recordKeys = /* @__PURE__ */ new Set();
			for (const key of values) if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
				recordKeys.add(typeof key === "number" ? key.toString() : key);
				const keyResult = def.keyType._zod.run({
					value: key,
					issues: []
				}, ctx);
				if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
				if (keyResult.issues.length) {
					payload.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
						input: key,
						path: [key],
						inst
					});
					continue;
				}
				const outKey = keyResult.value;
				const result = def.valueType._zod.run({
					value: input[key],
					issues: []
				}, ctx);
				if (result instanceof Promise) proms.push(result.then((result) => {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[outKey] = result.value;
				}));
				else {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[outKey] = result.value;
				}
			}
			let unrecognized;
			for (const key in input) if (!recordKeys.has(key)) {
				unrecognized = unrecognized ?? [];
				unrecognized.push(key);
			}
			if (unrecognized && unrecognized.length > 0) payload.issues.push({
				code: "unrecognized_keys",
				input,
				inst,
				keys: unrecognized
			});
		} else {
			payload.value = {};
			for (const key of Reflect.ownKeys(input)) {
				if (key === "__proto__") continue;
				if (!Object.prototype.propertyIsEnumerable.call(input, key)) continue;
				let keyResult = def.keyType._zod.run({
					value: key,
					issues: []
				}, ctx);
				if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
				if (typeof key === "string" && number$1.test(key) && keyResult.issues.length) {
					const retryResult = def.keyType._zod.run({
						value: Number(key),
						issues: []
					}, ctx);
					if (retryResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
					if (retryResult.issues.length === 0) keyResult = retryResult;
				}
				if (keyResult.issues.length) {
					if (def.mode === "loose") payload.value[key] = input[key];
					else payload.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
						input: key,
						path: [key],
						inst
					});
					continue;
				}
				const result = def.valueType._zod.run({
					value: input[key],
					issues: []
				}, ctx);
				if (result instanceof Promise) proms.push(result.then((result) => {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[keyResult.value] = result.value;
				}));
				else {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[keyResult.value] = result.value;
				}
			}
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
var $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
	$ZodType.init(inst, def);
	const values = getEnumValues(def.entries);
	const valuesSet = new Set(values);
	inst._zod.values = valuesSet;
	inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (valuesSet.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values,
			input,
			inst
		});
		return payload;
	};
});
var $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
	$ZodType.init(inst, def);
	if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
	const values = new Set(def.values);
	inst._zod.values = values;
	inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (values.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values: def.values,
			input,
			inst
		});
		return payload;
	};
});
var $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		const _out = def.transform(payload.value, payload);
		if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
			payload.value = output;
			payload.fallback = true;
			return payload;
		});
		if (_out instanceof Promise) throw new $ZodAsyncError();
		payload.value = _out;
		payload.fallback = true;
		return payload;
	};
});
function handleOptionalResult(result, input) {
	if (input === void 0 && (result.issues.length || result.fallback)) return {
		issues: [],
		value: void 0
	};
	return result;
}
var $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	inst._zod.optout = "optional";
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
	});
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (def.innerType._zod.optin === "optional") {
			const input = payload.value;
			const result = def.innerType._zod.run(payload, ctx);
			if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
			return handleOptionalResult(result, input);
		}
		if (payload.value === void 0) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
var $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
	inst._zod.parse = (payload, ctx) => {
		return def.innerType._zod.run(payload, ctx);
	};
});
var $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
	});
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === null) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
var $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) {
			payload.value = def.defaultValue;
			/**
			* $ZodDefault returns the default value immediately in forward direction.
			* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
			return payload;
		}
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
		return handleDefaultResult(result, def);
	};
});
function handleDefaultResult(payload, def) {
	if (payload.value === void 0) payload.value = def.defaultValue;
	return payload;
}
var $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) payload.value = def.defaultValue;
		return def.innerType._zod.run(payload, ctx);
	};
});
var $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => {
		const v = def.innerType._zod.values;
		return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
		return handleNonOptionalResult(result, inst);
	};
});
function handleNonOptionalResult(payload, inst) {
	if (!payload.issues.length && payload.value === void 0) payload.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: payload.value,
		inst
	});
	return payload;
}
var $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => {
			payload.value = result.value;
			if (result.issues.length) {
				payload.value = def.catchValue({
					...payload,
					error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
					input: payload.value
				});
				payload.issues = [];
				payload.fallback = true;
			}
			return payload;
		});
		payload.value = result.value;
		if (result.issues.length) {
			payload.value = def.catchValue({
				...payload,
				error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
				input: payload.value
			});
			payload.issues = [];
			payload.fallback = true;
		}
		return payload;
	};
});
var $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => def.in._zod.values);
	defineLazy(inst._zod, "optin", () => def.in._zod.optin);
	defineLazy(inst._zod, "optout", () => def.out._zod.optout);
	defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") {
			const right = def.out._zod.run(payload, ctx);
			if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
			return handlePipeResult(right, def.in, ctx);
		}
		const left = def.in._zod.run(payload, ctx);
		if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
		return handlePipeResult(left, def.out, ctx);
	};
});
function handlePipeResult(left, next, ctx) {
	if (left.issues.length) {
		left.aborted = true;
		return left;
	}
	return next._zod.run({
		value: left.value,
		issues: left.issues,
		fallback: left.fallback
	}, ctx);
}
var $ZodCodec = /*@__PURE__*/ $constructor("$ZodCodec", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => def.in._zod.values);
	defineLazy(inst._zod, "optin", () => def.in._zod.optin);
	defineLazy(inst._zod, "optout", () => def.out._zod.optout);
	defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
	inst._zod.parse = (payload, ctx) => {
		if ((ctx.direction || "forward") === "forward") {
			const left = def.in._zod.run(payload, ctx);
			if (left instanceof Promise) return left.then((left) => handleCodecAResult(left, def, ctx));
			return handleCodecAResult(left, def, ctx);
		} else {
			const right = def.out._zod.run(payload, ctx);
			if (right instanceof Promise) return right.then((right) => handleCodecAResult(right, def, ctx));
			return handleCodecAResult(right, def, ctx);
		}
	};
});
function handleCodecAResult(result, def, ctx) {
	if (result.issues.length) {
		result.aborted = true;
		return result;
	}
	if ((ctx.direction || "forward") === "forward") {
		const transformed = def.transform(result.value, result);
		if (transformed instanceof Promise) return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
		return handleCodecTxResult(result, transformed, def.out, ctx);
	} else {
		const transformed = def.reverseTransform(result.value, result);
		if (transformed instanceof Promise) return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
		return handleCodecTxResult(result, transformed, def.in, ctx);
	}
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
	if (left.issues.length) {
		left.aborted = true;
		return left;
	}
	return nextSchema._zod.run({
		value,
		issues: left.issues
	}, ctx);
}
var $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
	defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then(handleReadonlyResult);
		return handleReadonlyResult(result);
	};
});
function handleReadonlyResult(payload) {
	payload.value = Object.freeze(payload.value);
	return payload;
}
var $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
	$ZodCheck.init(inst, def);
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _) => {
		return payload;
	};
	inst._zod.check = (payload) => {
		const input = payload.value;
		const r = def.fn(input);
		if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
		handleRefineResult(r, payload, input, inst);
	};
});
function handleRefineResult(result, payload, input, inst) {
	if (!result) {
		const _iss = {
			code: "custom",
			input,
			inst,
			path: [...inst._zod.def.path ?? []],
			continue: !inst._zod.def.abort
		};
		if (inst._zod.def.params) _iss.params = inst._zod.def.params;
		payload.issues.push(issue(_iss));
	}
}
//#endregion
//#region node_modules/zod/v4/core/registries.js
var _a;
var $ZodRegistry = class {
	constructor() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
	}
	add(schema, ..._meta) {
		const meta = _meta[0];
		this._map.set(schema, meta);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
		return this;
	}
	clear() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
		return this;
	}
	remove(schema) {
		const meta = this._map.get(schema);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
		this._map.delete(schema);
		return this;
	}
	get(schema) {
		const p = schema._zod.parent;
		if (p) {
			const pm = { ...this.get(p) ?? {} };
			delete pm.id;
			const f = {
				...pm,
				...this._map.get(schema)
			};
			return Object.keys(f).length ? f : void 0;
		}
		return this._map.get(schema);
	}
	has(schema) {
		return this._map.has(schema);
	}
};
function registry() {
	return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
var globalRegistry = globalThis.__zod_globalRegistry;
//#endregion
//#region node_modules/zod/v4/core/api.js
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
	return new Class({
		type: "string",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
	return new Class({
		type: "string",
		format: "email",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
	return new Class({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v4",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v6",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v7",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
	return new Class({
		type: "string",
		format: "url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
	return new Class({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
	return new Class({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link _cuid2} instead.
* See https://github.com/paralleldrive/cuid.
*/
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
	return new Class({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
	return new Class({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
	return new Class({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
	return new Class({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
	return new Class({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
	return new Class({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
	return new Class({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
	return new Class({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
	return new Class({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
	return new Class({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
	return new Class({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
	return new Class({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: false,
		local: false,
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
	return new Class({
		type: "string",
		format: "date",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
	return new Class({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
	return new Class({
		type: "string",
		format: "duration",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
	return new Class({
		type: "number",
		checks: [],
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
	return new Class({
		type: "number",
		check: "number_format",
		abort: false,
		format: "safeint",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
	return new Class({
		type: "boolean",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _null$1(Class, params) {
	return new Class({
		type: "null",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
	return new Class({ type: "unknown" });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
	return new Class({
		type: "never",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
	return new $ZodCheckMultipleOf({
		check: "multiple_of",
		...normalizeParams(params),
		value
	});
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
	return new $ZodCheckMaxLength({
		check: "max_length",
		...normalizeParams(params),
		maximum
	});
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
	return new $ZodCheckMinLength({
		check: "min_length",
		...normalizeParams(params),
		minimum
	});
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
	return new $ZodCheckLengthEquals({
		check: "length_equals",
		...normalizeParams(params),
		length
	});
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
	return new $ZodCheckRegex({
		check: "string_format",
		format: "regex",
		...normalizeParams(params),
		pattern
	});
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
	return new $ZodCheckLowerCase({
		check: "string_format",
		format: "lowercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
	return new $ZodCheckUpperCase({
		check: "string_format",
		format: "uppercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
	return new $ZodCheckIncludes({
		check: "string_format",
		format: "includes",
		...normalizeParams(params),
		includes
	});
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
	return new $ZodCheckStartsWith({
		check: "string_format",
		format: "starts_with",
		...normalizeParams(params),
		prefix
	});
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
	return new $ZodCheckEndsWith({
		check: "string_format",
		format: "ends_with",
		...normalizeParams(params),
		suffix
	});
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
	return new $ZodCheckOverwrite({
		check: "overwrite",
		tx
	});
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
	return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
	return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
	return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
	return new Class({
		type: "array",
		element,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
	return new Class({
		type: "custom",
		check: "custom",
		fn,
		...normalizeParams(_params)
	});
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
	const ch = /* @__PURE__ */ _check((payload) => {
		payload.addIssue = (issue$2) => {
			if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
			else {
				const _issue = issue$2;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = ch);
				_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
				payload.issues.push(issue(_issue));
			}
		};
		return fn(payload.value, payload);
	}, params);
	return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
	const ch = new $ZodCheck({
		check: "custom",
		...normalizeParams(params)
	});
	ch._zod.check = fn;
	return ch;
}
// @__NO_SIDE_EFFECTS__
function _stringbool(Classes, _params) {
	const params = normalizeParams(_params);
	let truthyArray = params.truthy ?? [
		"true",
		"1",
		"yes",
		"on",
		"y",
		"enabled"
	];
	let falsyArray = params.falsy ?? [
		"false",
		"0",
		"no",
		"off",
		"n",
		"disabled"
	];
	if (params.case !== "sensitive") {
		truthyArray = truthyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
		falsyArray = falsyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
	}
	const truthySet = new Set(truthyArray);
	const falsySet = new Set(falsyArray);
	const _Codec = Classes.Codec ?? $ZodCodec;
	const _Boolean = Classes.Boolean ?? $ZodBoolean;
	const codec = new _Codec({
		type: "pipe",
		in: new (Classes.String ?? $ZodString)({
			type: "string",
			error: params.error
		}),
		out: new _Boolean({
			type: "boolean",
			error: params.error
		}),
		transform: ((input, payload) => {
			let data = input;
			if (params.case !== "sensitive") data = data.toLowerCase();
			if (truthySet.has(data)) return true;
			else if (falsySet.has(data)) return false;
			else {
				payload.issues.push({
					code: "invalid_value",
					expected: "stringbool",
					values: [...truthySet, ...falsySet],
					input: payload.value,
					inst: codec,
					continue: false
				});
				return {};
			}
		}),
		reverseTransform: ((input, _payload) => {
			if (input === true) return truthyArray[0] || "true";
			else return falsyArray[0] || "false";
		}),
		error: params.error
	});
	return codec;
}
//#endregion
//#region node_modules/zod/v4/core/to-json-schema.js
function initializeContext(params) {
	let target = params?.target ?? "draft-2020-12";
	if (target === "draft-4") target = "draft-04";
	if (target === "draft-7") target = "draft-07";
	return {
		processors: params.processors ?? {},
		metadataRegistry: params?.metadata ?? globalRegistry,
		target,
		unrepresentable: params?.unrepresentable ?? "throw",
		override: params?.override ?? (() => {}),
		io: params?.io ?? "output",
		counter: 0,
		seen: /* @__PURE__ */ new Map(),
		cycles: params?.cycles ?? "ref",
		reused: params?.reused ?? "inline",
		external: params?.external ?? void 0
	};
}
function process$2(schema, ctx, _params = {
	path: [],
	schemaPath: []
}) {
	var _a;
	const def = schema._zod.def;
	const seen = ctx.seen.get(schema);
	if (seen) {
		seen.count++;
		if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
		return seen.schema;
	}
	const result = {
		schema: {},
		count: 1,
		cycle: void 0,
		path: _params.path
	};
	ctx.seen.set(schema, result);
	const overrideSchema = schema._zod.toJSONSchema?.();
	if (overrideSchema) result.schema = overrideSchema;
	else {
		const params = {
			..._params,
			schemaPath: [..._params.schemaPath, schema],
			path: _params.path
		};
		if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
		else {
			const _json = result.schema;
			const processor = ctx.processors[def.type];
			if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
			processor(schema, ctx, _json, params);
		}
		const parent = schema._zod.parent;
		if (parent) {
			if (!result.ref) result.ref = parent;
			process$2(parent, ctx, params);
			ctx.seen.get(parent).isParent = true;
		}
	}
	const meta = ctx.metadataRegistry.get(schema);
	if (meta) Object.assign(result.schema, meta);
	if (ctx.io === "input" && isTransforming(schema)) {
		delete result.schema.examples;
		delete result.schema.default;
	}
	if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
	delete result.schema._prefault;
	return ctx.seen.get(schema).schema;
}
function extractDefs(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	const idToSchema = /* @__PURE__ */ new Map();
	for (const entry of ctx.seen.entries()) {
		const id = ctx.metadataRegistry.get(entry[0])?.id;
		if (id) {
			const existing = idToSchema.get(id);
			if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
			idToSchema.set(id, entry[0]);
		}
	}
	const makeURI = (entry) => {
		const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
		if (ctx.external) {
			const externalId = ctx.external.registry.get(entry[0])?.id;
			const uriGenerator = ctx.external.uri ?? ((id) => id);
			if (externalId) return { ref: uriGenerator(externalId) };
			const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
			entry[1].defId = id;
			return {
				defId: id,
				ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
			};
		}
		if (entry[1] === root) return { ref: "#" };
		const defUriPrefix = `#/${defsSegment}/`;
		const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
		return {
			defId,
			ref: defUriPrefix + defId
		};
	};
	const extractToDef = (entry) => {
		if (entry[1].schema.$ref) return;
		const seen = entry[1];
		const { ref, defId } = makeURI(entry);
		seen.def = { ...seen.schema };
		if (defId) seen.defId = defId;
		const schema = seen.schema;
		for (const key in schema) delete schema[key];
		schema.$ref = ref;
	};
	if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
	}
	for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (schema === entry[0]) {
			extractToDef(entry);
			continue;
		}
		if (ctx.external) {
			const ext = ctx.external.registry.get(entry[0])?.id;
			if (schema !== entry[0] && ext) {
				extractToDef(entry);
				continue;
			}
		}
		if (ctx.metadataRegistry.get(entry[0])?.id) {
			extractToDef(entry);
			continue;
		}
		if (seen.cycle) {
			extractToDef(entry);
			continue;
		}
		if (seen.count > 1) {
			if (ctx.reused === "ref") {
				extractToDef(entry);
				continue;
			}
		}
	}
}
function finalize(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	const flattenRef = (zodSchema) => {
		const seen = ctx.seen.get(zodSchema);
		if (seen.ref === null) return;
		const schema = seen.def ?? seen.schema;
		const _cached = { ...schema };
		const ref = seen.ref;
		seen.ref = null;
		if (ref) {
			flattenRef(ref);
			const refSeen = ctx.seen.get(ref);
			const refSchema = refSeen.schema;
			if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
				schema.allOf = schema.allOf ?? [];
				schema.allOf.push(refSchema);
			} else Object.assign(schema, refSchema);
			Object.assign(schema, _cached);
			if (zodSchema._zod.parent === ref) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (!(key in _cached)) delete schema[key];
			}
			if (refSchema.$ref && refSeen.def) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
			}
		}
		const parent = zodSchema._zod.parent;
		if (parent && parent !== ref) {
			flattenRef(parent);
			const parentSeen = ctx.seen.get(parent);
			if (parentSeen?.schema.$ref) {
				schema.$ref = parentSeen.schema.$ref;
				if (parentSeen.def) for (const key in schema) {
					if (key === "$ref" || key === "allOf") continue;
					if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
				}
			}
		}
		ctx.override({
			zodSchema,
			jsonSchema: schema,
			path: seen.path ?? []
		});
	};
	for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
	const result = {};
	if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
	else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
	else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
	else if (ctx.target === "openapi-3.0") {}
	if (ctx.external?.uri) {
		const id = ctx.external.registry.get(schema)?.id;
		if (!id) throw new Error("Schema is missing an `id` property");
		result.$id = ctx.external.uri(id);
	}
	Object.assign(result, root.def ?? root.schema);
	const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
	if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
	const defs = ctx.external?.defs ?? {};
	for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.def && seen.defId) {
			if (seen.def.id === seen.defId) delete seen.def.id;
			defs[seen.defId] = seen.def;
		}
	}
	if (ctx.external) {} else if (Object.keys(defs).length > 0) if (ctx.target === "draft-2020-12") result.$defs = defs;
	else result.definitions = defs;
	try {
		const finalized = JSON.parse(JSON.stringify(result));
		Object.defineProperty(finalized, "~standard", {
			value: {
				...schema["~standard"],
				jsonSchema: {
					input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
					output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
				}
			},
			enumerable: false,
			writable: false
		});
		return finalized;
	} catch (_err) {
		throw new Error("Error converting schema to JSON.");
	}
}
function isTransforming(_schema, _ctx) {
	const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
	if (ctx.seen.has(_schema)) return false;
	ctx.seen.add(_schema);
	const def = _schema._zod.def;
	if (def.type === "transform") return true;
	if (def.type === "array") return isTransforming(def.element, ctx);
	if (def.type === "set") return isTransforming(def.valueType, ctx);
	if (def.type === "lazy") return isTransforming(def.getter(), ctx);
	if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
	if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
	if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
	if (def.type === "pipe") {
		if (_schema._zod.traits.has("$ZodCodec")) return true;
		return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
	}
	if (def.type === "object") {
		for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
		return false;
	}
	if (def.type === "union") {
		for (const option of def.options) if (isTransforming(option, ctx)) return true;
		return false;
	}
	if (def.type === "tuple") {
		for (const item of def.items) if (isTransforming(item, ctx)) return true;
		if (def.rest && isTransforming(def.rest, ctx)) return true;
		return false;
	}
	return false;
}
/**
* Creates a toJSONSchema method for a schema instance.
* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
*/
var createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
	const ctx = initializeContext({
		...params,
		processors
	});
	process$2(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};
var createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
	const { libraryOptions, target } = params ?? {};
	const ctx = initializeContext({
		...libraryOptions ?? {},
		target,
		io,
		processors
	});
	process$2(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};
//#endregion
//#region node_modules/zod/v4/core/json-schema-processors.js
var formatMap = {
	guid: "uuid",
	url: "uri",
	datetime: "date-time",
	json_string: "json-string",
	regex: ""
};
var stringProcessor = (schema, ctx, _json, _params) => {
	const json = _json;
	json.type = "string";
	const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
	if (typeof minimum === "number") json.minLength = minimum;
	if (typeof maximum === "number") json.maxLength = maximum;
	if (format) {
		json.format = formatMap[format] ?? format;
		if (json.format === "") delete json.format;
		if (format === "time") delete json.format;
	}
	if (contentEncoding) json.contentEncoding = contentEncoding;
	if (patterns && patterns.size > 0) {
		const regexes = [...patterns];
		if (regexes.length === 1) json.pattern = regexes[0].source;
		else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
			...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
			pattern: regex.source
		}))];
	}
};
var numberProcessor = (schema, ctx, _json, _params) => {
	const json = _json;
	const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
	if (typeof format === "string" && format.includes("int")) json.type = "integer";
	else json.type = "number";
	const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
	const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
	const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
	if (exMin) if (legacy) {
		json.minimum = exclusiveMinimum;
		json.exclusiveMinimum = true;
	} else json.exclusiveMinimum = exclusiveMinimum;
	else if (typeof minimum === "number") json.minimum = minimum;
	if (exMax) if (legacy) {
		json.maximum = exclusiveMaximum;
		json.exclusiveMaximum = true;
	} else json.exclusiveMaximum = exclusiveMaximum;
	else if (typeof maximum === "number") json.maximum = maximum;
	if (typeof multipleOf === "number") json.multipleOf = multipleOf;
};
var booleanProcessor = (_schema, _ctx, json, _params) => {
	json.type = "boolean";
};
var nullProcessor = (_schema, ctx, json, _params) => {
	if (ctx.target === "openapi-3.0") {
		json.type = "string";
		json.nullable = true;
		json.enum = [null];
	} else json.type = "null";
};
var neverProcessor = (_schema, _ctx, json, _params) => {
	json.not = {};
};
var enumProcessor = (schema, _ctx, json, _params) => {
	const def = schema._zod.def;
	const values = getEnumValues(def.entries);
	if (values.every((v) => typeof v === "number")) json.type = "number";
	if (values.every((v) => typeof v === "string")) json.type = "string";
	json.enum = values;
};
var literalProcessor = (schema, ctx, json, _params) => {
	const def = schema._zod.def;
	const vals = [];
	for (const val of def.values) if (val === void 0) {
		if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
	} else if (typeof val === "bigint") if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
	else vals.push(Number(val));
	else vals.push(val);
	if (vals.length === 0) {} else if (vals.length === 1) {
		const val = vals[0];
		json.type = val === null ? "null" : typeof val;
		if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
		else json.const = val;
	} else {
		if (vals.every((v) => typeof v === "number")) json.type = "number";
		if (vals.every((v) => typeof v === "string")) json.type = "string";
		if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
		if (vals.every((v) => v === null)) json.type = "null";
		json.enum = vals;
	}
};
var customProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
};
var transformProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
};
var arrayProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	const { minimum, maximum } = schema._zod.bag;
	if (typeof minimum === "number") json.minItems = minimum;
	if (typeof maximum === "number") json.maxItems = maximum;
	json.type = "array";
	json.items = process$2(def.element, ctx, {
		...params,
		path: [...params.path, "items"]
	});
};
var objectProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	json.type = "object";
	json.properties = {};
	const shape = def.shape;
	for (const key in shape) json.properties[key] = process$2(shape[key], ctx, {
		...params,
		path: [
			...params.path,
			"properties",
			key
		]
	});
	const allKeys = new Set(Object.keys(shape));
	const requiredKeys = new Set([...allKeys].filter((key) => {
		const v = def.shape[key]._zod;
		if (ctx.io === "input") return v.optin === void 0;
		else return v.optout === void 0;
	}));
	if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
	if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
	else if (!def.catchall) {
		if (ctx.io === "output") json.additionalProperties = false;
	} else if (def.catchall) json.additionalProperties = process$2(def.catchall, ctx, {
		...params,
		path: [...params.path, "additionalProperties"]
	});
};
var unionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const isExclusive = def.inclusive === false;
	const options = def.options.map((x, i) => process$2(x, ctx, {
		...params,
		path: [
			...params.path,
			isExclusive ? "oneOf" : "anyOf",
			i
		]
	}));
	if (isExclusive) json.oneOf = options;
	else json.anyOf = options;
};
var intersectionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const a = process$2(def.left, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			0
		]
	});
	const b = process$2(def.right, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			1
		]
	});
	const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
	json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
};
var recordProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	json.type = "object";
	const keyType = def.keyType;
	const patterns = keyType._zod.bag?.patterns;
	if (def.mode === "loose" && patterns && patterns.size > 0) {
		const valueSchema = process$2(def.valueType, ctx, {
			...params,
			path: [
				...params.path,
				"patternProperties",
				"*"
			]
		});
		json.patternProperties = {};
		for (const pattern of patterns) json.patternProperties[pattern.source] = valueSchema;
	} else {
		if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") json.propertyNames = process$2(def.keyType, ctx, {
			...params,
			path: [...params.path, "propertyNames"]
		});
		json.additionalProperties = process$2(def.valueType, ctx, {
			...params,
			path: [...params.path, "additionalProperties"]
		});
	}
	const keyValues = keyType._zod.values;
	if (keyValues) {
		const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
		if (validKeyValues.length > 0) json.required = validKeyValues;
	}
};
var nullableProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const inner = process$2(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	if (ctx.target === "openapi-3.0") {
		seen.ref = def.innerType;
		json.nullable = true;
	} else json.anyOf = [inner, { type: "null" }];
};
var nonoptionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	process$2(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
var defaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process$2(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	json.default = JSON.parse(JSON.stringify(def.defaultValue));
};
var prefaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process$2(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
var catchProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process$2(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	let catchValue;
	try {
		catchValue = def.catchValue(void 0);
	} catch {
		throw new Error("Dynamic catch values are not supported in JSON Schema");
	}
	json.default = catchValue;
};
var pipeProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	const inIsTransform = def.in._zod.traits.has("$ZodTransform");
	const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
	process$2(innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = innerType;
};
var readonlyProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process$2(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	json.readOnly = true;
};
var optionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	process$2(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
//#endregion
//#region node_modules/zod/v4/classic/iso.js
var ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
	$ZodISODateTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function datetime(params) {
	return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
}
var ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
	$ZodISODate.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function date(params) {
	return /* @__PURE__ */ _isoDate(ZodISODate, params);
}
var ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
	$ZodISOTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function time(params) {
	return /* @__PURE__ */ _isoTime(ZodISOTime, params);
}
var ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
	$ZodISODuration.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function duration(params) {
	return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
}
//#endregion
//#region node_modules/zod/v4/classic/errors.js
var initializer = (inst, issues) => {
	$ZodError.init(inst, issues);
	inst.name = "ZodError";
	Object.defineProperties(inst, {
		format: { value: (mapper) => formatError(inst, mapper) },
		flatten: { value: (mapper) => flattenError(inst, mapper) },
		addIssue: { value: (issue) => {
			inst.issues.push(issue);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		addIssues: { value: (issues) => {
			inst.issues.push(...issues);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		isEmpty: { get() {
			return inst.issues.length === 0;
		} }
	});
};
var ZodError = /*@__PURE__*/ $constructor("ZodError", initializer);
var ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });
//#endregion
//#region node_modules/zod/v4/classic/parse.js
var parse$1 = /* @__PURE__ */ _parse(ZodRealError);
var parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
var safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
var safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
var encode = /* @__PURE__ */ _encode(ZodRealError);
var decode = /* @__PURE__ */ _decode(ZodRealError);
var encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
var decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
var safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
var safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
//#endregion
//#region node_modules/zod/v4/classic/schemas.js
var _installedGroups = /* @__PURE__ */ new WeakMap();
function _installLazyMethods(inst, group, methods) {
	const proto = Object.getPrototypeOf(inst);
	let installed = _installedGroups.get(proto);
	if (!installed) {
		installed = /* @__PURE__ */ new Set();
		_installedGroups.set(proto, installed);
	}
	if (installed.has(group)) return;
	installed.add(group);
	for (const key in methods) {
		const fn = methods[key];
		Object.defineProperty(proto, key, {
			configurable: true,
			enumerable: false,
			get() {
				const bound = fn.bind(this);
				Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					enumerable: true,
					value: bound
				});
				return bound;
			},
			set(v) {
				Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					enumerable: true,
					value: v
				});
			}
		});
	}
}
var ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
	$ZodType.init(inst, def);
	Object.assign(inst["~standard"], { jsonSchema: {
		input: createStandardJSONSchemaMethod(inst, "input"),
		output: createStandardJSONSchemaMethod(inst, "output")
	} });
	inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
	inst.def = def;
	inst.type = def.type;
	Object.defineProperty(inst, "_def", { value: def });
	inst.parse = (data, params) => parse$1(inst, data, params, { callee: inst.parse });
	inst.safeParse = (data, params) => safeParse(inst, data, params);
	inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
	inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
	inst.spa = inst.safeParseAsync;
	inst.encode = (data, params) => encode(inst, data, params);
	inst.decode = (data, params) => decode(inst, data, params);
	inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
	inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
	inst.safeEncode = (data, params) => safeEncode(inst, data, params);
	inst.safeDecode = (data, params) => safeDecode(inst, data, params);
	inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
	inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
	_installLazyMethods(inst, "ZodType", {
		check(...chks) {
			const def = this.def;
			return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
				check: ch,
				def: { check: "custom" },
				onattach: []
			} } : ch)] }), { parent: true });
		},
		with(...chks) {
			return this.check(...chks);
		},
		clone(def, params) {
			return clone(this, def, params);
		},
		brand() {
			return this;
		},
		register(reg, meta) {
			reg.add(this, meta);
			return this;
		},
		refine(check, params) {
			return this.check(refine(check, params));
		},
		superRefine(refinement, params) {
			return this.check(superRefine(refinement, params));
		},
		overwrite(fn) {
			return this.check(/* @__PURE__ */ _overwrite(fn));
		},
		optional() {
			return optional(this);
		},
		exactOptional() {
			return exactOptional(this);
		},
		nullable() {
			return nullable(this);
		},
		nullish() {
			return optional(nullable(this));
		},
		nonoptional(params) {
			return nonoptional(this, params);
		},
		array() {
			return array(this);
		},
		or(arg) {
			return union([this, arg]);
		},
		and(arg) {
			return intersection(this, arg);
		},
		transform(tx) {
			return pipe(this, transform(tx));
		},
		default(d) {
			return _default(this, d);
		},
		prefault(d) {
			return prefault(this, d);
		},
		catch(params) {
			return _catch(this, params);
		},
		pipe(target) {
			return pipe(this, target);
		},
		readonly() {
			return readonly(this);
		},
		describe(description) {
			const cl = this.clone();
			globalRegistry.add(cl, { description });
			return cl;
		},
		meta(...args) {
			if (args.length === 0) return globalRegistry.get(this);
			const cl = this.clone();
			globalRegistry.add(cl, args[0]);
			return cl;
		},
		isOptional() {
			return this.safeParse(void 0).success;
		},
		isNullable() {
			return this.safeParse(null).success;
		},
		apply(fn) {
			return fn(this);
		}
	});
	Object.defineProperty(inst, "description", {
		get() {
			return globalRegistry.get(inst)?.description;
		},
		configurable: true
	});
	return inst;
});
/** @internal */
var _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
	const bag = inst._zod.bag;
	inst.format = bag.format ?? null;
	inst.minLength = bag.minimum ?? null;
	inst.maxLength = bag.maximum ?? null;
	_installLazyMethods(inst, "_ZodString", {
		regex(...args) {
			return this.check(/* @__PURE__ */ _regex(...args));
		},
		includes(...args) {
			return this.check(/* @__PURE__ */ _includes(...args));
		},
		startsWith(...args) {
			return this.check(/* @__PURE__ */ _startsWith(...args));
		},
		endsWith(...args) {
			return this.check(/* @__PURE__ */ _endsWith(...args));
		},
		min(...args) {
			return this.check(/* @__PURE__ */ _minLength(...args));
		},
		max(...args) {
			return this.check(/* @__PURE__ */ _maxLength(...args));
		},
		length(...args) {
			return this.check(/* @__PURE__ */ _length(...args));
		},
		nonempty(...args) {
			return this.check(/* @__PURE__ */ _minLength(1, ...args));
		},
		lowercase(params) {
			return this.check(/* @__PURE__ */ _lowercase(params));
		},
		uppercase(params) {
			return this.check(/* @__PURE__ */ _uppercase(params));
		},
		trim() {
			return this.check(/* @__PURE__ */ _trim());
		},
		normalize(...args) {
			return this.check(/* @__PURE__ */ _normalize(...args));
		},
		toLowerCase() {
			return this.check(/* @__PURE__ */ _toLowerCase());
		},
		toUpperCase() {
			return this.check(/* @__PURE__ */ _toUpperCase());
		},
		slugify() {
			return this.check(/* @__PURE__ */ _slugify());
		}
	});
});
var ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	_ZodString.init(inst, def);
	inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
	inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
	inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
	inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
	inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
	inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
	inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
	inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
	inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
	inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
	inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
	inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
	inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
	inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
	inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
	inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
	inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
	inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
	inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
	inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
	inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
	inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
	inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
	inst.datetime = (params) => inst.check(datetime(params));
	inst.date = (params) => inst.check(date(params));
	inst.time = (params) => inst.check(time(params));
	inst.duration = (params) => inst.check(duration(params));
});
function string(params) {
	return /* @__PURE__ */ _string(ZodString, params);
}
var ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	_ZodString.init(inst, def);
});
var ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
	$ZodEmail.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
	$ZodGUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
	$ZodUUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
	$ZodURL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
	$ZodEmoji.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
	$ZodNanoID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
* See https://github.com/paralleldrive/cuid.
*/
var ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
	$ZodCUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
	$ZodCUID2.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
	$ZodULID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
	$ZodXID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
	$ZodKSUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
	$ZodIPv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
	$ZodIPv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
	$ZodCIDRv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
	$ZodCIDRv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
	$ZodBase64.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
	$ZodBase64URL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
	$ZodE164.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
	$ZodJWT.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
	$ZodNumber.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
	_installLazyMethods(inst, "ZodNumber", {
		gt(value, params) {
			return this.check(/* @__PURE__ */ _gt(value, params));
		},
		gte(value, params) {
			return this.check(/* @__PURE__ */ _gte(value, params));
		},
		min(value, params) {
			return this.check(/* @__PURE__ */ _gte(value, params));
		},
		lt(value, params) {
			return this.check(/* @__PURE__ */ _lt(value, params));
		},
		lte(value, params) {
			return this.check(/* @__PURE__ */ _lte(value, params));
		},
		max(value, params) {
			return this.check(/* @__PURE__ */ _lte(value, params));
		},
		int(params) {
			return this.check(int(params));
		},
		safe(params) {
			return this.check(int(params));
		},
		positive(params) {
			return this.check(/* @__PURE__ */ _gt(0, params));
		},
		nonnegative(params) {
			return this.check(/* @__PURE__ */ _gte(0, params));
		},
		negative(params) {
			return this.check(/* @__PURE__ */ _lt(0, params));
		},
		nonpositive(params) {
			return this.check(/* @__PURE__ */ _lte(0, params));
		},
		multipleOf(value, params) {
			return this.check(/* @__PURE__ */ _multipleOf(value, params));
		},
		step(value, params) {
			return this.check(/* @__PURE__ */ _multipleOf(value, params));
		},
		finite() {
			return this;
		}
	});
	const bag = inst._zod.bag;
	inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
	inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
	inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
	inst.isFinite = true;
	inst.format = bag.format ?? null;
});
function number(params) {
	return /* @__PURE__ */ _number(ZodNumber, params);
}
var ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
	$ZodNumberFormat.init(inst, def);
	ZodNumber.init(inst, def);
});
function int(params) {
	return /* @__PURE__ */ _int(ZodNumberFormat, params);
}
var ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
	$ZodBoolean.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
});
function boolean(params) {
	return /* @__PURE__ */ _boolean(ZodBoolean, params);
}
var ZodNull = /*@__PURE__*/ $constructor("ZodNull", (inst, def) => {
	$ZodNull.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
});
function _null(params) {
	return /* @__PURE__ */ _null$1(ZodNull, params);
}
var ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
	$ZodUnknown.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => void 0;
});
function unknown() {
	return /* @__PURE__ */ _unknown(ZodUnknown);
}
var ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
	$ZodNever.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
	return /* @__PURE__ */ _never(ZodNever, params);
}
var ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
	$ZodArray.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
	inst.element = def.element;
	_installLazyMethods(inst, "ZodArray", {
		min(n, params) {
			return this.check(/* @__PURE__ */ _minLength(n, params));
		},
		nonempty(params) {
			return this.check(/* @__PURE__ */ _minLength(1, params));
		},
		max(n, params) {
			return this.check(/* @__PURE__ */ _maxLength(n, params));
		},
		length(n, params) {
			return this.check(/* @__PURE__ */ _length(n, params));
		},
		unwrap() {
			return this.element;
		}
	});
});
function array(element, params) {
	return /* @__PURE__ */ _array(ZodArray, element, params);
}
var ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
	$ZodObjectJIT.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
	defineLazy(inst, "shape", () => {
		return def.shape;
	});
	_installLazyMethods(inst, "ZodObject", {
		keyof() {
			return _enum(Object.keys(this._zod.def.shape));
		},
		catchall(catchall) {
			return this.clone({
				...this._zod.def,
				catchall
			});
		},
		passthrough() {
			return this.clone({
				...this._zod.def,
				catchall: unknown()
			});
		},
		loose() {
			return this.clone({
				...this._zod.def,
				catchall: unknown()
			});
		},
		strict() {
			return this.clone({
				...this._zod.def,
				catchall: never()
			});
		},
		strip() {
			return this.clone({
				...this._zod.def,
				catchall: void 0
			});
		},
		extend(incoming) {
			return extend(this, incoming);
		},
		safeExtend(incoming) {
			return safeExtend(this, incoming);
		},
		merge(other) {
			return merge(this, other);
		},
		pick(mask) {
			return pick(this, mask);
		},
		omit(mask) {
			return omit(this, mask);
		},
		partial(...args) {
			return partial(ZodOptional, this, args[0]);
		},
		required(...args) {
			return required(ZodNonOptional, this, args[0]);
		}
	});
});
function object(shape, params) {
	return new ZodObject({
		type: "object",
		shape: shape ?? {},
		...normalizeParams(params)
	});
}
function strictObject(shape, params) {
	return new ZodObject({
		type: "object",
		shape,
		catchall: never(),
		...normalizeParams(params)
	});
}
function looseObject(shape, params) {
	return new ZodObject({
		type: "object",
		shape,
		catchall: unknown(),
		...normalizeParams(params)
	});
}
var ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
	$ZodUnion.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
	inst.options = def.options;
});
function union(options, params) {
	return new ZodUnion({
		type: "union",
		options,
		...normalizeParams(params)
	});
}
var ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
	$ZodIntersection.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
	return new ZodIntersection({
		type: "intersection",
		left,
		right
	});
}
var ZodRecord = /*@__PURE__*/ $constructor("ZodRecord", (inst, def) => {
	$ZodRecord.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
	inst.keyType = def.keyType;
	inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
	if (!valueType || !valueType._zod) return new ZodRecord({
		type: "record",
		keyType: string(),
		valueType: keyType,
		...normalizeParams(valueType)
	});
	return new ZodRecord({
		type: "record",
		keyType,
		valueType,
		...normalizeParams(params)
	});
}
var ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
	$ZodEnum.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
	inst.enum = def.entries;
	inst.options = Object.values(def.entries);
	const keys = new Set(Object.keys(def.entries));
	inst.extract = (values, params) => {
		const newEntries = {};
		for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
	inst.exclude = (values, params) => {
		const newEntries = { ...def.entries };
		for (const value of values) if (keys.has(value)) delete newEntries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
});
function _enum(values, params) {
	return new ZodEnum({
		type: "enum",
		entries: Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values,
		...normalizeParams(params)
	});
}
var ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
	$ZodLiteral.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
	inst.values = new Set(def.values);
	Object.defineProperty(inst, "value", { get() {
		if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return def.values[0];
	} });
});
function literal(value, params) {
	return new ZodLiteral({
		type: "literal",
		values: Array.isArray(value) ? value : [value],
		...normalizeParams(params)
	});
}
var ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
	$ZodTransform.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
	inst._zod.parse = (payload, _ctx) => {
		if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		payload.addIssue = (issue$1) => {
			if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
			else {
				const _issue = issue$1;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = inst);
				payload.issues.push(issue(_issue));
			}
		};
		const output = def.transform(payload.value, payload);
		if (output instanceof Promise) return output.then((output) => {
			payload.value = output;
			payload.fallback = true;
			return payload;
		});
		payload.value = output;
		payload.fallback = true;
		return payload;
	};
});
function transform(fn) {
	return new ZodTransform({
		type: "transform",
		transform: fn
	});
}
var ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
	return new ZodOptional({
		type: "optional",
		innerType
	});
}
var ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
	$ZodExactOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
	return new ZodExactOptional({
		type: "optional",
		innerType
	});
}
var ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
	$ZodNullable.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
	return new ZodNullable({
		type: "nullable",
		innerType
	});
}
var ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
	$ZodDefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
	return new ZodDefault({
		type: "default",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
var ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
	$ZodPrefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
	return new ZodPrefault({
		type: "prefault",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
var ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
	$ZodNonOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
	return new ZodNonOptional({
		type: "nonoptional",
		innerType,
		...normalizeParams(params)
	});
}
var ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
	$ZodCatch.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
	return new ZodCatch({
		type: "catch",
		innerType,
		catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
	});
}
var ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
	$ZodPipe.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
	inst.in = def.in;
	inst.out = def.out;
});
function pipe(in_, out) {
	return new ZodPipe({
		type: "pipe",
		in: in_,
		out
	});
}
var ZodCodec = /*@__PURE__*/ $constructor("ZodCodec", (inst, def) => {
	ZodPipe.init(inst, def);
	$ZodCodec.init(inst, def);
});
var ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
	$ZodReadonly.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
	return new ZodReadonly({
		type: "readonly",
		innerType
	});
}
var ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
	$ZodCustom.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
function refine(fn, _params = {}) {
	return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
	return /* @__PURE__ */ _superRefine(fn, params);
}
var stringbool = (...args) => /* @__PURE__ */ _stringbool({
	Codec: ZodCodec,
	Boolean: ZodBoolean,
	String: ZodString
}, ...args);
var mergeStrategySchema = _enum([
	"override",
	"append",
	"prepend"
]);
var mergeStrategiesSchema = record(string(), mergeStrategySchema);
/**
* Parses the common envelope of a raw config file while retaining all
* action-specific keys for composition and later validation.
*/
var configFileSchema = looseObject({ _extends: union([
	string(),
	_null(),
	strictObject({
		from: string().regex(/\S/, "'from' must not be blank"),
		strategy: mergeStrategiesSchema.nullish()
	})
]).optional().transform((value) => {
	if (value == null || typeof value === "string" && value.trim() === "") return;
	if (typeof value === "string") return {
		from: value.trim(),
		strategy: {}
	};
	return {
		from: value.from.trim(),
		strategy: value.strategy ?? {}
	};
}) });
//#endregion
//#region src/common/config/get-config-file-from-fs.ts
var getConfigFileFromFs = (normalizedFilepath, logger) => {
	if (isAbsolute(normalizedFilepath)) throw new Error(`Absolute paths are not supported for config file path: ${normalizedFilepath}`);
	if (!process$1.env.GITHUB_WORKSPACE) throw new Error(`env GITHUB_WORKSPACE is not set. Cannot resolve local repo path.`);
	const repoRoot = process$1.env.GITHUB_WORKSPACE;
	const configPath = path.join(repoRoot, normalizedFilepath);
	logger.info(`Looking for config locally at ${configPath}...`);
	if (!existsSync(repoRoot)) throw new Error(`Root repo path does not exist: ${repoRoot}`);
	if (!existsSync(configPath)) throw new Error(`Config file not found: ${configPath}. Did you clone your sources ? (ex: using @actions/checkout)`);
	logger.info(`Loading from file: ${configPath}`);
	return readFileSync(configPath, "utf8");
};
//#endregion
//#region src/common/config/get-config-file-from-repo.ts
var getConfigFileFromRepo = async (configTarget, octokit) => {
	let res;
	try {
		res = await octokit.rest.repos.getContent({
			owner: configTarget.repo.owner,
			repo: configTarget.repo.repo,
			path: configTarget.filepath,
			ref: configTarget.ref,
			mediaType: { format: "raw" }
		});
	} catch (error) {
		if (error.status === 404) throw new Error(`Config file not found with error 404. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ""}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ""})`);
		throw new Error(`Failed to fetch config from repo: ${error.message}`);
	}
	if (Array.isArray(res.data)) throw new Error(`Fetched content is a directory (array), expected a file. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ""}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ""})`);
	if (!res.headers["content-type"]?.startsWith("application/vnd.github.v3.raw")) throw new Error(`Fetched content has wrong content-type (${res.headers["content-type"]}), expected a raw file. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ""}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ""})`);
	if (typeof res.data !== "string") throw new Error(`Fetched content is not a string. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ""}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ""})`);
	return res.data;
};
//#endregion
//#region src/common/config/normalize-filepath.ts
/**
* current path is assumed to be the ".github" folder in your repo
* root path is assumed to be the root of your repo
* @example
*  filepath: release-drafter.yml
*  output: [repo root]/.github/release-drafter.yml
* @example
*  filepath: /src/../configs/release-drafter.yml
*  output: [repo root]/configs/release-drafter.yml
* @example
*  filepath: ../configs/release-drafter.yml
*  output: [repo root]/configs/release-drafter.yml
* @example
*  filepath: /src/../configs/release-drafter.yml
*  output: [repo root]/configs/release-drafter.yml
*
* When specifying a target using _extends in the same repo & ref, current path is assumed to be
* the dirname of the current (parent) config file, instead of the .github repository.
* This allows files to reference each-other in a more natural way.
*/
var normalizeFilepath = (config, parentConfig) => {
	const _filepath = normalize(config.filepath);
	if (isAbsolute(_filepath)) if (_filepath.startsWith("/")) return _filepath.slice(1);
	else throw new Error(`Encountered malformed absolute path ${_filepath}`);
	else if (parentConfig && parentConfig.repo.owner === config.repo.owner && parentConfig.repo.repo === config.repo.repo && config.ref === parentConfig.ref) return normalize(join(dirname(parentConfig.filepath), _filepath));
	else {
		if (_filepath.startsWith(".github/")) return _filepath;
		return join(".github", _filepath);
	}
};
//#endregion
//#region src/common/config/parse-config-target.ts
var describeConfigTarget = (target) => `${target.scheme}:${target.filepath}${target.repo ? ` (${target.repo.owner}/${target.repo.repo})` : ""}`;
/**
* Parses a config target string into its components
* @param target - Target string in format `[github:][[owner/]repo]:filepath[@ref]` or `file:filepath`
* @param currentContext - Current runtime context (repo owner, name, and ref)
* @returns Parsed config target with resolved components
*/
function parseConfigTarget(target, context) {
	let _target = structuredClone(target).trim();
	const getErr = (m) => /* @__PURE__ */ new Error(`invalid format: "${_target}". Expected format [github:][owner/repo:]filepath[@ref] or file:filepath. ${m}`);
	if (_target.includes(" ")) throw getErr("Target must not contain spaces.");
	const scheme = _target.startsWith("file:") ? "file" : "github";
	if (_target.startsWith("file:")) _target = _target.slice(5);
	if (_target.startsWith("github:")) _target = _target.slice(7);
	let hasRepoSpecifier = _target.includes(":");
	const hasRefSpecifier = _target.includes("@");
	if (scheme === "file") {
		if (hasRepoSpecifier) throw getErr("Local file targets cannot have \":\" github specifiers.");
		if (hasRefSpecifier) throw getErr("Local file targets cannot have \"@\" github specifiers.");
	}
	if (!hasRepoSpecifier && scheme !== "file") {
		const targetWithoutRef = hasRefSpecifier ? _target.slice(0, _target.indexOf("@")) : _target;
		const repoName = targetWithoutRef.split("/").at(-1) || "";
		if (!repoName.includes(".") || repoName === ".github") {
			if (hasRefSpecifier) _target = `${targetWithoutRef}:${_target.slice(_target.indexOf("@"))}`;
			else _target = `${_target}:`;
			hasRepoSpecifier = true;
		}
	}
	const parts = _target.split(":").flatMap((part) => part.split("@"));
	let targetRepo;
	let targetRef;
	if (parts.length > 3) throw getErr("\":\" or \"@\" was specified more than once.");
	if (hasRepoSpecifier) {
		if (parts.length < 2) throw getErr("Missing repo specifier.");
		const repoParts = parts[0].split("/");
		let targetRepoOwner;
		let targetRepoName;
		if (!repoParts.length) throw getErr("Missing repo specifier.");
		if (repoParts.length > 2) throw getErr("\"/\" specified more than once.");
		if (repoParts.length === 2) {
			targetRepoOwner = repoParts[0];
			targetRepoName = repoParts[1];
		} else {
			targetRepoName = repoParts[0];
			targetRepoOwner = context.repo.owner;
		}
		targetRepo = {
			owner: targetRepoOwner,
			repo: targetRepoName
		};
	} else targetRepo = context.repo;
	const isCurrentRepo = context.repo.owner === targetRepo.owner && context.repo.repo === targetRepo.repo;
	if (hasRefSpecifier) {
		if (parts.length < 2) throw getErr("Too short to contain ref specifier.");
		const refSpecifier = parts.at(-1);
		if (!refSpecifier) throw getErr("Missing ref specifier.");
		if (!refSpecifier.length) throw getErr("Ref specifier is empty.");
		targetRef = refSpecifier;
	} else targetRef = isCurrentRepo ? context.ref : void 0;
	const filepathIndex = hasRepoSpecifier ? 1 : 0;
	return {
		scheme,
		filepath: parts.at(filepathIndex) || "",
		ref: targetRef,
		repo: targetRepo
	};
}
//#endregion
//#region src/common/config/get-config-file.ts
var SUPPORTED_FILE_EXTENSIONS = [
	"json",
	"yml",
	"yaml"
];
var getConfigFile = async (configTarget, parentTarget, octokit, logger) => {
	const _configTarget = structuredClone(configTarget);
	const fileExtension = _configTarget.filepath.split(".").pop().toLowerCase();
	if (!SUPPORTED_FILE_EXTENSIONS.includes(fileExtension)) throw new Error(`Unsupported file extension: .${fileExtension}. Supported extensions are: ${SUPPORTED_FILE_EXTENSIONS.join(", ")}`);
	if (parentTarget?.scheme) {
		if (parentTarget?.scheme === "github" && _configTarget.scheme === "file") throw new Error(`The '_extends' import-chain cannot contain github: to file: scheme transitions. Please change '_extends: ${configTarget.scheme}:${configTarget.filepath}' to use the github: scheme. ex: '_extends: ${parentTarget.repo.owner}/${parentTarget.repo.repo}:${configTarget.filepath}'`);
	}
	_configTarget.filepath = normalizeFilepath(_configTarget, parentTarget);
	const loadFromFs = _configTarget.scheme === "file";
	let configRaw;
	if (loadFromFs) try {
		configRaw = getConfigFileFromFs(_configTarget.filepath, logger);
	} catch (error) {
		throw new Error(`Local load failed. ${error.message}`);
	}
	else try {
		configRaw = await getConfigFileFromRepo(_configTarget, octokit);
	} catch (error) {
		throw new Error(`Repo load failed. ${error.message}`);
	}
	const rawConfig = fileExtension === "json" ? JSON.parse(configRaw) : parse$2(configRaw);
	let config;
	try {
		config = configFileSchema.parse(rawConfig);
	} catch (error) {
		if (error instanceof ZodError) throw new Error(`Invalid config in ${describeConfigTarget(_configTarget)}:\n${prettifyError(error)}`, { cause: error });
		throw error;
	}
	return {
		config,
		fetchedFrom: _configTarget
	};
};
//#endregion
//#region src/common/config/get-config-files.ts
var getConfigFiles = async (configFilename, currentContext, octokit, logger) => {
	logger.debug(`getConfigFiles: Starting with filename: ${configFilename}`);
	let configTarget = parseConfigTarget(configFilename, currentContext);
	logger.debug(`getConfigFiles: Parsed config target - scheme: ${configTarget.scheme}, filepath: ${configTarget.filepath}`);
	const canFallBackToOrgRepo = configTarget.scheme === "github" && configTarget.repo.owner === currentContext.repo.owner && configTarget.repo.repo === currentContext.repo.repo && currentContext.repo.repo !== ".github";
	let requestedRepoConfig;
	try {
		requestedRepoConfig = await getConfigFile(configTarget, void 0, octokit, logger);
	} catch (error) {
		if (canFallBackToOrgRepo && error instanceof Error && error.message.includes("Config file not found") && configTarget.scheme === "github") {
			logger.info(`Config not found in ${currentContext.repo.owner}/${currentContext.repo.repo}, falling back to ${currentContext.repo.owner}/.github`);
			requestedRepoConfig = await getConfigFile({
				...configTarget,
				repo: {
					owner: currentContext.repo.owner,
					repo: ".github"
				},
				ref: void 0
			}, void 0, octokit, logger);
		} else throw error;
	}
	logger.debug(`getConfigFiles: Fetched initial config from ${requestedRepoConfig.fetchedFrom.scheme}:${requestedRepoConfig.fetchedFrom.filepath}`);
	const files = [requestedRepoConfig];
	let lastFetchedFrom = requestedRepoConfig.fetchedFrom;
	let lastExtends = requestedRepoConfig.config._extends;
	if (!lastExtends) {
		logger.debug(`getConfigFiles: No _extends found in config, returning single file`);
		return files;
	}
	logger.debug(`getConfigFiles: Found _extends directive: ${lastExtends.from}`);
	const MAX_EXTENDS_DEPTH = 33;
	let extendsDepth = 0;
	do {
		extendsDepth++;
		logger.debug(`getConfigFiles: Processing _extends depth ${extendsDepth}: ${lastExtends.from}`);
		if (extendsDepth > MAX_EXTENDS_DEPTH) {
			const error = `Maximum extends depth (${MAX_EXTENDS_DEPTH}) exceeded. Check for circular dependencies or reduce the chain of extended configurations.`;
			logger.error(`getConfigFiles: ${error}`);
			throw new Error(error);
		}
		configTarget = parseConfigTarget(lastExtends.from, lastFetchedFrom);
		if (!configTarget.filepath) configTarget.filepath = basename(lastFetchedFrom.filepath);
		logger.debug(`getConfigFiles: Parsed _extends target - scheme: ${configTarget.scheme}, filepath: ${configTarget.filepath}`);
		const normalizedFilepath = normalizeFilepath(configTarget, lastFetchedFrom);
		const preCheckTarget = {
			...configTarget,
			filepath: normalizedFilepath
		};
		if (files.find(({ fetchedFrom: loadedFrom }) => {
			const sameFilepath = loadedFrom.filepath === preCheckTarget.filepath;
			const sameRepo = loadedFrom.repo.owner === preCheckTarget.repo.owner && loadedFrom.repo.repo === preCheckTarget.repo.repo;
			const crossScheme = loadedFrom.scheme === "file" && preCheckTarget.scheme === "github";
			return sameFilepath && sameRepo && (crossScheme || loadedFrom.ref === preCheckTarget.ref);
		})) {
			logger.warning(`Recursion detected. Ignoring "_extends: ${lastExtends.from}".`);
			logger.debug(`getConfigFiles: Recursion detected, stopping extends chain`);
			return files;
		}
		const extendRepoConfig = await getConfigFile(configTarget, lastFetchedFrom, octokit, logger);
		logger.debug(`getConfigFiles: Fetched extended config from ${extendRepoConfig.fetchedFrom.scheme}:${extendRepoConfig.fetchedFrom.filepath}`);
		lastFetchedFrom = extendRepoConfig.fetchedFrom;
		lastExtends = extendRepoConfig.config._extends;
		files.push(extendRepoConfig);
		logger.debug(`getConfigFiles: Added extended config to chain. Total files: ${files.length}, next _extends: ${lastExtends?.from || "none"}`);
	} while (lastExtends);
	logger.debug(`getConfigFiles: Extends chain complete with ${files.length} file(s)`);
	return files;
};
//#endregion
//#region src/common/config/merge-config-chain.ts
var toMergeableList = (value, strategy, key, description) => {
	if (value === void 0 || value === null) return [];
	if (!Array.isArray(value)) throw new Error(`Cannot ${strategy} '${key}': ${description} is not a list (got ${typeof value}).`);
	return value;
};
/**
* Merges an `_extends` chain (ordered leaf-first, as returned by
* `getConfigFiles`) into a single config object.
*
* Keys merge shallowly by default: the extending file's value replaces the
* inherited one. A file can opt into appending or prepending a list key
* to/onto the inherited list via the mapping form of `_extends`
* (`_extends: {from: ..., strategy: {<key>: append|prepend}}`). A file's
* strategy governs only the step where that file itself is merged onto the
* configs it extends; it is not inherited by files extending it. The
* `_extends` key is stripped from the result.
*/
var mergeConfigChain = (configResults, logger) => {
	const merged = {};
	for (const { config, fetchedFrom } of [...configResults].reverse()) {
		const { _extends, ...rest } = config;
		const strategies = _extends?.strategy ?? {};
		for (const key of Object.keys(strategies)) if (!Object.hasOwn(rest, key)) logger.warning(`_extends strategy declares '${key}' in ${describeConfigTarget(fetchedFrom)}, but the file does not set '${key}'; the strategy has no effect.`);
		for (const [key, value] of Object.entries(rest)) {
			const strategy = (Object.hasOwn(strategies, key) ? strategies[key] : void 0) ?? "override";
			if (strategy === "override") {
				merged[key] = value;
				continue;
			}
			const inherited = toMergeableList(Object.hasOwn(merged, key) ? merged[key] : void 0, strategy, key, `the value inherited by ${describeConfigTarget(fetchedFrom)}`);
			const own = toMergeableList(value, strategy, key, `the value in ${describeConfigTarget(fetchedFrom)}`);
			merged[key] = strategy === "append" ? [...inherited, ...own] : [...own, ...inherited];
			logger.info(`_extends strategy: ${strategy}ed ${own.length} '${key}' item(s) from ${describeConfigTarget(fetchedFrom)} onto ${inherited.length} inherited item(s)`);
		}
	}
	return merged;
};
//#endregion
//#region src/common/config/index.ts
/**
* Loads configuration from one or multiple files and resolves with
* the combined configuration as well as the list of contexts the configuration
* was loaded from
*/
async function composeConfigGet(configFilename, currentContext, octokit, logger) {
	logger.debug(`composeConfigGet: Starting config composition with filename: ${configFilename}`);
	logger.debug(`composeConfigGet: Current context - repo: ${currentContext.repo.owner}/${currentContext.repo.repo}, ref: ${currentContext.ref}`);
	const configResults = await getConfigFiles(configFilename, currentContext, octokit, logger);
	logger.debug(`composeConfigGet: Retrieved ${configResults.length} config file(s)`);
	const contexts = configResults.map((c) => c.fetchedFrom).filter(Boolean);
	logger.debug(`composeConfigGet: Resolved ${contexts.length} context(s)`);
	contexts.forEach((ctx, idx) => {
		logger.debug(`composeConfigGet: Context[${idx}] - scheme: ${ctx.scheme}, filepath: ${ctx.filepath}${ctx.repo ? `, repo: ${ctx.repo.owner}/${ctx.repo.repo}` : ""}`);
	});
	const result = {
		contexts,
		config: mergeConfigChain(configResults, logger)
	};
	logger.debug(`composeConfigGet: Config composition complete with ${Object.keys(result.config).length} keys`);
	return result;
}
//#endregion
//#region src/common/get-pull-request-changed-files.ts
var PULL_REQUEST_FILES_PER_PAGE = 50;
var getPullRequestChangedFiles = async (octokit, params) => octokit.paginate(octokit.rest.pulls.listFiles, {
	...params,
	per_page: PULL_REQUEST_FILES_PER_PAGE
}, (response) => response.data.map((file) => file.filename));
var getPullRequestsChangedFiles = async (params) => {
	const { octokit } = params;
	const changedFileEntries = await Promise.all(params.pullRequests.map(async (pullRequest) => {
		const key = `${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`;
		try {
			return [key, await getPullRequestChangedFiles(octokit, {
				owner: params.owner,
				repo: params.repo,
				pull_number: pullRequest.number
			})];
		} catch (error) {
			throw new Error(`Failed to list changed files for pull request #${pullRequest.number}.`, { cause: error });
		}
	}));
	return new Map(changedFileEntries);
};
//#endregion
//#region src/common/graphql.ts
var executeGraphql = (client, document, variables) => client(document.toString(), variables);
//#endregion
//#region src/types/github.graphql.generated.ts
var TypedDocumentString = class extends String {
	__apiType;
	value;
	__meta__;
	constructor(value, __meta__) {
		super(value);
		this.value = value;
		this.__meta__ = __meta__;
	}
	toString() {
		return this.value;
	}
};
new TypedDocumentString(`
    fragment PullRequestFields on PullRequest {
  __typename
  title
  number
  url @include(if: $withPullRequestURL)
  body @include(if: $withPullRequestBody)
  author {
    __typename
    login
    url
  }
  baseRepository {
    __typename
    nameWithOwner
  }
  mergedAt
  isCrossRepository
  labels(first: 100) {
    __typename
    nodes {
      __typename
      name
    }
  }
  merged
  baseRefName @include(if: $withBaseRefName)
  headRefName @include(if: $withHeadRefName)
}
    `, { "fragmentName": "PullRequestFields" });
new TypedDocumentString(`
    fragment ComparisonCommitFields on Commit {
  __typename
  id
  oid
  committedDate
  message
  author {
    __typename
    name
    user {
      __typename
      login
    }
  }
  authors(first: 100) {
    nodes {
      __typename
      name
      user {
        __typename
        login
      }
    }
  }
  associatedPullRequests(first: $pullRequestLimit) {
    __typename
    nodes {
      ...PullRequestFields
    }
  }
}
    fragment PullRequestFields on PullRequest {
  __typename
  title
  number
  url @include(if: $withPullRequestURL)
  body @include(if: $withPullRequestBody)
  author {
    __typename
    login
    url
  }
  baseRepository {
    __typename
    nameWithOwner
  }
  mergedAt
  isCrossRepository
  labels(first: 100) {
    __typename
    nodes {
      __typename
      name
    }
  }
  merged
  baseRefName @include(if: $withBaseRefName)
  headRefName @include(if: $withHeadRefName)
}`, { "fragmentName": "ComparisonCommitFields" });
var FindCommitsInComparisonDocument = new TypedDocumentString(`
    query findCommitsInComparison($name: String!, $owner: String!, $baseCommitish: String!, $headCommitish: String!, $useCommitishes: Boolean!, $withPullRequestBody: Boolean!, $withPullRequestURL: Boolean!, $cursor: String, $withBaseRefName: Boolean!, $withHeadRefName: Boolean!, $pullRequestLimit: Int!, $historyLimit: Int!) {
  repository(name: $name, owner: $owner) {
    ref(qualifiedName: $baseCommitish) @skip(if: $useCommitishes) {
      compare(headRef: $headCommitish) {
        commits(first: $historyLimit, after: $cursor) {
          __typename
          pageInfo {
            __typename
            hasNextPage
            endCursor
          }
          nodes {
            ...ComparisonCommitFields
          }
        }
      }
    }
    head: object(expression: $headCommitish) @include(if: $useCommitishes) {
      __typename
      ... on Commit {
        history(first: $historyLimit, after: $cursor) {
          __typename
          pageInfo {
            __typename
            hasNextPage
            endCursor
          }
          nodes {
            ...ComparisonCommitFields
          }
        }
      }
    }
  }
}
    fragment ComparisonCommitFields on Commit {
  __typename
  id
  oid
  committedDate
  message
  author {
    __typename
    name
    user {
      __typename
      login
    }
  }
  authors(first: 100) {
    nodes {
      __typename
      name
      user {
        __typename
        login
      }
    }
  }
  associatedPullRequests(first: $pullRequestLimit) {
    __typename
    nodes {
      ...PullRequestFields
    }
  }
}
fragment PullRequestFields on PullRequest {
  __typename
  title
  number
  url @include(if: $withPullRequestURL)
  body @include(if: $withPullRequestBody)
  author {
    __typename
    login
    url
  }
  baseRepository {
    __typename
    nameWithOwner
  }
  mergedAt
  isCrossRepository
  labels(first: 100) {
    __typename
    nodes {
      __typename
      name
    }
  }
  merged
  baseRefName @include(if: $withBaseRefName)
  headRefName @include(if: $withHeadRefName)
}`);
new TypedDocumentString(`
    query findCommitsWithPathChangesQuery($name: String!, $owner: String!, $targetCommitish: String!, $after: String, $path: String) {
  repository(name: $name, owner: $owner) {
    object(expression: $targetCommitish) {
      ... on Commit {
        __typename
        history(path: $path, after: $after) {
          __typename
          pageInfo {
            __typename
            hasNextPage
            endCursor
          }
          nodes {
            __typename
            id
          }
        }
      }
    }
  }
}
    `);
var FindRecentMergedPullRequestsDocument = new TypedDocumentString(`
    query findRecentMergedPullRequests($name: String!, $owner: String!, $baseRefName: String, $limit: Int!, $withPullRequestBody: Boolean!, $withPullRequestURL: Boolean!, $withBaseRefName: Boolean!, $withHeadRefName: Boolean!) {
  repository(name: $name, owner: $owner) {
    pullRequests(
      states: [MERGED]
      baseRefName: $baseRefName
      orderBy: { field: UPDATED_AT, direction: DESC }
      first: $limit
    ) {
      __typename
      nodes {
        ...PullRequestFields
        mergeCommit {
          __typename
          oid
        }
      }
    }
  }
}
    fragment PullRequestFields on PullRequest {
  __typename
  title
  number
  url @include(if: $withPullRequestURL)
  body @include(if: $withPullRequestBody)
  author {
    __typename
    login
    url
  }
  baseRepository {
    __typename
    nameWithOwner
  }
  mergedAt
  isCrossRepository
  labels(first: 100) {
    __typename
    nodes {
      __typename
      name
    }
  }
  merged
  baseRefName @include(if: $withBaseRefName)
  headRefName @include(if: $withHeadRefName)
}`);
var ResolveCommitishDocument = new TypedDocumentString(`
    query resolveCommitish($name: String!, $owner: String!, $expression: String!) {
  repository(name: $name, owner: $owner) {
    object(expression: $expression) {
      __typename
      oid
    }
  }
}
    `);
var ResolvePullRequestCommitishDocument = new TypedDocumentString(`
    query resolvePullRequestCommitish($name: String!, $owner: String!, $number: Int!) {
  repository(name: $name, owner: $owner) {
    pullRequest(number: $number) {
      headRefOid
      mergeCommit {
        oid
      }
      potentialMergeCommit {
        oid
      }
    }
  }
}
    `);
//#endregion
//#region src/common/parse-commitish.ts
var commitishToCommitExpression = (commitish) => `${commitish}^{commit}`;
var resolveTagToCommitSha = async (params) => {
	const { octokit, tagRef, repo } = params;
	const target = (await executeGraphql(octokit.graphql, ResolveCommitishDocument, {
		name: repo.repo,
		owner: repo.owner,
		expression: commitishToCommitExpression(tagRef)
	})).repository?.object;
	if (target?.__typename !== "Commit") throw new Error(`Tag ${tagRef} does not point to a commit`);
	return target.oid;
};
var resolvePullRequestToCommitSha = async (params) => {
	const { octokit, pullRequestNumber, refType, repo } = params;
	const pullRequest = (await executeGraphql(octokit.graphql, ResolvePullRequestCommitishDocument, {
		name: repo.repo,
		owner: repo.owner,
		number: pullRequestNumber
	})).repository?.pullRequest;
	const commitSha = refType === "head" ? pullRequest?.headRefOid : pullRequest?.potentialMergeCommit?.oid ?? pullRequest?.mergeCommit?.oid;
	if (!commitSha) throw new Error(`Pull request #${pullRequestNumber} does not have a ${refType} commit`);
	return commitSha;
};
/**
* GitHub's Releases API accepts a branch name or commit SHA as
* `target_commitish`. Normalize fully qualified branch refs, resolve fully
* qualified tag and pull request refs to commit SHAs before building the API
* payload.
*
* A tag without the `refs/tags/` prefix cannot be distinguished reliably from
* a branch with the same name, so it is passed through unchanged.
*
* If ref resolution fails, preserve the existing fallback to the repository's
* default branch.
*/
var parseCommitishForRelease = async (commitish, github) => {
	const { logger, octokit, repo } = github;
	if (commitish.startsWith("refs/heads/")) return commitish.replace(/^refs\/heads\//, "");
	if (commitish.startsWith("refs/tags/")) return resolveTagToCommitSha({
		octokit,
		repo,
		tagRef: commitish
	}).catch(() => {
		logger.warning(`${commitish} could not be resolved to a commit SHA, falling back to default branch`);
		return "";
	});
	if (commitish.startsWith("refs/pull/")) {
		const pullRequestRef = /^refs\/pull\/(\d+)\/(head|merge)$/.exec(commitish);
		if (pullRequestRef) {
			const [, pullRequestNumber, refType] = pullRequestRef;
			return resolvePullRequestToCommitSha({
				octokit,
				repo,
				pullRequestNumber: Number(pullRequestNumber),
				refType
			}).catch(() => {
				logger.warning(`${commitish} could not be resolved to a commit SHA, falling back to default branch`);
				return "";
			});
		}
		logger.warning(`${commitish} is not a supported pull request ref, falling back to default branch`);
		return "";
	}
	return commitish;
};
//#endregion
//#region src/common/shared-input.schema.ts
/**
* Inputs shared by release-drafter and autolabeler
*/
var sharedInputSchema = object({
	/**
	* Access token used to make requests against the GitHub API.
	*
	* Defaults to ${{ github.token }}, or the GITHUB_TOKEN environment variable.
	*/
	token: string().min(1).default(() => process$1.env.GITHUB_TOKEN || ""),
	/**
	* When enabled, no write operations (creating/updating releases or adding
	* labels) are performed. Instead, the action logs what it would have done.
	*/
	"dry-run": stringbool().or(boolean()).optional()
}).superRefine((data, ctx) => {
	if (data.token && !process$1.env.GITHUB_TOKEN) process$1.env.GITHUB_TOKEN = data.token;
	if (!process$1.env.GITHUB_TOKEN) ctx.addIssue({
		code: "custom",
		message: "Unable to find a token. Please see input 'token'.",
		path: ["token"]
	});
});
//#endregion
//#region node_modules/escape-string-regexp/index.js
function escapeStringRegexp(string) {
	if (typeof string !== "string") throw new TypeError("Expected a string");
	return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
//#endregion
//#region src/common/string-to-regex.ts
var regexLiteral = /^\/(.+)\/([AJUXgimsux]*)$/;
var supportedFlags = "gimsuy";
var stringToRegex = (search) => {
	const match = regexLiteral.exec(search);
	if (!match) return new RegExp(escapeStringRegexp(search), "g");
	const flags = [...new Set(match[2])].filter((flag) => supportedFlags.includes(flag)).join("");
	return new RegExp(match[1], flags);
};
//#endregion
//#region src/actions/drafter/config/schemas/common-config.schema.ts
/**
* Configuration parameters that can be specified in both
* the config file or the action input.
*
* Default values cannot be defined here,
* as action inputs may override config file values.
*
* @see merge-input-and-config.ts for how the merging of config and input is handled, including default values.
*/
var commonConfigSchema = object({
	/**
	* A boolean indicating whether the release being created or updated should be marked as latest.
	*/
	latest: stringbool().or(boolean()).optional(),
	/**
	* Whether to draft a prerelease, with changes since another prerelease (if applicable). Default `false`.
	*/
	prerelease: stringbool().or(boolean()).optional(),
	/**
	* A string indicating an identifier (alpha, beta, rc, etc), to increment the prerelease version. This automatically enables `prerelease` when both values come from the same config location; explicit action inputs still take precedence. Default `''`.
	*/
	"prerelease-identifier": string().optional(),
	/**
	* When looking for the last published release to scan changes up-to, include pre-releases. Has no effect if using `prerelease: true` (already enabled). Default `false`.
	*/
	"include-pre-releases": stringbool().or(boolean()).optional(),
	/**
	* The release target, i.e. branch, commit SHA, or fully qualified tag or pull request ref it should point to. Tag and pull request refs are resolved to commit SHAs. Defaults to the branch that release-drafter runs for, e.g. `master` when configured to run on pushes to `master`.
	*/
	commitish: string().optional(),
	/**
	* A string that would be added before the template body.
	*/
	header: string().optional(),
	/**
	* A string that would be added after the template body.
	*/
	footer: string().optional(),
	/**
	* Filter releases that satisfies this semver range. Evaluates the tag name againts node's semver.satisfies().
	*/
	"filter-by-range": string().optional()
});
//#endregion
//#region src/actions/drafter/config/schemas/config.schema.ts
/**
* A single set of predicates that are combined with AND logic.
* All specified predicates must be satisfied for a change to match.
*/
var changeConditionSchema = object({
	/**
	* Conventional commit predicate: matches a change whose title or message
	* follows the conventional commit shape, e.g. `feat(api)!: add endpoint`.
	*/
	conventional: union([literal(true), object({
		/** Shorthand for one `types` entry. */
		type: string().min(1).optional(),
		/** Conventional commit types to match, e.g. `feat` or `fix`. */
		types: array(string().min(1)).optional().default([]),
		/** Shorthand for one `scopes` entry. */
		scope: string().min(1).optional(),
		/** Conventional commit scopes to match, e.g. `api` or `ui`. */
		scopes: array(string().min(1)).optional().default([]),
		/** Match titles with (`true`) or without (`false`) a breaking `!`. */
		breaking: boolean().optional()
	})]).optional(),
	/**
	* Label predicate: matches a change that carries this label.
	*
	* Shorthand for adding a single value to `labels`.
	* If `label` and `labels` are both specified, they are combined.
	*
	* Use `labels-mode` to configure how this label is compared to change labels.
	*/
	label: string().min(1).optional(),
	/**
	* Labels predicate: matches a change that carries these labels.
	*
	* `labels-mode` defaults to `any`, so the condition matches when the change
	* shares at least one configured label unless another mode is set.
	*
	* Use `labels-mode` to configure how these labels are compared to change labels.
	*/
	labels: array(string().min(1)).optional().default([]),
	/**
	* Matching mode for the `labels` predicate.
	*
	* Has no effect unless `label` or `labels` is configured in the same condition.
	*
	* The comparison is set-based (label order is ignored).
	*
	* - `any`: Change and configured labels overlap (current behavior).
	* - `all`: Change contains every configured label. Change can have more labels.
	* - `only`: Every change label is included in configured labels. Configured labels can specify more.
	* - `exactly`: Change labels and configured labels are the same set.
	*/
	"labels-mode": _enum([
		"any",
		"all",
		"only",
		"exactly"
	]).optional().default("any"),
	/**
	* Path predicate: matches a change that touched this path pattern. Supports glob patterns.
	*
	* Same as specifying a single `paths` value.
	* If `path` and `paths` are both specified, they are combined.
	*
	* Use `paths-mode` to configure how this path is matched against the pull
	* request's changed files.
	*/
	path: string().min(1).optional(),
	/**
	* Paths predicate: matches a change that touched any of these path patterns.
	* Values support glob patterns.
	*
	* If `path` and `paths` are both specified, they are combined before
	* `paths-mode` is applied.
	*
	* Use `paths-mode` to configure how these path patterns are compared to the
	* pull request's changed files.
	*/
	paths: array(string().min(1)).optional().default([]),
	/**
	* Matching mode for the `paths` predicate.
	*
	* Has no effect unless `path` or `paths` is configured in the same condition.
	*
	* The comparison is set-based (path order is ignored).
	*
	* - `any`: At least one changed file matched a configured path pattern.
	* - `all`: Every configured path pattern matched at least one changed file.
	* - `only`: Every changed file matched a configured path pattern.
	* - `exactly`: Every changed file matched a configured path pattern and every
	*   configured path pattern matched at least one changed file.
	*/
	"paths-mode": _enum([
		"any",
		"all",
		"only",
		"exactly"
	]).optional().default("any")
});
var changeConditionSchemaDefaults = changeConditionSchema.parse({});
var categorySchema = object({
	/**
	* Expanded in $TITLE in the category-template.
	*
	* Required when `type` is `changelog` (default).
	* This is enforced during merged-config validation rather than by this schema alone.
	*
	* May be omitted for non-changelog categories because
	* they are not rendered in the changelog output.
	*/
	title: string().min(1).optional(),
	/**
	* The type of the category.
	*
	* - `changelog`: Included in the generated changelog.
	* - `pre-include`: Keep only matching changes for later changelog categorization.
	* - `pre-exclude`: Exclude matching changes for later changelog categorization. Is run against changes that were included in category type `pre-include` if specified.
	* - `version-resolver`: Used solely to determine `$RESOLVED_VERSION` from the changes this category matches, without rendering a changelog section. Use `type: 'changelog'` (default) and `categories[*].semver-increment` instead if you mean this category to also be included in the changelog.
	*
	* `pre-include` always runs before `pre-exclude` in the pipeline.
	* Omitted values default to `changelog`.
	*
	* @default "changelog"
	*/
	type: _enum([
		"changelog",
		"pre-include",
		"pre-exclude",
		"version-resolver"
	]).optional().default("changelog"),
	/**
	* Whether changes included in this category should be excluded from other categories.
	*
	* Default behavior allows changes to appear in multiple categories if they match multiple category criteria.
	*
	* Only applicable to categories of `type: changelog` or `type: version-resolver`.
	* This only controls inclusion for a single category type at a time, so a change can still match
	* one exclusive changelog category and one exclusive version-resolver category.
	*
	* @default false
	*/
	exclusive: boolean().optional().default(false),
	/**
	* Collapses the category's change list into a `<details>`/`<summary>` block
	* when the number of changes is greater than this value.
	*
	* Only applicable to categories of `type: changelog`.
	*
	* Set to `0` to always collapse. Set to `-1` to disable collapsing.
	*
	* @default -1
	*/
	"collapse-after": number().int().min(-1).optional().default(-1),
	/**
	* Which version increment this category contributes to `$RESOLVED_VERSION`.
	*
	* For `type: changelog` categories, this applies to changes that end up assigned
	* to the category after changelog matching and `exclusive` handling.
	* For `type: version-resolver` categories, this applies to changes the category
	* matches directly, with a category that omits `when` acting as the fallback
	* when no other `type: version-resolver` category matches.
	*
	* If multiple categories contribute, the most severe increment wins.
	* For example, if one contributing category has `semver-increment: 'minor'`
	* and another has `semver-increment: 'patch'`, the resulting increment will
	* be `minor`.
	*
	* Applicable to categories of `type: changelog` and `type: version-resolver`.
	* Ignored for `type: pre-include` and `type: pre-exclude`.
	*
	* @default "patch"
	*/
	"semver-increment": _enum([
		"major",
		"minor",
		"patch"
	]).optional().default("patch"),
	/**
	* Compatibility shorthand for adding label matching to this category.
	*
	* Equivalent to adding the same `labels` predicate to every `when` condition.
	*
	* @deprecated Use `when.labels` instead.
	*/
	labels: array(string().min(1)).optional().default([]),
	/**
	* Compatibility shorthand for adding a single label match to this category.
	*
	* Equivalent to adding the same `label` predicate to every `when` condition.
	*
	* @deprecated Use `when.label` instead.
	*/
	label: string().min(1).optional(),
	/**
	* Conditions that determine whether a change belongs to this category.
	*
	* Can be specified as:
	* - A **single condition** (object): the change must satisfy all predicates in that condition.
	* - An **array of conditions**: the change must satisfy all predicates of **at least one**
	*   condition (OR logic across conditions, AND logic within each condition).
	*
	* An empty array (default) matches all changes.
	*
	* @example
	* # Shorthand: single condition (must have label "bug" AND touch "src/")
	* when:
	*   labels: [bug]
	*   paths: [src/**]
	*
	* @example
	* # Array: (label "bug" AND path "src/") OR (label "enhancement")
	* when:
	*   - labels: [bug]
	*     paths: [src/**]
	*   - labels: [enhancement]
	*/
	when: changeConditionSchema.or(array(changeConditionSchema)).optional().default([])
});
var categorySchemaDefaults = categorySchema.parse({});
var exclusiveConfigSchema = object({
	/**
	* The template to use for each merged change.
	*/
	"change-template": string().optional().default("* $TITLE (#$NUMBER) $AUTHORS"),
	/**
	* The template to use for each author in `$AUTHORS`.
	*/
	"change-author-template": string().optional().default("$AUTHOR_MENTION"),
	/**
	* The separator to use between authors in `$AUTHORS`.
	*/
	"change-authors-separator": string().optional().default(", "),
	/**
	* An optional separator to use before the final author in `$AUTHORS`.
	*/
	"change-authors-final-separator": string().optional(),
	/**
	* Characters to escape in `$TITLE` when inserting into `change-template` so that they are not interpreted as Markdown format characters.
	*/
	"change-title-escapes": string().optional(),
	/**
	* The template to use for when there’s no changes.
	*/
	"no-changes-template": string().optional().default("* No changes"),
	/**
	* The template to use when calculating the next version number for the release. Useful for projects that don't use semantic versioning.
	*/
	"version-template": string().optional().default("$MAJOR.$MINOR.$PATCH$PRERELEASE"),
	/**
	* The template for the name of the draft release.
	*/
	"name-template": string().optional(),
	/**
	* A known prefix used to filter release tags. For matching tags, this prefix is stripped before attempting to parse the version.
	*/
	"tag-prefix": string().optional(),
	/**
	* The template for the tag of the draft release.
	*/
	"tag-template": string().optional(),
	/**
	* Exclude changes using labels.
	*
	* @deprecated Use a `type: pre-exclude` category with `when.labels` instead.
	*/
	"exclude-labels": array(string()).optional().default([]),
	/**
	* Include only the specified changes using labels.
	*
	* @deprecated Use a `type: pre-include` category with `when.labels` instead.
	*/
	"include-labels": array(string()).optional().default([]),
	/**
	* Restrict changes included in the release notes to only the changes that modified any of the paths in this array.
	* Supports files and directories.
	*
	* @deprecated Use a `type: pre-include` category with `when.paths` instead.
	*/
	"include-paths": array(string()).optional().default([]),
	/**
	* Exclude changes from the release notes if they modified any of the paths in this array.
	* Supports files and directories. If used with `include-paths`, the exclusion takes precedence.
	*
	* @deprecated Use a `type: pre-exclude` category with `when.paths` instead.
	*/
	"exclude-paths": array(string()).optional().default([]),
	/**
	* Exclude specific usernames from the generated `$CONTRIBUTORS` variable.
	*/
	"exclude-contributors": array(string()).optional().default([]),
	/**
	* The template to use for each new contributor in `$NEW_CONTRIBUTORS`.
	*/
	"new-contributor-template": string().optional().default("* $AUTHOR_MENTION made their first contribution in #$NUMBER"),
	/**
	* The template to use for `$CONTRIBUTORS` when there's no contributors to list.
	*/
	"no-contributors-template": string().optional().default("No contributors"),
	/**
	* Sort changelog by merged_at or title.
	*/
	"sort-by": _enum(["merged_at", "title"]).optional().default("merged_at"),
	/**
	* Sort changelog in ascending or descending order.
	*/
	"sort-direction": _enum(["ascending", "descending"]).optional().default("descending"),
	/**
	* Filter previous releases to consider only those with the target matching `commitish`.
	*/
	"filter-by-commitish": boolean().optional().default(false),
	"pull-request-limit": number().int().positive().optional().default(5),
	/**
	* Size of the pagination window when walking the repo. Can avoid erratic 502s from Github. Default: `15`
	*/
	"history-limit": number().int().positive().optional().default(15),
	/**
	* Search and replace content in the generated changelog body.
	*/
	replacers: array(object({
		search: string().min(1),
		replace: string().min(0)
	})).optional().default([]),
	/**
	* Categorize changes
	*/
	categories: array(categorySchema).optional().default([]),
	/**
	* Adjust the `$RESOLVED_VERSION` variable using labels.
	*
	* @deprecated Use a category with a `semver-increment` instead. Use category[ies] with `type: version-resolver` to separate version resolution from changelog inclusion concerns.
	*/
	"version-resolver": object({
		major: object({ labels: array(string().min(1)) }).optional().default({ labels: [] }),
		minor: object({ labels: array(string().min(1)) }).optional().default({ labels: [] }),
		patch: object({ labels: array(string().min(1)) }).optional().default({ labels: [] }),
		default: _enum([
			"major",
			"minor",
			"patch"
		]).optional().default("patch")
	}).optional().default({
		major: { labels: [] },
		minor: { labels: [] },
		patch: { labels: [] },
		default: "patch"
	}),
	/**
	* The template to use for each category.
	*/
	"category-template": string().optional().default("## $TITLE"),
	/**
	* The template for the body of the draft release.
	* Optional as it may be inherited via `_extends`.
	*/
	template: string().optional().default("")
}).meta({
	title: "JSON schema for Release Drafter yaml files",
	id: "https://github.com/release-drafter/release-drafter/blob/master/drafter/schema.json"
});
var configSchema = exclusiveConfigSchema.and(commonConfigSchema);
var configSchemaDefaults = Object.fromEntries(Object.entries({
	...exclusiveConfigSchema.shape,
	...commonConfigSchema.shape
}).map(([key, value]) => {
	if (value instanceof ZodDefault) return [key, value.def.defaultValue];
	return [key, void 0];
}));
//#endregion
//#region src/actions/drafter/config/get-config.ts
var getConfig = async (configName, github) => {
	const { config, contexts } = await composeConfigGet(configName, {
		repo: github.repo,
		ref: github.ref ?? ""
	}, github.octokit, github.logger);
	contexts.forEach(({ filepath, ref, repo, scheme }) => {
		const remotePath = `${repo.owner}/${repo.repo}/${filepath}${ref ? `@${ref}` : ""}`;
		const location = scheme === "file" ? `locally from "${filepath}"` : `from "${remotePath}"${ref ? "" : " on the default branch"}`;
		github.logger.info(`Config fetched ${location}.`);
	});
	return configSchema.parse(config);
};
//#endregion
//#region node_modules/semver/internal/lrucache.js
var require_lrucache = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var LRUCache = class {
		constructor() {
			this.max = 1e3;
			this.map = /* @__PURE__ */ new Map();
		}
		get(key) {
			const value = this.map.get(key);
			if (value === void 0) return;
			else {
				this.map.delete(key);
				this.map.set(key, value);
				return value;
			}
		}
		delete(key) {
			return this.map.delete(key);
		}
		set(key, value) {
			if (!this.delete(key) && value !== void 0) {
				if (this.map.size >= this.max) {
					const firstKey = this.map.keys().next().value;
					this.delete(firstKey);
				}
				this.map.set(key, value);
			}
			return this;
		}
	};
	module.exports = LRUCache;
}));
//#endregion
//#region node_modules/semver/internal/parse-options.js
var require_parse_options = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var looseOption = Object.freeze({ loose: true });
	var emptyOpts = Object.freeze({});
	var parseOptions = (options) => {
		if (!options) return emptyOpts;
		if (typeof options !== "object") return looseOption;
		return options;
	};
	module.exports = parseOptions;
}));
//#endregion
//#region node_modules/semver/internal/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SEMVER_SPEC_VERSION = "2.0.0";
	var MAX_LENGTH = 256;
	var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;
	module.exports = {
		MAX_LENGTH,
		MAX_SAFE_COMPONENT_LENGTH: 16,
		MAX_SAFE_BUILD_LENGTH: MAX_LENGTH - 6,
		MAX_SAFE_INTEGER,
		RELEASE_TYPES: [
			"major",
			"premajor",
			"minor",
			"preminor",
			"patch",
			"prepatch",
			"prerelease"
		],
		SEMVER_SPEC_VERSION,
		FLAG_INCLUDE_PRERELEASE: 1,
		FLAG_LOOSE: 2
	};
}));
//#endregion
//#region node_modules/semver/internal/debug.js
var require_debug = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {};
}));
//#endregion
//#region node_modules/semver/internal/re.js
var require_re = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { MAX_SAFE_COMPONENT_LENGTH, MAX_SAFE_BUILD_LENGTH, MAX_LENGTH } = require_constants();
	var debug = require_debug();
	exports = module.exports = {};
	var re = exports.re = [];
	var safeRe = exports.safeRe = [];
	var src = exports.src = [];
	var safeSrc = exports.safeSrc = [];
	var t = exports.t = {};
	var R = 0;
	var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
	var safeRegexReplacements = [
		["\\s", 1],
		["\\d", MAX_LENGTH],
		[LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
	];
	var makeSafeRegex = (value) => {
		for (const [token, max] of safeRegexReplacements) value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
		return value;
	};
	var createToken = (name, value, isGlobal) => {
		const safe = makeSafeRegex(value);
		const index = R++;
		debug(name, index, value);
		t[name] = index;
		src[index] = value;
		safeSrc[index] = safe;
		re[index] = new RegExp(value, isGlobal ? "g" : void 0);
		safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
	};
	createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
	createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
	createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
	createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
	createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
	createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
	createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
	createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
	createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
	createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
	createToken("FULL", `^${src[t.FULLPLAIN]}$`);
	createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
	createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
	createToken("GTLT", "((?:<|>)?=?)");
	createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
	createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
	createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
	createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
	createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
	createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("COERCEPLAIN", `(^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
	createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
	createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
	createToken("COERCERTL", src[t.COERCE], true);
	createToken("COERCERTLFULL", src[t.COERCEFULL], true);
	createToken("LONETILDE", "(?:~>?)");
	createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
	exports.tildeTrimReplace = "$1~";
	createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
	createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("LONECARET", "(?:\\^)");
	createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
	exports.caretTrimReplace = "$1^";
	createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
	createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
	createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
	createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
	exports.comparatorTrimReplace = "$1$2$3";
	createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
	createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
	createToken("STAR", "(<|>)?=?\\s*\\*");
	createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
	createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
}));
//#endregion
//#region node_modules/semver/internal/identifiers.js
var require_identifiers = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var numeric = /^[0-9]+$/;
	var compareIdentifiers = (a, b) => {
		if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
		const anum = numeric.test(a);
		const bnum = numeric.test(b);
		if (anum && bnum) {
			a = +a;
			b = +b;
		}
		return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
	};
	var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
	module.exports = {
		compareIdentifiers,
		rcompareIdentifiers
	};
}));
//#endregion
//#region node_modules/semver/classes/semver.js
var require_semver = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var debug = require_debug();
	var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
	var { safeRe: re, t } = require_re();
	var parseOptions = require_parse_options();
	var { compareIdentifiers } = require_identifiers();
	var isPrereleaseIdentifier = (prerelease, identifier) => {
		const identifiers = identifier.split(".");
		if (identifiers.length > prerelease.length) return false;
		for (let i = 0; i < identifiers.length; i++) if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) return false;
		return true;
	};
	module.exports = class SemVer {
		constructor(version, options) {
			options = parseOptions(options);
			if (version instanceof SemVer) if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) return version;
			else version = version.version;
			else if (typeof version !== "string") throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
			if (version.length > MAX_LENGTH) throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
			debug("SemVer", version, options);
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
			if (!m) throw new TypeError(`Invalid Version: ${version}`);
			this.raw = version;
			this.major = +m[1];
			this.minor = +m[2];
			this.patch = +m[3];
			if (this.major > MAX_SAFE_INTEGER || this.major < 0) throw new TypeError("Invalid major version");
			if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) throw new TypeError("Invalid minor version");
			if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) throw new TypeError("Invalid patch version");
			if (!m[4]) this.prerelease = [];
			else this.prerelease = m[4].split(".").map((id) => {
				if (/^[0-9]+$/.test(id)) {
					const num = +id;
					if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
				}
				return id;
			});
			this.build = m[5] ? m[5].split(".") : [];
			this.format();
		}
		format() {
			this.version = `${this.major}.${this.minor}.${this.patch}`;
			if (this.prerelease.length) this.version += `-${this.prerelease.join(".")}`;
			return this.version;
		}
		toString() {
			return this.version;
		}
		compare(other) {
			debug("SemVer.compare", this.version, this.options, other);
			if (!(other instanceof SemVer)) {
				if (typeof other === "string" && other === this.version) return 0;
				other = new SemVer(other, this.options);
			}
			if (other.version === this.version) return 0;
			return this.compareMain(other) || this.comparePre(other);
		}
		compareMain(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			if (this.major < other.major) return -1;
			if (this.major > other.major) return 1;
			if (this.minor < other.minor) return -1;
			if (this.minor > other.minor) return 1;
			if (this.patch < other.patch) return -1;
			if (this.patch > other.patch) return 1;
			return 0;
		}
		comparePre(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			if (this.prerelease.length && !other.prerelease.length) return -1;
			else if (!this.prerelease.length && other.prerelease.length) return 1;
			else if (!this.prerelease.length && !other.prerelease.length) return 0;
			let i = 0;
			do {
				const a = this.prerelease[i];
				const b = other.prerelease[i];
				debug("prerelease compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		compareBuild(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			let i = 0;
			do {
				const a = this.build[i];
				const b = other.build[i];
				debug("build compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		inc(release, identifier, identifierBase) {
			if (release.startsWith("pre")) {
				if (!identifier && identifierBase === false) throw new Error("invalid increment argument: identifier is empty");
				if (identifier) {
					const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
					if (!match || match[1] !== identifier) throw new Error(`invalid identifier: ${identifier}`);
				}
			}
			switch (release) {
				case "premajor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor = 0;
					this.major++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "preminor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "prepatch":
					this.prerelease.length = 0;
					this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "prerelease":
					if (this.prerelease.length === 0) this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "release":
					if (this.prerelease.length === 0) throw new Error(`version ${this.raw} is not a prerelease`);
					this.prerelease.length = 0;
					break;
				case "major":
					if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
					this.minor = 0;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "minor":
					if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "patch":
					if (this.prerelease.length === 0) this.patch++;
					this.prerelease = [];
					break;
				case "pre": {
					const base = Number(identifierBase) ? 1 : 0;
					if (this.prerelease.length === 0) this.prerelease = [base];
					else {
						let i = this.prerelease.length;
						while (--i >= 0) if (typeof this.prerelease[i] === "number") {
							this.prerelease[i]++;
							i = -2;
						}
						if (i === -1) {
							if (identifier === this.prerelease.join(".") && identifierBase === false) throw new Error("invalid increment argument: identifier already exists");
							this.prerelease.push(base);
						}
					}
					if (identifier) {
						let prerelease = [identifier, base];
						if (identifierBase === false) prerelease = [identifier];
						if (isPrereleaseIdentifier(this.prerelease, identifier)) {
							const prereleaseBase = this.prerelease[identifier.split(".").length];
							if (isNaN(prereleaseBase)) this.prerelease = prerelease;
						} else this.prerelease = prerelease;
					}
					break;
				}
				default: throw new Error(`invalid increment argument: ${release}`);
			}
			this.raw = this.format();
			if (this.build.length) this.raw += `+${this.build.join(".")}`;
			return this;
		}
	};
}));
//#endregion
//#region node_modules/semver/functions/compare.js
var require_compare = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
	module.exports = compare;
}));
//#endregion
//#region node_modules/semver/functions/eq.js
var require_eq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var eq = (a, b, loose) => compare(a, b, loose) === 0;
	module.exports = eq;
}));
//#endregion
//#region node_modules/semver/functions/neq.js
var require_neq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var neq = (a, b, loose) => compare(a, b, loose) !== 0;
	module.exports = neq;
}));
//#endregion
//#region node_modules/semver/functions/gt.js
var require_gt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var gt = (a, b, loose) => compare(a, b, loose) > 0;
	module.exports = gt;
}));
//#endregion
//#region node_modules/semver/functions/gte.js
var require_gte = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var gte = (a, b, loose) => compare(a, b, loose) >= 0;
	module.exports = gte;
}));
//#endregion
//#region node_modules/semver/functions/lt.js
var require_lt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var lt = (a, b, loose) => compare(a, b, loose) < 0;
	module.exports = lt;
}));
//#endregion
//#region node_modules/semver/functions/lte.js
var require_lte = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var lte = (a, b, loose) => compare(a, b, loose) <= 0;
	module.exports = lte;
}));
//#endregion
//#region node_modules/semver/functions/cmp.js
var require_cmp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var eq = require_eq();
	var neq = require_neq();
	var gt = require_gt();
	var gte = require_gte();
	var lt = require_lt();
	var lte = require_lte();
	var cmp = (a, op, b, loose) => {
		switch (op) {
			case "===":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a === b;
			case "!==":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a !== b;
			case "":
			case "=":
			case "==": return eq(a, b, loose);
			case "!=": return neq(a, b, loose);
			case ">": return gt(a, b, loose);
			case ">=": return gte(a, b, loose);
			case "<": return lt(a, b, loose);
			case "<=": return lte(a, b, loose);
			default: throw new TypeError(`Invalid operator: ${op}`);
		}
	};
	module.exports = cmp;
}));
//#endregion
//#region node_modules/semver/classes/comparator.js
var require_comparator = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ANY = Symbol("SemVer ANY");
	module.exports = class Comparator {
		static get ANY() {
			return ANY;
		}
		constructor(comp, options) {
			options = parseOptions(options);
			if (comp instanceof Comparator) if (comp.loose === !!options.loose) return comp;
			else comp = comp.value;
			comp = comp.trim().split(/\s+/).join(" ");
			debug("comparator", comp, options);
			this.options = options;
			this.loose = !!options.loose;
			this.parse(comp);
			if (this.semver === ANY) this.value = "";
			else this.value = this.operator + this.semver.version;
			debug("comp", this);
		}
		parse(comp) {
			const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
			const m = comp.match(r);
			if (!m) throw new TypeError(`Invalid comparator: ${comp}`);
			this.operator = m[1] !== void 0 ? m[1] : "";
			if (this.operator === "=") this.operator = "";
			if (!m[2]) this.semver = ANY;
			else this.semver = new SemVer(m[2], this.options.loose);
		}
		toString() {
			return this.value;
		}
		test(version) {
			debug("Comparator.test", version, this.options.loose);
			if (this.semver === ANY || version === ANY) return true;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			return cmp(version, this.operator, this.semver, this.options);
		}
		intersects(comp, options) {
			if (!(comp instanceof Comparator)) throw new TypeError("a Comparator is required");
			if (this.operator === "") {
				if (this.value === "") return true;
				return new Range(comp.value, options).test(this.value);
			} else if (comp.operator === "") {
				if (comp.value === "") return true;
				return new Range(this.value, options).test(comp.semver);
			}
			options = parseOptions(options);
			if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) return false;
			if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) return false;
			if (this.operator.startsWith(">") && comp.operator.startsWith(">")) return true;
			if (this.operator.startsWith("<") && comp.operator.startsWith("<")) return true;
			if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) return true;
			if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) return true;
			if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) return true;
			return false;
		}
	};
	var parseOptions = require_parse_options();
	var { safeRe: re, t } = require_re();
	var cmp = require_cmp();
	var debug = require_debug();
	var SemVer = require_semver();
	var Range = require_range();
}));
//#endregion
//#region node_modules/semver/classes/range.js
var require_range = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SPACE_CHARACTERS = /\s+/g;
	module.exports = class Range {
		constructor(range, options) {
			options = parseOptions(options);
			if (range instanceof Range) if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) return range;
			else return new Range(range.raw, options);
			if (range instanceof Comparator) {
				this.raw = range.value;
				this.set = [[range]];
				this.formatted = void 0;
				return this;
			}
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
			this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
			if (!this.set.length) throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
			if (this.set.length > 1) {
				const first = this.set[0];
				this.set = this.set.filter((c) => !isNullSet(c[0]));
				if (this.set.length === 0) this.set = [first];
				else if (this.set.length > 1) {
					for (const c of this.set) if (c.length === 1 && isAny(c[0])) {
						this.set = [c];
						break;
					}
				}
			}
			this.formatted = void 0;
		}
		get range() {
			if (this.formatted === void 0) {
				this.formatted = "";
				for (let i = 0; i < this.set.length; i++) {
					if (i > 0) this.formatted += "||";
					const comps = this.set[i];
					for (let k = 0; k < comps.length; k++) {
						if (k > 0) this.formatted += " ";
						this.formatted += comps[k].toString().trim();
					}
				}
			}
			return this.formatted;
		}
		format() {
			return this.range;
		}
		toString() {
			return this.range;
		}
		parseRange(range) {
			range = range.replace(BUILDSTRIPRE, "");
			const memoKey = ((this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE)) + ":" + range;
			const cached = cache.get(memoKey);
			if (cached) return cached;
			const loose = this.options.loose;
			const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
			range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
			debug("hyphen replace", range);
			range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
			debug("comparator trim", range);
			range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
			debug("tilde trim", range);
			range = range.replace(re[t.CARETTRIM], caretTrimReplace);
			debug("caret trim", range);
			let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
			if (loose) rangeList = rangeList.filter((comp) => {
				debug("loose invalid filter", comp, this.options);
				return !!comp.match(re[t.COMPARATORLOOSE]);
			});
			debug("range list", rangeList);
			const rangeMap = /* @__PURE__ */ new Map();
			const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
			for (const comp of comparators) {
				if (isNullSet(comp)) return [comp];
				rangeMap.set(comp.value, comp);
			}
			if (rangeMap.size > 1 && rangeMap.has("")) rangeMap.delete("");
			const result = [...rangeMap.values()];
			cache.set(memoKey, result);
			return result;
		}
		intersects(range, options) {
			if (!(range instanceof Range)) throw new TypeError("a Range is required");
			return this.set.some((thisComparators) => {
				return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
					return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
						return rangeComparators.every((rangeComparator) => {
							return thisComparator.intersects(rangeComparator, options);
						});
					});
				});
			});
		}
		test(version) {
			if (!version) return false;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			for (let i = 0; i < this.set.length; i++) if (testSet(this.set[i], version, this.options)) return true;
			return false;
		}
	};
	var cache = new (require_lrucache())();
	var parseOptions = require_parse_options();
	var Comparator = require_comparator();
	var debug = require_debug();
	var SemVer = require_semver();
	var { safeRe: re, src, t, comparatorTrimReplace, tildeTrimReplace, caretTrimReplace } = require_re();
	var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
	var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
	var isNullSet = (c) => c.value === "<0.0.0-0";
	var isAny = (c) => c.value === "";
	var isSatisfiable = (comparators, options) => {
		let result = true;
		const remainingComparators = comparators.slice();
		let testComparator = remainingComparators.pop();
		while (result && remainingComparators.length) {
			result = remainingComparators.every((otherComparator) => {
				return testComparator.intersects(otherComparator, options);
			});
			testComparator = remainingComparators.pop();
		}
		return result;
	};
	var parseComparator = (comp, options) => {
		comp = comp.replace(re[t.BUILD], "");
		debug("comp", comp, options);
		comp = replaceCarets(comp, options);
		debug("caret", comp);
		comp = replaceTildes(comp, options);
		debug("tildes", comp);
		comp = replaceXRanges(comp, options);
		debug("xrange", comp);
		comp = replaceStars(comp, options);
		debug("stars", comp);
		return comp;
	};
	var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
	var invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
	var replaceTildes = (comp, options) => {
		return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
	};
	var replaceTilde = (comp, options) => {
		const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
		const z = options.includePrerelease ? "-0" : "";
		return comp.replace(r, (_, M, m, p, pr) => {
			debug("tilde", comp, _, M, m, p, pr);
			let ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
			else if (isX(p)) ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
			else if (pr) {
				debug("replaceTilde pr", pr);
				ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
			} else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
			debug("tilde return", ret);
			return ret;
		});
	};
	var replaceCarets = (comp, options) => {
		return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
	};
	var replaceCaret = (comp, options) => {
		debug("caret", comp, options);
		const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
		const z = options.includePrerelease ? "-0" : "";
		return comp.replace(r, (_, M, m, p, pr) => {
			debug("caret", comp, _, M, m, p, pr);
			let ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
			else if (isX(p)) if (M === "0") ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
			else ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
			else if (pr) {
				debug("replaceCaret pr", pr);
				if (M === "0") if (m === "0") ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
				else ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
				else ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
			} else {
				debug("no pr");
				if (M === "0") if (m === "0") ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
				else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
				else ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
			}
			debug("caret return", ret);
			return ret;
		});
	};
	var replaceXRanges = (comp, options) => {
		debug("replaceXRanges", comp, options);
		return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
	};
	var replaceXRange = (comp, options) => {
		comp = comp.trim();
		const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
		return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
			debug("xRange", comp, ret, gtlt, M, m, p, pr);
			if (invalidXRangeOrder(M, m, p)) return comp;
			const xM = isX(M);
			const xm = xM || isX(m);
			const xp = xm || isX(p);
			const anyX = xp;
			if (gtlt === "=" && anyX) gtlt = "";
			pr = options.includePrerelease ? "-0" : "";
			if (xM) if (gtlt === ">" || gtlt === "<") ret = "<0.0.0-0";
			else ret = "*";
			else if (gtlt && anyX) {
				if (xm) m = 0;
				p = 0;
				if (gtlt === ">") {
					gtlt = ">=";
					if (xm) {
						M = +M + 1;
						m = 0;
						p = 0;
					} else {
						m = +m + 1;
						p = 0;
					}
				} else if (gtlt === "<=") {
					gtlt = "<";
					if (xm) M = +M + 1;
					else m = +m + 1;
				}
				if (gtlt === "<") pr = "-0";
				ret = `${gtlt + M}.${m}.${p}${pr}`;
			} else if (xm) ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
			else if (xp) ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
			debug("xRange return", ret);
			return ret;
		});
	};
	var replaceStars = (comp, options) => {
		debug("replaceStars", comp, options);
		return comp.trim().replace(re[t.STAR], "");
	};
	var replaceGTE0 = (comp, options) => {
		debug("replaceGTE0", comp, options);
		return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
	};
	var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
		if (isX(fM)) from = "";
		else if (isX(fm)) from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
		else if (isX(fp)) from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
		else if (fpr) from = `>=${from}`;
		else from = `>=${from}${incPr ? "-0" : ""}`;
		if (isX(tM)) to = "";
		else if (isX(tm)) to = `<${+tM + 1}.0.0-0`;
		else if (isX(tp)) to = `<${tM}.${+tm + 1}.0-0`;
		else if (tpr) to = `<=${tM}.${tm}.${tp}-${tpr}`;
		else if (incPr) to = `<${tM}.${tm}.${+tp + 1}-0`;
		else to = `<=${to}`;
		return `${from} ${to}`.trim();
	};
	var testSet = (set, version, options) => {
		for (let i = 0; i < set.length; i++) if (!set[i].test(version)) return false;
		if (version.prerelease.length && !options.includePrerelease) {
			for (let i = 0; i < set.length; i++) {
				debug(set[i].semver);
				if (set[i].semver === Comparator.ANY) continue;
				if (set[i].semver.prerelease.length > 0) {
					const allowed = set[i].semver;
					if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) return true;
				}
			}
			return false;
		}
		return true;
	};
}));
//#endregion
//#region src/actions/drafter/config/parse-categories.ts
var import_valid = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var validRange = (range, options) => {
		try {
			return new Range(range, options).range || "*";
		} catch (er) {
			return null;
		}
	};
	module.exports = validRange;
})))(), 1);
var categoryMigrationDocumentationUrl = "https://github.com/release-drafter/release-drafter/pull/1558";
var withMigrationDocumentationLink = (message) => `${message} Migration documentation: ${categoryMigrationDocumentationUrl}`;
var normalizeConventional = (conventional, logger) => {
	if (!conventional) return;
	if (conventional === true) return {
		types: [],
		scopes: [],
		breaking: void 0
	};
	if (Object.keys(conventional).length === 0) logger.warning("Use 'conventional: true' instead of 'conventional: {}' to match any conventional title.");
	return {
		types: [...conventional.types || [], ...conventional.type ? [conventional.type] : []],
		scopes: [...conventional.scopes || [], ...conventional.scope ? [conventional.scope] : []],
		breaking: conventional.breaking
	};
};
/**
* Parses all categories from the config, normalizing conditions and
* handling backward compatibility with deprecated fields.
*
* This function:
* - Normalizes a missing `type` to `changelog` to match schema defaults
* - Normalizes the `when` field to always be an array of conditions
* - Applies deprecated category-level `label`/`labels` shorthands to every
*   normalized `when` condition
* - Warns when deprecated compatibility fields are used
* - Preserves all other category fields as-is
*
* Accepts both fully-typed and partial category objects for flexibility.
*
* @param categories - Categories from the raw config
* @returns Array of fully parsed categories with normalized conditions
*/
function parseCategories(categories, deprecatedConfig, logger) {
	const parsedCategories = structuredClone(categories.categories).map((cat) => {
		const { labels, label, when: _when, "collapse-after": rawCollapseAfter, "semver-increment": rawSemverIncrement, exclusive: rawExclusive, title, ..._cat } = cat;
		const collapseAfter = rawCollapseAfter ?? categorySchemaDefaults["collapse-after"];
		const semverIncrement = rawSemverIncrement ?? categorySchemaDefaults["semver-increment"];
		const exclusive = rawExclusive ?? categorySchemaDefaults.exclusive;
		const deprecatedLabels = [...labels || [], ...label ? [label] : []];
		if (deprecatedLabels.length > 0) logger.warning(withMigrationDocumentationLink(`Use of deprecated 'categories[*].label' or 'categories[*].labels' field detected${title ? ` on category "${title}"` : ""}. Please migrate. This field will be removed in a future release. To migrate, move the labels into the category's 'when' condition.`));
		const parsedWhenConditions = (_when !== void 0 ? Array.isArray(_when) ? _when.length > 0 || deprecatedLabels.length === 0 ? _when : [{}] : [_when] : deprecatedLabels.length > 0 ? [{}] : []).map((condition) => {
			const { path, label, conventional, ..._cond } = condition;
			const normalizedConventional = normalizeConventional(conventional, logger);
			return {
				..._cond,
				"labels-mode": condition["labels-mode"] ?? changeConditionSchemaDefaults["labels-mode"],
				"paths-mode": condition["paths-mode"] ?? changeConditionSchemaDefaults["paths-mode"],
				paths: [...condition.paths || [], ...path ? [path] : []],
				labels: [
					...deprecatedLabels,
					...condition.labels || [],
					...label ? [label] : []
				],
				...normalizedConventional ? { conventional: normalizedConventional } : {}
			};
		}).filter((condition) => condition.paths.length > 0 || condition.labels.length > 0 || !!condition.conventional);
		const categoryType = _cat.type ?? categorySchemaDefaults.type;
		switch (categoryType) {
			case "changelog": return {
				type: "changelog",
				when: parsedWhenConditions,
				"collapse-after": collapseAfter,
				"semver-increment": semverIncrement,
				exclusive,
				title
			};
			case "version-resolver":
				if (title) logger.warning(`Title "${title}" ignored for category of type "${categoryType}"`);
				if (collapseAfter !== -1) logger.warning(`"collapse-after" "${collapseAfter}" ignored for category of type "${categoryType}"`);
				return {
					type: "version-resolver",
					when: parsedWhenConditions,
					"semver-increment": semverIncrement,
					exclusive
				};
			case "pre-exclude":
			case "pre-include":
				if (title) logger.warning(`Title "${title}" ignored for category of type "${categoryType}"`);
				if (collapseAfter !== -1) logger.warning(`"collapse-after" "${collapseAfter}" ignored for category of type "${categoryType}"`);
				if (exclusive) throw new Error(`"exclusive" can only be set on categories of type "changelog" or "version-resolver"; it cannot be used on category of type "${categoryType}".`);
				if (semverIncrement !== "patch") logger.warning(`"semver-increment" "${semverIncrement}" ignored for category of type "${categoryType}"`);
				return {
					type: categoryType,
					when: parsedWhenConditions
				};
			default: throw new Error(`Unsupported category type: ${categoryType}`);
		}
	});
	if (deprecatedConfig["exclude-labels"] && deprecatedConfig["exclude-labels"].length > 0 || deprecatedConfig["exclude-paths"] && deprecatedConfig["exclude-paths"].length > 0) logger.warning(withMigrationDocumentationLink(`Use of deprecated 'exclude-labels' or 'exclude-paths' field detected. Please migrate. This field will be removed in a future release. To migrate, add the correspoding labels or paths to a 'type: "pre-exclude"' category.`));
	if (deprecatedConfig["exclude-labels"] && deprecatedConfig["exclude-labels"].length > 0 || deprecatedConfig["exclude-paths"] && deprecatedConfig["exclude-paths"].length > 0) {
		if (parsedCategories.findIndex((cat) => cat.type === "pre-exclude") !== -1) throw new Error("A 'pre-exclude' category already exists. Cannot migrate deprecated exclude-labels field. Please either remove the deprecated field or remove the existing 'pre-exclude' category to resolve this conflict.");
		parsedCategories.push({
			type: "pre-exclude",
			when: [{
				labels: deprecatedConfig["exclude-labels"] || [],
				"labels-mode": "any",
				paths: deprecatedConfig["exclude-paths"] || [],
				"paths-mode": "any"
			}]
		});
	}
	if (deprecatedConfig["include-labels"] && deprecatedConfig["include-labels"].length > 0 || deprecatedConfig["include-paths"] && deprecatedConfig["include-paths"].length > 0) {
		logger.warning(withMigrationDocumentationLink(`Use of deprecated 'include-labels' or 'include-paths' field detected. Please migrate. This field will be removed in a future release. To migrate, add the correspoding labels or paths to a 'type: "pre-include"' category.`));
		if (parsedCategories.findIndex((cat) => cat.type === "pre-include") !== -1) throw new Error("A 'pre-include' category already exists. Cannot migrate deprecated include-labels or include-paths fields. Please either remove the deprecated fields or remove the existing 'pre-include' category to resolve this conflict.");
		parsedCategories.push({
			type: "pre-include",
			when: [{
				labels: deprecatedConfig["include-labels"] || [],
				"labels-mode": "any",
				paths: deprecatedConfig["include-paths"] || [],
				"paths-mode": "any"
			}]
		});
	}
	if (deprecatedConfig["version-resolver"].default !== configSchemaDefaults["version-resolver"].default) {
		logger.warning(withMigrationDocumentationLink(`Use of deprecated 'version-resolver.default' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "${deprecatedConfig["version-resolver"].default}"' to 'type: changelog' category with no 'when' condition (uncategorized changes), or move the default resolver to a new category with type 'version-resolver' and 'semver-increment' set to "${deprecatedConfig["version-resolver"].default}" - also without 'when' conditions.`));
		if (parsedCategories.findIndex((cat) => cat.type === "version-resolver" && cat.when.length === 0) !== -1) throw new Error("A 'version-resolver' category with no 'when' condition already exists. Cannot migrate deprecated 'version-resolver.default' field. Please either remove the deprecated field or remove the existing 'version-resolver' category to resolve this conflict.");
		parsedCategories.push({
			type: "version-resolver",
			"semver-increment": deprecatedConfig["version-resolver"].default,
			when: [],
			exclusive: false
		});
	}
	if (deprecatedConfig["version-resolver"].major.labels !== configSchemaDefaults["version-resolver"].major.labels && deprecatedConfig["version-resolver"].major.labels.length > 0) {
		logger.warning(withMigrationDocumentationLink(`Use of deprecated 'version-resolver.major.labels' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "major"' to a pre-existing 'type: changelog' category, or move the labels from 'version-resolver.major.labels' to a new category with type 'version-resolver' and 'semver-increment' set to 'major'.`));
		parsedCategories.push({
			type: "version-resolver",
			"semver-increment": "major",
			when: [{
				labels: deprecatedConfig["version-resolver"].major.labels || [],
				"labels-mode": "any",
				paths: [],
				"paths-mode": "any"
			}],
			exclusive: false
		});
	}
	if (deprecatedConfig["version-resolver"].minor.labels !== configSchemaDefaults["version-resolver"].minor.labels && deprecatedConfig["version-resolver"].minor.labels.length > 0) {
		logger.warning(withMigrationDocumentationLink(`Use of deprecated 'version-resolver.minor.labels' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "minor"' to a pre-existing 'type: changelog' category, or move the labels from 'version-resolver.minor.labels' to a new category with type 'version-resolver' and 'semver-increment' set to 'minor'.`));
		parsedCategories.push({
			type: "version-resolver",
			"semver-increment": "minor",
			when: [{
				labels: deprecatedConfig["version-resolver"].minor.labels || [],
				"labels-mode": "any",
				paths: [],
				"paths-mode": "any"
			}],
			exclusive: false
		});
	}
	if (deprecatedConfig["version-resolver"].patch.labels !== configSchemaDefaults["version-resolver"].patch.labels && deprecatedConfig["version-resolver"].patch.labels.length > 0) {
		logger.warning(withMigrationDocumentationLink(`Use of deprecated 'version-resolver.patch.labels' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "patch"' to a pre-existing 'type: changelog' category, or move the labels from 'version-resolver.patch.labels' to a new category with type 'version-resolver' and 'semver-increment' set to 'patch'.`));
		parsedCategories.push({
			type: "version-resolver",
			"semver-increment": "patch",
			when: [{
				labels: deprecatedConfig["version-resolver"].patch.labels || [],
				"labels-mode": "any",
				paths: [],
				"paths-mode": "any"
			}],
			exclusive: false
		});
	}
	return parsedCategories;
}
//#endregion
//#region src/actions/drafter/config/merge-input-and-config.ts
/**
* Returns a copy of `config`, updated with values from `input`.
*
* Also performs some validation.
*
* Input takes precedence, because it's more easy to change at runtime
*/
var mergeInputAndConfig = (params) => {
	const { config: originalConfig, input } = params;
	const { "exclude-labels": excludeLabels, "include-labels": includeLabels, "include-paths": includePaths, "exclude-paths": excludePaths, "version-resolver": versionResolver, ...config } = structuredClone(originalConfig);
	const deprecatedCategoryConfig = {
		"exclude-labels": excludeLabels,
		"include-labels": includeLabels,
		"include-paths": includePaths,
		"exclude-paths": excludePaths,
		"version-resolver": versionResolver
	};
	applyOverrides(config, input, params.logger);
	const { commitish, latest, prerelease } = getParsedDefaults(config, params.ref);
	const replacers = getTransformedReplacers(config, params.logger);
	const categories = getTransformedCategories(config, deprecatedCategoryConfig, params.logger);
	const parsedConfig = {
		...config,
		commitish,
		latest,
		prerelease,
		replacers,
		categories
	};
	validateParsedConfig(parsedConfig);
	return parsedConfig;
};
var applyOverrides = (config, input, logger) => {
	applyStringOverride(config, input, "commitish", logger);
	applyStringOverride(config, input, "header", logger);
	applyStringOverride(config, input, "footer", logger);
	applyStringOverride(config, input, "prerelease-identifier", logger);
	applyBooleanOverride(config, input, "prerelease", logger);
	applyBooleanOverride(config, input, "include-pre-releases", logger);
	applyBooleanOverride(config, input, "latest", logger);
	applyStringOverride(config, input, "filter-by-range", logger);
	applyReleaseModeOverrides(config, input, logger);
};
var applyReleaseModeOverrides = (config, input, logger) => {
	if (config.latest && config.prerelease) {
		logger.warning("'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release.");
		config.latest = false;
	}
	const hasInputPrerelease = typeof input.prerelease === "boolean";
	const hasInputPrereleaseIdentifier = !!input["prerelease-identifier"];
	if (config["prerelease-identifier"] && !config.prerelease && (!hasInputPrerelease || hasInputPrereleaseIdentifier)) {
		logger.warning(`You specified a 'prerelease-identifier' (${config["prerelease-identifier"]}), but 'prerelease' is set to false. Switching to true.`);
		config.prerelease = true;
	}
};
var applyBooleanOverride = (config, input, key, logger) => {
	const inputValue = input[key];
	if (typeof inputValue !== "boolean") return;
	const configValue = config[key];
	if (typeof configValue === "boolean" && configValue !== inputValue) logger.info(`Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`);
	config[key] = inputValue;
};
var applyStringOverride = (config, input, key, logger) => {
	const inputValue = input[key];
	if (!inputValue) return;
	const configValue = config[key];
	if (configValue && configValue !== inputValue) logger.info(`Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`);
	config[key] = inputValue;
};
var getParsedDefaults = (config, ref) => ({
	commitish: config.commitish || ref || "",
	latest: typeof config.latest !== "boolean" ? true : config.latest,
	prerelease: typeof config.prerelease !== "boolean" ? false : config.prerelease
});
var getTransformedReplacers = (config, logger) => config.replacers.map((r) => {
	try {
		return {
			...r,
			search: stringToRegex(r.search)
		};
	} catch {
		logger.warning(`Bad replacer regex: '${r.search}'`);
		return false;
	}
}).filter((r) => !!r);
var getTransformedCategories = (config, deprecatedCategoryConfig, logger) => parseCategories(config, deprecatedCategoryConfig, logger);
var validateParsedConfig = (parsedConfig) => {
	if (!parsedConfig.commitish) throw new Error("'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)");
	if (parsedConfig.categories.filter((category) => category.type === "changelog" && !category.title).length > 0) throw new Error("Every 'type: \"changelog\"' category must define a non-empty 'title'.");
	if (parsedConfig.categories.filter((category) => category.type === "changelog" && category.when.length === 0).length > 1) throw new Error("Multiple 'type: \"changelog\"' categories detected with no 'when' condition. Only one such category is supported for uncategorized changes.");
	if (parsedConfig["filter-by-range"] && !(0, import_valid.default)(parsedConfig["filter-by-range"])) throw new Error(`'filter-by-range' value "${parsedConfig["filter-by-range"]}" could not be parsed as a valid semver range.`);
};
var actionInputSchema = object({
	/**
	* If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
	* The config should still be located inside `.github` as that's where we are looking for config files.
	* @default 'release-drafter.yml'
	*/
	"config-name": string().optional().default("release-drafter.yml"),
	/**
	* The name that will be used in the GitHub release that's created or updated.
	* This will override any `name-template` specified in your `release-drafter.yml` if defined.
	*/
	name: string().optional(),
	/**
	* The tag name to be associated with the GitHub release that's created or updated.
	* This will override any `tag-template` specified in your `release-drafter.yml` if defined.
	*/
	tag: string().optional(),
	/**
	* The version to be associated with the GitHub release that's created or updated.
	* This will override any version calculated by the release-drafter.
	*/
	version: string().optional(),
	/**
	* A boolean indicating whether the release being created or updated should be immediately published.
	*/
	publish: stringbool().optional().default(false)
}).and(sharedInputSchema).and(commonConfigSchema);
//#endregion
//#region node_modules/conventional-commits-parser/dist/regex.js
var nomatchRegex = /(?!.*)/;
function escape(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function joinOr(parts) {
	return parts.map((val) => typeof val === "string" ? escape(val.trim()) : val.source).filter(Boolean).join("|");
}
function getNotesRegex(noteKeywords, notesPattern) {
	if (!noteKeywords) return nomatchRegex;
	const noteKeywordsSelection = joinOr(noteKeywords);
	if (!notesPattern) return new RegExp(`^[\\s|*]*(${noteKeywordsSelection})[:\\s]+(.*)`, "i");
	return notesPattern(noteKeywordsSelection);
}
function getReferencePartsRegex(issuePrefixes, issuePrefixesCaseSensitive) {
	if (!issuePrefixes) return nomatchRegex;
	const flags = issuePrefixesCaseSensitive ? "g" : "gi";
	return new RegExp(`(?:.*?)??\\s*([\\w-\\.\\/]*?)??(${joinOr(issuePrefixes)})([\\w-]+)(?=\\s|$|[,;)\\]])`, flags);
}
function getReferencesRegex(referenceActions) {
	if (!referenceActions) return /()(.+)/gi;
	const joinedKeywords = joinOr(referenceActions);
	return new RegExp(`(${joinedKeywords})(?:\\s+(.*?))(?=(?:${joinedKeywords})|$)`, "gi");
}
/**
* Make the regexes used to parse a commit.
* @param options
* @returns Regexes.
*/
function getParserRegexes(options = {}) {
	return {
		notes: getNotesRegex(options.noteKeywords, options.notesPattern),
		referenceParts: getReferencePartsRegex(options.issuePrefixes, options.issuePrefixesCaseSensitive),
		references: getReferencesRegex(options.referenceActions),
		mentions: /@([\w-]+)/g,
		url: /\b(?:https?):\/\/(?:www\.)?([-a-zA-Z0-9@:%_+.~#?&//=])+\b/
	};
}
//#endregion
//#region node_modules/conventional-commits-parser/dist/utils.js
var SCISSOR = "------------------------ >8 ------------------------";
/**
* Remove leading and trailing newlines.
* @param input
* @returns String without leading and trailing newlines.
*/
function trimNewLines(input) {
	const matches = input.match(/[^\r\n]/);
	if (typeof matches?.index !== "number") return "";
	const firstIndex = matches.index;
	let lastIndex = input.length - 1;
	while (input[lastIndex] === "\r" || input[lastIndex] === "\n") lastIndex--;
	return input.substring(firstIndex, lastIndex + 1);
}
/**
* Append a newline to a string.
* @param src
* @param line
* @returns String with appended newline.
*/
function appendLine(src, line) {
	return src ? `${src}\n${line || ""}` : line || "";
}
/**
* Creates a function that filters out comments lines.
* @param char
* @returns Comment filter function.
*/
function getCommentFilter(char) {
	return char ? (line) => !line.startsWith(char) : () => true;
}
/**
* Select lines before the scissor.
* @param lines
* @param commentChar
* @returns Lines before the scissor.
*/
function truncateToScissor(lines, commentChar) {
	const scissorIndex = lines.indexOf(`${commentChar} ${SCISSOR}`);
	if (scissorIndex === -1) return lines;
	return lines.slice(0, scissorIndex);
}
/**
* Filter out GPG sign lines.
* @param line
* @returns True if the line is not a GPG sign line.
*/
function gpgFilter(line) {
	return !line.match(/^\s*gpg:/);
}
/**
* Assign matched correspondence to the target object.
* @param target - The target object to assign values to.
* @param matches - The RegExp match array containing the matched groups.
* @param correspondence - An array of keys that correspond to the matched groups.
* @returns The target object with assigned values.
*/
function assignMatchedCorrespondence(target, matches, correspondence) {
	const { groups } = matches;
	for (let i = 0, len = correspondence.length, key; i < len; i++) {
		key = correspondence[i];
		target[key] = (groups ? groups[key] : matches[i + 1]) || null;
	}
	return target;
}
//#endregion
//#region node_modules/conventional-commits-parser/dist/options.js
var defaultOptions = {
	noteKeywords: ["BREAKING CHANGE", "BREAKING-CHANGE"],
	issuePrefixes: ["#"],
	referenceActions: [
		"close",
		"closes",
		"closed",
		"fix",
		"fixes",
		"fixed",
		"resolve",
		"resolves",
		"resolved"
	],
	headerPattern: /^(\w*)(?:\(([\w$@.\-*/ ]*)\))?: (.*)$/,
	headerCorrespondence: [
		"type",
		"scope",
		"subject"
	],
	revertPattern: /^Revert\s"([\s\S]*)"\s*This reverts commit (\w*)\.?/,
	revertCorrespondence: ["header", "hash"],
	fieldPattern: /^-(.*?)-$/
};
//#endregion
//#region node_modules/conventional-commits-parser/dist/CommitParser.js
/**
* Helper to create commit object.
* @param initialData - Initial commit data.
* @returns Commit object with empty data.
*/
function createCommitObject(initialData = {}) {
	return {
		merge: null,
		revert: null,
		header: null,
		body: null,
		footer: null,
		notes: [],
		mentions: [],
		references: [],
		...initialData
	};
}
/**
* Commit message parser.
*/
var CommitParser = class {
	options;
	regexes;
	lines = [];
	lineIndex = 0;
	commit = createCommitObject();
	constructor(options = {}) {
		this.options = {
			...defaultOptions,
			...options
		};
		this.regexes = getParserRegexes(this.options);
	}
	currentLine() {
		return this.lines[this.lineIndex];
	}
	nextLine() {
		return this.lines[this.lineIndex++];
	}
	isLineAvailable() {
		return this.lineIndex < this.lines.length;
	}
	parseReference(input, action) {
		const { regexes } = this;
		if (regexes.url.test(input)) return null;
		const matches = regexes.referenceParts.exec(input);
		if (!matches) return null;
		let [raw, repository = null, prefix, issue] = matches;
		let owner = null;
		if (repository) {
			const slashIndex = repository.indexOf("/");
			if (slashIndex !== -1) {
				owner = repository.slice(0, slashIndex);
				repository = repository.slice(slashIndex + 1);
			}
		}
		return {
			raw,
			action,
			owner,
			repository,
			prefix,
			issue
		};
	}
	parseReferences(input) {
		const { regexes } = this;
		const regex = input.match(regexes.references) ? regexes.references : /()(.+)/gi;
		const references = [];
		let matches;
		let action;
		let sentence;
		let reference;
		while (true) {
			matches = regex.exec(input);
			if (!matches) break;
			action = matches[1] || null;
			sentence = matches[2] || "";
			while (true) {
				reference = this.parseReference(sentence, action);
				if (!reference) break;
				references.push(reference);
			}
		}
		return references;
	}
	skipEmptyLines() {
		let line = this.currentLine();
		while (line !== void 0 && !line.trim()) {
			this.nextLine();
			line = this.currentLine();
		}
	}
	parseMerge() {
		const { commit, options } = this;
		const correspondence = options.mergeCorrespondence || [];
		const merge = this.currentLine();
		const matches = merge && options.mergePattern ? merge.match(options.mergePattern) : null;
		if (matches) {
			this.nextLine();
			commit.merge = matches[0] || null;
			assignMatchedCorrespondence(commit, matches, correspondence);
			return true;
		}
		return false;
	}
	parseHeader(isMergeCommit) {
		if (isMergeCommit) this.skipEmptyLines();
		const { commit, options } = this;
		const correspondence = options.headerCorrespondence || [];
		const header = commit.header ?? this.nextLine();
		let matches = null;
		if (header) {
			if (options.breakingHeaderPattern) matches = header.match(options.breakingHeaderPattern);
			if (!matches && options.headerPattern) matches = header.match(options.headerPattern);
		}
		if (header) commit.header = header;
		if (matches) assignMatchedCorrespondence(commit, matches, correspondence);
	}
	parseMeta() {
		const { options, commit } = this;
		if (!options.fieldPattern || !this.isLineAvailable()) return false;
		let matches;
		let field = null;
		let parsed = false;
		while (this.isLineAvailable()) {
			matches = this.currentLine().match(options.fieldPattern);
			if (matches) {
				field = matches[1] || null;
				this.nextLine();
				continue;
			}
			if (field) {
				parsed = true;
				commit[field] = appendLine(commit[field], this.currentLine());
				this.nextLine();
			} else break;
		}
		return parsed;
	}
	parseNotes() {
		const { regexes, commit } = this;
		if (!this.isLineAvailable()) return false;
		const matches = this.currentLine().match(regexes.notes);
		let references = [];
		if (matches) {
			const note = {
				title: matches[1],
				text: matches[2]
			};
			commit.notes.push(note);
			commit.footer = appendLine(commit.footer, this.currentLine());
			this.nextLine();
			while (this.isLineAvailable()) {
				if (this.parseMeta()) return true;
				if (this.parseNotes()) return true;
				references = this.parseReferences(this.currentLine());
				if (references.length) commit.references.push(...references);
				else note.text = appendLine(note.text, this.currentLine());
				commit.footer = appendLine(commit.footer, this.currentLine());
				this.nextLine();
				if (references.length) break;
			}
			return true;
		}
		return false;
	}
	parseBodyAndFooter(isBody) {
		const { commit } = this;
		if (!this.isLineAvailable()) return isBody;
		const references = this.parseReferences(this.currentLine());
		const isStillBody = !references.length && isBody;
		if (isStillBody) commit.body = appendLine(commit.body, this.currentLine());
		else {
			commit.references.push(...references);
			commit.footer = appendLine(commit.footer, this.currentLine());
		}
		this.nextLine();
		return isStillBody;
	}
	parseBreakingHeader() {
		const { commit, options } = this;
		if (!options.breakingHeaderPattern || commit.notes.length || !commit.header) return;
		const matches = commit.header.match(options.breakingHeaderPattern);
		if (matches) commit.notes.push({
			title: "BREAKING CHANGE",
			text: matches[3]
		});
	}
	parseMentions(input) {
		const { commit, regexes } = this;
		let matches;
		for (;;) {
			matches = regexes.mentions.exec(input);
			if (!matches) break;
			commit.mentions.push(matches[1]);
		}
	}
	parseRevert(input) {
		const { commit, options } = this;
		const correspondence = options.revertCorrespondence || [];
		const matches = options.revertPattern ? input.match(options.revertPattern) : null;
		if (matches) commit.revert = assignMatchedCorrespondence({}, matches, correspondence);
	}
	cleanupCommit() {
		const { commit } = this;
		if (commit.body) commit.body = trimNewLines(commit.body);
		if (commit.footer) commit.footer = trimNewLines(commit.footer);
		commit.notes.forEach((note) => {
			note.text = trimNewLines(note.text);
		});
		const referencesSet = /* @__PURE__ */ new Set();
		commit.references = commit.references.filter((reference) => {
			const uid = `${reference.action} ${reference.raw}`.toLocaleLowerCase();
			const ok = !referencesSet.has(uid);
			if (ok) referencesSet.add(uid);
			return ok;
		});
	}
	/**
	* Parse commit message string into an object.
	* @param input - Commit message string.
	* @returns Commit object.
	*/
	parse(input) {
		if (!input.trim()) throw new TypeError("Expected a raw commit");
		const { commentChar } = this.options;
		const commentFilter = getCommentFilter(commentChar);
		const rawLines = trimNewLines(input).split(/\r?\n/);
		const lines = commentChar ? truncateToScissor(rawLines, commentChar).filter((line) => commentFilter(line) && gpgFilter(line)) : rawLines.filter((line) => gpgFilter(line));
		const commit = createCommitObject();
		this.lines = lines;
		this.lineIndex = 0;
		this.commit = commit;
		const isMergeCommit = this.parseMerge();
		this.parseHeader(isMergeCommit);
		if (commit.header) commit.references = this.parseReferences(commit.header);
		let isBody = true;
		while (this.isLineAvailable()) {
			this.parseMeta();
			if (this.parseNotes()) isBody = false;
			if (!this.parseBodyAndFooter(isBody)) isBody = false;
		}
		this.parseBreakingHeader();
		this.parseMentions(input);
		this.parseRevert(input);
		this.cleanupCommit();
		return commit;
	}
};
//#endregion
//#region src/actions/drafter/common/category-matching.ts
var import_ignore = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	function makeArray(subject) {
		return Array.isArray(subject) ? subject : [subject];
	}
	var UNDEFINED = void 0;
	var EMPTY = "";
	var SPACE = " ";
	var ESCAPE = "\\";
	var REGEX_TEST_BLANK_LINE = /^\s+$/;
	var REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
	var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
	var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
	var REGEX_SPLITALL_CRLF = /\r?\n/g;
	var REGEX_TEST_INVALID_PATH = /^\.{0,2}\/|^\.{1,2}$/;
	var REGEX_TEST_TRAILING_SLASH = /\/$/;
	var SLASH = "/";
	var TMP_KEY_IGNORE = "node-ignore";
	/* istanbul ignore else */
	if (typeof Symbol !== "undefined") TMP_KEY_IGNORE = Symbol.for("node-ignore");
	var KEY_IGNORE = TMP_KEY_IGNORE;
	var define = (object, key, value) => {
		Object.defineProperty(object, key, { value });
		return value;
	};
	var REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;
	var RETURN_FALSE = () => false;
	var sanitizeRange = (range) => range.replace(REGEX_REGEXP_RANGE, (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY);
	var negateRange = (range) => range.startsWith("!") || range.startsWith("\\^") ? `^${range.slice(range[0] === "!" ? 1 : 2)}` : range;
	var cleanRangeBackSlash = (slashes) => {
		const { length } = slashes;
		return slashes.slice(0, length - length % 2);
	};
	var REPLACERS = [
		[/^\uFEFF/, () => EMPTY],
		[/((?:\\\\)*?)(\\?\s+)$/, (_, m1, m2) => m1 + (m2.indexOf("\\") === 0 ? SPACE : EMPTY)],
		[/(\\+?)\s/g, (_, m1) => {
			const { length } = m1;
			return m1.slice(0, length - length % 2) + SPACE;
		}],
		[/[\\$.|*+(){^]/g, (match) => `\\${match}`],
		[/(?!\\)\?/g, () => "[^/]"],
		[/^\//, () => "^"],
		[/\//g, () => "\\/"],
		[/^\^*(?:\\\*\\\*\\\/)+/, () => "^(?:.*\\/)?"],
		[/^(?=[^^])/, function startingReplacer() {
			return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
		}],
		[/\\\/\\\*\\\*(?=\\\/|$)/g, (_, index, str) => index + 6 < str.length ? "(?:\\/[^\\/]+)*" : "\\/.+"],
		[/(^|[^\\]+)(\\\*)+(?=.+)/g, (_, p1, p2) => {
			return p1 + p2.replace(/\\\*/g, "[^\\/]*");
		}],
		[/\\\\\\(?=[$.|*+(){^])/g, () => ESCAPE],
		[/\\\\/g, () => ESCAPE],
		[/(\\)?\[([^\]/]*?)(\\*)($|\])/g, (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}` : close === "]" ? endEscape.length % 2 === 0 ? `[${negateRange(sanitizeRange(range))}${endEscape}]` : "[]" : "[]"],
		[/(?:[^*])$/, (match) => /\/$/.test(match) ? `${match}$` : `${match}(?=$|\\/$)`]
	];
	var REGEX_REPLACE_TRAILING_WILDCARD = /(^|\\\/)?\\\*$/;
	var MODE_IGNORE = "regex";
	var MODE_CHECK_IGNORE = "checkRegex";
	var TRAILING_WILD_CARD_REPLACERS = {
		[MODE_IGNORE](_, p1) {
			return `${p1 ? `${p1}[^/]+` : "[^/]*"}(?=$|\\/$)`;
		},
		[MODE_CHECK_IGNORE](_, p1) {
			return `${p1 ? `${p1}[^/]*` : "[^/]*"}(?=$|\\/$)`;
		}
	};
	var makeRegexPrefix = (pattern) => REPLACERS.reduce((prev, [matcher, replacer]) => prev.replace(matcher, replacer.bind(pattern)), pattern);
	var isString = (subject) => typeof subject === "string";
	var checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_TEST_BLANK_LINE.test(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern) && pattern.indexOf("#") !== 0;
	var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF).filter(Boolean);
	var IgnoreRule = class {
		constructor(pattern, mark, body, ignoreCase, negative, prefix) {
			this.pattern = pattern;
			this.mark = mark;
			this.negative = negative;
			define(this, "body", body);
			define(this, "ignoreCase", ignoreCase);
			define(this, "regexPrefix", prefix);
		}
		get regex() {
			const key = "_regex";
			if (this[key]) return this[key];
			return this._make(MODE_IGNORE, key);
		}
		get checkRegex() {
			const key = "_checkRegex";
			if (this[key]) return this[key];
			return this._make(MODE_CHECK_IGNORE, key);
		}
		_make(mode, key) {
			const str = this.regexPrefix.replace(REGEX_REPLACE_TRAILING_WILDCARD, TRAILING_WILD_CARD_REPLACERS[mode]);
			const regex = this.ignoreCase ? new RegExp(str, "i") : new RegExp(str);
			return define(this, key, regex);
		}
	};
	var createRule = ({ pattern, mark }, ignoreCase) => {
		let negative = false;
		let body = pattern;
		if (body.indexOf("!") === 0) {
			negative = true;
			body = body.substr(1);
		}
		body = body.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
		const regexPrefix = makeRegexPrefix(body);
		return new IgnoreRule(pattern, mark, body, ignoreCase, negative, regexPrefix);
	};
	var RuleManager = class {
		constructor(ignoreCase) {
			this._ignoreCase = ignoreCase;
			this._rules = [];
		}
		_add(pattern) {
			if (pattern && pattern[KEY_IGNORE]) {
				this._rules = this._rules.concat(pattern._rules._rules);
				this._added = true;
				return;
			}
			if (isString(pattern)) pattern = { pattern };
			if (checkPattern(pattern.pattern)) {
				const rule = createRule(pattern, this._ignoreCase);
				this._added = true;
				this._rules.push(rule);
			}
		}
		add(pattern) {
			this._added = false;
			makeArray(isString(pattern) ? splitPattern(pattern) : pattern).forEach(this._add, this);
			return this._added;
		}
		test(path, checkUnignored, mode) {
			let ignored = false;
			let unignored = false;
			let matchedRule;
			this._rules.forEach((rule) => {
				const { negative } = rule;
				if (unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored) return;
				if (!rule[mode].test(path)) return;
				ignored = !negative;
				unignored = negative;
				matchedRule = negative ? UNDEFINED : rule;
			});
			const ret = {
				ignored,
				unignored
			};
			if (matchedRule) ret.rule = matchedRule;
			return ret;
		}
	};
	var throwError = (message, Ctor) => {
		throw new Ctor(message);
	};
	var checkPath = (path, originalPath, doThrow) => {
		if (!isString(path)) return doThrow(`path must be a string, but got \`${originalPath}\``, TypeError);
		if (!path) return doThrow(`path must not be empty`, TypeError);
		if (checkPath.isNotRelative(path)) return doThrow(`path should be a \`path.relative()\`d string, but got "${originalPath}"`, RangeError);
		return true;
	};
	var isNotRelative = (path) => REGEX_TEST_INVALID_PATH.test(path);
	checkPath.isNotRelative = isNotRelative;
	/* istanbul ignore next */
	checkPath.convert = (p) => p;
	var Ignore = class {
		constructor({ ignorecase = true, ignoreCase = ignorecase, allowRelativePaths = false } = {}) {
			define(this, KEY_IGNORE, true);
			this._rules = new RuleManager(ignoreCase);
			this._strictPathCheck = !allowRelativePaths;
			this._initCache();
		}
		_initCache() {
			this._ignoreCache = Object.create(null);
			this._testCache = Object.create(null);
		}
		add(pattern) {
			if (this._rules.add(pattern)) this._initCache();
			return this;
		}
		addPattern(pattern) {
			return this.add(pattern);
		}
		_test(originalPath, cache, checkUnignored, slices) {
			const path = originalPath && checkPath.convert(originalPath);
			checkPath(path, originalPath, this._strictPathCheck ? throwError : RETURN_FALSE);
			return this._t(path, cache, checkUnignored, slices);
		}
		checkIgnore(path) {
			if (!REGEX_TEST_TRAILING_SLASH.test(path)) return this.test(path);
			const slices = path.split(SLASH).filter(Boolean);
			slices.pop();
			if (slices.length) {
				const parent = this._t(slices.join(SLASH) + SLASH, this._testCache, true, slices);
				if (parent.ignored) return parent;
			}
			return this._rules.test(path, false, MODE_CHECK_IGNORE);
		}
		_t(path, cache, checkUnignored, slices) {
			if (path in cache) return cache[path];
			if (!slices) slices = path.split(SLASH).filter(Boolean);
			slices.pop();
			if (!slices.length) return cache[path] = this._rules.test(path, checkUnignored, MODE_IGNORE);
			const parent = this._t(slices.join(SLASH) + SLASH, cache, checkUnignored, slices);
			return cache[path] = parent.ignored ? parent : this._rules.test(path, checkUnignored, MODE_IGNORE);
		}
		ignores(path) {
			return this._test(path, this._ignoreCache, false).ignored;
		}
		createFilter() {
			return (path) => !this.ignores(path);
		}
		filter(paths) {
			return makeArray(paths).filter(this.createFilter());
		}
		test(path) {
			return this._test(path, this._testCache, true);
		}
	};
	var factory = (options) => new Ignore(options);
	var isPathValid = (path) => checkPath(path && checkPath.convert(path), path, RETURN_FALSE);
	/* istanbul ignore next */
	var setupWindows = () => {
		const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
		checkPath.convert = makePosix;
		const REGEX_TEST_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
		checkPath.isNotRelative = (path) => REGEX_TEST_WINDOWS_PATH_ABSOLUTE.test(path) || isNotRelative(path);
	};
	/* istanbul ignore next */
	if (typeof process !== "undefined" && process.platform === "win32") setupWindows();
	module.exports = factory;
	factory.default = factory;
	module.exports.isPathValid = isPathValid;
	define(module.exports, Symbol.for("setupWindows"), setupWindows);
})))(), 1);
var conventionalParser = new CommitParser({
	headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
	breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/
});
var getPullRequestLabels = (pullRequest) => (pullRequest.labels?.nodes ?? []).filter((label) => Boolean(label?.name)).map((label) => label.name);
var unique = (values) => [...new Set(values)];
var matchesValues = (actualValues, expectedValues, mode) => {
	const actual = unique(actualValues);
	const expected = unique(expectedValues);
	if (expected.length === 0) return true;
	switch (mode) {
		case "all": return expected.every((value) => actual.includes(value));
		case "only": return actual.length > 0 && actual.every((value) => expected.includes(value));
		case "exactly": return actual.length === expected.length && actual.every((value) => expected.includes(value));
		default: return expected.length === 0 || expected.some((value) => actual.includes(value));
	}
};
var matchesPullRequestPaths = (condition, pullRequest) => {
	if (condition.paths.length === 0) return true;
	const changedFiles = unique(pullRequest.changedFiles ?? []);
	if (changedFiles.length === 0) return false;
	const expectedMatchers = unique(condition.paths).map((path) => ({
		path,
		matcher: (0, import_ignore.default)().add(path)
	}));
	const matchesAllConfiguredPaths = expectedMatchers.every(({ matcher }) => changedFiles.some((file) => matcher.ignores(file)));
	const matchesOnlyConfiguredPaths = changedFiles.length > 0 && changedFiles.every((file) => expectedMatchers.some(({ matcher }) => matcher.ignores(file)));
	switch (condition["paths-mode"]) {
		case "all": return matchesAllConfiguredPaths;
		case "only": return matchesOnlyConfiguredPaths;
		case "exactly": return matchesAllConfiguredPaths && matchesOnlyConfiguredPaths;
		default: return changedFiles.some((file) => expectedMatchers.some(({ matcher }) => matcher.ignores(file)));
	}
};
var parseConventionalTitle = (title) => {
	if (!title) return void 0;
	const parsed = conventionalParser.parse(title);
	if (typeof parsed.type !== "string") return void 0;
	return {
		type: parsed.type,
		scope: typeof parsed.scope === "string" ? parsed.scope : void 0,
		breaking: parsed.notes.length > 0
	};
};
var matchesConventionalTitle = (condition, pullRequest) => {
	if (!condition.conventional) return true;
	const parsed = parseConventionalTitle(pullRequest.title);
	if (!parsed) return false;
	const { types, scopes, breaking } = condition.conventional;
	return (types.length === 0 || types.includes(parsed.type)) && (scopes.length === 0 || parsed.scope !== void 0 && scopes.includes(parsed.scope)) && (breaking === void 0 || breaking === parsed.breaking);
};
var matchesCategoryCondition = (condition, pullRequest) => matchesValues(getPullRequestLabels(pullRequest), condition.labels, condition["labels-mode"]) && matchesPullRequestPaths(condition, pullRequest) && matchesConventionalTitle(condition, pullRequest);
var matchesCategory = (category, pullRequest) => category.when.length === 0 || category.when.some((condition) => matchesCategoryCondition(condition, pullRequest));
var filterPullRequestsByPreCategories = (pullRequests, categories) => {
	const preIncludeCategories = categories.filter((category) => category.type === "pre-include");
	const preExcludeCategories = categories.filter((category) => category.type === "pre-exclude");
	return pullRequests.filter((pullRequest) => {
		if (!(preIncludeCategories.length === 0 || preIncludeCategories.some((category) => matchesCategory(category, pullRequest)))) return false;
		return !preExcludeCategories.some((category) => matchesCategory(category, pullRequest));
	});
};
/**
* Determines if any of the categories require loading pull request changed files.
*/
var needsPullRequestChangedFiles = (categories) => categories.some((category) => category.when.some((condition) => condition.paths.length > 0));
var getChangelogCategories = (categories) => categories.filter((category) => category.type === "changelog");
var getVersionResolverCategories = (categories) => categories.filter((category) => category.type === "version-resolver");
//#endregion
//#region src/actions/drafter/lib/build-release-payload/categorize-pull-requests.ts
var categorizePullRequests = (params) => {
	const { pullRequests, config } = params;
	const changelogCategories = getChangelogCategories(config.categories);
	const uncategorizedPullRequests = [];
	const categorizedPullRequests = changelogCategories.map((category) => {
		return {
			...category,
			pullRequests: []
		};
	});
	const uncategorizedCategoryIndex = changelogCategories.findIndex((category) => category.when.length === 0);
	const filteredPullRequests = filterPullRequestsByPreCategories(pullRequests, config.categories);
	for (const pullRequest of filteredPullRequests) {
		let matchedAnyCategory = false;
		for (const category of categorizedPullRequests) {
			if (category.when.length === 0) continue;
			if (matchesCategory(category, pullRequest)) {
				category.pullRequests.push(pullRequest);
				matchedAnyCategory = true;
				if (category.exclusive) break;
			}
		}
		if (!matchedAnyCategory) if (uncategorizedCategoryIndex === -1) uncategorizedPullRequests.push(pullRequest);
		else categorizedPullRequests[uncategorizedCategoryIndex].pullRequests.push(pullRequest);
	}
	return [uncategorizedPullRequests, categorizedPullRequests];
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-template/util/charCode.ts
var CharCode = /* @__PURE__ */ function(CharCode) {
	CharCode[CharCode["Backslash"] = 92] = "Backslash";
	CharCode[CharCode["Tab"] = 9] = "Tab";
	CharCode[CharCode["LineFeed"] = 10] = "LineFeed";
	CharCode[CharCode["CarriageReturn"] = 13] = "CarriageReturn";
	CharCode[CharCode["Space"] = 32] = "Space";
	CharCode[CharCode["Ampersand"] = 38] = "Ampersand";
	CharCode[CharCode["DollarSign"] = 36] = "DollarSign";
	CharCode[CharCode["Digit0"] = 48] = "Digit0";
	CharCode[CharCode["Digit1"] = 49] = "Digit1";
	CharCode[CharCode["Digit2"] = 50] = "Digit2";
	CharCode[CharCode["Digit3"] = 51] = "Digit3";
	CharCode[CharCode["Digit4"] = 52] = "Digit4";
	CharCode[CharCode["Digit5"] = 53] = "Digit5";
	CharCode[CharCode["Digit6"] = 54] = "Digit6";
	CharCode[CharCode["Digit7"] = 55] = "Digit7";
	CharCode[CharCode["Digit8"] = 56] = "Digit8";
	CharCode[CharCode["Digit9"] = 57] = "Digit9";
	CharCode[CharCode["A"] = 65] = "A";
	CharCode[CharCode["E"] = 69] = "E";
	CharCode[CharCode["L"] = 76] = "L";
	CharCode[CharCode["U"] = 85] = "U";
	CharCode[CharCode["a"] = 97] = "a";
	CharCode[CharCode["l"] = 108] = "l";
	CharCode[CharCode["n"] = 110] = "n";
	CharCode[CharCode["t"] = 116] = "t";
	CharCode[CharCode["u"] = 117] = "u";
	return CharCode;
}({});
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-template/util/search.ts
function containsUppercaseCharacter(target) {
	if (!target) return false;
	return target.toLowerCase() !== target;
}
function buildReplaceStringWithCasePreserved(matches, pattern) {
	if (matches && matches[0] !== "") {
		const containsHyphens = validateSpecificSpecialCharacter(matches, pattern, "-");
		const containsUnderscores = validateSpecificSpecialCharacter(matches, pattern, "_");
		if (containsHyphens && !containsUnderscores) return buildReplaceStringForSpecificSpecialCharacter(matches, pattern, "-");
		else if (!containsHyphens && containsUnderscores) return buildReplaceStringForSpecificSpecialCharacter(matches, pattern, "_");
		if (matches[0].toUpperCase() === matches[0]) return pattern.toUpperCase();
		else if (matches[0].toLowerCase() === matches[0]) return pattern.toLowerCase();
		else if (containsUppercaseCharacter(matches[0][0]) && pattern.length > 0) return pattern[0].toUpperCase() + pattern.substring(1);
		else if (matches[0][0].toUpperCase() !== matches[0][0] && pattern.length > 0) return pattern[0].toLowerCase() + pattern.substring(1);
		else return pattern;
	} else return pattern;
}
function validateSpecificSpecialCharacter(matches, pattern, specialCharacter) {
	return matches[0].indexOf(specialCharacter) !== -1 && pattern.indexOf(specialCharacter) !== -1 && matches[0].split(specialCharacter).length === pattern.split(specialCharacter).length;
}
function buildReplaceStringForSpecificSpecialCharacter(matches, pattern, specialCharacter) {
	const splitPatternAtSpecialCharacter = pattern.split(specialCharacter);
	const splitMatchAtSpecialCharacter = matches[0].split(specialCharacter);
	let replaceString = "";
	splitPatternAtSpecialCharacter.forEach((splitValue, index) => {
		replaceString += buildReplaceStringWithCasePreserved([splitMatchAtSpecialCharacter[index]], splitValue) + specialCharacter;
	});
	return replaceString.slice(0, -1);
}
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-template/util/replacePattern.ts
/**
* Assigned when the replace pattern is entirely static.
*/
var StaticValueReplacePattern = class {
	staticValue;
	kind = 0;
	constructor(staticValue) {
		this.staticValue = staticValue;
	}
};
/**
* Assigned when the replace pattern has replacement patterns.
*/
var DynamicPiecesReplacePattern = class {
	pieces;
	kind = 1;
	constructor(pieces) {
		this.pieces = pieces;
	}
};
var ReplacePattern = class ReplacePattern {
	static fromStaticValue(value) {
		return new ReplacePattern([ReplacePiece.staticValue(value)]);
	}
	_state;
	get hasReplacementPatterns() {
		return this._state.kind === 1;
	}
	constructor(pieces) {
		if (!pieces || pieces.length === 0) this._state = new StaticValueReplacePattern("");
		else if (pieces.length === 1 && pieces[0].staticValue !== null) this._state = new StaticValueReplacePattern(pieces[0].staticValue);
		else this._state = new DynamicPiecesReplacePattern(pieces);
	}
	buildReplaceString(matches, preserveCase) {
		if (this._state.kind === 0) if (preserveCase) return buildReplaceStringWithCasePreserved(matches, this._state.staticValue);
		else return this._state.staticValue;
		let result = "";
		for (let i = 0, len = this._state.pieces.length; i < len; i++) {
			const piece = this._state.pieces[i];
			if (piece.staticValue !== null) {
				result += piece.staticValue;
				continue;
			}
			let match = ReplacePattern._substitute(piece.matchIndex, matches);
			if (piece.caseOps !== null && piece.caseOps.length > 0) {
				const repl = [];
				const lenOps = piece.caseOps.length;
				let opIdx = 0;
				for (let idx = 0, len = match.length; idx < len; idx++) {
					if (opIdx >= lenOps) {
						repl.push(match.slice(idx));
						break;
					}
					switch (piece.caseOps[opIdx]) {
						case "U":
							repl.push(match[idx].toUpperCase());
							break;
						case "u":
							repl.push(match[idx].toUpperCase());
							opIdx++;
							break;
						case "L":
							repl.push(match[idx].toLowerCase());
							break;
						case "l":
							repl.push(match[idx].toLowerCase());
							opIdx++;
							break;
						case "E":
							repl.push(match.slice(idx));
							idx = len;
							break;
						default: repl.push(match[idx]);
					}
				}
				match = repl.join("");
			}
			result += match;
		}
		return result;
	}
	static _substitute(matchIndex, matches) {
		if (matches === null) return "";
		if (matchIndex === 0) return matches[0];
		let remainder = "";
		while (matchIndex > 0) {
			if (matchIndex < matches.length) return (matches[matchIndex] || "") + remainder;
			remainder = String(matchIndex % 10) + remainder;
			matchIndex = Math.floor(matchIndex / 10);
		}
		return `$${remainder}`;
	}
};
/**
* A replace piece can either be a static string or an index to a specific match.
*/
var ReplacePiece = class ReplacePiece {
	static staticValue(value) {
		return new ReplacePiece(value, -1, null);
	}
	static matchIndex(index) {
		return new ReplacePiece(null, index, null);
	}
	static caseOps(index, caseOps) {
		return new ReplacePiece(null, index, caseOps);
	}
	staticValue;
	matchIndex;
	caseOps;
	constructor(staticValue, matchIndex, caseOps) {
		this.staticValue = staticValue;
		this.matchIndex = matchIndex;
		if (!caseOps || caseOps.length === 0) this.caseOps = null;
		else this.caseOps = caseOps.slice(0);
	}
};
var ReplacePieceBuilder = class {
	_source;
	_lastCharIndex;
	_result;
	_resultLen;
	_currentStaticPiece;
	constructor(source) {
		this._source = source;
		this._lastCharIndex = 0;
		this._result = [];
		this._resultLen = 0;
		this._currentStaticPiece = "";
	}
	emitUnchanged(toCharIndex) {
		this._emitStatic(this._source.substring(this._lastCharIndex, toCharIndex));
		this._lastCharIndex = toCharIndex;
	}
	emitStatic(value, toCharIndex) {
		this._emitStatic(value);
		this._lastCharIndex = toCharIndex;
	}
	_emitStatic(value) {
		if (value.length === 0) return;
		this._currentStaticPiece += value;
	}
	emitMatchIndex(index, toCharIndex, caseOps) {
		if (this._currentStaticPiece.length !== 0) {
			this._result[this._resultLen++] = ReplacePiece.staticValue(this._currentStaticPiece);
			this._currentStaticPiece = "";
		}
		this._result[this._resultLen++] = ReplacePiece.caseOps(index, caseOps);
		this._lastCharIndex = toCharIndex;
	}
	finalize() {
		this.emitUnchanged(this._source.length);
		if (this._currentStaticPiece.length !== 0) {
			this._result[this._resultLen++] = ReplacePiece.staticValue(this._currentStaticPiece);
			this._currentStaticPiece = "";
		}
		return new ReplacePattern(this._result);
	}
};
/**
* \n			=> inserts a LF
* \t		  => inserts a TAB
* \\			=> inserts a "\\".
* \u			=> upper-cases one character in a match.
* \U			=> upper-cases ALL remaining characters in a match.
* \l			=> lower-cases one character in a match.
* \L			=> lower-cases ALL remaining characters in a match.
* \E			=> ends a \U or \L case-change sequence.
* $$			=> inserts a "$".
* $& and $0	=> inserts the matched substring.
* $n			=> Where n is a non-negative integer lesser than 100, inserts the nth parenthesized submatch string
* everything else stays untouched
*
* Also see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
*/
function parseReplaceString(replaceString) {
	if (!replaceString || replaceString.length === 0) return new ReplacePattern(null);
	const caseOps = [];
	const result = new ReplacePieceBuilder(replaceString);
	for (let i = 0, len = replaceString.length; i < len; i++) {
		const chCode = replaceString.charCodeAt(i);
		if (chCode === CharCode.Backslash) {
			i++;
			if (i >= len) break;
			const nextChCode = replaceString.charCodeAt(i);
			switch (nextChCode) {
				case CharCode.Backslash:
					result.emitUnchanged(i - 1);
					result.emitStatic("\\", i + 1);
					break;
				case CharCode.n:
					result.emitUnchanged(i - 1);
					result.emitStatic("\n", i + 1);
					break;
				case CharCode.t:
					result.emitUnchanged(i - 1);
					result.emitStatic("	", i + 1);
					break;
				case CharCode.u:
				case CharCode.U:
				case CharCode.l:
				case CharCode.L:
				case CharCode.E:
					result.emitUnchanged(i - 1);
					result.emitStatic("", i + 1);
					caseOps.push(String.fromCharCode(nextChCode));
					break;
			}
			continue;
		}
		if (chCode === CharCode.DollarSign) {
			i++;
			if (i >= len) break;
			const nextChCode = replaceString.charCodeAt(i);
			if (nextChCode === CharCode.DollarSign) {
				result.emitUnchanged(i - 1);
				result.emitStatic("$", i + 1);
				continue;
			}
			if (nextChCode === CharCode.Digit0 || nextChCode === CharCode.Ampersand) {
				result.emitUnchanged(i - 1);
				result.emitMatchIndex(0, i + 1, caseOps);
				caseOps.length = 0;
				continue;
			}
			if (CharCode.Digit1 <= nextChCode && nextChCode <= CharCode.Digit9) {
				let matchIndex = nextChCode - CharCode.Digit0;
				if (i + 1 < len) {
					const nextNextChCode = replaceString.charCodeAt(i + 1);
					if (CharCode.Digit0 <= nextNextChCode && nextNextChCode <= CharCode.Digit9) {
						i++;
						matchIndex = matchIndex * 10 + (nextNextChCode - CharCode.Digit0);
						result.emitUnchanged(i - 2);
						result.emitMatchIndex(matchIndex, i + 1, caseOps);
						caseOps.length = 0;
						continue;
					}
				}
				result.emitUnchanged(i - 1);
				result.emitMatchIndex(matchIndex, i + 1, caseOps);
				caseOps.length = 0;
			}
		}
	}
	return result.finalize();
}
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-template/render-template.ts
var getReplaceMatches = (args) => {
	const lastArg = args[args.length - 1];
	const hasGroups = typeof lastArg === "object" && lastArg !== null;
	const matchCount = args.length - (hasGroups ? 3 : 2);
	return args.slice(0, matchCount);
};
var applyReplacer = (input, replacer) => {
	const replacePattern = parseReplaceString(replacer.replace);
	return input.replace(replacer.search, (...args) => {
		const matches = getReplaceMatches(args);
		return replacePattern.buildReplaceString(matches);
	});
};
/**
* replaces all uppercase dollar templates with their string representation from object
* if replacement is undefined in object the dollar template string is left untouched
*/
var renderTemplate = (params) => {
	const { template, object, replacers } = params;
	let input = template.replace(/(\$[A-Z_]+)/g, (_, k) => {
		let result;
		const isValidKey = (key) => key in object && object[key] !== void 0 && object[key] !== null;
		if (!isValidKey(k)) result = k;
		else if (typeof object[k] === "object") {
			const nested = object[k];
			result = renderTemplate({
				template: nested.template,
				object: nested
			});
		} else result = `${object[k]}`;
		return result;
	});
	if (replacers) for (const replacer of replacers) input = applyReplacer(input, replacer);
	return input;
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/generate-contributors-sentence.ts
var botSuffix = "[bot]";
var pullRequestKey = (pullRequest) => `${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`;
var normalizeLogin = (login, isBot = false) => isBot && !login.endsWith(botSuffix) ? `${login}${botSuffix}` : login;
var renderAuthorMention = (contributor, serverUrl) => {
	if ("name" in contributor) return contributor.name;
	const botUrl = contributor.login.endsWith(botSuffix) ? contributor.botUrl ?? `${serverUrl.replace(/\/$/, "")}/apps/${contributor.login.slice(0, -5)}` : void 0;
	if (botUrl) return `[@${contributor.login}](${botUrl})`;
	return `@${contributor.login}`;
};
var generateContributorsSentence = (params) => {
	const { commits, pullRequests, config } = params;
	return generateAuthorsSentence({
		commits,
		pullRequests: filterPullRequestsByPreCategories(pullRequests, config.categories),
		excludeContributors: config["exclude-contributors"],
		noAuthorsTemplate: config["no-contributors-template"],
		serverUrl: params.serverUrl
	});
};
var generateAuthorsSentence = (params) => {
	const { commits, pullRequests } = params;
	const serverUrl = params.serverUrl ?? "https://github.com";
	const includedPullRequestKeys = new Set(pullRequests.map(pullRequestKey));
	const includedMergeCommitOids = new Set(pullRequests.flatMap((pullRequest) => "mergeCommit" in pullRequest && pullRequest.mergeCommit?.oid ? [pullRequest.mergeCommit.oid] : []));
	const contributors = /* @__PURE__ */ new Map();
	const pullRequestAuthorLogins = /* @__PURE__ */ new Set();
	for (const commit of commits) {
		if (!includedMergeCommitOids.has(commit.oid) && !commit.associatedPullRequests?.nodes?.some((pullRequest) => pullRequest && includedPullRequestKeys.has(pullRequestKey(pullRequest)))) continue;
		for (const author of commit.authors?.nodes ?? (commit.author ? [commit.author] : [])) if (author?.user) {
			const login = normalizeLogin(author.user.login);
			contributors.set(`login:${login}`, { login });
		} else if (author?.name) contributors.set(`name:${author.name}`, { name: author.name });
	}
	for (const pullRequest of pullRequests) if (pullRequest.author) {
		const isBot = pullRequest.author.__typename === "Bot";
		const login = normalizeLogin(pullRequest.author.login, isBot);
		pullRequestAuthorLogins.add(login);
		contributors.set(`login:${login}`, {
			login,
			botUrl: isBot ? pullRequest.author.url : void 0
		});
	}
	const sortedContributors = [...contributors.values()].filter((contributor) => "name" in contributor || !(params.excludeContributors ?? []).some((excluded) => excluded === contributor.login || `${excluded}${botSuffix}` === contributor.login)).sort((a, b) => {
		const aIsPullRequestAuthor = "login" in a && pullRequestAuthorLogins.has(a.login);
		if (aIsPullRequestAuthor !== ("login" in b && pullRequestAuthorLogins.has(b.login))) return aIsPullRequestAuthor ? -1 : 1;
		const aIsBot = "login" in a && (a.botUrl !== void 0 || a.login.endsWith(botSuffix));
		if (aIsBot !== ("login" in b && (b.botUrl !== void 0 || b.login.endsWith(botSuffix)))) return aIsBot ? 1 : -1;
		const aName = "name" in a ? a.name : a.login;
		const bName = "name" in b ? b.name : b.login;
		return aName.localeCompare(bName);
	});
	if (sortedContributors.length === 0) return params.noAuthorsTemplate ?? "";
	if (params.authorTemplate !== void 0) {
		const authorTemplate = params.authorTemplate;
		const authors = sortedContributors.map((contributor) => {
			const author = "name" in contributor ? contributor.name : contributor.login;
			return renderTemplate({
				template: authorTemplate,
				object: {
					$AUTHOR: author,
					$AUTHOR_MENTION: renderAuthorMention(contributor, serverUrl)
				}
			});
		});
		const separator = params.authorsSeparator ?? ", ";
		if (params.authorsFinalSeparator !== void 0 && authors.length > 1) return `${authors.slice(0, -1).join(separator)}${params.authorsFinalSeparator}${authors.at(-1)}`;
		return authors.join(separator);
	}
	const mentions = sortedContributors.map((contributor) => renderAuthorMention(contributor, serverUrl));
	if (mentions.length > 1) return `${mentions.slice(0, -1).join(", ")} and ${mentions.slice(-1)}`;
	return mentions[0];
};
var generateNewContributorsList = (params) => {
	const { pullRequests, newContributorLogins, config } = params;
	const firstPullRequestByLogin = /* @__PURE__ */ new Map();
	const includedPullRequestKeys = new Set(filterPullRequestsByPreCategories(pullRequests, config.categories).map(pullRequestKey));
	for (const pullRequest of pullRequests) {
		if (!pullRequest.author || !newContributorLogins.has(pullRequest.author.login) || config["exclude-contributors"].includes(pullRequest.author.login)) continue;
		const previous = firstPullRequestByLogin.get(pullRequest.author.login);
		if (!previous || (pullRequest.mergedAt ?? "") < (previous.mergedAt ?? "")) firstPullRequestByLogin.set(pullRequest.author.login, pullRequest);
	}
	const entries = [...firstPullRequestByLogin.entries()].filter(([, pullRequest]) => includedPullRequestKeys.has(pullRequestKey(pullRequest))).sort(([, a], [, b]) => (a.mergedAt ?? "").localeCompare(b.mergedAt ?? "") || a.number - b.number);
	if (entries.length === 0) return "";
	return entries.map(([login, pullRequest]) => renderTemplate({
		template: config["new-contributor-template"],
		object: {
			$AUTHOR: login,
			$AUTHOR_MENTION: `@${login}`,
			$AUTHOR_URL: pullRequest.author?.url,
			$NUMBER: pullRequest.number,
			$URL: pullRequest.url
		}
	})).join("\n");
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/pull-request-to-string.ts
var pullRequestToString = (params) => params.pullRequests.map((pullRequest) => {
	let pullAuthor = "ghost";
	if (pullRequest.author) pullAuthor = pullRequest.author.__typename && pullRequest.author.__typename === "Bot" ? `[${pullRequest.author.login}[bot]](${pullRequest.author.url})` : pullRequest.author.login;
	const authorTemplate = params.config["change-author-template"];
	return renderTemplate({
		template: params.config["change-template"],
		object: {
			$CATEGORY: params.category ?? "",
			$TITLE: escapeTitle({
				title: pullRequest.title,
				escapes: params.config["change-title-escapes"]
			}),
			$NUMBER: pullRequest.number.toString(),
			$AUTHORS: generateAuthorsSentence({
				commits: params.commits,
				serverUrl: params.serverUrl,
				pullRequests: [pullRequest],
				noAuthorsTemplate: renderTemplate({
					template: authorTemplate,
					object: {
						$AUTHOR: "ghost",
						$AUTHOR_MENTION: "@ghost"
					}
				}),
				authorTemplate,
				authorsSeparator: params.config["change-authors-separator"],
				authorsFinalSeparator: params.config["change-authors-final-separator"]
			}),
			$AUTHOR: pullAuthor,
			$AUTHOR_URL: pullRequest.author?.url ?? "",
			$BODY: pullRequest.body,
			$URL: pullRequest.url,
			$BASE_REF_NAME: pullRequest.baseRefName,
			$HEAD_REF_NAME: pullRequest.headRefName
		}
	});
}).join("\n");
var escapeTitle = (params) => params.title.replace(new RegExp(`[${escapeStringRegexp(params.escapes || "")}]|\`.*?\``, "g"), (match) => {
	if (match.length > 1) return match;
	if (match === "@" || match === "#") return `${match}<!---->`;
	return `\\${match}`;
});
//#endregion
//#region src/actions/drafter/lib/build-release-payload/generate-changelog.ts
var generateChangeLog = (params) => {
	const { commits = [], pullRequests, config } = params;
	const [uncategorizedPullRequests, categorizedPullRequests] = categorizePullRequests({
		pullRequests,
		config
	});
	if (categorizedPullRequests.reduce((sum, category) => sum + category.pullRequests.length, 0) + uncategorizedPullRequests.length === 0) return config["no-changes-template"];
	const changeLog = [];
	if (uncategorizedPullRequests.length > 0) changeLog.push(pullRequestToString({
		serverUrl: params.serverUrl,
		commits,
		pullRequests: uncategorizedPullRequests,
		config
	}), "\n\n");
	for (const [index, category] of categorizedPullRequests.entries()) {
		if (category.pullRequests.length === 0) continue;
		const categoryTitle = renderTemplate({
			template: config["category-template"],
			object: { $TITLE: category.title }
		});
		if (categoryTitle) changeLog.push(categoryTitle, "\n\n");
		const pullRequestString = pullRequestToString({
			serverUrl: params.serverUrl,
			category: category.title,
			commits,
			pullRequests: category.pullRequests,
			config
		});
		if (category["collapse-after"] !== -1 && category.pullRequests.length > category["collapse-after"]) changeLog.push("<details>", "\n", `<summary>${category.pullRequests.length} change${category.pullRequests.length > 1 ? "s" : ""}</summary>`, "\n\n", pullRequestString, "\n", "</details>");
		else changeLog.push(pullRequestString);
		if (index + 1 !== categorizedPullRequests.length) changeLog.push("\n\n");
	}
	return changeLog.join("").trim();
};
//#endregion
//#region node_modules/semver/functions/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var parse = (version, options, throwErrors = false) => {
		if (version instanceof SemVer) return version;
		try {
			return new SemVer(version, options);
		} catch (er) {
			if (!throwErrors) return null;
			throw er;
		}
	};
	module.exports = parse;
}));
//#endregion
//#region node_modules/semver/functions/coerce.js
var require_coerce = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var parse = require_parse();
	var { safeRe: re, t } = require_re();
	var coerce = (version, options) => {
		if (version instanceof SemVer) return version;
		if (typeof version === "number") version = String(version);
		if (typeof version !== "string") return null;
		options = options || {};
		let match = null;
		if (!options.rtl) match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
		else {
			const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
			let next;
			while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
				if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
				coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
			}
			coerceRtlRegex.lastIndex = -1;
		}
		if (match === null) return null;
		const major = match[2];
		return parse(`${major}.${match[3] || "0"}.${match[4] || "0"}${options.includePrerelease && match[5] ? `-${match[5]}` : ""}${options.includePrerelease && match[6] ? `+${match[6]}` : ""}`, options);
	};
	module.exports = coerce;
}));
//#endregion
//#region node_modules/semver/functions/inc.js
var require_inc = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var inc = (version, release, options, identifier, identifierBase) => {
		if (typeof options === "string") {
			identifierBase = identifier;
			identifier = options;
			options = void 0;
		}
		try {
			return new SemVer(version instanceof SemVer ? version.version : version, options).inc(release, identifier, identifierBase).version;
		} catch (er) {
			return null;
		}
	};
	module.exports = inc;
}));
//#endregion
//#region node_modules/semver/functions/major.js
var require_major = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var major = (a, loose) => new SemVer(a, loose).major;
	module.exports = major;
}));
//#endregion
//#region node_modules/semver/functions/minor.js
var require_minor = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var minor = (a, loose) => new SemVer(a, loose).minor;
	module.exports = minor;
}));
//#endregion
//#region node_modules/semver/functions/patch.js
var require_patch = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var patch = (a, loose) => new SemVer(a, loose).patch;
	module.exports = patch;
}));
//#endregion
//#region node_modules/semver/functions/prerelease.js
var require_prerelease = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var prerelease = (version, options) => {
		const parsed = parse(version, options);
		return parsed && parsed.prerelease.length ? parsed.prerelease : null;
	};
	module.exports = prerelease;
}));
//#endregion
//#region src/actions/drafter/lib/build-release-payload/version-descriptor.ts
var import_coerce = /* @__PURE__ */ __toESM(require_coerce(), 1);
var import_inc = /* @__PURE__ */ __toESM(require_inc(), 1);
var import_major = /* @__PURE__ */ __toESM(require_major(), 1);
var import_minor = /* @__PURE__ */ __toESM(require_minor(), 1);
var import_parse = /* @__PURE__ */ __toESM(require_parse(), 1);
var import_patch = /* @__PURE__ */ __toESM(require_patch(), 1);
var import_prerelease = /* @__PURE__ */ __toESM(require_prerelease(), 1);
var VersionDescriptor = class VersionDescriptor {
	version = null;
	major = null;
	minor = null;
	patch = null;
	prerelease = null;
	preReleaseIdentifier;
	tagPrefix;
	logger;
	constructor(from, opt) {
		this.logger = opt.logger ?? noopLogger;
		this.preReleaseIdentifier = opt?.preReleaseIdentifier;
		this.tagPrefix = opt?.tagPrefix;
		this.version = this._coerce(from);
		this.major = this.version ? (0, import_major.default)(this.version).toString() : null;
		this.minor = this.version ? (0, import_minor.default)(this.version).toString() : null;
		this.patch = this.version ? (0, import_patch.default)(this.version).toString() : null;
		this.prerelease = this.version === null ? null : (0, import_prerelease.default)(this.version) ? `-${(0, import_prerelease.default)(this.version)?.join(".")}` : "";
	}
	_coerce(from) {
		if (from) {
			const ver = typeof from === "object" ? this._isRelease(from) ? this._toSemver(this._stripTag(from.tag_name)) || this._toSemver(this._stripTag(from.name)) : this._toSemver(from) : this._toSemver(this._stripTag(from));
			if (!ver) {
				this.logger.warning(`Failed to parse version from input ${from}. Defaulting coerced version to null.`);
				return null;
			}
			return ver;
		} else {
			this.logger.debug(`Building version descriptor without version input. Defaulting coerced version to null.`);
			return null;
		}
	}
	_isRelease(input) {
		return typeof input === "object" && input !== null && (typeof input?.tag_name === "string" || typeof input?.name === "string");
	}
	_stripTag(input) {
		return this.tagPrefix && input?.startsWith(this.tagPrefix) ? input.slice(this.tagPrefix.length) : input;
	}
	_toSemver(version) {
		const result = (0, import_parse.default)(version);
		if (result) return result;
		return (0, import_coerce.default)(version);
	}
	/**
	* Alters version in-place by incrementing it according to the specified release type (major, minor, patch, prerelease).
	*/
	incremented(increment) {
		if (!this.version || increment === "no_increment") return this;
		const _incrementedVersion = (0, import_inc.default)(this.version, increment, true, this.preReleaseIdentifier);
		if (!_incrementedVersion) throw new Error(`Failed to increment version ${this.version} with increment ${increment}`);
		const _incrementedSemver = this._toSemver(_incrementedVersion);
		if (!_incrementedSemver) throw new Error(`Failed to parse version ${_incrementedVersion} after incrementing ${this.version} with increment ${increment}`);
		return new VersionDescriptor(_incrementedSemver, {
			tagPrefix: this.tagPrefix,
			preReleaseIdentifier: this.preReleaseIdentifier,
			logger: this.logger
		});
	}
	rendered(template) {
		return renderTemplate({
			template,
			object: {
				$MAJOR: this.major ?? void 0,
				$MINOR: this.minor ?? void 0,
				$PATCH: this.patch ?? void 0,
				$PRERELEASE: this.prerelease ?? void 0
			}
		});
	}
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/get-version-info.ts
var getVersionInfo = (params) => {
	const logger = params.logger ?? noopLogger;
	const { lastRelease, config, input, versionKeyIncrement: _versionKeyIncrement } = params;
	logger.info(`🏷️ Resolving version information...`);
	logger.info(`  last release: ${lastRelease?.tag_name || "none"}`);
	logger.info(`  version input: ${input.version || input.tag || input.name || "none"}`);
	logger.info(`  version key increment: ${_versionKeyIncrement}`);
	let _localIncrement = structuredClone(_versionKeyIncrement);
	logger.info(`  Coercing and parsing version from last release...`);
	const versionFromLastRelease = new VersionDescriptor(lastRelease, {
		tagPrefix: config["tag-prefix"],
		preReleaseIdentifier: config["prerelease-identifier"],
		logger
	});
	logger.info(`  Parsed version from last release: ${versionFromLastRelease.version?.format() || "none"}.`);
	logger.info(`  Coercing and parsing version from input...`);
	const versionFromInput = new VersionDescriptor(input.version || input.tag || input.name, {
		tagPrefix: config["tag-prefix"],
		preReleaseIdentifier: config["prerelease-identifier"],
		logger
	});
	logger.info(`  Parsed version from input: ${versionFromInput.version?.format() || "none"}.`);
	let referenceVersion;
	if (versionFromInput.version) {
		_localIncrement = "no_increment";
		referenceVersion = versionFromInput;
	} else if (versionFromLastRelease.version) {
		referenceVersion = versionFromLastRelease;
		const incrementsToPrerelease = _localIncrement?.startsWith("pre");
		const lastReleaseIsPrerelease = referenceVersion?.prerelease?.length;
		if (incrementsToPrerelease) {
			if (lastReleaseIsPrerelease) {
				if (_localIncrement !== "prerelease") {
					logger.info(`  versionKeyIncrement is set to "${_localIncrement}", but the last release is already a prerelease (${referenceVersion.version?.format() || "none"}). The version will be incremented as a prerelease instead.`);
					_localIncrement = "prerelease";
				}
			}
		}
	} else referenceVersion = new VersionDescriptor("0.0.0", {
		preReleaseIdentifier: config["prerelease-identifier"],
		logger,
		tagPrefix: config["tag-prefix"]
	});
	return {
		$NEXT_MAJOR_VERSION: referenceVersion.incremented("major").rendered(config["version-template"]),
		$NEXT_MAJOR_VERSION_MAJOR: referenceVersion.incremented("major").major,
		$NEXT_MAJOR_VERSION_MINOR: referenceVersion.incremented("major").minor,
		$NEXT_MAJOR_VERSION_PATCH: referenceVersion.incremented("major").patch,
		$NEXT_MINOR_VERSION: referenceVersion.incremented("minor").rendered(config["version-template"]),
		$NEXT_MINOR_VERSION_MAJOR: referenceVersion.incremented("minor").major,
		$NEXT_MINOR_VERSION_MINOR: referenceVersion.incremented("minor").minor,
		$NEXT_MINOR_VERSION_PATCH: referenceVersion.incremented("minor").patch,
		$NEXT_PATCH_VERSION: referenceVersion.incremented("patch").rendered(config["version-template"]),
		$NEXT_PATCH_VERSION_MAJOR: referenceVersion.incremented("patch").major,
		$NEXT_PATCH_VERSION_MINOR: referenceVersion.incremented("patch").minor,
		$NEXT_PATCH_VERSION_PATCH: referenceVersion.incremented("patch").patch,
		$NEXT_PRERELEASE_VERSION: referenceVersion.incremented("prerelease").rendered(config["version-template"]),
		$NEXT_PRERELEASE_VERSION_PRERELEASE: referenceVersion.incremented("prerelease").prerelease,
		$RESOLVED_VERSION: referenceVersion.incremented(_localIncrement).rendered(config["version-template"]),
		$RESOLVED_VERSION_MAJOR: referenceVersion.incremented(_localIncrement).major,
		$RESOLVED_VERSION_MINOR: referenceVersion.incremented(_localIncrement).minor,
		$RESOLVED_VERSION_PATCH: referenceVersion.incremented(_localIncrement).patch,
		$RESOLVED_VERSION_PRERELEASE: referenceVersion.incremented(_localIncrement).prerelease
	};
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-release-name.ts
/**
* Renders the release name,
* based on the input and config.
*/
var renderReleaseName = (params) => {
	const logger = params.logger ?? noopLogger;
	let name = structuredClone(params.inputName);
	const { config, versionInfo } = params;
	if (name === void 0) name = versionInfo ? renderTemplate({
		template: config["name-template"] || "",
		object: versionInfo
	}) : "";
	else if (versionInfo) name = renderTemplate({
		template: name,
		object: versionInfo
	});
	logger.debug(`name: ${name}`);
	return name;
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-tag-name.ts
/**
* Renders the tag name for the release,
* based on the input and config.
*/
var renderTagName = (params) => {
	const logger = params.logger ?? noopLogger;
	let tagName = structuredClone(params.inputTagName);
	const { config, versionInfo } = params;
	if (tagName === void 0) tagName = versionInfo ? renderTemplate({
		template: config["tag-template"] || "",
		object: versionInfo
	}) : "";
	else if (versionInfo) tagName = renderTemplate({
		template: tagName,
		object: versionInfo
	});
	logger.debug(`tag: ${tagName}`);
	return tagName;
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/resolve-version-increment.ts
var priorityMap = {
	patch: 1,
	minor: 2,
	major: 3
};
var getHighestPriority = (params) => {
	const { pullRequests, categories, emptyWhenBehavior } = params;
	const emptyWhenCategory = categories.find((category) => category.when.length === 0);
	const matchedPullRequests = /* @__PURE__ */ new Set();
	let highestPriority;
	let remainingPullRequests = [...pullRequests];
	for (const category of categories) {
		if (category.when.length === 0) continue;
		const matchingPullRequests = remainingPullRequests.filter((pullRequest) => matchesCategory(category, pullRequest));
		if (matchingPullRequests.length === 0) continue;
		highestPriority = Math.max(highestPriority ?? 0, priorityMap[category["semver-increment"]]);
		for (const pullRequest of matchingPullRequests) matchedPullRequests.add(pullRequest);
		if (category.exclusive) {
			const matchedPullRequestsSet = new Set(matchingPullRequests);
			remainingPullRequests = remainingPullRequests.filter((pullRequest) => !matchedPullRequestsSet.has(pullRequest));
		}
	}
	if (!emptyWhenCategory) return highestPriority;
	if (emptyWhenBehavior === "fallback") return highestPriority ?? priorityMap[emptyWhenCategory["semver-increment"]];
	if (!pullRequests.some((pullRequest) => !matchedPullRequests.has(pullRequest))) return highestPriority;
	return Math.max(highestPriority ?? 0, priorityMap[emptyWhenCategory["semver-increment"]]);
};
var resolveVersionKeyIncrement = (params) => {
	const logger = params.logger ?? noopLogger;
	const { pullRequests, config } = params;
	const filteredPullRequests = filterPullRequestsByPreCategories(pullRequests, config.categories);
	const changelogPriority = getHighestPriority({
		pullRequests: filteredPullRequests,
		categories: getChangelogCategories(config.categories),
		emptyWhenBehavior: "uncategorized"
	});
	const versionResolverPriority = getHighestPriority({
		pullRequests: filteredPullRequests,
		categories: getVersionResolverCategories(config.categories),
		emptyWhenBehavior: "fallback"
	}) ?? priorityMap.patch;
	const resolvedPriority = Math.max(changelogPriority ?? 0, versionResolverPriority);
	const versionKey = Object.entries(priorityMap).find(([, priority]) => priority === resolvedPriority)?.[0];
	logger.debug(`versionKey: ${versionKey}`);
	let versionKeyIncrement = versionKey;
	if (config.prerelease && config["prerelease-identifier"]) versionKeyIncrement = `pre${versionKeyIncrement}`;
	logger.info(`Version increment: ${versionKeyIncrement}${!versionKey ? " (default)" : ""}`);
	return versionKeyIncrement;
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/sort-pull-requests.ts
var sortPullRequests = (params) => {
	const logger = params.logger ?? noopLogger;
	const { pullRequests, config: { "sort-by": sortBy, "sort-direction": sortDirection } } = params;
	const getSortField = sortBy === "title" ? getTitle : getMergedAt;
	const sort = sortDirection === "ascending" ? sortAscending : sortDescending;
	return structuredClone(pullRequests).sort((a, b) => {
		try {
			return sort(getSortField(a), getSortField(b));
		} catch (error) {
			logger.warning(`Failed to sort pull-requests ${a.number} and ${b.number} by ${sortBy} in ${sortDirection} order. Returning unsorted.`);
			logger.error(error);
			return 0;
		}
	});
};
var getTitle = (pr) => pr.title;
var getMergedAt = (pr) => pr.mergedAt;
var sortAscending = (a, b) => {
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	if (a > b) return 1;
	if (a < b) return -1;
	return 0;
};
var sortDescending = (a, b) => {
	if (a == null && b == null) return 0;
	if (a == null) return -1;
	if (b == null) return 1;
	if (a > b) return -1;
	if (a < b) return 1;
	return 0;
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/static/last-not-found.md?raw
var last_not_found_default = "> [!WARNING]\n> Release Drafter could not find a previous **published release** for `$OWNER/$REPOSITORY`. This draft was created **without a comparison baseline**.\n\n> [!IMPORTANT]\n> Treat this draft as a manual starting point.\n> Review the proposed version, tag, and notes before publishing.\n\nIf you did not expect this to happen, [open an issue](https://github.com/release-drafter/release-drafter/issues/new?template=previous-published-release-not-found.yml).\n";
//#endregion
//#region src/actions/drafter/lib/build-release-payload/build-release-payload.ts
/**
* Outputs the payload for creating or updating a release.
*
* Previously known as `generateReleaseInfo`.
*/
var buildReleasePayload = async (params) => {
	const { commits, config, input, lastRelease, previousCommitish, newContributorLogins = /* @__PURE__ */ new Set(), pullRequests } = params;
	const { logger, octokit, repo, serverUrl } = params.github;
	logger.info(`📝 Generating release payload and body...`);
	const sortedPullRequests = sortPullRequests({
		pullRequests,
		config,
		logger
	});
	let body = (config.header || "") + config.template + (!lastRelease && !previousCommitish ? `\n---\n${renderTemplate({
		template: last_not_found_default,
		object: {
			$OWNER: repo.owner,
			$REPOSITORY: repo.repo
		}
	})}\n---\n` : "") + (config.footer || "");
	body = renderTemplate({
		template: body,
		object: {
			$PREVIOUS_TAG: previousCommitish ?? lastRelease?.tag_name ?? "",
			$CHANGES: generateChangeLog({
				commits,
				pullRequests: sortedPullRequests,
				config,
				serverUrl
			}),
			$CONTRIBUTORS: generateContributorsSentence({
				commits,
				pullRequests: sortedPullRequests,
				config,
				serverUrl
			}),
			$NEW_CONTRIBUTORS: generateNewContributorsList({
				pullRequests: sortedPullRequests,
				newContributorLogins,
				config
			}),
			$OWNER: repo.owner,
			$REPOSITORY: repo.repo
		},
		replacers: config.replacers
	});
	const versionInfo = getVersionInfo({
		lastRelease,
		config,
		input,
		versionKeyIncrement: resolveVersionKeyIncrement({
			pullRequests,
			config,
			logger
		}),
		logger
	});
	logger.debug(`🤖 versionInfo: ${JSON.stringify(versionInfo, null, 2)}`);
	if (versionInfo) body = renderTemplate({
		template: body,
		object: versionInfo
	});
	const res = {
		name: renderReleaseName({
			inputName: input.name,
			config,
			versionInfo,
			logger
		}),
		tag: renderTagName({
			inputTagName: input.tag,
			config,
			versionInfo,
			logger
		}),
		body,
		targetCommitish: await parseCommitishForRelease(config.commitish, {
			octokit,
			repo,
			logger
		}),
		prerelease: config.prerelease,
		make_latest: config.prerelease ? false : config.latest,
		draft: !input.publish,
		resolvedVersion: versionInfo?.$RESOLVED_VERSION,
		majorVersion: versionInfo?.$RESOLVED_VERSION_MAJOR,
		minorVersion: versionInfo?.$RESOLVED_VERSION_MINOR,
		patchVersion: versionInfo?.$RESOLVED_VERSION_PATCH,
		prereleaseVersion: versionInfo?.$RESOLVED_VERSION_PRERELEASE
	};
	logger.info(`  Release payload built successfully`);
	logger.info(`  name:                        ${res.name}`);
	logger.info(`  tag:                         ${res.tag}`);
	logger.info(`  body:                        ${res.body.length} characters long`);
	logger.info(`  targetCommitish:             ${res.targetCommitish}`);
	logger.info(`  prerelease:                  ${res.prerelease}`);
	logger.info(`  make_latest:                 ${res.make_latest}`);
	logger.info(`  draft:                       ${res.draft}${!res.draft ? " (will be published !)" : ""}`);
	logger.info(`  RESOLVED_VERSION:            ${res.resolvedVersion}`);
	logger.info(`  RESOLVED_VERSION_MAJOR:      ${res.majorVersion}`);
	logger.info(`  RESOLVED_VERSION_MINOR:      ${res.minorVersion}`);
	logger.info(`  RESOLVED_VERSION_PATCH:      ${res.patchVersion}`);
	logger.info(`  RESOLVED_VERSION_PRERELEASE: ${res.prereleaseVersion}`);
	return res;
};
//#endregion
//#region node_modules/semver/functions/satisfies.js
var require_satisfies = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var satisfies = (version, range, options) => {
		try {
			range = new Range(range, options);
		} catch (er) {
			return false;
		}
		return range.test(version);
	};
	module.exports = satisfies;
}));
//#endregion
//#region node_modules/compare-versions/lib/esm/utils.js
var semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
var validateAndParse = (version) => {
	if (typeof version !== "string") throw new TypeError("Invalid argument expected string");
	const match = version.match(semver);
	if (!match) throw new Error(`Invalid argument not valid semver ('${version}' received)`);
	match.shift();
	return match;
};
var isWildcard = (s) => s === "*" || s === "x" || s === "X";
var tryParse = (v) => {
	const n = parseInt(v, 10);
	return isNaN(n) ? v : n;
};
var forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
var compareStrings = (a, b) => {
	if (isWildcard(a) || isWildcard(b)) return 0;
	const [ap, bp] = forceType(tryParse(a), tryParse(b));
	if (ap > bp) return 1;
	if (ap < bp) return -1;
	return 0;
};
var compareSegments = (a, b) => {
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const r = compareStrings(a[i] || "0", b[i] || "0");
		if (r !== 0) return r;
	}
	return 0;
};
//#endregion
//#region node_modules/compare-versions/lib/esm/compareVersions.js
/**
* Compare [semver](https://semver.org/) version strings to find greater, equal or lesser.
* This library supports the full semver specification, including comparing versions with different number of digits like `1.0.0`, `1.0`, `1`, and pre-release versions like `1.0.0-alpha`.
* @param v1 - First version to compare
* @param v2 - Second version to compare
* @returns Numeric value compatible with the [Array.sort(fn) interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters).
*/
var compareVersions = (v1, v2) => {
	const n1 = validateAndParse(v1);
	const n2 = validateAndParse(v2);
	const p1 = n1.pop();
	const p2 = n2.pop();
	const r = compareSegments(n1, n2);
	if (r !== 0) return r;
	if (p1 && p2) return compareSegments(p1.split("."), p2.split("."));
	else if (p1 || p2) return p1 ? -1 : 1;
	return 0;
};
//#endregion
//#region src/actions/drafter/lib/find-previous-releases/sort-releases.ts
var import_satisfies = /* @__PURE__ */ __toESM(require_satisfies(), 1);
var sortReleases = (params) => {
	const tagPrefixRexExp = params.tagPrefix ? new RegExp(`^${escapeStringRegexp(params.tagPrefix)}`) : void 0;
	return params.releases.sort((r1, r2) => {
		const tag_name_1 = tagPrefixRexExp ? r1.tag_name.replace(tagPrefixRexExp, "") : r1.tag_name;
		const tag_name_2 = tagPrefixRexExp ? r2.tag_name.replace(tagPrefixRexExp, "") : r2.tag_name;
		try {
			return compareVersions(tag_name_1, tag_name_2);
		} catch {
			return new Date(r1.created_at).getTime() - new Date(r2.created_at).getTime();
		}
	});
};
//#endregion
//#region src/actions/drafter/lib/find-previous-releases/find-previous-releases.ts
var RELEASE_COUNT_LIMIT = 1e3;
/**
* Lists every release and :
* - filters by commitish if specified
* - filters by tag-prefix if specified
* - filters out pre-releases unless specified
* - extracts the first draft releases (according to return-order of GitHub API)
* - get latest published release according to ./sort-releases.ts implementation
*
* Returns one of (or both) draft release and latest published release
* The last stable release is used to determine the range of commits to include in the changelog,
* and to resolve the next version number.
*
* The draft release is used to determine if we should create a new release or update the existing one.
*/
var findPreviousReleases = async (params) => {
	const { commitish, "filter-by-commitish": filterByCommitish, "tag-prefix": tagPrefix, prerelease: isPreRelease, "include-pre-releases": includePreReleases, "filter-by-range": filterByRange } = params;
	const { logger, octokit, repo } = params.github;
	logger.info("🔎 Discovering previous releases from GitHub...");
	let releaseCount = 0;
	const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
		...repo,
		per_page: 100
	}, (response, done) => {
		releaseCount += response.data.length;
		if (releaseCount >= RELEASE_COUNT_LIMIT) done();
		return response.data;
	});
	logger.info(`  Found ${releases.length} releases`);
	const headRefRegex = /^refs\/heads\//;
	const targetCommitishName = commitish.replace(headRefRegex, "");
	const commitishFilteredReleases = filterByCommitish ? releases.filter((r) => targetCommitishName === r.target_commitish.replace(headRefRegex, "")) : releases;
	const semverRangeFilteredReleases = filterByRange && filterByRange !== "*" ? commitishFilteredReleases.filter((r) => {
		const parsedRange = (0, import_valid.default)(filterByRange);
		if (!parsedRange) return false;
		const parsedVersion = (0, import_coerce.default)(r.tag_name, { loose: true })?.version;
		if (!parsedVersion) {
			logger.warning(`Failed to coerce semver version for "${r.tag_name}" : will be excluded from releases considered for drafting.`);
			return false;
		}
		const doesSatisfy = !!(0, import_satisfies.default)(parsedVersion, parsedRange, { loose: true });
		logger.debug(`Range "${parsedRange}" ${doesSatisfy ? "satisfies" : "does not satisfy"} version "${parsedVersion}" `);
		return doesSatisfy;
	}) : commitishFilteredReleases;
	const filteredReleases = tagPrefix ? semverRangeFilteredReleases.filter((r) => r.tag_name.startsWith(tagPrefix)) : semverRangeFilteredReleases;
	let publishedReleases = filteredReleases.filter((r) => !r.draft);
	let draftReleases = filteredReleases.filter((r) => r.draft);
	publishedReleases = publishedReleases.filter((publishedRelease) => isPreRelease || includePreReleases ? publishedRelease.prerelease || !publishedRelease.prerelease : !publishedRelease.prerelease);
	draftReleases = draftReleases.filter((draftRelease) => isPreRelease ? draftRelease.prerelease : !draftRelease.prerelease);
	const draftRelease = draftReleases.at(0);
	const lastRelease = sortReleases({
		releases: publishedReleases,
		tagPrefix
	})?.at(-1);
	if (draftRelease) {
		if (draftReleases.length > 1) {
			logger.warning(`Multiple draft releases found : ${draftReleases.map((r) => r.tag_name).join(", ")}`);
			logger.warning(`Using the first one returned by GitHub API: ${draftRelease.tag_name}`);
		}
		logger.info(`  Draft release${isPreRelease ? " (which is a prerelease)" : ""}:`);
		logger.info(`    tag_name:  ${draftRelease.tag_name}`);
		logger.info(`    name:      ${draftRelease.name}`);
	} else logger.info(`  No draft release found${isPreRelease ? " (among prerelease drafts)" : ""}`);
	if (lastRelease) {
		logger.info(`  Last release${isPreRelease ? " (including prerelease)" : ""}:`);
		logger.info(`    tag_name:  ${lastRelease.tag_name}`);
		logger.info(`    name:      ${lastRelease.name}`);
	} else logger.warning(`  No published release found${isPreRelease ? " (including prerelease)" : ""}`);
	return {
		draftRelease,
		lastRelease
	};
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/find-commits-in-comparison.ts
var findComparisonCommitOids = async (octokit, params) => {
	const commits = [];
	let page = 1;
	while (true) {
		const response = await octokit.rest.repos.compareCommitsWithBasehead({
			owner: params.owner,
			repo: params.name,
			basehead: `${params.baseCommitish}...${params.headCommitish}`,
			per_page: 100,
			page
		});
		commits.push(...response.data.commits);
		if (!response.headers.link?.includes("rel=\"next\"")) break;
		page++;
	}
	return new Set(commits.map((commit) => commit.sha));
};
var findCommitsInComparison = async (params) => {
	const { octokit } = params.github;
	const { github: _github, ...comparisonParams } = params;
	const commits = [];
	const useCommitishes = params.useCommitishes ?? false;
	const remainingComparisonOids = useCommitishes ? await findComparisonCommitOids(octokit, params) : void 0;
	if (remainingComparisonOids?.size === 0) return commits;
	const queryParams = {
		...comparisonParams,
		useCommitishes,
		headCommitish: useCommitishes ? commitishToCommitExpression(params.headCommitish) : params.headCommitish
	};
	let cursor;
	while (true) {
		const repository = (await executeGraphql(octokit.graphql, FindCommitsInComparisonDocument, {
			...queryParams,
			cursor
		})).repository;
		if (remainingComparisonOids) {
			const history = repository?.head?.__typename === "Commit" ? repository.head.history : void 0;
			if (!history) throw new Error("Head commitish could not be resolved to a commit");
			for (const commit of history.nodes ?? []) if (commit && remainingComparisonOids.delete(commit.oid)) commits.push(commit);
			if (remainingComparisonOids.size === 0) return commits;
			if (!history.pageInfo.hasNextPage) throw new Error(`Comparison commits were not found in the history of ${params.headCommitish}: ${[...remainingComparisonOids].join(", ")}`);
			cursor = history.pageInfo.endCursor;
		} else {
			const comparison = repository?.ref?.compare?.commits;
			if (!comparison) throw new Error("Query returned an unexpected result: ref or comparison not found");
			commits.push(...(comparison.nodes ?? []).filter((commit) => commit != null));
			if (!comparison.pageInfo.hasNextPage) return commits;
			cursor = comparison.pageInfo.endCursor;
		}
		if (!cursor) throw new Error("Commit comparison pagination returned no cursor");
	}
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/find-recent-merged-pull-requests.ts
var RECENT_PR_LOOKBACK = 5;
var findRecentMergedPullRequests = async (params) => {
	const { logger, octokit, repo } = params.github;
	const nameWithOwner = `${repo.owner}/${repo.repo}`;
	const missingPRs = ((await executeGraphql(octokit.graphql, FindRecentMergedPullRequestsDocument, {
		name: repo.repo,
		owner: repo.owner,
		baseRefName: params.baseRefName,
		limit: RECENT_PR_LOOKBACK,
		...params.fieldFlags
	})).repository?.pullRequests.nodes ?? []).filter((pr) => {
		if (!pr?.mergeCommit?.oid) return false;
		const prKey = `${nameWithOwner}#${pr.number}`;
		return params.commitOids.has(pr.mergeCommit.oid) && !params.foundPrKeys.has(prKey);
	});
	if (missingPRs.length === 0) return [];
	logger.info(`  Found ${missingPRs.length} recently merged PR(s) missing from GraphQL index, recovering: ${missingPRs.map((pr) => `#${pr?.number}`).join(", ")}`);
	return missingPRs.filter((pr) => pr != null);
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/find-pull-requests.ts
var findNewContributorLogins = async (pullRequests, github) => {
	const { octokit, repo } = github;
	const firstMergedAtByLogin = /* @__PURE__ */ new Map();
	for (const pullRequest of pullRequests) {
		if (pullRequest.author?.__typename !== "User" || !pullRequest.mergedAt) continue;
		const previous = firstMergedAtByLogin.get(pullRequest.author.login);
		if (!previous || pullRequest.mergedAt < previous) firstMergedAtByLogin.set(pullRequest.author.login, pullRequest.mergedAt);
	}
	const candidates = [...firstMergedAtByLogin];
	if (candidates.length === 0) return /* @__PURE__ */ new Set();
	const variables = Object.fromEntries(candidates.map(([login, mergedAt], index) => [`query${index}`, `repo:${repo.owner}/${repo.repo} is:pr is:merged author:${login} merged:<${mergedAt}`]));
	const data = await octokit.graphql(`query findPreviousContributions(${candidates.map((_, index) => `$query${index}: String!`).join(", ")}) {
      ${candidates.map((_, index) => `author${index}: search(query: $query${index}, type: ISSUE, first: 1) { issueCount }`).join("\n")}
    }`, variables);
	return new Set(candidates.flatMap(([login], index) => data[`author${index}`]?.issueCount === 0 ? [login] : []));
};
var findPullRequests = async (params) => {
	const { logger, octokit, repo } = params.github;
	const sharedComparisonParams = {
		name: repo.repo,
		owner: repo.owner,
		withPullRequestBody: params.config["change-template"].includes("$BODY"),
		withPullRequestURL: params.config["change-template"].includes("$URL"),
		withBaseRefName: params.config["change-template"].includes("$BASE_REF_NAME"),
		withHeadRefName: params.config["change-template"].includes("$HEAD_REF_NAME"),
		pullRequestLimit: params.config["pull-request-limit"],
		historyLimit: params.config["history-limit"]
	};
	const previousCommitish = params.previousCommitish || (params.lastRelease?.tag_name ? `refs/tags/${params.lastRelease.tag_name}` : void 0);
	if (!previousCommitish) {
		logger.warning("A previous (published) release is required to find changes");
		return {
			commits: [],
			newContributorLogins: /* @__PURE__ */ new Set(),
			pullRequests: []
		};
	}
	logger.info(`🔎 Discovering commits between ${previousCommitish} and ${params.config.commitish}...`);
	const commits = await findCommitsInComparison({
		baseCommitish: previousCommitish,
		headCommitish: params.config.commitish,
		useCommitishes: !!params.previousCommitish,
		github: params.github,
		...sharedComparisonParams
	});
	logger.info(`  Found ${commits.length} commits.`);
	const pullRequestsByKey = new Map(commits.flatMap((commit) => commit.associatedPullRequests?.nodes ?? []).filter((pr) => pr != null).map((pr) => [`${pr.baseRepository?.nameWithOwner}#${pr.number}`, pr]));
	const pullRequestsRaw = [...pullRequestsByKey.values()];
	const comparisonCommitOids = new Set(commits.flatMap((c) => c.oid ? [c.oid] : []));
	const { commitish } = params.config;
	const isBranchRef = commitish.startsWith("refs/heads/");
	const isUnsupportedRef = commitish.startsWith("refs/tags/") || commitish.startsWith("refs/pull/");
	const recoveredPRs = comparisonCommitOids.size === 0 || isUnsupportedRef ? [] : await findRecentMergedPullRequests({
		baseRefName: isBranchRef ? commitish.replace(/^refs\/heads\//, "") : null,
		commitOids: comparisonCommitOids,
		foundPrKeys: new Set(pullRequestsByKey.keys()),
		github: params.github,
		fieldFlags: {
			withPullRequestBody: sharedComparisonParams.withPullRequestBody,
			withPullRequestURL: sharedComparisonParams.withPullRequestURL,
			withBaseRefName: sharedComparisonParams.withBaseRefName,
			withHeadRefName: sharedComparisonParams.withHeadRefName
		}
	});
	const pullRequests = [...pullRequestsRaw, ...recoveredPRs].filter((pr) => pr.baseRepository?.nameWithOwner === `${repo.owner}/${repo.repo}` && pr.merged);
	const shouldLoadPullRequestChangedFiles = needsPullRequestChangedFiles(params.config.categories);
	const pullRequestChangedFiles = shouldLoadPullRequestChangedFiles ? await getPullRequestsChangedFiles({
		owner: repo.owner,
		repo: repo.repo,
		pullRequests,
		octokit
	}) : /* @__PURE__ */ new Map();
	const newContributorLogins = [
		params.config.header,
		params.config.template,
		params.config.footer
	].some((template) => template?.includes("$NEW_CONTRIBUTORS")) ? await findNewContributorLogins(pullRequests, params.github) : /* @__PURE__ */ new Set();
	logger.info(`  Found ${pullRequests.length} merged pull requests targeting ${repo.owner}/${repo.repo}${pullRequests.length > 0 ? `: ${pullRequests.map((pr) => `#${pr.number}`).join(", ")}` : "."}`);
	return {
		commits,
		newContributorLogins,
		pullRequests: pullRequests.map((pullRequest) => shouldLoadPullRequestChangedFiles ? {
			...pullRequest,
			changedFiles: pullRequestChangedFiles.get(`${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`)
		} : pullRequest)
	};
};
//#endregion
//#region src/actions/drafter/lib/upsert-release/create-release.ts
var createRelease = async (params) => {
	const { octokit, repo } = params.github;
	const { releasePayload } = params;
	return octokit.rest.repos.createRelease({
		owner: repo.owner,
		repo: repo.repo,
		target_commitish: releasePayload.targetCommitish,
		name: releasePayload.name,
		tag_name: releasePayload.tag,
		body: releasePayload.body,
		draft: releasePayload.draft,
		prerelease: releasePayload.prerelease,
		make_latest: releasePayload.prerelease ? "false" : releasePayload.make_latest.toString()
	});
};
//#endregion
//#region src/actions/drafter/lib/upsert-release/update-release.ts
var updateRelease = async (params) => {
	const { octokit, repo } = params.github;
	const { draftRelease, releasePayload } = params;
	const updateReleaseParameters = {
		name: releasePayload.name || draftRelease.name || void 0,
		tag_name: releasePayload.tag || draftRelease.tag_name,
		target_commitish: releasePayload.targetCommitish
	};
	if (!updateReleaseParameters.name) delete updateReleaseParameters.name;
	if (!updateReleaseParameters.tag_name) delete updateReleaseParameters.tag_name;
	if (!updateReleaseParameters.target_commitish) delete updateReleaseParameters.target_commitish;
	return octokit.rest.repos.updateRelease({
		owner: repo.owner,
		repo: repo.repo,
		release_id: draftRelease.id,
		body: releasePayload.body,
		draft: releasePayload.draft,
		prerelease: releasePayload.prerelease,
		make_latest: releasePayload.prerelease ? "false" : releasePayload.make_latest.toString(),
		...updateReleaseParameters
	});
};
//#endregion
//#region src/actions/drafter/lib/upsert-release/upsert-release.ts
var upsertRelease = async (params) => {
	const { draftRelease, releasePayload, dryRun } = params;
	const { logger } = params.github;
	if (dryRun) {
		if (!draftRelease) logger.info(`🤖 [dry-run] Would create a new release with payload: ${JSON.stringify(releasePayload, null, 2)}`);
		else logger.info(`🤖 [dry-run] Would update existing release (id: ${draftRelease.id}) with payload: ${JSON.stringify(releasePayload, null, 2)}`);
		return;
	}
	if (!draftRelease) {
		logger.info("🚀 Creating new release...");
		const res = await createRelease({
			releasePayload,
			github: params.github
		});
		logger.info(`🎉 Release created: ${res.data.html_url || releasePayload.name}`);
		return res;
	} else {
		logger.info("🚀 Updating existing release...");
		const res = await updateRelease({
			draftRelease,
			releasePayload,
			github: params.github
		});
		logger.info(`🎉 Release updated: ${res.data.html_url || releasePayload.name}`);
		return res;
	}
};
//#endregion
//#region src/actions/drafter/main.ts
var main = async (params) => {
	/**
	* 1. find previous releases - returns latest release
	* 2. find commits since latest release, with their associated pull-requests
	* 3. sort those pull-requests according to the desired config (for release-body)
	* 4. generate release info
	* 5. create a release (may be a draft) or update previous draft
	* 6. set action outputs
	*/
	const { config, input } = params;
	const { logger } = params.github;
	const isPullRequestMergeRef = /^refs\/pull\/\d+\/merge$/.test(config.commitish);
	const effectiveInput = isPullRequestMergeRef ? {
		...input,
		"dry-run": true,
		publish: false
	} : input;
	if (isPullRequestMergeRef && !input["dry-run"]) logger.warning(`${config.commitish} points to an ephemeral pull request merge commit; forcing dry-run mode and disabling publish. Set dry-run: true explicitly to suppress this warning.`);
	const { draftRelease, lastRelease } = await findPreviousReleases({
		...config,
		github: params.github
	});
	const { commits, newContributorLogins, pullRequests } = await findPullRequests({
		lastRelease,
		config,
		previousCommitish: params.previousCommitish,
		github: params.github
	});
	const releasePayload = await buildReleasePayload({
		commits,
		config,
		input: effectiveInput,
		lastRelease,
		previousCommitish: params.previousCommitish,
		newContributorLogins,
		pullRequests,
		github: params.github
	});
	return {
		commits,
		pullRequests,
		releasePayload,
		upsertedRelease: await upsertRelease({
			draftRelease,
			releasePayload,
			dryRun: effectiveInput["dry-run"],
			github: params.github
		}),
		dryRun: effectiveInput["dry-run"]
	};
};
//#endregion
//#region src/drafter.ts
var draftRelease = async (options) => {
	const logger = options.logger ?? noopLogger;
	const octokit = options.octokit ?? getOctokit(options.token, {
		baseUrl: options.apiUrl,
		logger
	});
	const repository = options.commitish ? void 0 : await octokit.rest.repos.get(options.repo);
	const commitish = options.commitish || repository?.data.default_branch;
	if (!commitish) throw new Error("Unable to resolve the target commitish");
	const github = {
		repo: options.repo,
		ref: commitish,
		serverUrl: options.serverUrl ?? "https://github.com",
		octokit,
		logger
	};
	logger.info(`⚙️ Loading configuration from ${options.configName ?? "release-drafter.yml"}...`);
	const input = actionInputSchema.parse({
		"config-name": options.configName,
		version: options.version,
		publish: options.publish?.toString(),
		prerelease: options.prerelease?.toString(),
		latest: options.latest?.toString(),
		token: options.token,
		"dry-run": options.dryRun,
		commitish
	});
	return main({
		config: mergeInputAndConfig({
			config: await getConfig(input["config-name"], github),
			input,
			logger,
			ref: github.ref
		}),
		input,
		previousCommitish: options.previousCommitish,
		github
	});
};
//#endregion
export { getOctokit as n, draftRelease as t };
