import { g as getDefaultExportFromCjs } from "./_commonjsHelpers.js";
import require$$0 from "os";
import require$$0$1 from "crypto";
import require$$1 from "fs";
import path from "path";
import { r as requireLib } from "./index2.js";
import require$$6$1 from "string_decoder";
import require$$4 from "events";
import require$$2 from "child_process";
import require$$0$2 from "assert";
import require$$6 from "timers";
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
var core$2 = {};
var command = {};
var utils = {};
var hasRequiredUtils;
function requireUtils() {
  if (hasRequiredUtils) return utils;
  hasRequiredUtils = 1;
  Object.defineProperty(utils, "__esModule", { value: true });
  utils.toCommandProperties = utils.toCommandValue = void 0;
  function toCommandValue(input) {
    if (input === null || input === void 0) {
      return "";
    } else if (typeof input === "string" || input instanceof String) {
      return input;
    }
    return JSON.stringify(input);
  }
  utils.toCommandValue = toCommandValue;
  function toCommandProperties(annotationProperties) {
    if (!Object.keys(annotationProperties).length) {
      return {};
    }
    return {
      title: annotationProperties.title,
      file: annotationProperties.file,
      line: annotationProperties.startLine,
      endLine: annotationProperties.endLine,
      col: annotationProperties.startColumn,
      endColumn: annotationProperties.endColumn
    };
  }
  utils.toCommandProperties = toCommandProperties;
  return utils;
}
var hasRequiredCommand;
function requireCommand() {
  if (hasRequiredCommand) return command;
  hasRequiredCommand = 1;
  var __createBinding = command && command.__createBinding || (Object.create ? (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  }) : (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  }));
  var __setModuleDefault = command && command.__setModuleDefault || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  }) : function(o, v) {
    o["default"] = v;
  });
  var __importStar = command && command.__importStar || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    }
    __setModuleDefault(result, mod);
    return result;
  };
  Object.defineProperty(command, "__esModule", { value: true });
  command.issue = command.issueCommand = void 0;
  const os = __importStar(require$$0);
  const utils_1 = requireUtils();
  function issueCommand(command2, properties, message) {
    const cmd = new Command(command2, properties, message);
    process.stdout.write(cmd.toString() + os.EOL);
  }
  command.issueCommand = issueCommand;
  function issue(name, message = "") {
    issueCommand(name, {}, message);
  }
  command.issue = issue;
  const CMD_STRING = "::";
  class Command {
    constructor(command2, properties, message) {
      if (!command2) {
        command2 = "missing.command";
      }
      this.command = command2;
      this.properties = properties;
      this.message = message;
    }
    toString() {
      let cmdStr = CMD_STRING + this.command;
      if (this.properties && Object.keys(this.properties).length > 0) {
        cmdStr += " ";
        let first = true;
        for (const key in this.properties) {
          if (this.properties.hasOwnProperty(key)) {
            const val = this.properties[key];
            if (val) {
              if (first) {
                first = false;
              } else {
                cmdStr += ",";
              }
              cmdStr += `${key}=${escapeProperty(val)}`;
            }
          }
        }
      }
      cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
      return cmdStr;
    }
  }
  function escapeData(s) {
    return (0, utils_1.toCommandValue)(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  }
  function escapeProperty(s) {
    return (0, utils_1.toCommandValue)(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/:/g, "%3A").replace(/,/g, "%2C");
  }
  return command;
}
var fileCommand = {};
var hasRequiredFileCommand;
function requireFileCommand() {
  if (hasRequiredFileCommand) return fileCommand;
  hasRequiredFileCommand = 1;
  var __createBinding = fileCommand && fileCommand.__createBinding || (Object.create ? (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  }) : (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  }));
  var __setModuleDefault = fileCommand && fileCommand.__setModuleDefault || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  }) : function(o, v) {
    o["default"] = v;
  });
  var __importStar = fileCommand && fileCommand.__importStar || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    }
    __setModuleDefault(result, mod);
    return result;
  };
  Object.defineProperty(fileCommand, "__esModule", { value: true });
  fileCommand.prepareKeyValueMessage = fileCommand.issueFileCommand = void 0;
  const crypto = __importStar(require$$0$1);
  const fs = __importStar(require$$1);
  const os = __importStar(require$$0);
  const utils_1 = requireUtils();
  function issueFileCommand(command2, message) {
    const filePath = process.env[`GITHUB_${command2}`];
    if (!filePath) {
      throw new Error(`Unable to find environment variable for file command ${command2}`);
    }
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing file at path: ${filePath}`);
    }
    fs.appendFileSync(filePath, `${(0, utils_1.toCommandValue)(message)}${os.EOL}`, {
      encoding: "utf8"
    });
  }
  fileCommand.issueFileCommand = issueFileCommand;
  function prepareKeyValueMessage(key, value) {
    const delimiter = `ghadelimiter_${crypto.randomUUID()}`;
    const convertedValue = (0, utils_1.toCommandValue)(value);
    if (key.includes(delimiter)) {
      throw new Error(`Unexpected input: name should not contain the delimiter "${delimiter}"`);
    }
    if (convertedValue.includes(delimiter)) {
      throw new Error(`Unexpected input: value should not contain the delimiter "${delimiter}"`);
    }
    return `${key}<<${delimiter}${os.EOL}${convertedValue}${os.EOL}${delimiter}`;
  }
  fileCommand.prepareKeyValueMessage = prepareKeyValueMessage;
  return fileCommand;
}
var oidcUtils = {};
var auth = {};
var hasRequiredAuth;
function requireAuth() {
  if (hasRequiredAuth) return auth;
  hasRequiredAuth = 1;
  var __awaiter = auth && auth.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(auth, "__esModule", { value: true });
  auth.PersonalAccessTokenCredentialHandler = auth.BearerCredentialHandler = auth.BasicCredentialHandler = void 0;
  class BasicCredentialHandler {
    constructor(username, password) {
      this.username = username;
      this.password = password;
    }
    prepareRequest(options) {
      if (!options.headers) {
        throw Error("The request has no headers");
      }
      options.headers["Authorization"] = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`;
    }
    // This handler cannot handle 401
    canHandleAuthentication() {
      return false;
    }
    handleAuthentication() {
      return __awaiter(this, void 0, void 0, function* () {
        throw new Error("not implemented");
      });
    }
  }
  auth.BasicCredentialHandler = BasicCredentialHandler;
  class BearerCredentialHandler {
    constructor(token) {
      this.token = token;
    }
    // currently implements pre-authorization
    // TODO: support preAuth = false where it hooks on 401
    prepareRequest(options) {
      if (!options.headers) {
        throw Error("The request has no headers");
      }
      options.headers["Authorization"] = `Bearer ${this.token}`;
    }
    // This handler cannot handle 401
    canHandleAuthentication() {
      return false;
    }
    handleAuthentication() {
      return __awaiter(this, void 0, void 0, function* () {
        throw new Error("not implemented");
      });
    }
  }
  auth.BearerCredentialHandler = BearerCredentialHandler;
  class PersonalAccessTokenCredentialHandler {
    constructor(token) {
      this.token = token;
    }
    // currently implements pre-authorization
    // TODO: support preAuth = false where it hooks on 401
    prepareRequest(options) {
      if (!options.headers) {
        throw Error("The request has no headers");
      }
      options.headers["Authorization"] = `Basic ${Buffer.from(`PAT:${this.token}`).toString("base64")}`;
    }
    // This handler cannot handle 401
    canHandleAuthentication() {
      return false;
    }
    handleAuthentication() {
      return __awaiter(this, void 0, void 0, function* () {
        throw new Error("not implemented");
      });
    }
  }
  auth.PersonalAccessTokenCredentialHandler = PersonalAccessTokenCredentialHandler;
  return auth;
}
var hasRequiredOidcUtils;
function requireOidcUtils() {
  if (hasRequiredOidcUtils) return oidcUtils;
  hasRequiredOidcUtils = 1;
  var __awaiter = oidcUtils && oidcUtils.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(oidcUtils, "__esModule", { value: true });
  oidcUtils.OidcClient = void 0;
  const http_client_1 = requireLib();
  const auth_1 = requireAuth();
  const core_1 = requireCore();
  class OidcClient {
    static createHttpClient(allowRetry = true, maxRetry = 10) {
      const requestOptions = {
        allowRetries: allowRetry,
        maxRetries: maxRetry
      };
      return new http_client_1.HttpClient("actions/oidc-client", [new auth_1.BearerCredentialHandler(OidcClient.getRequestToken())], requestOptions);
    }
    static getRequestToken() {
      const token = process.env["ACTIONS_ID_TOKEN_REQUEST_TOKEN"];
      if (!token) {
        throw new Error("Unable to get ACTIONS_ID_TOKEN_REQUEST_TOKEN env variable");
      }
      return token;
    }
    static getIDTokenUrl() {
      const runtimeUrl = process.env["ACTIONS_ID_TOKEN_REQUEST_URL"];
      if (!runtimeUrl) {
        throw new Error("Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable");
      }
      return runtimeUrl;
    }
    static getCall(id_token_url) {
      var _a;
      return __awaiter(this, void 0, void 0, function* () {
        const httpclient = OidcClient.createHttpClient();
        const res = yield httpclient.getJson(id_token_url).catch((error) => {
          throw new Error(`Failed to get ID Token. 
 
        Error Code : ${error.statusCode}
 
        Error Message: ${error.message}`);
        });
        const id_token = (_a = res.result) === null || _a === void 0 ? void 0 : _a.value;
        if (!id_token) {
          throw new Error("Response json body do not have ID Token field");
        }
        return id_token;
      });
    }
    static getIDToken(audience) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          let id_token_url = OidcClient.getIDTokenUrl();
          if (audience) {
            const encodedAudience = encodeURIComponent(audience);
            id_token_url = `${id_token_url}&audience=${encodedAudience}`;
          }
          (0, core_1.debug)(`ID token url is ${id_token_url}`);
          const id_token = yield OidcClient.getCall(id_token_url);
          (0, core_1.setSecret)(id_token);
          return id_token;
        } catch (error) {
          throw new Error(`Error message: ${error.message}`);
        }
      });
    }
  }
  oidcUtils.OidcClient = OidcClient;
  return oidcUtils;
}
var summary = {};
var hasRequiredSummary;
function requireSummary() {
  if (hasRequiredSummary) return summary;
  hasRequiredSummary = 1;
  (function(exports$1) {
    var __awaiter = summary && summary.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.summary = exports$1.markdownSummary = exports$1.SUMMARY_DOCS_URL = exports$1.SUMMARY_ENV_VAR = void 0;
    const os_1 = require$$0;
    const fs_1 = require$$1;
    const { access, appendFile, writeFile } = fs_1.promises;
    exports$1.SUMMARY_ENV_VAR = "GITHUB_STEP_SUMMARY";
    exports$1.SUMMARY_DOCS_URL = "https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary";
    class Summary {
      constructor() {
        this._buffer = "";
      }
      /**
       * Finds the summary file path from the environment, rejects if env var is not found or file does not exist
       * Also checks r/w permissions.
       *
       * @returns step summary file path
       */
      filePath() {
        return __awaiter(this, void 0, void 0, function* () {
          if (this._filePath) {
            return this._filePath;
          }
          const pathFromEnv = process.env[exports$1.SUMMARY_ENV_VAR];
          if (!pathFromEnv) {
            throw new Error(`Unable to find environment variable for $${exports$1.SUMMARY_ENV_VAR}. Check if your runtime environment supports job summaries.`);
          }
          try {
            yield access(pathFromEnv, fs_1.constants.R_OK | fs_1.constants.W_OK);
          } catch (_a) {
            throw new Error(`Unable to access summary file: '${pathFromEnv}'. Check if the file has correct read/write permissions.`);
          }
          this._filePath = pathFromEnv;
          return this._filePath;
        });
      }
      /**
       * Wraps content in an HTML tag, adding any HTML attributes
       *
       * @param {string} tag HTML tag to wrap
       * @param {string | null} content content within the tag
       * @param {[attribute: string]: string} attrs key-value list of HTML attributes to add
       *
       * @returns {string} content wrapped in HTML element
       */
      wrap(tag, content, attrs = {}) {
        const htmlAttrs = Object.entries(attrs).map(([key, value]) => ` ${key}="${value}"`).join("");
        if (!content) {
          return `<${tag}${htmlAttrs}>`;
        }
        return `<${tag}${htmlAttrs}>${content}</${tag}>`;
      }
      /**
       * Writes text in the buffer to the summary buffer file and empties buffer. Will append by default.
       *
       * @param {SummaryWriteOptions} [options] (optional) options for write operation
       *
       * @returns {Promise<Summary>} summary instance
       */
      write(options) {
        return __awaiter(this, void 0, void 0, function* () {
          const overwrite = !!(options === null || options === void 0 ? void 0 : options.overwrite);
          const filePath = yield this.filePath();
          const writeFunc = overwrite ? writeFile : appendFile;
          yield writeFunc(filePath, this._buffer, { encoding: "utf8" });
          return this.emptyBuffer();
        });
      }
      /**
       * Clears the summary buffer and wipes the summary file
       *
       * @returns {Summary} summary instance
       */
      clear() {
        return __awaiter(this, void 0, void 0, function* () {
          return this.emptyBuffer().write({ overwrite: true });
        });
      }
      /**
       * Returns the current summary buffer as a string
       *
       * @returns {string} string of summary buffer
       */
      stringify() {
        return this._buffer;
      }
      /**
       * If the summary buffer is empty
       *
       * @returns {boolen} true if the buffer is empty
       */
      isEmptyBuffer() {
        return this._buffer.length === 0;
      }
      /**
       * Resets the summary buffer without writing to summary file
       *
       * @returns {Summary} summary instance
       */
      emptyBuffer() {
        this._buffer = "";
        return this;
      }
      /**
       * Adds raw text to the summary buffer
       *
       * @param {string} text content to add
       * @param {boolean} [addEOL=false] (optional) append an EOL to the raw text (default: false)
       *
       * @returns {Summary} summary instance
       */
      addRaw(text, addEOL = false) {
        this._buffer += text;
        return addEOL ? this.addEOL() : this;
      }
      /**
       * Adds the operating system-specific end-of-line marker to the buffer
       *
       * @returns {Summary} summary instance
       */
      addEOL() {
        return this.addRaw(os_1.EOL);
      }
      /**
       * Adds an HTML codeblock to the summary buffer
       *
       * @param {string} code content to render within fenced code block
       * @param {string} lang (optional) language to syntax highlight code
       *
       * @returns {Summary} summary instance
       */
      addCodeBlock(code, lang) {
        const attrs = Object.assign({}, lang && { lang });
        const element = this.wrap("pre", this.wrap("code", code), attrs);
        return this.addRaw(element).addEOL();
      }
      /**
       * Adds an HTML list to the summary buffer
       *
       * @param {string[]} items list of items to render
       * @param {boolean} [ordered=false] (optional) if the rendered list should be ordered or not (default: false)
       *
       * @returns {Summary} summary instance
       */
      addList(items, ordered = false) {
        const tag = ordered ? "ol" : "ul";
        const listItems = items.map((item) => this.wrap("li", item)).join("");
        const element = this.wrap(tag, listItems);
        return this.addRaw(element).addEOL();
      }
      /**
       * Adds an HTML table to the summary buffer
       *
       * @param {SummaryTableCell[]} rows table rows
       *
       * @returns {Summary} summary instance
       */
      addTable(rows) {
        const tableBody = rows.map((row) => {
          const cells = row.map((cell) => {
            if (typeof cell === "string") {
              return this.wrap("td", cell);
            }
            const { header, data, colspan, rowspan } = cell;
            const tag = header ? "th" : "td";
            const attrs = Object.assign(Object.assign({}, colspan && { colspan }), rowspan && { rowspan });
            return this.wrap(tag, data, attrs);
          }).join("");
          return this.wrap("tr", cells);
        }).join("");
        const element = this.wrap("table", tableBody);
        return this.addRaw(element).addEOL();
      }
      /**
       * Adds a collapsable HTML details element to the summary buffer
       *
       * @param {string} label text for the closed state
       * @param {string} content collapsable content
       *
       * @returns {Summary} summary instance
       */
      addDetails(label, content) {
        const element = this.wrap("details", this.wrap("summary", label) + content);
        return this.addRaw(element).addEOL();
      }
      /**
       * Adds an HTML image tag to the summary buffer
       *
       * @param {string} src path to the image you to embed
       * @param {string} alt text description of the image
       * @param {SummaryImageOptions} options (optional) addition image attributes
       *
       * @returns {Summary} summary instance
       */
      addImage(src, alt, options) {
        const { width, height } = options || {};
        const attrs = Object.assign(Object.assign({}, width && { width }), height && { height });
        const element = this.wrap("img", null, Object.assign({ src, alt }, attrs));
        return this.addRaw(element).addEOL();
      }
      /**
       * Adds an HTML section heading element
       *
       * @param {string} text heading text
       * @param {number | string} [level=1] (optional) the heading level, default: 1
       *
       * @returns {Summary} summary instance
       */
      addHeading(text, level) {
        const tag = `h${level}`;
        const allowedTag = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag) ? tag : "h1";
        const element = this.wrap(allowedTag, text);
        return this.addRaw(element).addEOL();
      }
      /**
       * Adds an HTML thematic break (<hr>) to the summary buffer
       *
       * @returns {Summary} summary instance
       */
      addSeparator() {
        const element = this.wrap("hr", null);
        return this.addRaw(element).addEOL();
      }
      /**
       * Adds an HTML line break (<br>) to the summary buffer
       *
       * @returns {Summary} summary instance
       */
      addBreak() {
        const element = this.wrap("br", null);
        return this.addRaw(element).addEOL();
      }
      /**
       * Adds an HTML blockquote to the summary buffer
       *
       * @param {string} text quote text
       * @param {string} cite (optional) citation url
       *
       * @returns {Summary} summary instance
       */
      addQuote(text, cite) {
        const attrs = Object.assign({}, cite && { cite });
        const element = this.wrap("blockquote", text, attrs);
        return this.addRaw(element).addEOL();
      }
      /**
       * Adds an HTML anchor tag to the summary buffer
       *
       * @param {string} text link text/content
       * @param {string} href hyperlink
       *
       * @returns {Summary} summary instance
       */
      addLink(text, href) {
        const element = this.wrap("a", text, { href });
        return this.addRaw(element).addEOL();
      }
    }
    const _summary = new Summary();
    exports$1.markdownSummary = _summary;
    exports$1.summary = _summary;
  })(summary);
  return summary;
}
var pathUtils = {};
var hasRequiredPathUtils;
function requirePathUtils() {
  if (hasRequiredPathUtils) return pathUtils;
  hasRequiredPathUtils = 1;
  var __createBinding = pathUtils && pathUtils.__createBinding || (Object.create ? (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  }) : (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  }));
  var __setModuleDefault = pathUtils && pathUtils.__setModuleDefault || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  }) : function(o, v) {
    o["default"] = v;
  });
  var __importStar = pathUtils && pathUtils.__importStar || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    }
    __setModuleDefault(result, mod);
    return result;
  };
  Object.defineProperty(pathUtils, "__esModule", { value: true });
  pathUtils.toPlatformPath = pathUtils.toWin32Path = pathUtils.toPosixPath = void 0;
  const path$1 = __importStar(path);
  function toPosixPath(pth) {
    return pth.replace(/[\\]/g, "/");
  }
  pathUtils.toPosixPath = toPosixPath;
  function toWin32Path(pth) {
    return pth.replace(/[/]/g, "\\");
  }
  pathUtils.toWin32Path = toWin32Path;
  function toPlatformPath(pth) {
    return pth.replace(/[/\\]/g, path$1.sep);
  }
  pathUtils.toPlatformPath = toPlatformPath;
  return pathUtils;
}
var platform = {};
var exec = {};
var toolrunner = {};
var io = {};
var ioUtil = {};
var hasRequiredIoUtil;
function requireIoUtil() {
  if (hasRequiredIoUtil) return ioUtil;
  hasRequiredIoUtil = 1;
  (function(exports$1) {
    var __createBinding = ioUtil && ioUtil.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() {
        return m[k];
      } });
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = ioUtil && ioUtil.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = ioUtil && ioUtil.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __awaiter = ioUtil && ioUtil.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var _a;
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.getCmdPath = exports$1.tryGetExecutablePath = exports$1.isRooted = exports$1.isDirectory = exports$1.exists = exports$1.READONLY = exports$1.UV_FS_O_EXLOCK = exports$1.IS_WINDOWS = exports$1.unlink = exports$1.symlink = exports$1.stat = exports$1.rmdir = exports$1.rm = exports$1.rename = exports$1.readlink = exports$1.readdir = exports$1.open = exports$1.mkdir = exports$1.lstat = exports$1.copyFile = exports$1.chmod = void 0;
    const fs = __importStar(require$$1);
    const path$1 = __importStar(path);
    _a = fs.promises, exports$1.chmod = _a.chmod, exports$1.copyFile = _a.copyFile, exports$1.lstat = _a.lstat, exports$1.mkdir = _a.mkdir, exports$1.open = _a.open, exports$1.readdir = _a.readdir, exports$1.readlink = _a.readlink, exports$1.rename = _a.rename, exports$1.rm = _a.rm, exports$1.rmdir = _a.rmdir, exports$1.stat = _a.stat, exports$1.symlink = _a.symlink, exports$1.unlink = _a.unlink;
    exports$1.IS_WINDOWS = process.platform === "win32";
    exports$1.UV_FS_O_EXLOCK = 268435456;
    exports$1.READONLY = fs.constants.O_RDONLY;
    function exists(fsPath) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          yield exports$1.stat(fsPath);
        } catch (err) {
          if (err.code === "ENOENT") {
            return false;
          }
          throw err;
        }
        return true;
      });
    }
    exports$1.exists = exists;
    function isDirectory(fsPath, useStat = false) {
      return __awaiter(this, void 0, void 0, function* () {
        const stats = useStat ? yield exports$1.stat(fsPath) : yield exports$1.lstat(fsPath);
        return stats.isDirectory();
      });
    }
    exports$1.isDirectory = isDirectory;
    function isRooted(p) {
      p = normalizeSeparators(p);
      if (!p) {
        throw new Error('isRooted() parameter "p" cannot be empty');
      }
      if (exports$1.IS_WINDOWS) {
        return p.startsWith("\\") || /^[A-Z]:/i.test(p);
      }
      return p.startsWith("/");
    }
    exports$1.isRooted = isRooted;
    function tryGetExecutablePath(filePath, extensions) {
      return __awaiter(this, void 0, void 0, function* () {
        let stats = void 0;
        try {
          stats = yield exports$1.stat(filePath);
        } catch (err) {
          if (err.code !== "ENOENT") {
            console.log(`Unexpected error attempting to determine if executable file exists '${filePath}': ${err}`);
          }
        }
        if (stats && stats.isFile()) {
          if (exports$1.IS_WINDOWS) {
            const upperExt = path$1.extname(filePath).toUpperCase();
            if (extensions.some((validExt) => validExt.toUpperCase() === upperExt)) {
              return filePath;
            }
          } else {
            if (isUnixExecutable(stats)) {
              return filePath;
            }
          }
        }
        const originalFilePath = filePath;
        for (const extension of extensions) {
          filePath = originalFilePath + extension;
          stats = void 0;
          try {
            stats = yield exports$1.stat(filePath);
          } catch (err) {
            if (err.code !== "ENOENT") {
              console.log(`Unexpected error attempting to determine if executable file exists '${filePath}': ${err}`);
            }
          }
          if (stats && stats.isFile()) {
            if (exports$1.IS_WINDOWS) {
              try {
                const directory = path$1.dirname(filePath);
                const upperName = path$1.basename(filePath).toUpperCase();
                for (const actualName of yield exports$1.readdir(directory)) {
                  if (upperName === actualName.toUpperCase()) {
                    filePath = path$1.join(directory, actualName);
                    break;
                  }
                }
              } catch (err) {
                console.log(`Unexpected error attempting to determine the actual case of the file '${filePath}': ${err}`);
              }
              return filePath;
            } else {
              if (isUnixExecutable(stats)) {
                return filePath;
              }
            }
          }
        }
        return "";
      });
    }
    exports$1.tryGetExecutablePath = tryGetExecutablePath;
    function normalizeSeparators(p) {
      p = p || "";
      if (exports$1.IS_WINDOWS) {
        p = p.replace(/\//g, "\\");
        return p.replace(/\\\\+/g, "\\");
      }
      return p.replace(/\/\/+/g, "/");
    }
    function isUnixExecutable(stats) {
      return (stats.mode & 1) > 0 || (stats.mode & 8) > 0 && stats.gid === process.getgid() || (stats.mode & 64) > 0 && stats.uid === process.getuid();
    }
    function getCmdPath() {
      var _a2;
      return (_a2 = process.env["COMSPEC"]) !== null && _a2 !== void 0 ? _a2 : `cmd.exe`;
    }
    exports$1.getCmdPath = getCmdPath;
  })(ioUtil);
  return ioUtil;
}
var hasRequiredIo;
function requireIo() {
  if (hasRequiredIo) return io;
  hasRequiredIo = 1;
  var __createBinding = io && io.__createBinding || (Object.create ? (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() {
      return m[k];
    } });
  }) : (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  }));
  var __setModuleDefault = io && io.__setModuleDefault || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  }) : function(o, v) {
    o["default"] = v;
  });
  var __importStar = io && io.__importStar || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    }
    __setModuleDefault(result, mod);
    return result;
  };
  var __awaiter = io && io.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(io, "__esModule", { value: true });
  io.findInPath = io.which = io.mkdirP = io.rmRF = io.mv = io.cp = void 0;
  const assert_1 = require$$0$2;
  const path$1 = __importStar(path);
  const ioUtil2 = __importStar(requireIoUtil());
  function cp(source, dest, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
      const { force, recursive, copySourceDirectory } = readCopyOptions(options);
      const destStat = (yield ioUtil2.exists(dest)) ? yield ioUtil2.stat(dest) : null;
      if (destStat && destStat.isFile() && !force) {
        return;
      }
      const newDest = destStat && destStat.isDirectory() && copySourceDirectory ? path$1.join(dest, path$1.basename(source)) : dest;
      if (!(yield ioUtil2.exists(source))) {
        throw new Error(`no such file or directory: ${source}`);
      }
      const sourceStat = yield ioUtil2.stat(source);
      if (sourceStat.isDirectory()) {
        if (!recursive) {
          throw new Error(`Failed to copy. ${source} is a directory, but tried to copy without recursive flag.`);
        } else {
          yield cpDirRecursive(source, newDest, 0, force);
        }
      } else {
        if (path$1.relative(source, newDest) === "") {
          throw new Error(`'${newDest}' and '${source}' are the same file`);
        }
        yield copyFile(source, newDest, force);
      }
    });
  }
  io.cp = cp;
  function mv(source, dest, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
      if (yield ioUtil2.exists(dest)) {
        let destExists = true;
        if (yield ioUtil2.isDirectory(dest)) {
          dest = path$1.join(dest, path$1.basename(source));
          destExists = yield ioUtil2.exists(dest);
        }
        if (destExists) {
          if (options.force == null || options.force) {
            yield rmRF(dest);
          } else {
            throw new Error("Destination already exists");
          }
        }
      }
      yield mkdirP(path$1.dirname(dest));
      yield ioUtil2.rename(source, dest);
    });
  }
  io.mv = mv;
  function rmRF(inputPath) {
    return __awaiter(this, void 0, void 0, function* () {
      if (ioUtil2.IS_WINDOWS) {
        if (/[*"<>|]/.test(inputPath)) {
          throw new Error('File path must not contain `*`, `"`, `<`, `>` or `|` on Windows');
        }
      }
      try {
        yield ioUtil2.rm(inputPath, {
          force: true,
          maxRetries: 3,
          recursive: true,
          retryDelay: 300
        });
      } catch (err) {
        throw new Error(`File was unable to be removed ${err}`);
      }
    });
  }
  io.rmRF = rmRF;
  function mkdirP(fsPath) {
    return __awaiter(this, void 0, void 0, function* () {
      assert_1.ok(fsPath, "a path argument must be provided");
      yield ioUtil2.mkdir(fsPath, { recursive: true });
    });
  }
  io.mkdirP = mkdirP;
  function which(tool, check) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!tool) {
        throw new Error("parameter 'tool' is required");
      }
      if (check) {
        const result = yield which(tool, false);
        if (!result) {
          if (ioUtil2.IS_WINDOWS) {
            throw new Error(`Unable to locate executable file: ${tool}. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also verify the file has a valid extension for an executable file.`);
          } else {
            throw new Error(`Unable to locate executable file: ${tool}. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable.`);
          }
        }
        return result;
      }
      const matches = yield findInPath(tool);
      if (matches && matches.length > 0) {
        return matches[0];
      }
      return "";
    });
  }
  io.which = which;
  function findInPath(tool) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!tool) {
        throw new Error("parameter 'tool' is required");
      }
      const extensions = [];
      if (ioUtil2.IS_WINDOWS && process.env["PATHEXT"]) {
        for (const extension of process.env["PATHEXT"].split(path$1.delimiter)) {
          if (extension) {
            extensions.push(extension);
          }
        }
      }
      if (ioUtil2.isRooted(tool)) {
        const filePath = yield ioUtil2.tryGetExecutablePath(tool, extensions);
        if (filePath) {
          return [filePath];
        }
        return [];
      }
      if (tool.includes(path$1.sep)) {
        return [];
      }
      const directories = [];
      if (process.env.PATH) {
        for (const p of process.env.PATH.split(path$1.delimiter)) {
          if (p) {
            directories.push(p);
          }
        }
      }
      const matches = [];
      for (const directory of directories) {
        const filePath = yield ioUtil2.tryGetExecutablePath(path$1.join(directory, tool), extensions);
        if (filePath) {
          matches.push(filePath);
        }
      }
      return matches;
    });
  }
  io.findInPath = findInPath;
  function readCopyOptions(options) {
    const force = options.force == null ? true : options.force;
    const recursive = Boolean(options.recursive);
    const copySourceDirectory = options.copySourceDirectory == null ? true : Boolean(options.copySourceDirectory);
    return { force, recursive, copySourceDirectory };
  }
  function cpDirRecursive(sourceDir, destDir, currentDepth, force) {
    return __awaiter(this, void 0, void 0, function* () {
      if (currentDepth >= 255)
        return;
      currentDepth++;
      yield mkdirP(destDir);
      const files = yield ioUtil2.readdir(sourceDir);
      for (const fileName of files) {
        const srcFile = `${sourceDir}/${fileName}`;
        const destFile = `${destDir}/${fileName}`;
        const srcFileStat = yield ioUtil2.lstat(srcFile);
        if (srcFileStat.isDirectory()) {
          yield cpDirRecursive(srcFile, destFile, currentDepth, force);
        } else {
          yield copyFile(srcFile, destFile, force);
        }
      }
      yield ioUtil2.chmod(destDir, (yield ioUtil2.stat(sourceDir)).mode);
    });
  }
  function copyFile(srcFile, destFile, force) {
    return __awaiter(this, void 0, void 0, function* () {
      if ((yield ioUtil2.lstat(srcFile)).isSymbolicLink()) {
        try {
          yield ioUtil2.lstat(destFile);
          yield ioUtil2.unlink(destFile);
        } catch (e) {
          if (e.code === "EPERM") {
            yield ioUtil2.chmod(destFile, "0666");
            yield ioUtil2.unlink(destFile);
          }
        }
        const symlinkFull = yield ioUtil2.readlink(srcFile);
        yield ioUtil2.symlink(symlinkFull, destFile, ioUtil2.IS_WINDOWS ? "junction" : null);
      } else if (!(yield ioUtil2.exists(destFile)) || force) {
        yield ioUtil2.copyFile(srcFile, destFile);
      }
    });
  }
  return io;
}
var hasRequiredToolrunner;
function requireToolrunner() {
  if (hasRequiredToolrunner) return toolrunner;
  hasRequiredToolrunner = 1;
  var __createBinding = toolrunner && toolrunner.__createBinding || (Object.create ? (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() {
      return m[k];
    } });
  }) : (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  }));
  var __setModuleDefault = toolrunner && toolrunner.__setModuleDefault || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  }) : function(o, v) {
    o["default"] = v;
  });
  var __importStar = toolrunner && toolrunner.__importStar || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    }
    __setModuleDefault(result, mod);
    return result;
  };
  var __awaiter = toolrunner && toolrunner.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(toolrunner, "__esModule", { value: true });
  toolrunner.argStringToArray = toolrunner.ToolRunner = void 0;
  const os = __importStar(require$$0);
  const events = __importStar(require$$4);
  const child = __importStar(require$$2);
  const path$1 = __importStar(path);
  const io2 = __importStar(requireIo());
  const ioUtil2 = __importStar(requireIoUtil());
  const timers_1 = require$$6;
  const IS_WINDOWS = process.platform === "win32";
  class ToolRunner extends events.EventEmitter {
    constructor(toolPath, args, options) {
      super();
      if (!toolPath) {
        throw new Error("Parameter 'toolPath' cannot be null or empty.");
      }
      this.toolPath = toolPath;
      this.args = args || [];
      this.options = options || {};
    }
    _debug(message) {
      if (this.options.listeners && this.options.listeners.debug) {
        this.options.listeners.debug(message);
      }
    }
    _getCommandString(options, noPrefix) {
      const toolPath = this._getSpawnFileName();
      const args = this._getSpawnArgs(options);
      let cmd = noPrefix ? "" : "[command]";
      if (IS_WINDOWS) {
        if (this._isCmdFile()) {
          cmd += toolPath;
          for (const a of args) {
            cmd += ` ${a}`;
          }
        } else if (options.windowsVerbatimArguments) {
          cmd += `"${toolPath}"`;
          for (const a of args) {
            cmd += ` ${a}`;
          }
        } else {
          cmd += this._windowsQuoteCmdArg(toolPath);
          for (const a of args) {
            cmd += ` ${this._windowsQuoteCmdArg(a)}`;
          }
        }
      } else {
        cmd += toolPath;
        for (const a of args) {
          cmd += ` ${a}`;
        }
      }
      return cmd;
    }
    _processLineBuffer(data, strBuffer, onLine) {
      try {
        let s = strBuffer + data.toString();
        let n = s.indexOf(os.EOL);
        while (n > -1) {
          const line = s.substring(0, n);
          onLine(line);
          s = s.substring(n + os.EOL.length);
          n = s.indexOf(os.EOL);
        }
        return s;
      } catch (err) {
        this._debug(`error processing line. Failed with error ${err}`);
        return "";
      }
    }
    _getSpawnFileName() {
      if (IS_WINDOWS) {
        if (this._isCmdFile()) {
          return process.env["COMSPEC"] || "cmd.exe";
        }
      }
      return this.toolPath;
    }
    _getSpawnArgs(options) {
      if (IS_WINDOWS) {
        if (this._isCmdFile()) {
          let argline = `/D /S /C "${this._windowsQuoteCmdArg(this.toolPath)}`;
          for (const a of this.args) {
            argline += " ";
            argline += options.windowsVerbatimArguments ? a : this._windowsQuoteCmdArg(a);
          }
          argline += '"';
          return [argline];
        }
      }
      return this.args;
    }
    _endsWith(str, end) {
      return str.endsWith(end);
    }
    _isCmdFile() {
      const upperToolPath = this.toolPath.toUpperCase();
      return this._endsWith(upperToolPath, ".CMD") || this._endsWith(upperToolPath, ".BAT");
    }
    _windowsQuoteCmdArg(arg) {
      if (!this._isCmdFile()) {
        return this._uvQuoteCmdArg(arg);
      }
      if (!arg) {
        return '""';
      }
      const cmdSpecialChars = [
        " ",
        "	",
        "&",
        "(",
        ")",
        "[",
        "]",
        "{",
        "}",
        "^",
        "=",
        ";",
        "!",
        "'",
        "+",
        ",",
        "`",
        "~",
        "|",
        "<",
        ">",
        '"'
      ];
      let needsQuotes = false;
      for (const char of arg) {
        if (cmdSpecialChars.some((x) => x === char)) {
          needsQuotes = true;
          break;
        }
      }
      if (!needsQuotes) {
        return arg;
      }
      let reverse = '"';
      let quoteHit = true;
      for (let i = arg.length; i > 0; i--) {
        reverse += arg[i - 1];
        if (quoteHit && arg[i - 1] === "\\") {
          reverse += "\\";
        } else if (arg[i - 1] === '"') {
          quoteHit = true;
          reverse += '"';
        } else {
          quoteHit = false;
        }
      }
      reverse += '"';
      return reverse.split("").reverse().join("");
    }
    _uvQuoteCmdArg(arg) {
      if (!arg) {
        return '""';
      }
      if (!arg.includes(" ") && !arg.includes("	") && !arg.includes('"')) {
        return arg;
      }
      if (!arg.includes('"') && !arg.includes("\\")) {
        return `"${arg}"`;
      }
      let reverse = '"';
      let quoteHit = true;
      for (let i = arg.length; i > 0; i--) {
        reverse += arg[i - 1];
        if (quoteHit && arg[i - 1] === "\\") {
          reverse += "\\";
        } else if (arg[i - 1] === '"') {
          quoteHit = true;
          reverse += "\\";
        } else {
          quoteHit = false;
        }
      }
      reverse += '"';
      return reverse.split("").reverse().join("");
    }
    _cloneExecOptions(options) {
      options = options || {};
      const result = {
        cwd: options.cwd || process.cwd(),
        env: options.env || process.env,
        silent: options.silent || false,
        windowsVerbatimArguments: options.windowsVerbatimArguments || false,
        failOnStdErr: options.failOnStdErr || false,
        ignoreReturnCode: options.ignoreReturnCode || false,
        delay: options.delay || 1e4
      };
      result.outStream = options.outStream || process.stdout;
      result.errStream = options.errStream || process.stderr;
      return result;
    }
    _getSpawnOptions(options, toolPath) {
      options = options || {};
      const result = {};
      result.cwd = options.cwd;
      result.env = options.env;
      result["windowsVerbatimArguments"] = options.windowsVerbatimArguments || this._isCmdFile();
      if (options.windowsVerbatimArguments) {
        result.argv0 = `"${toolPath}"`;
      }
      return result;
    }
    /**
     * Exec a tool.
     * Output will be streamed to the live console.
     * Returns promise with return code
     *
     * @param     tool     path to tool to exec
     * @param     options  optional exec options.  See ExecOptions
     * @returns   number
     */
    exec() {
      return __awaiter(this, void 0, void 0, function* () {
        if (!ioUtil2.isRooted(this.toolPath) && (this.toolPath.includes("/") || IS_WINDOWS && this.toolPath.includes("\\"))) {
          this.toolPath = path$1.resolve(process.cwd(), this.options.cwd || process.cwd(), this.toolPath);
        }
        this.toolPath = yield io2.which(this.toolPath, true);
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
          this._debug(`exec tool: ${this.toolPath}`);
          this._debug("arguments:");
          for (const arg of this.args) {
            this._debug(`   ${arg}`);
          }
          const optionsNonNull = this._cloneExecOptions(this.options);
          if (!optionsNonNull.silent && optionsNonNull.outStream) {
            optionsNonNull.outStream.write(this._getCommandString(optionsNonNull) + os.EOL);
          }
          const state = new ExecState(optionsNonNull, this.toolPath);
          state.on("debug", (message) => {
            this._debug(message);
          });
          if (this.options.cwd && !(yield ioUtil2.exists(this.options.cwd))) {
            return reject(new Error(`The cwd: ${this.options.cwd} does not exist!`));
          }
          const fileName = this._getSpawnFileName();
          const cp = child.spawn(fileName, this._getSpawnArgs(optionsNonNull), this._getSpawnOptions(this.options, fileName));
          let stdbuffer = "";
          if (cp.stdout) {
            cp.stdout.on("data", (data) => {
              if (this.options.listeners && this.options.listeners.stdout) {
                this.options.listeners.stdout(data);
              }
              if (!optionsNonNull.silent && optionsNonNull.outStream) {
                optionsNonNull.outStream.write(data);
              }
              stdbuffer = this._processLineBuffer(data, stdbuffer, (line) => {
                if (this.options.listeners && this.options.listeners.stdline) {
                  this.options.listeners.stdline(line);
                }
              });
            });
          }
          let errbuffer = "";
          if (cp.stderr) {
            cp.stderr.on("data", (data) => {
              state.processStderr = true;
              if (this.options.listeners && this.options.listeners.stderr) {
                this.options.listeners.stderr(data);
              }
              if (!optionsNonNull.silent && optionsNonNull.errStream && optionsNonNull.outStream) {
                const s = optionsNonNull.failOnStdErr ? optionsNonNull.errStream : optionsNonNull.outStream;
                s.write(data);
              }
              errbuffer = this._processLineBuffer(data, errbuffer, (line) => {
                if (this.options.listeners && this.options.listeners.errline) {
                  this.options.listeners.errline(line);
                }
              });
            });
          }
          cp.on("error", (err) => {
            state.processError = err.message;
            state.processExited = true;
            state.processClosed = true;
            state.CheckComplete();
          });
          cp.on("exit", (code) => {
            state.processExitCode = code;
            state.processExited = true;
            this._debug(`Exit code ${code} received from tool '${this.toolPath}'`);
            state.CheckComplete();
          });
          cp.on("close", (code) => {
            state.processExitCode = code;
            state.processExited = true;
            state.processClosed = true;
            this._debug(`STDIO streams have closed for tool '${this.toolPath}'`);
            state.CheckComplete();
          });
          state.on("done", (error, exitCode) => {
            if (stdbuffer.length > 0) {
              this.emit("stdline", stdbuffer);
            }
            if (errbuffer.length > 0) {
              this.emit("errline", errbuffer);
            }
            cp.removeAllListeners();
            if (error) {
              reject(error);
            } else {
              resolve(exitCode);
            }
          });
          if (this.options.input) {
            if (!cp.stdin) {
              throw new Error("child process missing stdin");
            }
            cp.stdin.end(this.options.input);
          }
        }));
      });
    }
  }
  toolrunner.ToolRunner = ToolRunner;
  function argStringToArray(argString) {
    const args = [];
    let inQuotes = false;
    let escaped = false;
    let arg = "";
    function append(c) {
      if (escaped && c !== '"') {
        arg += "\\";
      }
      arg += c;
      escaped = false;
    }
    for (let i = 0; i < argString.length; i++) {
      const c = argString.charAt(i);
      if (c === '"') {
        if (!escaped) {
          inQuotes = !inQuotes;
        } else {
          append(c);
        }
        continue;
      }
      if (c === "\\" && escaped) {
        append(c);
        continue;
      }
      if (c === "\\" && inQuotes) {
        escaped = true;
        continue;
      }
      if (c === " " && !inQuotes) {
        if (arg.length > 0) {
          args.push(arg);
          arg = "";
        }
        continue;
      }
      append(c);
    }
    if (arg.length > 0) {
      args.push(arg.trim());
    }
    return args;
  }
  toolrunner.argStringToArray = argStringToArray;
  class ExecState extends events.EventEmitter {
    constructor(options, toolPath) {
      super();
      this.processClosed = false;
      this.processError = "";
      this.processExitCode = 0;
      this.processExited = false;
      this.processStderr = false;
      this.delay = 1e4;
      this.done = false;
      this.timeout = null;
      if (!toolPath) {
        throw new Error("toolPath must not be empty");
      }
      this.options = options;
      this.toolPath = toolPath;
      if (options.delay) {
        this.delay = options.delay;
      }
    }
    CheckComplete() {
      if (this.done) {
        return;
      }
      if (this.processClosed) {
        this._setResult();
      } else if (this.processExited) {
        this.timeout = timers_1.setTimeout(ExecState.HandleTimeout, this.delay, this);
      }
    }
    _debug(message) {
      this.emit("debug", message);
    }
    _setResult() {
      let error;
      if (this.processExited) {
        if (this.processError) {
          error = new Error(`There was an error when attempting to execute the process '${this.toolPath}'. This may indicate the process failed to start. Error: ${this.processError}`);
        } else if (this.processExitCode !== 0 && !this.options.ignoreReturnCode) {
          error = new Error(`The process '${this.toolPath}' failed with exit code ${this.processExitCode}`);
        } else if (this.processStderr && this.options.failOnStdErr) {
          error = new Error(`The process '${this.toolPath}' failed because one or more lines were written to the STDERR stream`);
        }
      }
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      this.done = true;
      this.emit("done", error, this.processExitCode);
    }
    static HandleTimeout(state) {
      if (state.done) {
        return;
      }
      if (!state.processClosed && state.processExited) {
        const message = `The STDIO streams did not close within ${state.delay / 1e3} seconds of the exit event from process '${state.toolPath}'. This may indicate a child process inherited the STDIO streams and has not yet exited.`;
        state._debug(message);
      }
      state._setResult();
    }
  }
  return toolrunner;
}
var hasRequiredExec;
function requireExec() {
  if (hasRequiredExec) return exec;
  hasRequiredExec = 1;
  var __createBinding = exec && exec.__createBinding || (Object.create ? (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() {
      return m[k];
    } });
  }) : (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  }));
  var __setModuleDefault = exec && exec.__setModuleDefault || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  }) : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exec && exec.__importStar || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    }
    __setModuleDefault(result, mod);
    return result;
  };
  var __awaiter = exec && exec.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(exec, "__esModule", { value: true });
  exec.getExecOutput = exec.exec = void 0;
  const string_decoder_1 = require$$6$1;
  const tr = __importStar(requireToolrunner());
  function exec$1(commandLine, args, options) {
    return __awaiter(this, void 0, void 0, function* () {
      const commandArgs = tr.argStringToArray(commandLine);
      if (commandArgs.length === 0) {
        throw new Error(`Parameter 'commandLine' cannot be null or empty.`);
      }
      const toolPath = commandArgs[0];
      args = commandArgs.slice(1).concat(args || []);
      const runner = new tr.ToolRunner(toolPath, args, options);
      return runner.exec();
    });
  }
  exec.exec = exec$1;
  function getExecOutput(commandLine, args, options) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
      let stdout = "";
      let stderr = "";
      const stdoutDecoder = new string_decoder_1.StringDecoder("utf8");
      const stderrDecoder = new string_decoder_1.StringDecoder("utf8");
      const originalStdoutListener = (_a = options === null || options === void 0 ? void 0 : options.listeners) === null || _a === void 0 ? void 0 : _a.stdout;
      const originalStdErrListener = (_b = options === null || options === void 0 ? void 0 : options.listeners) === null || _b === void 0 ? void 0 : _b.stderr;
      const stdErrListener = (data) => {
        stderr += stderrDecoder.write(data);
        if (originalStdErrListener) {
          originalStdErrListener(data);
        }
      };
      const stdOutListener = (data) => {
        stdout += stdoutDecoder.write(data);
        if (originalStdoutListener) {
          originalStdoutListener(data);
        }
      };
      const listeners = Object.assign(Object.assign({}, options === null || options === void 0 ? void 0 : options.listeners), { stdout: stdOutListener, stderr: stdErrListener });
      const exitCode = yield exec$1(commandLine, args, Object.assign(Object.assign({}, options), { listeners }));
      stdout += stdoutDecoder.end();
      stderr += stderrDecoder.end();
      return {
        exitCode,
        stdout,
        stderr
      };
    });
  }
  exec.getExecOutput = getExecOutput;
  return exec;
}
var hasRequiredPlatform;
function requirePlatform() {
  if (hasRequiredPlatform) return platform;
  hasRequiredPlatform = 1;
  (function(exports$1) {
    var __createBinding = platform && platform.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = platform && platform.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = platform && platform.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __awaiter = platform && platform.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __importDefault = platform && platform.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.getDetails = exports$1.isLinux = exports$1.isMacOS = exports$1.isWindows = exports$1.arch = exports$1.platform = void 0;
    const os_1 = __importDefault(require$$0);
    const exec2 = __importStar(requireExec());
    const getWindowsInfo = () => __awaiter(void 0, void 0, void 0, function* () {
      const { stdout: version } = yield exec2.getExecOutput('powershell -command "(Get-CimInstance -ClassName Win32_OperatingSystem).Version"', void 0, {
        silent: true
      });
      const { stdout: name } = yield exec2.getExecOutput('powershell -command "(Get-CimInstance -ClassName Win32_OperatingSystem).Caption"', void 0, {
        silent: true
      });
      return {
        name: name.trim(),
        version: version.trim()
      };
    });
    const getMacOsInfo = () => __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b, _c, _d;
      const { stdout } = yield exec2.getExecOutput("sw_vers", void 0, {
        silent: true
      });
      const version = (_b = (_a = stdout.match(/ProductVersion:\s*(.+)/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : "";
      const name = (_d = (_c = stdout.match(/ProductName:\s*(.+)/)) === null || _c === void 0 ? void 0 : _c[1]) !== null && _d !== void 0 ? _d : "";
      return {
        name,
        version
      };
    });
    const getLinuxInfo = () => __awaiter(void 0, void 0, void 0, function* () {
      const { stdout } = yield exec2.getExecOutput("lsb_release", ["-i", "-r", "-s"], {
        silent: true
      });
      const [name, version] = stdout.trim().split("\n");
      return {
        name,
        version
      };
    });
    exports$1.platform = os_1.default.platform();
    exports$1.arch = os_1.default.arch();
    exports$1.isWindows = exports$1.platform === "win32";
    exports$1.isMacOS = exports$1.platform === "darwin";
    exports$1.isLinux = exports$1.platform === "linux";
    function getDetails() {
      return __awaiter(this, void 0, void 0, function* () {
        return Object.assign(Object.assign({}, yield exports$1.isWindows ? getWindowsInfo() : exports$1.isMacOS ? getMacOsInfo() : getLinuxInfo()), {
          platform: exports$1.platform,
          arch: exports$1.arch,
          isWindows: exports$1.isWindows,
          isMacOS: exports$1.isMacOS,
          isLinux: exports$1.isLinux
        });
      });
    }
    exports$1.getDetails = getDetails;
  })(platform);
  return platform;
}
var hasRequiredCore;
function requireCore() {
  if (hasRequiredCore) return core$2;
  hasRequiredCore = 1;
  (function(exports$1) {
    var __createBinding = core$2 && core$2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = core$2 && core$2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = core$2 && core$2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __awaiter = core$2 && core$2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.platform = exports$1.toPlatformPath = exports$1.toWin32Path = exports$1.toPosixPath = exports$1.markdownSummary = exports$1.summary = exports$1.getIDToken = exports$1.getState = exports$1.saveState = exports$1.group = exports$1.endGroup = exports$1.startGroup = exports$1.info = exports$1.notice = exports$1.warning = exports$1.error = exports$1.debug = exports$1.isDebug = exports$1.setFailed = exports$1.setCommandEcho = exports$1.setOutput = exports$1.getBooleanInput = exports$1.getMultilineInput = exports$1.getInput = exports$1.addPath = exports$1.setSecret = exports$1.exportVariable = exports$1.ExitCode = void 0;
    const command_1 = requireCommand();
    const file_command_1 = requireFileCommand();
    const utils_1 = requireUtils();
    const os = __importStar(require$$0);
    const path$1 = __importStar(path);
    const oidc_utils_1 = requireOidcUtils();
    var ExitCode;
    (function(ExitCode2) {
      ExitCode2[ExitCode2["Success"] = 0] = "Success";
      ExitCode2[ExitCode2["Failure"] = 1] = "Failure";
    })(ExitCode || (exports$1.ExitCode = ExitCode = {}));
    function exportVariable(name, val) {
      const convertedVal = (0, utils_1.toCommandValue)(val);
      process.env[name] = convertedVal;
      const filePath = process.env["GITHUB_ENV"] || "";
      if (filePath) {
        return (0, file_command_1.issueFileCommand)("ENV", (0, file_command_1.prepareKeyValueMessage)(name, val));
      }
      (0, command_1.issueCommand)("set-env", { name }, convertedVal);
    }
    exports$1.exportVariable = exportVariable;
    function setSecret(secret) {
      (0, command_1.issueCommand)("add-mask", {}, secret);
    }
    exports$1.setSecret = setSecret;
    function addPath(inputPath) {
      const filePath = process.env["GITHUB_PATH"] || "";
      if (filePath) {
        (0, file_command_1.issueFileCommand)("PATH", inputPath);
      } else {
        (0, command_1.issueCommand)("add-path", {}, inputPath);
      }
      process.env["PATH"] = `${inputPath}${path$1.delimiter}${process.env["PATH"]}`;
    }
    exports$1.addPath = addPath;
    function getInput(name, options) {
      const val = process.env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] || "";
      if (options && options.required && !val) {
        throw new Error(`Input required and not supplied: ${name}`);
      }
      if (options && options.trimWhitespace === false) {
        return val;
      }
      return val.trim();
    }
    exports$1.getInput = getInput;
    function getMultilineInput(name, options) {
      const inputs = getInput(name, options).split("\n").filter((x) => x !== "");
      if (options && options.trimWhitespace === false) {
        return inputs;
      }
      return inputs.map((input) => input.trim());
    }
    exports$1.getMultilineInput = getMultilineInput;
    function getBooleanInput(name, options) {
      const trueValue = ["true", "True", "TRUE"];
      const falseValue = ["false", "False", "FALSE"];
      const val = getInput(name, options);
      if (trueValue.includes(val))
        return true;
      if (falseValue.includes(val))
        return false;
      throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}
Support boolean input list: \`true | True | TRUE | false | False | FALSE\``);
    }
    exports$1.getBooleanInput = getBooleanInput;
    function setOutput(name, value) {
      const filePath = process.env["GITHUB_OUTPUT"] || "";
      if (filePath) {
        return (0, file_command_1.issueFileCommand)("OUTPUT", (0, file_command_1.prepareKeyValueMessage)(name, value));
      }
      process.stdout.write(os.EOL);
      (0, command_1.issueCommand)("set-output", { name }, (0, utils_1.toCommandValue)(value));
    }
    exports$1.setOutput = setOutput;
    function setCommandEcho(enabled) {
      (0, command_1.issue)("echo", enabled ? "on" : "off");
    }
    exports$1.setCommandEcho = setCommandEcho;
    function setFailed(message) {
      process.exitCode = ExitCode.Failure;
      error(message);
    }
    exports$1.setFailed = setFailed;
    function isDebug() {
      return process.env["RUNNER_DEBUG"] === "1";
    }
    exports$1.isDebug = isDebug;
    function debug(message) {
      (0, command_1.issueCommand)("debug", {}, message);
    }
    exports$1.debug = debug;
    function error(message, properties = {}) {
      (0, command_1.issueCommand)("error", (0, utils_1.toCommandProperties)(properties), message instanceof Error ? message.toString() : message);
    }
    exports$1.error = error;
    function warning(message, properties = {}) {
      (0, command_1.issueCommand)("warning", (0, utils_1.toCommandProperties)(properties), message instanceof Error ? message.toString() : message);
    }
    exports$1.warning = warning;
    function notice(message, properties = {}) {
      (0, command_1.issueCommand)("notice", (0, utils_1.toCommandProperties)(properties), message instanceof Error ? message.toString() : message);
    }
    exports$1.notice = notice;
    function info(message) {
      process.stdout.write(message + os.EOL);
    }
    exports$1.info = info;
    function startGroup(name) {
      (0, command_1.issue)("group", name);
    }
    exports$1.startGroup = startGroup;
    function endGroup() {
      (0, command_1.issue)("endgroup");
    }
    exports$1.endGroup = endGroup;
    function group(name, fn) {
      return __awaiter(this, void 0, void 0, function* () {
        startGroup(name);
        let result;
        try {
          result = yield fn();
        } finally {
          endGroup();
        }
        return result;
      });
    }
    exports$1.group = group;
    function saveState(name, value) {
      const filePath = process.env["GITHUB_STATE"] || "";
      if (filePath) {
        return (0, file_command_1.issueFileCommand)("STATE", (0, file_command_1.prepareKeyValueMessage)(name, value));
      }
      (0, command_1.issueCommand)("save-state", { name }, (0, utils_1.toCommandValue)(value));
    }
    exports$1.saveState = saveState;
    function getState(name) {
      return process.env[`STATE_${name}`] || "";
    }
    exports$1.getState = getState;
    function getIDToken(aud) {
      return __awaiter(this, void 0, void 0, function* () {
        return yield oidc_utils_1.OidcClient.getIDToken(aud);
      });
    }
    exports$1.getIDToken = getIDToken;
    var summary_1 = requireSummary();
    Object.defineProperty(exports$1, "summary", { enumerable: true, get: function() {
      return summary_1.summary;
    } });
    var summary_2 = requireSummary();
    Object.defineProperty(exports$1, "markdownSummary", { enumerable: true, get: function() {
      return summary_2.markdownSummary;
    } });
    var path_utils_1 = requirePathUtils();
    Object.defineProperty(exports$1, "toPosixPath", { enumerable: true, get: function() {
      return path_utils_1.toPosixPath;
    } });
    Object.defineProperty(exports$1, "toWin32Path", { enumerable: true, get: function() {
      return path_utils_1.toWin32Path;
    } });
    Object.defineProperty(exports$1, "toPlatformPath", { enumerable: true, get: function() {
      return path_utils_1.toPlatformPath;
    } });
    exports$1.platform = __importStar(requirePlatform());
  })(core$2);
  return core$2;
}
var coreExports = requireCore();
const core = /* @__PURE__ */ getDefaultExportFromCjs(coreExports);
const core$1 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: core
}, [coreExports]);
export {
  core as a,
  core$1 as b,
  coreExports as c
};
//# sourceMappingURL=core.js.map
