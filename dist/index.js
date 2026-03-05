import { g as getDefaultExportFromCjs } from "./_commonjsHelpers.js";
var lib = { exports: {} };
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib.exports;
  hasRequiredLib = 1;
  lib.exports = function(input) {
    if (typeof input !== "string") {
      throw new Error("Invalid input. Input must be a string");
    }
    var m = input.match(/(\/?)(.+)\1([a-z]*)/i);
    if (!m) {
      throw new Error("Invalid regular expression format.");
    }
    var validFlags = Array.from(new Set(m[3])).filter(function(flag) {
      return "gimsuy".includes(flag);
    }).join("");
    return new RegExp(m[2], validFlags);
  };
  return lib.exports;
}

var _default = md5;
exports["default"] = _default;

/***/ }),

/***/ 37723:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _default = '00000000-0000-0000-0000-000000000000';
exports["default"] = _default;

/***/ }),

/***/ 17267:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;

var _validate = _interopRequireDefault(__nccwpck_require__(36200));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function parse(uuid) {
  if (!(0, _validate.default)(uuid)) {
    throw TypeError('Invalid UUID');
  }

  let v;
  const arr = new Uint8Array(16); // Parse ########-....-....-....-............

  arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
  arr[1] = v >>> 16 & 0xff;
  arr[2] = v >>> 8 & 0xff;
  arr[3] = v & 0xff; // Parse ........-####-....-....-............

  arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
  arr[5] = v & 0xff; // Parse ........-....-####-....-............

  arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
  arr[7] = v & 0xff; // Parse ........-....-....-####-............

  arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
  arr[9] = v & 0xff; // Parse ........-....-....-....-############
  // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)

  arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000 & 0xff;
  arr[11] = v / 0x100000000 & 0xff;
  arr[12] = v >>> 24 & 0xff;
  arr[13] = v >>> 16 & 0xff;
  arr[14] = v >>> 8 & 0xff;
  arr[15] = v & 0xff;
  return arr;
}

var _default = parse;
exports["default"] = _default;

/***/ }),

/***/ 67879:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
exports["default"] = _default;

/***/ }),

/***/ 12973:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = rng;

var _crypto = _interopRequireDefault(__nccwpck_require__(76982));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const rnds8Pool = new Uint8Array(256); // # of random values to pre-allocate

let poolPtr = rnds8Pool.length;

function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    _crypto.default.randomFillSync(rnds8Pool);

    poolPtr = 0;
  }

  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

/***/ }),

/***/ 507:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;

var _crypto = _interopRequireDefault(__nccwpck_require__(76982));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function sha1(bytes) {
  if (Array.isArray(bytes)) {
    bytes = Buffer.from(bytes);
  } else if (typeof bytes === 'string') {
    bytes = Buffer.from(bytes, 'utf8');
  }

  return _crypto.default.createHash('sha1').update(bytes).digest();
}

var _default = sha1;
exports["default"] = _default;

/***/ }),

/***/ 37597:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;

var _validate = _interopRequireDefault(__nccwpck_require__(36200));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
const byteToHex = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).substr(1));
}

function stringify(arr, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  const uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
  // of the following:
  // - One or more input array values don't map to a hex octet (leading to
  // "undefined" in the uuid)
  // - Invalid input values for the RFC `version` or `variant` fields

  if (!(0, _validate.default)(uuid)) {
    throw TypeError('Stringified UUID is invalid');
  }

  return uuid;
}

var _default = stringify;
exports["default"] = _default;

/***/ }),

/***/ 6415:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;

var _rng = _interopRequireDefault(__nccwpck_require__(12973));

var _stringify = _interopRequireDefault(__nccwpck_require__(37597));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html
let _nodeId;

let _clockseq; // Previous uuid creation time


let _lastMSecs = 0;
let _lastNSecs = 0; // See https://github.com/uuidjs/uuid for API details

function v1(options, buf, offset) {
  let i = buf && offset || 0;
  const b = buf || new Array(16);
  options = options || {};
  let node = options.node || _nodeId;
  let clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq; // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189

  if (node == null || clockseq == null) {
    const seedBytes = options.random || (options.rng || _rng.default)();

    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [seedBytes[0] | 0x01, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
    }

    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  } // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.


  let msecs = options.msecs !== undefined ? options.msecs : Date.now(); // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock

  let nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1; // Time since last uuid creation (in msecs)

  const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000; // Per 4.2.1.2, Bump clockseq on clock regression

  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  } // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval


  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  } // Per 4.2.1.2 Throw error if too many uuids are requested


  if (nsecs >= 10000) {
    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq; // Per 4.1.4 - Convert from unix epoch to Gregorian epoch

  msecs += 12219292800000; // `time_low`

  const tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff; // `time_mid`

  const tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff; // `time_high_and_version`

  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version

  b[i++] = tmh >>> 16 & 0xff; // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)

  b[i++] = clockseq >>> 8 | 0x80; // `clock_seq_low`

  b[i++] = clockseq & 0xff; // `node`

  for (let n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf || (0, _stringify.default)(b);
}

var _default = v1;
exports["default"] = _default;

/***/ }),

/***/ 51697:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;

var _v = _interopRequireDefault(__nccwpck_require__(92930));

var _md = _interopRequireDefault(__nccwpck_require__(10216));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const v3 = (0, _v.default)('v3', 0x30, _md.default);
var _default = v3;
exports["default"] = _default;

/***/ }),

/***/ 92930:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = _default;
exports.URL = exports.DNS = void 0;

var _stringify = _interopRequireDefault(__nccwpck_require__(37597));

var _parse = _interopRequireDefault(__nccwpck_require__(17267));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function stringToBytes(str) {
  str = unescape(encodeURIComponent(str)); // UTF8 escape

  const bytes = [];

  for (let i = 0; i < str.length; ++i) {
    bytes.push(str.charCodeAt(i));
  }

  return bytes;
}

const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
exports.DNS = DNS;
const URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
exports.URL = URL;

function _default(name, version, hashfunc) {
  function generateUUID(value, namespace, buf, offset) {
    if (typeof value === 'string') {
      value = stringToBytes(value);
    }

    if (typeof namespace === 'string') {
      namespace = (0, _parse.default)(namespace);
    }

    if (namespace.length !== 16) {
      throw TypeError('Namespace must be array-like (16 iterable integer values, 0-255)');
    } // Compute hash of namespace and value, Per 4.3
    // Future: Use spread syntax when supported on all platforms, e.g. `bytes =
    // hashfunc([...namespace, ... value])`


    let bytes = new Uint8Array(16 + value.length);
    bytes.set(namespace);
    bytes.set(value, namespace.length);
    bytes = hashfunc(bytes);
    bytes[6] = bytes[6] & 0x0f | version;
    bytes[8] = bytes[8] & 0x3f | 0x80;

    if (buf) {
      offset = offset || 0;

      for (let i = 0; i < 16; ++i) {
        buf[offset + i] = bytes[i];
      }

      return buf;
    }

    return (0, _stringify.default)(bytes);
  } // Function#name is not settable on some platforms (#270)


  try {
    generateUUID.name = name; // eslint-disable-next-line no-empty
  } catch (err) {} // For CommonJS default export support


  generateUUID.DNS = DNS;
  generateUUID.URL = URL;
  return generateUUID;
}

/***/ }),

/***/ 4676:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;

var _rng = _interopRequireDefault(__nccwpck_require__(12973));

var _stringify = _interopRequireDefault(__nccwpck_require__(37597));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function v4(options, buf, offset) {
  options = options || {};

  const rnds = options.random || (options.rng || _rng.default)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`


  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

  if (buf) {
    offset = offset || 0;

    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }

    return buf;
  }

  return (0, _stringify.default)(rnds);
}

var _default = v4;
exports["default"] = _default;

/***/ }),

/***/ 69771:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;

var _v = _interopRequireDefault(__nccwpck_require__(92930));

var _sha = _interopRequireDefault(__nccwpck_require__(507));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const v5 = (0, _v.default)('v5', 0x50, _sha.default);
var _default = v5;
exports["default"] = _default;

/***/ }),

/***/ 36200:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;

var _regex = _interopRequireDefault(__nccwpck_require__(67879));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function validate(uuid) {
  return typeof uuid === 'string' && _regex.default.test(uuid);
}

var _default = validate;
exports["default"] = _default;

/***/ }),

/***/ 15868:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;

var _validate = _interopRequireDefault(__nccwpck_require__(36200));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function version(uuid) {
  if (!(0, _validate.default)(uuid)) {
    throw TypeError('Invalid UUID');
  }

  return parseInt(uuid.substr(14, 1), 16);
}

var _default = version;
exports["default"] = _default;

/***/ }),

/***/ 45116:
/***/ ((module) => {

"use strict";
/*!
 * vary
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module exports.
 */

module.exports = vary
module.exports.append = append

/**
 * RegExp to match field-name in RFC 7230 sec 3.2
 *
 * field-name    = token
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 */

var FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

/**
 * Append a field to a vary header.
 *
 * @param {String} header
 * @param {String|Array} field
 * @return {String}
 * @public
 */

function append (header, field) {
  if (typeof header !== 'string') {
    throw new TypeError('header argument is required')
  }

  if (!field) {
    throw new TypeError('field argument is required')
  }

  // get fields array
  var fields = !Array.isArray(field)
    ? parse(String(field))
    : field

  // assert on invalid field names
  for (var j = 0; j < fields.length; j++) {
    if (!FIELD_NAME_REGEXP.test(fields[j])) {
      throw new TypeError('field argument contains an invalid header name')
    }
  }

  // existing, unspecified vary
  if (header === '*') {
    return header
  }

  // enumerate current values
  var val = header
  var vals = parse(header.toLowerCase())

  // unspecified vary
  if (fields.indexOf('*') !== -1 || vals.indexOf('*') !== -1) {
    return '*'
  }

  for (var i = 0; i < fields.length; i++) {
    var fld = fields[i].toLowerCase()

    // append value (case-preserving)
    if (vals.indexOf(fld) === -1) {
      vals.push(fld)
      val = val
        ? val + ', ' + fields[i]
        : fields[i]
    }
  }

  return val
}

/**
 * Parse a vary header into an array.
 *
 * @param {String} header
 * @return {Array}
 * @private
 */

function parse (header) {
  var end = 0
  var list = []
  var start = 0

  // gather tokens
  for (var i = 0, len = header.length; i < len; i++) {
    switch (header.charCodeAt(i)) {
      case 0x20: /*   */
        if (start === end) {
          start = end = i + 1
        }
        break
      case 0x2c: /* , */
        list.push(header.substring(start, end))
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  // final token
  list.push(header.substring(start, end))

  return list
}

/**
 * Mark that a request is varied on a header field.
 *
 * @param {Object} res
 * @param {String|Array} field
 * @public
 */

function vary (res, field) {
  if (!res || !res.getHeader || !res.setHeader) {
    // quack quack
    throw new TypeError('res argument is required')
  }

  // get existing header
  var val = res.getHeader('Vary') || ''
  var header = Array.isArray(val)
    ? val.join(', ')
    : String(val)

  // set new header
  if ((val = append(header, field))) {
    res.setHeader('Vary', val)
  }
}


/***/ }),

/***/ 37125:
/***/ ((module) => {

"use strict";


var conversions = {};
module.exports = conversions;

function sign(x) {
    return x < 0 ? -1 : 1;
}

function evenRound(x) {
    // Round x to the nearest integer, choosing the even integer if it lies halfway between two.
    if ((x % 1) === 0.5 && (x & 1) === 0) { // [even number].5; round down (i.e. floor)
        return Math.floor(x);
    } else {
        return Math.round(x);
    }
}

function createNumberConversion(bitLength, typeOpts) {
    if (!typeOpts.unsigned) {
        --bitLength;
    }
    const lowerBound = typeOpts.unsigned ? 0 : -Math.pow(2, bitLength);
    const upperBound = Math.pow(2, bitLength) - 1;

    const moduloVal = typeOpts.moduloBitLength ? Math.pow(2, typeOpts.moduloBitLength) : Math.pow(2, bitLength);
    const moduloBound = typeOpts.moduloBitLength ? Math.pow(2, typeOpts.moduloBitLength - 1) : Math.pow(2, bitLength - 1);

    return function(V, opts) {
        if (!opts) opts = {};

        let x = +V;

        if (opts.enforceRange) {
            if (!Number.isFinite(x)) {
                throw new TypeError("Argument is not a finite number");
            }

            x = sign(x) * Math.floor(Math.abs(x));
            if (x < lowerBound || x > upperBound) {
                throw new TypeError("Argument is not in byte range");
            }

            return x;
        }

        if (!isNaN(x) && opts.clamp) {
            x = evenRound(x);

            if (x < lowerBound) x = lowerBound;
            if (x > upperBound) x = upperBound;
            return x;
        }

        if (!Number.isFinite(x) || x === 0) {
            return 0;
        }

        x = sign(x) * Math.floor(Math.abs(x));
        x = x % moduloVal;

        if (!typeOpts.unsigned && x >= moduloBound) {
            return x - moduloVal;
        } else if (typeOpts.unsigned) {
            if (x < 0) {
              x += moduloVal;
            } else if (x === -0) { // don't return negative zero
              return 0;
            }
        }

        return x;
    }
}

conversions["void"] = function () {
    return undefined;
};

conversions["boolean"] = function (val) {
    return !!val;
};

conversions["byte"] = createNumberConversion(8, { unsigned: false });
conversions["octet"] = createNumberConversion(8, { unsigned: true });

conversions["short"] = createNumberConversion(16, { unsigned: false });
conversions["unsigned short"] = createNumberConversion(16, { unsigned: true });

conversions["long"] = createNumberConversion(32, { unsigned: false });
conversions["unsigned long"] = createNumberConversion(32, { unsigned: true });

conversions["long long"] = createNumberConversion(32, { unsigned: false, moduloBitLength: 64 });
conversions["unsigned long long"] = createNumberConversion(32, { unsigned: true, moduloBitLength: 64 });

conversions["double"] = function (V) {
    const x = +V;

    if (!Number.isFinite(x)) {
        throw new TypeError("Argument is not a finite floating-point value");
    }

    return x;
};

conversions["unrestricted double"] = function (V) {
    const x = +V;

    if (isNaN(x)) {
        throw new TypeError("Argument is NaN");
    }

    return x;
};

// not quite valid, but good enough for JS
conversions["float"] = conversions["double"];
conversions["unrestricted float"] = conversions["unrestricted double"];

conversions["DOMString"] = function (V, opts) {
    if (!opts) opts = {};

    if (opts.treatNullAsEmptyString && V === null) {
        return "";
    }

    return String(V);
};

conversions["ByteString"] = function (V, opts) {
    const x = String(V);
    let c = undefined;
    for (let i = 0; (c = x.codePointAt(i)) !== undefined; ++i) {
        if (c > 255) {
            throw new TypeError("Argument is not a valid bytestring");
        }
    }

    return x;
};

conversions["USVString"] = function (V) {
    const S = String(V);
    const n = S.length;
    const U = [];
    for (let i = 0; i < n; ++i) {
        const c = S.charCodeAt(i);
        if (c < 0xD800 || c > 0xDFFF) {
            U.push(String.fromCodePoint(c));
        } else if (0xDC00 <= c && c <= 0xDFFF) {
            U.push(String.fromCodePoint(0xFFFD));
        } else {
            if (i === n - 1) {
                U.push(String.fromCodePoint(0xFFFD));
            } else {
                const d = S.charCodeAt(i + 1);
                if (0xDC00 <= d && d <= 0xDFFF) {
                    const a = c & 0x3FF;
                    const b = d & 0x3FF;
                    U.push(String.fromCodePoint((2 << 15) + (2 << 9) * a + b));
                    ++i;
                } else {
                    U.push(String.fromCodePoint(0xFFFD));
                }
            }
        }
    }

    return U.join('');
};

conversions["Date"] = function (V, opts) {
    if (!(V instanceof Date)) {
        throw new TypeError("Argument is not a Date object");
    }
    if (isNaN(V)) {
        return undefined;
    }

    return V;
};

conversions["RegExp"] = function (V, opts) {
    if (!(V instanceof RegExp)) {
        V = new RegExp(V);
    }

    return V;
};


/***/ }),

/***/ 23184:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

const usm = __nccwpck_require__(20905);

exports.implementation = class URLImpl {
  constructor(constructorArgs) {
    const url = constructorArgs[0];
    const base = constructorArgs[1];

    let parsedBase = null;
    if (base !== undefined) {
      parsedBase = usm.basicURLParse(base);
      if (parsedBase === "failure") {
        throw new TypeError("Invalid base URL");
      }
    }

    const parsedURL = usm.basicURLParse(url, { baseURL: parsedBase });
    if (parsedURL === "failure") {
      throw new TypeError("Invalid URL");
    }

    this._url = parsedURL;

    // TODO: query stuff
  }

  get href() {
    return usm.serializeURL(this._url);
  }

  set href(v) {
    const parsedURL = usm.basicURLParse(v);
    if (parsedURL === "failure") {
      throw new TypeError("Invalid URL");
    }

    this._url = parsedURL;
  }

  get origin() {
    return usm.serializeURLOrigin(this._url);
  }

  get protocol() {
    return this._url.scheme + ":";
  }

  set protocol(v) {
    usm.basicURLParse(v + ":", { url: this._url, stateOverride: "scheme start" });
  }

  get username() {
    return this._url.username;
  }

  set username(v) {
    if (usm.cannotHaveAUsernamePasswordPort(this._url)) {
      return;
    }

    usm.setTheUsername(this._url, v);
  }

  get password() {
    return this._url.password;
  }

  set password(v) {
    if (usm.cannotHaveAUsernamePasswordPort(this._url)) {
      return;
    }

    usm.setThePassword(this._url, v);
  }

  get host() {
    const url = this._url;

    if (url.host === null) {
      return "";
    }

    if (url.port === null) {
      return usm.serializeHost(url.host);
    }

    return usm.serializeHost(url.host) + ":" + usm.serializeInteger(url.port);
  }

  set host(v) {
    if (this._url.cannotBeABaseURL) {
      return;
    }

    usm.basicURLParse(v, { url: this._url, stateOverride: "host" });
  }

  get hostname() {
    if (this._url.host === null) {
      return "";
    }

    return usm.serializeHost(this._url.host);
  }

  set hostname(v) {
    if (this._url.cannotBeABaseURL) {
      return;
    }

    usm.basicURLParse(v, { url: this._url, stateOverride: "hostname" });
  }

  get port() {
    if (this._url.port === null) {
      return "";
    }

    return usm.serializeInteger(this._url.port);
  }

  set port(v) {
    if (usm.cannotHaveAUsernamePasswordPort(this._url)) {
      return;
    }

    if (v === "") {
      this._url.port = null;
    } else {
      usm.basicURLParse(v, { url: this._url, stateOverride: "port" });
    }
  }

  get pathname() {
    if (this._url.cannotBeABaseURL) {
      return this._url.path[0];
    }

    if (this._url.path.length === 0) {
      return "";
    }

    return "/" + this._url.path.join("/");
  }

  set pathname(v) {
    if (this._url.cannotBeABaseURL) {
      return;
    }

    this._url.path = [];
    usm.basicURLParse(v, { url: this._url, stateOverride: "path start" });
  }

  get search() {
    if (this._url.query === null || this._url.query === "") {
      return "";
    }

    return "?" + this._url.query;
  }

  set search(v) {
    // TODO: query stuff

    const url = this._url;

    if (v === "") {
      url.query = null;
      return;
    }

    const input = v[0] === "?" ? v.substring(1) : v;
    url.query = "";
    usm.basicURLParse(input, { url, stateOverride: "query" });
  }

  get hash() {
    if (this._url.fragment === null || this._url.fragment === "") {
      return "";
    }

    return "#" + this._url.fragment;
  }

  set hash(v) {
    if (v === "") {
      this._url.fragment = null;
      return;
    }

    const input = v[0] === "#" ? v.substring(1) : v;
    this._url.fragment = "";
    usm.basicURLParse(input, { url: this._url, stateOverride: "fragment" });
  }

  toJSON() {
    return this.href;
  }
};


/***/ }),

/***/ 66633:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const conversions = __nccwpck_require__(37125);
const utils = __nccwpck_require__(39857);
const Impl = __nccwpck_require__(23184);

const impl = utils.implSymbol;

function URL(url) {
  if (!this || this[impl] || !(this instanceof URL)) {
    throw new TypeError("Failed to construct 'URL': Please use the 'new' operator, this DOM object constructor cannot be called as a function.");
  }
  if (arguments.length < 1) {
    throw new TypeError("Failed to construct 'URL': 1 argument required, but only " + arguments.length + " present.");
  }
  const args = [];
  for (let i = 0; i < arguments.length && i < 2; ++i) {
    args[i] = arguments[i];
  }
  args[0] = conversions["USVString"](args[0]);
  if (args[1] !== undefined) {
  args[1] = conversions["USVString"](args[1]);
  }

  module.exports.setup(this, args);
}

URL.prototype.toJSON = function toJSON() {
  if (!this || !module.exports.is(this)) {
    throw new TypeError("Illegal invocation");
  }
  const args = [];
  for (let i = 0; i < arguments.length && i < 0; ++i) {
    args[i] = arguments[i];
  }
  return this[impl].toJSON.apply(this[impl], args);
};
Object.defineProperty(URL.prototype, "href", {
  get() {
    return this[impl].href;
  },
  set(V) {
    V = conversions["USVString"](V);
    this[impl].href = V;
  },
  enumerable: true,
  configurable: true
});

URL.prototype.toString = function () {
  if (!this || !module.exports.is(this)) {
    throw new TypeError("Illegal invocation");
  }
  return this.href;
};

Object.defineProperty(URL.prototype, "origin", {
  get() {
    return this[impl].origin;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(URL.prototype, "protocol", {
  get() {
    return this[impl].protocol;
  },
  set(V) {
    V = conversions["USVString"](V);
    this[impl].protocol = V;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(URL.prototype, "username", {
  get() {
    return this[impl].username;
  },
  set(V) {
    V = conversions["USVString"](V);
    this[impl].username = V;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(URL.prototype, "password", {
  get() {
    return this[impl].password;
  },
  set(V) {
    V = conversions["USVString"](V);
    this[impl].password = V;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(URL.prototype, "host", {
  get() {
    return this[impl].host;
  },
  set(V) {
    V = conversions["USVString"](V);
    this[impl].host = V;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(URL.prototype, "hostname", {
  get() {
    return this[impl].hostname;
  },
  set(V) {
    V = conversions["USVString"](V);
    this[impl].hostname = V;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(URL.prototype, "port", {
  get() {
    return this[impl].port;
  },
  set(V) {
    V = conversions["USVString"](V);
    this[impl].port = V;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(URL.prototype, "pathname", {
  get() {
    return this[impl].pathname;
  },
  set(V) {
    V = conversions["USVString"](V);
    this[impl].pathname = V;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(URL.prototype, "search", {
  get() {
    return this[impl].search;
  },
  set(V) {
    V = conversions["USVString"](V);
    this[impl].search = V;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(URL.prototype, "hash", {
  get() {
    return this[impl].hash;
  },
  set(V) {
    V = conversions["USVString"](V);
    this[impl].hash = V;
  },
  enumerable: true,
  configurable: true
});


module.exports = {
  is(obj) {
    return !!obj && obj[impl] instanceof Impl.implementation;
  },
  create(constructorArgs, privateData) {
    let obj = Object.create(URL.prototype);
    this.setup(obj, constructorArgs, privateData);
    return obj;
  },
  setup(obj, constructorArgs, privateData) {
    if (!privateData) privateData = {};
    privateData.wrapper = obj;

    obj[impl] = new Impl.implementation(constructorArgs, privateData);
    obj[impl][utils.wrapperSymbol] = obj;
  },
  interface: URL,
  expose: {
    Window: { URL: URL },
    Worker: { URL: URL }
  }
};



/***/ }),

/***/ 62686:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


exports.URL = __nccwpck_require__(66633)["interface"];
exports.serializeURL = __nccwpck_require__(20905).serializeURL;
exports.serializeURLOrigin = __nccwpck_require__(20905).serializeURLOrigin;
exports.basicURLParse = __nccwpck_require__(20905).basicURLParse;
exports.setTheUsername = __nccwpck_require__(20905).setTheUsername;
exports.setThePassword = __nccwpck_require__(20905).setThePassword;
exports.serializeHost = __nccwpck_require__(20905).serializeHost;
exports.serializeInteger = __nccwpck_require__(20905).serializeInteger;
exports.parseURL = __nccwpck_require__(20905).parseURL;


/***/ }),

/***/ 20905:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const punycode = __nccwpck_require__(24876);
const tr46 = __nccwpck_require__(1552);

const specialSchemes = {
  ftp: 21,
  file: null,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};

const failure = Symbol("failure");

function countSymbols(str) {
  return punycode.ucs2.decode(str).length;
}

function at(input, idx) {
  const c = input[idx];
  return isNaN(c) ? undefined : String.fromCodePoint(c);
}

function isASCIIDigit(c) {
  return c >= 0x30 && c <= 0x39;
}

function isASCIIAlpha(c) {
  return (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A);
}

function isASCIIAlphanumeric(c) {
  return isASCIIAlpha(c) || isASCIIDigit(c);
}

function isASCIIHex(c) {
  return isASCIIDigit(c) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
}

function isSingleDot(buffer) {
  return buffer === "." || buffer.toLowerCase() === "%2e";
}

function isDoubleDot(buffer) {
  buffer = buffer.toLowerCase();
  return buffer === ".." || buffer === "%2e." || buffer === ".%2e" || buffer === "%2e%2e";
}

function isWindowsDriveLetterCodePoints(cp1, cp2) {
  return isASCIIAlpha(cp1) && (cp2 === 58 || cp2 === 124);
}

function isWindowsDriveLetterString(string) {
  return string.length === 2 && isASCIIAlpha(string.codePointAt(0)) && (string[1] === ":" || string[1] === "|");
}

function isNormalizedWindowsDriveLetterString(string) {
  return string.length === 2 && isASCIIAlpha(string.codePointAt(0)) && string[1] === ":";
}

function containsForbiddenHostCodePoint(string) {
  return string.search(/\u0000|\u0009|\u000A|\u000D|\u0020|#|%|\/|:|\?|@|\[|\\|\]/) !== -1;
}

function containsForbiddenHostCodePointExcludingPercent(string) {
  return string.search(/\u0000|\u0009|\u000A|\u000D|\u0020|#|\/|:|\?|@|\[|\\|\]/) !== -1;
}

function isSpecialScheme(scheme) {
  return specialSchemes[scheme] !== undefined;
}

function isSpecial(url) {
  return isSpecialScheme(url.scheme);
}

function defaultPort(scheme) {
  return specialSchemes[scheme];
}

function percentEncode(c) {
  let hex = c.toString(16).toUpperCase();
  if (hex.length === 1) {
    hex = "0" + hex;
  }

  return "%" + hex;
}

function utf8PercentEncode(c) {
  const buf = new Buffer(c);

  let str = "";

  for (let i = 0; i < buf.length; ++i) {
    str += percentEncode(buf[i]);
  }

  return str;
}

function utf8PercentDecode(str) {
  const input = new Buffer(str);
  const output = [];
  for (let i = 0; i < input.length; ++i) {
    if (input[i] !== 37) {
      output.push(input[i]);
    } else if (input[i] === 37 && isASCIIHex(input[i + 1]) && isASCIIHex(input[i + 2])) {
      output.push(parseInt(input.slice(i + 1, i + 3).toString(), 16));
      i += 2;
    } else {
      output.push(input[i]);
    }
  }
  return new Buffer(output).toString();
}

function isC0ControlPercentEncode(c) {
  return c <= 0x1F || c > 0x7E;
}

const extraPathPercentEncodeSet = new Set([32, 34, 35, 60, 62, 63, 96, 123, 125]);
function isPathPercentEncode(c) {
  return isC0ControlPercentEncode(c) || extraPathPercentEncodeSet.has(c);
}

const extraUserinfoPercentEncodeSet =
  new Set([47, 58, 59, 61, 64, 91, 92, 93, 94, 124]);
function isUserinfoPercentEncode(c) {
  return isPathPercentEncode(c) || extraUserinfoPercentEncodeSet.has(c);
}

function percentEncodeChar(c, encodeSetPredicate) {
  const cStr = String.fromCodePoint(c);

  if (encodeSetPredicate(c)) {
    return utf8PercentEncode(cStr);
  }

  return cStr;
}

function parseIPv4Number(input) {
  let R = 10;

  if (input.length >= 2 && input.charAt(0) === "0" && input.charAt(1).toLowerCase() === "x") {
    input = input.substring(2);
    R = 16;
  } else if (input.length >= 2 && input.charAt(0) === "0") {
    input = input.substring(1);
    R = 8;
  }

  if (input === "") {
    return 0;
  }

  const regex = R === 10 ? /[^0-9]/ : (R === 16 ? /[^0-9A-Fa-f]/ : /[^0-7]/);
  if (regex.test(input)) {
    return failure;
  }

  return parseInt(input, R);
}

function parseIPv4(input) {
  const parts = input.split(".");
  if (parts[parts.length - 1] === "") {
    if (parts.length > 1) {
      parts.pop();
    }
  }

  if (parts.length > 4) {
    return input;
  }

  const numbers = [];
  for (const part of parts) {
    if (part === "") {
      return input;
    }
    const n = parseIPv4Number(part);
    if (n === failure) {
      return input;
    }

    numbers.push(n);
  }

  for (let i = 0; i < numbers.length - 1; ++i) {
    if (numbers[i] > 255) {
      return failure;
    }
  }
  if (numbers[numbers.length - 1] >= Math.pow(256, 5 - numbers.length)) {
    return failure;
  }

  let ipv4 = numbers.pop();
  let counter = 0;

  for (const n of numbers) {
    ipv4 += n * Math.pow(256, 3 - counter);
    ++counter;
  }

  return ipv4;
}

function serializeIPv4(address) {
  let output = "";
  let n = address;

  for (let i = 1; i <= 4; ++i) {
    output = String(n % 256) + output;
    if (i !== 4) {
      output = "." + output;
    }
    n = Math.floor(n / 256);
  }

  return output;
}

function parseIPv6(input) {
  const address = [0, 0, 0, 0, 0, 0, 0, 0];
  let pieceIndex = 0;
  let compress = null;
  let pointer = 0;

  input = punycode.ucs2.decode(input);

  if (input[pointer] === 58) {
    if (input[pointer + 1] !== 58) {
      return failure;
    }

    pointer += 2;
    ++pieceIndex;
    compress = pieceIndex;
  }

  while (pointer < input.length) {
    if (pieceIndex === 8) {
      return failure;
    }

    if (input[pointer] === 58) {
      if (compress !== null) {
        return failure;
      }
      ++pointer;
      ++pieceIndex;
      compress = pieceIndex;
      continue;
    }

    let value = 0;
    let length = 0;

    while (length < 4 && isASCIIHex(input[pointer])) {
      value = value * 0x10 + parseInt(at(input, pointer), 16);
      ++pointer;
      ++length;
    }

    if (input[pointer] === 46) {
      if (length === 0) {
        return failure;
      }

      pointer -= length;

      if (pieceIndex > 6) {
        return failure;
      }

      let numbersSeen = 0;

      while (input[pointer] !== undefined) {
        let ipv4Piece = null;

        if (numbersSeen > 0) {
          if (input[pointer] === 46 && numbersSeen < 4) {
            ++pointer;
          } else {
            return failure;
          }
        }

        if (!isASCIIDigit(input[pointer])) {
          return failure;
        }

        while (isASCIIDigit(input[pointer])) {
          const number = parseInt(at(input, pointer));
          if (ipv4Piece === null) {
            ipv4Piece = number;
          } else if (ipv4Piece === 0) {
            return failure;
          } else {
            ipv4Piece = ipv4Piece * 10 + number;
          }
          if (ipv4Piece > 255) {
            return failure;
          }
          ++pointer;
        }

        address[pieceIndex] = address[pieceIndex] * 0x100 + ipv4Piece;

        ++numbersSeen;

        if (numbersSeen === 2 || numbersSeen === 4) {
          ++pieceIndex;
        }
      }

      if (numbersSeen !== 4) {
        return failure;
      }

      break;
    } else if (input[pointer] === 58) {
      ++pointer;
      if (input[pointer] === undefined) {
        return failure;
      }
    } else if (input[pointer] !== undefined) {
      return failure;
    }

    address[pieceIndex] = value;
    ++pieceIndex;
  }

  if (compress !== null) {
    let swaps = pieceIndex - compress;
    pieceIndex = 7;
    while (pieceIndex !== 0 && swaps > 0) {
      const temp = address[compress + swaps - 1];
      address[compress + swaps - 1] = address[pieceIndex];
      address[pieceIndex] = temp;
      --pieceIndex;
      --swaps;
    }
  } else if (compress === null && pieceIndex !== 8) {
    return failure;
  }

  return address;
}

function serializeIPv6(address) {
  let output = "";
  const seqResult = findLongestZeroSequence(address);
  const compress = seqResult.idx;
  let ignore0 = false;

  for (let pieceIndex = 0; pieceIndex <= 7; ++pieceIndex) {
    if (ignore0 && address[pieceIndex] === 0) {
      continue;
    } else if (ignore0) {
      ignore0 = false;
    }

    if (compress === pieceIndex) {
      const separator = pieceIndex === 0 ? "::" : ":";
      output += separator;
      ignore0 = true;
      continue;
    }

    output += address[pieceIndex].toString(16);

    if (pieceIndex !== 7) {
      output += ":";
    }
  }

  return output;
}

function parseHost(input, isSpecialArg) {
  if (input[0] === "[") {
    if (input[input.length - 1] !== "]") {
      return failure;
    }

    return parseIPv6(input.substring(1, input.length - 1));
  }

  if (!isSpecialArg) {
    return parseOpaqueHost(input);
  }

  const domain = utf8PercentDecode(input);
  const asciiDomain = tr46.toASCII(domain, false, tr46.PROCESSING_OPTIONS.NONTRANSITIONAL, false);
  if (asciiDomain === null) {
    return failure;
  }

  if (containsForbiddenHostCodePoint(asciiDomain)) {
    return failure;
  }

  const ipv4Host = parseIPv4(asciiDomain);
  if (typeof ipv4Host === "number" || ipv4Host === failure) {
    return ipv4Host;
  }

  return asciiDomain;
}

function parseOpaqueHost(input) {
  if (containsForbiddenHostCodePointExcludingPercent(input)) {
    return failure;
  }

  let output = "";
  const decoded = punycode.ucs2.decode(input);
  for (let i = 0; i < decoded.length; ++i) {
    output += percentEncodeChar(decoded[i], isC0ControlPercentEncode);
  }
  return output;
}

function findLongestZeroSequence(arr) {
  let maxIdx = null;
  let maxLen = 1; // only find elements > 1
  let currStart = null;
  let currLen = 0;

  for (let i = 0; i < arr.length; ++i) {
    if (arr[i] !== 0) {
      if (currLen > maxLen) {
        maxIdx = currStart;
        maxLen = currLen;
      }

      currStart = null;
      currLen = 0;
    } else {
      if (currStart === null) {
        currStart = i;
      }
      ++currLen;
    }
  }

  // if trailing zeros
  if (currLen > maxLen) {
    maxIdx = currStart;
    maxLen = currLen;
  }

  return {
    idx: maxIdx,
    len: maxLen
  };
}

function serializeHost(host) {
  if (typeof host === "number") {
    return serializeIPv4(host);
  }

  // IPv6 serializer
  if (host instanceof Array) {
    return "[" + serializeIPv6(host) + "]";
  }

  return host;
}

function trimControlChars(url) {
  return url.replace(/^[\u0000-\u001F\u0020]+|[\u0000-\u001F\u0020]+$/g, "");
}

function trimTabAndNewline(url) {
  return url.replace(/\u0009|\u000A|\u000D/g, "");
}

function shortenPath(url) {
  const path = url.path;
  if (path.length === 0) {
    return;
  }
  if (url.scheme === "file" && path.length === 1 && isNormalizedWindowsDriveLetter(path[0])) {
    return;
  }

  path.pop();
}

function includesCredentials(url) {
  return url.username !== "" || url.password !== "";
}

function cannotHaveAUsernamePasswordPort(url) {
  return url.host === null || url.host === "" || url.cannotBeABaseURL || url.scheme === "file";
}

function isNormalizedWindowsDriveLetter(string) {
  return /^[A-Za-z]:$/.test(string);
}

function URLStateMachine(input, base, encodingOverride, url, stateOverride) {
  this.pointer = 0;
  this.input = input;
  this.base = base || null;
  this.encodingOverride = encodingOverride || "utf-8";
  this.stateOverride = stateOverride;
  this.url = url;
  this.failure = false;
  this.parseError = false;

  if (!this.url) {
    this.url = {
      scheme: "",
      username: "",
      password: "",
      host: null,
      port: null,
      path: [],
      query: null,
      fragment: null,

      cannotBeABaseURL: false
    };

    const res = trimControlChars(this.input);
    if (res !== this.input) {
      this.parseError = true;
    }
    this.input = res;
  }

  const res = trimTabAndNewline(this.input);
  if (res !== this.input) {
    this.parseError = true;
  }
  this.input = res;

  this.state = stateOverride || "scheme start";

  this.buffer = "";
  this.atFlag = false;
  this.arrFlag = false;
  this.passwordTokenSeenFlag = false;

  this.input = punycode.ucs2.decode(this.input);

  for (; this.pointer <= this.input.length; ++this.pointer) {
    const c = this.input[this.pointer];
    const cStr = isNaN(c) ? undefined : String.fromCodePoint(c);

    // exec state machine
    const ret = this["parse " + this.state](c, cStr);
    if (!ret) {
      break; // terminate algorithm
    } else if (ret === failure) {
      this.failure = true;
      break;
    }
  }
}

URLStateMachine.prototype["parse scheme start"] = function parseSchemeStart(c, cStr) {
  if (isASCIIAlpha(c)) {
    this.buffer += cStr.toLowerCase();
    this.state = "scheme";
  } else if (!this.stateOverride) {
    this.state = "no scheme";
    --this.pointer;
  } else {
    this.parseError = true;
    return failure;
  }

  return true;
};

URLStateMachine.prototype["parse scheme"] = function parseScheme(c, cStr) {
  if (isASCIIAlphanumeric(c) || c === 43 || c === 45 || c === 46) {
    this.buffer += cStr.toLowerCase();
  } else if (c === 58) {
    if (this.stateOverride) {
      if (isSpecial(this.url) && !isSpecialScheme(this.buffer)) {
        return false;
      }

      if (!isSpecial(this.url) && isSpecialScheme(this.buffer)) {
        return false;
      }

      if ((includesCredentials(this.url) || this.url.port !== null) && this.buffer === "file") {
        return false;
      }

      if (this.url.scheme === "file" && (this.url.host === "" || this.url.host === null)) {
        return false;
      }
    }
    this.url.scheme = this.buffer;
    this.buffer = "";
    if (this.stateOverride) {
      return false;
    }
    if (this.url.scheme === "file") {
      if (this.input[this.pointer + 1] !== 47 || this.input[this.pointer + 2] !== 47) {
        this.parseError = true;
      }
      this.state = "file";
    } else if (isSpecial(this.url) && this.base !== null && this.base.scheme === this.url.scheme) {
      this.state = "special relative or authority";
    } else if (isSpecial(this.url)) {
      this.state = "special authority slashes";
    } else if (this.input[this.pointer + 1] === 47) {
      this.state = "path or authority";
      ++this.pointer;
    } else {
      this.url.cannotBeABaseURL = true;
      this.url.path.push("");
      this.state = "cannot-be-a-base-URL path";
    }
  } else if (!this.stateOverride) {
    this.buffer = "";
    this.state = "no scheme";
    this.pointer = -1;
  } else {
    this.parseError = true;
    return failure;
  }

  return true;
};

URLStateMachine.prototype["parse no scheme"] = function parseNoScheme(c) {
  if (this.base === null || (this.base.cannotBeABaseURL && c !== 35)) {
    return failure;
  } else if (this.base.cannotBeABaseURL && c === 35) {
    this.url.scheme = this.base.scheme;
    this.url.path = this.base.path.slice();
    this.url.query = this.base.query;
    this.url.fragment = "";
    this.url.cannotBeABaseURL = true;
    this.state = "fragment";
  } else if (this.base.scheme === "file") {
    this.state = "file";
    --this.pointer;
  } else {
    this.state = "relative";
    --this.pointer;
  }

  return true;
};

URLStateMachine.prototype["parse special relative or authority"] = function parseSpecialRelativeOrAuthority(c) {
  if (c === 47 && this.input[this.pointer + 1] === 47) {
    this.state = "special authority ignore slashes";
    ++this.pointer;
  } else {
    this.parseError = true;
    this.state = "relative";
    --this.pointer;
  }

  return true;
};

URLStateMachine.prototype["parse path or authority"] = function parsePathOrAuthority(c) {
  if (c === 47) {
    this.state = "authority";
  } else {
    this.state = "path";
    --this.pointer;
  }

  return true;
};

URLStateMachine.prototype["parse relative"] = function parseRelative(c) {
  this.url.scheme = this.base.scheme;
  if (isNaN(c)) {
    this.url.username = this.base.username;
    this.url.password = this.base.password;
    this.url.host = this.base.host;
    this.url.port = this.base.port;
    this.url.path = this.base.path.slice();
    this.url.query = this.base.query;
  } else if (c === 47) {
    this.state = "relative slash";
  } else if (c === 63) {
    this.url.username = this.base.username;
    this.url.password = this.base.password;
    this.url.host = this.base.host;
    this.url.port = this.base.port;
    this.url.path = this.base.path.slice();
    this.url.query = "";
    this.state = "query";
  } else if (c === 35) {
    this.url.username = this.base.username;
    this.url.password = this.base.password;
    this.url.host = this.base.host;
    this.url.port = this.base.port;
    this.url.path = this.base.path.slice();
    this.url.query = this.base.query;
    this.url.fragment = "";
    this.state = "fragment";
  } else if (isSpecial(this.url) && c === 92) {
    this.parseError = true;
    this.state = "relative slash";
  } else {
    this.url.username = this.base.username;
    this.url.password = this.base.password;
    this.url.host = this.base.host;
    this.url.port = this.base.port;
    this.url.path = this.base.path.slice(0, this.base.path.length - 1);

    this.state = "path";
    --this.pointer;
  }

  return true;
};

URLStateMachine.prototype["parse relative slash"] = function parseRelativeSlash(c) {
  if (isSpecial(this.url) && (c === 47 || c === 92)) {
    if (c === 92) {
      this.parseError = true;
    }
    this.state = "special authority ignore slashes";
  } else if (c === 47) {
    this.state = "authority";
  } else {
    this.url.username = this.base.username;
    this.url.password = this.base.password;
    this.url.host = this.base.host;
    this.url.port = this.base.port;
    this.state = "path";
    --this.pointer;
  }

  return true;
};

URLStateMachine.prototype["parse special authority slashes"] = function parseSpecialAuthoritySlashes(c) {
  if (c === 47 && this.input[this.pointer + 1] === 47) {
    this.state = "special authority ignore slashes";
    ++this.pointer;
  } else {
    this.parseError = true;
    this.state = "special authority ignore slashes";
    --this.pointer;
  }

  return true;
};

URLStateMachine.prototype["parse special authority ignore slashes"] = function parseSpecialAuthorityIgnoreSlashes(c) {
  if (c !== 47 && c !== 92) {
    this.state = "authority";
    --this.pointer;
  } else {
    this.parseError = true;
  }

  return true;
};

URLStateMachine.prototype["parse authority"] = function parseAuthority(c, cStr) {
  if (c === 64) {
    this.parseError = true;
    if (this.atFlag) {
      this.buffer = "%40" + this.buffer;
    }
    this.atFlag = true;

    // careful, this is based on buffer and has its own pointer (this.pointer != pointer) and inner chars
    const len = countSymbols(this.buffer);
    for (let pointer = 0; pointer < len; ++pointer) {
      const codePoint = this.buffer.codePointAt(pointer);

      if (codePoint === 58 && !this.passwordTokenSeenFlag) {
        this.passwordTokenSeenFlag = true;
        continue;
      }
      const encodedCodePoints = percentEncodeChar(codePoint, isUserinfoPercentEncode);
      if (this.passwordTokenSeenFlag) {
        this.url.password += encodedCodePoints;
      } else {
        this.url.username += encodedCodePoints;
      }
    }
    this.buffer = "";
  } else if (isNaN(c) || c === 47 || c === 63 || c === 35 ||
             (isSpecial(this.url) && c === 92)) {
    if (this.atFlag && this.buffer === "") {
      this.parseError = true;
      return failure;
    }
    this.pointer -= countSymbols(this.buffer) + 1;
    this.buffer = "";
    this.state = "host";
  } else {
    this.buffer += cStr;
  }

  return true;
};

URLStateMachine.prototype["parse hostname"] =
URLStateMachine.prototype["parse host"] = function parseHostName(c, cStr) {
  if (this.stateOverride && this.url.scheme === "file") {
    --this.pointer;
    this.state = "file host";
  } else if (c === 58 && !this.arrFlag) {
    if (this.buffer === "") {
      this.parseError = true;
      return failure;
    }

    const host = parseHost(this.buffer, isSpecial(this.url));
    if (host === failure) {
      return failure;
    }

    this.url.host = host;
    this.buffer = "";
    this.state = "port";
    if (this.stateOverride === "hostname") {
      return false;
    }
  } else if (isNaN(c) || c === 47 || c === 63 || c === 35 ||
             (isSpecial(this.url) && c === 92)) {
    --this.pointer;
    if (isSpecial(this.url) && this.buffer === "") {
      this.parseError = true;
      return failure;
    } else if (this.stateOverride && this.buffer === "" &&
               (includesCredentials(this.url) || this.url.port !== null)) {
      this.parseError = true;
      return false;
    }

    const host = parseHost(this.buffer, isSpecial(this.url));
    if (host === failure) {
      return failure;
    }

    this.url.host = host;
    this.buffer = "";
    this.state = "path start";
    if (this.stateOverride) {
      return false;
    }
  } else {
    if (c === 91) {
      this.arrFlag = true;
    } else if (c === 93) {
      this.arrFlag = false;
    }
    this.buffer += cStr;
  }

  return true;
};

URLStateMachine.prototype["parse port"] = function parsePort(c, cStr) {
  if (isASCIIDigit(c)) {
    this.buffer += cStr;
  } else if (isNaN(c) || c === 47 || c === 63 || c === 35 ||
             (isSpecial(this.url) && c === 92) ||
             this.stateOverride) {
    if (this.buffer !== "") {
      const port = parseInt(this.buffer);
      if (port > Math.pow(2, 16) - 1) {
        this.parseError = true;
        return failure;
      }
      this.url.port = port === defaultPort(this.url.scheme) ? null : port;
      this.buffer = "";
    }
    if (this.stateOverride) {
      return false;
    }
    this.state = "path start";
    --this.pointer;
  } else {
    this.parseError = true;
    return failure;
  }

  return true;
};

const fileOtherwiseCodePoints = new Set([47, 92, 63, 35]);

URLStateMachine.prototype["parse file"] = function parseFile(c) {
  this.url.scheme = "file";

  if (c === 47 || c === 92) {
    if (c === 92) {
      this.parseError = true;
    }
    this.state = "file slash";
  } else if (this.base !== null && this.base.scheme === "file") {
    if (isNaN(c)) {
      this.url.host = this.base.host;
      this.url.path = this.base.path.slice();
      this.url.query = this.base.query;
    } else if (c === 63) {
      this.url.host = this.base.host;
      this.url.path = this.base.path.slice();
      this.url.query = "";
      this.state = "query";
    } else if (c === 35) {
      this.url.host = this.base.host;
      this.url.path = this.base.path.slice();
      this.url.query = this.base.query;
      this.url.fragment = "";
      this.state = "fragment";
    } else {
      if (this.input.length - this.pointer - 1 === 0 || // remaining consists of 0 code points
          !isWindowsDriveLetterCodePoints(c, this.input[this.pointer + 1]) ||
          (this.input.length - this.pointer - 1 >= 2 && // remaining has at least 2 code points
           !fileOtherwiseCodePoints.has(this.input[this.pointer + 2]))) {
        this.url.host = this.base.host;
        this.url.path = this.base.path.slice();
        shortenPath(this.url);
      } else {
        this.parseError = true;
      }

      this.state = "path";
      --this.pointer;
    }
  } else {
    this.state = "path";
    --this.pointer;
  }

  return true;
};

URLStateMachine.prototype["parse file slash"] = function parseFileSlash(c) {
  if (c === 47 || c === 92) {
    if (c === 92) {
      this.parseError = true;
    }
    this.state = "file host";
  } else {
    if (this.base !== null && this.base.scheme === "file") {
      if (isNormalizedWindowsDriveLetterString(this.base.path[0])) {
        this.url.path.push(this.base.path[0]);
      } else {
        this.url.host = this.base.host;
      }
    }
    this.state = "path";
    --this.pointer;
  }

  return true;
};

URLStateMachine.prototype["parse file host"] = function parseFileHost(c, cStr) {
  if (isNaN(c) || c === 47 || c === 92 || c === 63 || c === 35) {
    --this.pointer;
    if (!this.stateOverride && isWindowsDriveLetterString(this.buffer)) {
      this.parseError = true;
      this.state = "path";
    } else if (this.buffer === "") {
      this.url.host = "";
      if (this.stateOverride) {
        return false;
      }
      this.state = "path start";
    } else {
      let host = parseHost(this.buffer, isSpecial(this.url));
      if (host === failure) {
        return failure;
      }
      if (host === "localhost") {
        host = "";
      }
      this.url.host = host;

      if (this.stateOverride) {
        return false;
      }

      this.buffer = "";
      this.state = "path start";
    }
  } else {
    this.buffer += cStr;
  }

  return true;
};

URLStateMachine.prototype["parse path start"] = function parsePathStart(c) {
  if (isSpecial(this.url)) {
    if (c === 92) {
      this.parseError = true;
    }
    this.state = "path";

    if (c !== 47 && c !== 92) {
      --this.pointer;
    }
  } else if (!this.stateOverride && c === 63) {
    this.url.query = "";
    this.state = "query";
  } else if (!this.stateOverride && c === 35) {
    this.url.fragment = "";
    this.state = "fragment";
  } else if (c !== undefined) {
    this.state = "path";
    if (c !== 47) {
      --this.pointer;
    }
  }

  return true;
};

URLStateMachine.prototype["parse path"] = function parsePath(c) {
  if (isNaN(c) || c === 47 || (isSpecial(this.url) && c === 92) ||
      (!this.stateOverride && (c === 63 || c === 35))) {
    if (isSpecial(this.url) && c === 92) {
      this.parseError = true;
    }

    if (isDoubleDot(this.buffer)) {
      shortenPath(this.url);
      if (c !== 47 && !(isSpecial(this.url) && c === 92)) {
        this.url.path.push("");
      }
    } else if (isSingleDot(this.buffer) && c !== 47 &&
               !(isSpecial(this.url) && c === 92)) {
      this.url.path.push("");
    } else if (!isSingleDot(this.buffer)) {
      if (this.url.scheme === "file" && this.url.path.length === 0 && isWindowsDriveLetterString(this.buffer)) {
        if (this.url.host !== "" && this.url.host !== null) {
          this.parseError = true;
          this.url.host = "";
        }
        this.buffer = this.buffer[0] + ":";
      }
      this.url.path.push(this.buffer);
    }
    this.buffer = "";
    if (this.url.scheme === "file" && (c === undefined || c === 63 || c === 35)) {
      while (this.url.path.length > 1 && this.url.path[0] === "") {
        this.parseError = true;
        this.url.path.shift();
      }
    }
    if (c === 63) {
      this.url.query = "";
      this.state = "query";
    }
    if (c === 35) {
      this.url.fragment = "";
      this.state = "fragment";
    }
  } else {
    // TODO: If c is not a URL code point and not "%", parse error.

    if (c === 37 &&
      (!isASCIIHex(this.input[this.pointer + 1]) ||
        !isASCIIHex(this.input[this.pointer + 2]))) {
      this.parseError = true;
    }

    this.buffer += percentEncodeChar(c, isPathPercentEncode);
  }

  return true;
};

URLStateMachine.prototype["parse cannot-be-a-base-URL path"] = function parseCannotBeABaseURLPath(c) {
  if (c === 63) {
    this.url.query = "";
    this.state = "query";
  } else if (c === 35) {
    this.url.fragment = "";
    this.state = "fragment";
  } else {
    // TODO: Add: not a URL code point
    if (!isNaN(c) && c !== 37) {
      this.parseError = true;
    }

    if (c === 37 &&
        (!isASCIIHex(this.input[this.pointer + 1]) ||
         !isASCIIHex(this.input[this.pointer + 2]))) {
      this.parseError = true;
    }

    if (!isNaN(c)) {
      this.url.path[0] = this.url.path[0] + percentEncodeChar(c, isC0ControlPercentEncode);
    }
  }

  return true;
};

URLStateMachine.prototype["parse query"] = function parseQuery(c, cStr) {
  if (isNaN(c) || (!this.stateOverride && c === 35)) {
    if (!isSpecial(this.url) || this.url.scheme === "ws" || this.url.scheme === "wss") {
      this.encodingOverride = "utf-8";
    }

    const buffer = new Buffer(this.buffer); // TODO: Use encoding override instead
    for (let i = 0; i < buffer.length; ++i) {
      if (buffer[i] < 0x21 || buffer[i] > 0x7E || buffer[i] === 0x22 || buffer[i] === 0x23 ||
          buffer[i] === 0x3C || buffer[i] === 0x3E) {
        this.url.query += percentEncode(buffer[i]);
      } else {
        this.url.query += String.fromCodePoint(buffer[i]);
      }
    }

    this.buffer = "";
    if (c === 35) {
      this.url.fragment = "";
      this.state = "fragment";
    }
  } else {
    // TODO: If c is not a URL code point and not "%", parse error.
    if (c === 37 &&
      (!isASCIIHex(this.input[this.pointer + 1]) ||
        !isASCIIHex(this.input[this.pointer + 2]))) {
      this.parseError = true;
    }

    this.buffer += cStr;
  }

  return true;
};

URLStateMachine.prototype["parse fragment"] = function parseFragment(c) {
  if (isNaN(c)) { // do nothing
  } else if (c === 0x0) {
    this.parseError = true;
  } else {
    // TODO: If c is not a URL code point and not "%", parse error.
    if (c === 37 &&
      (!isASCIIHex(this.input[this.pointer + 1]) ||
        !isASCIIHex(this.input[this.pointer + 2]))) {
      this.parseError = true;
    }

    this.url.fragment += percentEncodeChar(c, isC0ControlPercentEncode);
  }

  return true;
};

function serializeURL(url, excludeFragment) {
  let output = url.scheme + ":";
  if (url.host !== null) {
    output += "//";

    if (url.username !== "" || url.password !== "") {
      output += url.username;
      if (url.password !== "") {
        output += ":" + url.password;
      }
      output += "@";
    }

    output += serializeHost(url.host);

    if (url.port !== null) {
      output += ":" + url.port;
    }
  } else if (url.host === null && url.scheme === "file") {
    output += "//";
  }

  if (url.cannotBeABaseURL) {
    output += url.path[0];
  } else {
    for (const string of url.path) {
      output += "/" + string;
    }
  }

  if (url.query !== null) {
    output += "?" + url.query;
  }

  if (!excludeFragment && url.fragment !== null) {
    output += "#" + url.fragment;
  }

  return output;
}

function serializeOrigin(tuple) {
  let result = tuple.scheme + "://";
  result += serializeHost(tuple.host);

  if (tuple.port !== null) {
    result += ":" + tuple.port;
  }

  return result;
}

module.exports.serializeURL = serializeURL;

module.exports.serializeURLOrigin = function (url) {
  // https://url.spec.whatwg.org/#concept-url-origin
  switch (url.scheme) {
    case "blob":
      try {
        return module.exports.serializeURLOrigin(module.exports.parseURL(url.path[0]));
      } catch (e) {
        // serializing an opaque origin returns "null"
        return "null";
      }
    case "ftp":
    case "gopher":
    case "http":
    case "https":
    case "ws":
    case "wss":
      return serializeOrigin({
        scheme: url.scheme,
        host: url.host,
        port: url.port
      });
    case "file":
      // spec says "exercise to the reader", chrome says "file://"
      return "file://";
    default:
      // serializing an opaque origin returns "null"
      return "null";
  }
};

module.exports.basicURLParse = function (input, options) {
  if (options === undefined) {
    options = {};
  }

  const usm = new URLStateMachine(input, options.baseURL, options.encodingOverride, options.url, options.stateOverride);
  if (usm.failure) {
    return "failure";
  }

  return usm.url;
};

module.exports.setTheUsername = function (url, username) {
  url.username = "";
  const decoded = punycode.ucs2.decode(username);
  for (let i = 0; i < decoded.length; ++i) {
    url.username += percentEncodeChar(decoded[i], isUserinfoPercentEncode);
  }
};

module.exports.setThePassword = function (url, password) {
  url.password = "";
  const decoded = punycode.ucs2.decode(password);
  for (let i = 0; i < decoded.length; ++i) {
    url.password += percentEncodeChar(decoded[i], isUserinfoPercentEncode);
  }
};

module.exports.serializeHost = serializeHost;

module.exports.cannotHaveAUsernamePasswordPort = cannotHaveAUsernamePasswordPort;

module.exports.serializeInteger = function (integer) {
  return String(integer);
};

module.exports.parseURL = function (input, options) {
  if (options === undefined) {
    options = {};
  }

  // We don't handle blobs, so this just delegates:
  return module.exports.basicURLParse(input, { baseURL: options.baseURL, encodingOverride: options.encodingOverride });
};


/***/ }),

/***/ 39857:
/***/ ((module) => {

"use strict";


module.exports.mixin = function mixin(target, source) {
  const keys = Object.getOwnPropertyNames(source);
  for (let i = 0; i < keys.length; ++i) {
    Object.defineProperty(target, keys[i], Object.getOwnPropertyDescriptor(source, keys[i]));
  }
};

module.exports.wrapperSymbol = Symbol("wrapper");
module.exports.implSymbol = Symbol("impl");

module.exports.wrapperForImpl = function (impl) {
  return impl[module.exports.wrapperSymbol];
};

module.exports.implForWrapper = function (wrapper) {
  return wrapper[module.exports.implSymbol];
};



/***/ }),

/***/ 58264:
/***/ ((module) => {

// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}


/***/ }),

/***/ 39962:
/***/ ((module) => {

"use strict";

module.exports = function (Yallist) {
  Yallist.prototype[Symbol.iterator] = function* () {
    for (let walker = this.head; walker; walker = walker.next) {
      yield walker.value
    }
  }
}


/***/ }),

/***/ 17864:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

module.exports = Yallist

Yallist.Node = Node
Yallist.create = Yallist

function Yallist (list) {
  var self = this
  if (!(self instanceof Yallist)) {
    self = new Yallist()
  }

  self.tail = null
  self.head = null
  self.length = 0

  if (list && typeof list.forEach === 'function') {
    list.forEach(function (item) {
      self.push(item)
    })
  } else if (arguments.length > 0) {
    for (var i = 0, l = arguments.length; i < l; i++) {
      self.push(arguments[i])
    }
  }

  return self
}

Yallist.prototype.removeNode = function (node) {
  if (node.list !== this) {
    throw new Error('removing node which does not belong to this list')
  }

  var next = node.next
  var prev = node.prev

  if (next) {
    next.prev = prev
  }

  if (prev) {
    prev.next = next
  }

  if (node === this.head) {
    this.head = next
  }
  if (node === this.tail) {
    this.tail = prev
  }

  node.list.length--
  node.next = null
  node.prev = null
  node.list = null

  return next
}

Yallist.prototype.unshiftNode = function (node) {
  if (node === this.head) {
    return
  }

  if (node.list) {
    node.list.removeNode(node)
  }

  var head = this.head
  node.list = this
  node.next = head
  if (head) {
    head.prev = node
  }

  this.head = node
  if (!this.tail) {
    this.tail = node
  }
  this.length++
}

Yallist.prototype.pushNode = function (node) {
  if (node === this.tail) {
    return
  }

  if (node.list) {
    node.list.removeNode(node)
  }

  var tail = this.tail
  node.list = this
  node.prev = tail
  if (tail) {
    tail.next = node
  }

  this.tail = node
  if (!this.head) {
    this.head = node
  }
  this.length++
}

Yallist.prototype.push = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    push(this, arguments[i])
  }
  return this.length
}

Yallist.prototype.unshift = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    unshift(this, arguments[i])
  }
  return this.length
}

Yallist.prototype.pop = function () {
  if (!this.tail) {
    return undefined
  }

  var res = this.tail.value
  this.tail = this.tail.prev
  if (this.tail) {
    this.tail.next = null
  } else {
    this.head = null
  }
  this.length--
  return res
}

Yallist.prototype.shift = function () {
  if (!this.head) {
    return undefined
  }

  var res = this.head.value
  this.head = this.head.next
  if (this.head) {
    this.head.prev = null
  } else {
    this.tail = null
  }
  this.length--
  return res
}

Yallist.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = this.head, i = 0; walker !== null; i++) {
    fn.call(thisp, walker.value, i, this)
    walker = walker.next
  }
}

Yallist.prototype.forEachReverse = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
    fn.call(thisp, walker.value, i, this)
    walker = walker.prev
  }
}

Yallist.prototype.get = function (n) {
  for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.next
  }
  if (i === n && walker !== null) {
    return walker.value
  }
}

Yallist.prototype.getReverse = function (n) {
  for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.prev
  }
  if (i === n && walker !== null) {
    return walker.value
  }
}

Yallist.prototype.map = function (fn, thisp) {
  thisp = thisp || this
  var res = new Yallist()
  for (var walker = this.head; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this))
    walker = walker.next
  }
  return res
}

Yallist.prototype.mapReverse = function (fn, thisp) {
  thisp = thisp || this
  var res = new Yallist()
  for (var walker = this.tail; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this))
    walker = walker.prev
  }
  return res
}

Yallist.prototype.reduce = function (fn, initial) {
  var acc
  var walker = this.head
  if (arguments.length > 1) {
    acc = initial
  } else if (this.head) {
    walker = this.head.next
    acc = this.head.value
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = 0; walker !== null; i++) {
    acc = fn(acc, walker.value, i)
    walker = walker.next
  }

  return acc
}

Yallist.prototype.reduceReverse = function (fn, initial) {
  var acc
  var walker = this.tail
  if (arguments.length > 1) {
    acc = initial
  } else if (this.tail) {
    walker = this.tail.prev
    acc = this.tail.value
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = this.length - 1; walker !== null; i--) {
    acc = fn(acc, walker.value, i)
    walker = walker.prev
  }

  return acc
}

Yallist.prototype.toArray = function () {
  var arr = new Array(this.length)
  for (var i = 0, walker = this.head; walker !== null; i++) {
    arr[i] = walker.value
    walker = walker.next
  }
  return arr
}

Yallist.prototype.toArrayReverse = function () {
  var arr = new Array(this.length)
  for (var i = 0, walker = this.tail; walker !== null; i++) {
    arr[i] = walker.value
    walker = walker.prev
  }
  return arr
}

Yallist.prototype.slice = function (from, to) {
  to = to || this.length
  if (to < 0) {
    to += this.length
  }
  from = from || 0
  if (from < 0) {
    from += this.length
  }
  var ret = new Yallist()
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0
  }
  if (to > this.length) {
    to = this.length
  }
  for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
    walker = walker.next
  }
  for (; walker !== null && i < to; i++, walker = walker.next) {
    ret.push(walker.value)
  }
  return ret
}

Yallist.prototype.sliceReverse = function (from, to) {
  to = to || this.length
  if (to < 0) {
    to += this.length
  }
  from = from || 0
  if (from < 0) {
    from += this.length
  }
  var ret = new Yallist()
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0
  }
  if (to > this.length) {
    to = this.length
  }
  for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
    walker = walker.prev
  }
  for (; walker !== null && i > from; i--, walker = walker.prev) {
    ret.push(walker.value)
  }
  return ret
}

Yallist.prototype.splice = function (start, deleteCount, ...nodes) {
  if (start > this.length) {
    start = this.length - 1
  }
  if (start < 0) {
    start = this.length + start;
  }

  for (var i = 0, walker = this.head; walker !== null && i < start; i++) {
    walker = walker.next
  }

  var ret = []
  for (var i = 0; walker && i < deleteCount; i++) {
    ret.push(walker.value)
    walker = this.removeNode(walker)
  }
  if (walker === null) {
    walker = this.tail
  }

  if (walker !== this.head && walker !== this.tail) {
    walker = walker.prev
  }

  for (var i = 0; i < nodes.length; i++) {
    walker = insert(this, walker, nodes[i])
  }
  return ret;
}

Yallist.prototype.reverse = function () {
  var head = this.head
  var tail = this.tail
  for (var walker = head; walker !== null; walker = walker.prev) {
    var p = walker.prev
    walker.prev = walker.next
    walker.next = p
  }
  this.head = tail
  this.tail = head
  return this
}

function insert (self, node, value) {
  var inserted = node === self.head ?
    new Node(value, null, node, self) :
    new Node(value, node, node.next, self)

  if (inserted.next === null) {
    self.tail = inserted
  }
  if (inserted.prev === null) {
    self.head = inserted
  }

  self.length++

  return inserted
}

function push (self, item) {
  self.tail = new Node(item, self.tail, null, self)
  if (!self.head) {
    self.head = self.tail
  }
  self.length++
}

function unshift (self, item) {
  self.head = new Node(item, null, self.head, self)
  if (!self.tail) {
    self.tail = self.head
  }
  self.length++
}

function Node (value, prev, next, list) {
  if (!(this instanceof Node)) {
    return new Node(value, prev, next, list)
  }

  this.list = list
  this.value = value

  if (prev) {
    prev.next = this
    this.prev = prev
  } else {
    this.prev = null
  }

  if (next) {
    next.prev = this
    this.next = next
  } else {
    this.next = null
  }
}

try {
  // add if support for Symbol.iterator is present
  __nccwpck_require__(39962)(Yallist)
} catch (er) {}


/***/ }),

/***/ 42078:
/***/ ((module) => {

module.exports = eval("require")("encoding");


/***/ }),

/***/ 21609:
/***/ ((module) => {

module.exports = eval("require")("smee-client");


/***/ }),

/***/ 42613:
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ 90290:
/***/ ((module) => {

"use strict";
module.exports = require("async_hooks");

/***/ }),

/***/ 20181:
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ 35317:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 64236:
/***/ ((module) => {

"use strict";
module.exports = require("console");

/***/ }),

/***/ 49140:
/***/ ((module) => {

"use strict";
module.exports = require("constants");

/***/ }),

/***/ 76982:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 31637:
/***/ ((module) => {

"use strict";
module.exports = require("diagnostics_channel");

/***/ }),

/***/ 72250:
/***/ ((module) => {

"use strict";
module.exports = require("dns");

/***/ }),

/***/ 73167:
/***/ ((module) => {

"use strict";
module.exports = require("domain");

/***/ }),

/***/ 24434:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 79896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 58611:
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ 85675:
/***/ ((module) => {

"use strict";
module.exports = require("http2");

/***/ }),

/***/ 65692:
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ 50264:
/***/ ((module) => {

"use strict";
module.exports = require("inspector");

/***/ }),

/***/ 69278:
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ 77598:
/***/ ((module) => {

"use strict";
module.exports = require("node:crypto");

/***/ }),

/***/ 78474:
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ 57075:
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ 57975:
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ 70857:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 16928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 82987:
/***/ ((module) => {

"use strict";
module.exports = require("perf_hooks");

/***/ }),

/***/ 24876:
/***/ ((module) => {

"use strict";
module.exports = require("punycode");

/***/ }),

/***/ 83480:
/***/ ((module) => {

"use strict";
module.exports = require("querystring");

/***/ }),

/***/ 2203:
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ 63774:
/***/ ((module) => {

"use strict";
module.exports = require("stream/web");

/***/ }),

/***/ 13193:
/***/ ((module) => {

"use strict";
module.exports = require("string_decoder");

/***/ }),

/***/ 53557:
/***/ ((module) => {

"use strict";
module.exports = require("timers");

/***/ }),

/***/ 64756:
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ 52018:
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ 87016:
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ 39023:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 98253:
/***/ ((module) => {

"use strict";
module.exports = require("util/types");

/***/ }),

/***/ 28167:
/***/ ((module) => {

"use strict";
module.exports = require("worker_threads");

/***/ }),

/***/ 43106:
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ }),

/***/ 61805:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { getConfig } = __nccwpck_require__(65751)
const { isTriggerableReference } = __nccwpck_require__(71917)
const {
  findReleases,
  generateReleaseInfo,
  createRelease,
  updateRelease,
} = __nccwpck_require__(37091)
const { findCommitsWithAssociatedPullRequests } = __nccwpck_require__(95023)
const { sortPullRequests } = __nccwpck_require__(65472)
const { log } = __nccwpck_require__(87707)
const core = __nccwpck_require__(37484)
const { runnerIsActions } = __nccwpck_require__(13008)
const ignore = __nccwpck_require__(70298)

module.exports = (app, { getRouter }) => {
  if (!runnerIsActions() && typeof getRouter === 'function') {
    getRouter().get('/healthz', (request, response) => {
      response.status(200).json({ status: 'pass' })
    })
  }

  app.on(
    [
      'pull_request.opened',
      'pull_request.reopened',
      'pull_request.synchronize',
      'pull_request.edited',
      'pull_request_target.opened',
      'pull_request_target.reopened',
      'pull_request_target.synchronize',
      'pull_request_target.edited',
    ],
    async (context) => {
      const { configName, disableAutolabeler } = getInput()

      const config = await getConfig({
        context,
        configName,
      })

      if (config === null || disableAutolabeler) return

      let issue = {
        ...context.issue({ pull_number: context.payload.pull_request.number }),
      }
      const changedFiles = await context.octokit.paginate(
        context.octokit.pulls.listFiles.endpoint.merge(issue),
        (response) => response.data.map((file) => file.filename)
      )
      const labels = new Set()

      for (const autolabel of config['autolabeler']) {
        let found = false
        // check modified files
        if (!found && autolabel.files.length > 0) {
          const matcher = ignore().add(autolabel.files)
          if (changedFiles.some((file) => matcher.ignores(file))) {
            labels.add(autolabel.label)
            found = true
            log({
              context,
              message: `Found label for files: '${autolabel.label}'`,
            })
          }
        }
        // check branch names
        if (!found && autolabel.branch.length > 0) {
          for (const matcher of autolabel.branch) {
            if (matcher.test(context.payload.pull_request.head.ref)) {
              labels.add(autolabel.label)
              found = true
              log({
                context,
                message: `Found label for branch: '${autolabel.label}'`,
              })
              break
            }
          }
        }
        // check pr title
        if (!found && autolabel.title.length > 0) {
          for (const matcher of autolabel.title) {
            if (matcher.test(context.payload.pull_request.title)) {
              labels.add(autolabel.label)
              found = true
              log({
                context,
                message: `Found label for title: '${autolabel.label}'`,
              })
              break
            }
          }
        }
        // check pr body
        if (
          !found &&
          context.payload.pull_request.body != null &&
          autolabel.body.length > 0
        ) {
          for (const matcher of autolabel.body) {
            if (matcher.test(context.payload.pull_request.body)) {
              labels.add(autolabel.label)
              found = true
              log({
                context,
                message: `Found label for body: '${autolabel.label}'`,
              })
              break
            }
          }
        }
      }

      const labelsToAdd = [...labels]
      if (labelsToAdd.length > 0) {
        let labelIssue = {
          ...context.issue({
            issue_number: context.payload.pull_request.number,
            labels: labelsToAdd,
          }),
        }
        await context.octokit.issues.addLabels(labelIssue)
        if (runnerIsActions()) {
          core.setOutput('number', context.payload.pull_request.number)
          core.setOutput('labels', labelsToAdd.join(','))
        }
        return
      }
    }
  )

  const drafter = async (context) => {
    const input = getInput()

    const config = await getConfig({
      context,
      configName: input.configName,
    })

    if (!config || input.disableReleaser) return

    updateConfigFromInput(config, input)

    // GitHub Actions merge payloads slightly differ, in that their ref points
    // to the PR branch instead of refs/heads/master
    const ref = process.env['GITHUB_REF'] || context.payload.ref

    if (!isTriggerableReference({ ref, context, config })) {
      return
    }

    const targetCommitish = config.commitish || ref

    const {
      'filter-by-commitish': filterByCommitish,
      'include-pre-releases': includePreReleases,
      'tag-prefix': tagPrefix,
      latest,
      prerelease,
    } = config

    const { draftRelease, lastRelease } = await findReleases({
      context,
      targetCommitish,
      filterByCommitish,
      includePreReleases,
      isPreRelease: prerelease,
      tagPrefix,
    })

    const { commits, pullRequests: mergedPullRequests } =
      await findCommitsWithAssociatedPullRequests({
        context,
        targetCommitish,
        lastRelease,
        config,
      })

    const sortedMergedPullRequests = sortPullRequests(
      mergedPullRequests,
      config['sort-by'],
      config['sort-direction']
    )

    const { shouldDraft, version, tag, name } = input

    const releaseInfo = generateReleaseInfo({
      context,
      commits,
      config,
      lastRelease,
      mergedPullRequests: sortedMergedPullRequests,
      version,
      tag,
      name,
      isPreRelease: prerelease,
      latest,
      shouldDraft,
      targetCommitish,
    })

    let createOrUpdateReleaseResponse
    if (!draftRelease) {
      log({ context, message: 'Creating new release' })
      createOrUpdateReleaseResponse = await createRelease({
        context,
        releaseInfo,
        config,
      })
    } else {
      log({ context, message: 'Updating existing release' })
      createOrUpdateReleaseResponse = await updateRelease({
        context,
        draftRelease,
        releaseInfo,
        config,
      })
    }

    if (runnerIsActions()) {
      setActionOutput(createOrUpdateReleaseResponse, releaseInfo)
    }
  }

  if (runnerIsActions()) {
    app.onAny(drafter)
  } else {
    app.on('push', drafter)
  }
}

function getInput() {
  return {
    configName: core.getInput('config-name'),
    shouldDraft: core.getInput('publish').toLowerCase() !== 'true',
    version: core.getInput('version') || undefined,
    tag: core.getInput('tag') || undefined,
    name: core.getInput('name') || undefined,
    disableReleaser: core.getInput('disable-releaser').toLowerCase() === 'true',
    disableAutolabeler:
      core.getInput('disable-autolabeler').toLowerCase() === 'true',
    commitish: core.getInput('commitish') || undefined,
    header: core.getInput('header') || undefined,
    footer: core.getInput('footer') || undefined,
    prerelease:
      core.getInput('prerelease') !== ''
        ? core.getInput('prerelease').toLowerCase() === 'true'
        : undefined,
    preReleaseIdentifier: core.getInput('prerelease-identifier') || undefined,
    latest: core.getInput('latest')?.toLowerCase() || undefined,
    commitsSince: core.getInput('initial-commits-since') || undefined,
  }
}

/**
 * Merges the config file with the input
 * the input takes precedence, because it's more easy to change at runtime
 */
function updateConfigFromInput(config, input) {
  if (input.commitish) {
    config.commitish = input.commitish
  }

  if (input.header) {
    config.header = input.header
  }

  if (input.footer) {
    config.footer = input.footer
  }

  if (input.prerelease !== undefined) {
    config.prerelease = input.prerelease
  }

  if (input.preReleaseIdentifier) {
    config['prerelease-identifier'] = input.preReleaseIdentifier
  }

  if (!config.prerelease && config['prerelease-identifier']) {
    config.prerelease = true
  }

  config.latest = config.prerelease
    ? 'false'
    : input.latest || config.latest || undefined

  if (input.commitsSince) {
    config['initial-commits-since'] = input.commitsSince
  }
}

function setActionOutput(
  releaseResponse,
  { body, resolvedVersion, majorVersion, minorVersion, patchVersion }
) {
  const {
    data: {
      id: releaseId,
      html_url: htmlUrl,
      upload_url: uploadUrl,
      tag_name: tagName,
      name: name,
    },
  } = releaseResponse
  if (releaseId && Number.isInteger(releaseId))
    core.setOutput('id', releaseId.toString())
  if (htmlUrl) core.setOutput('html_url', htmlUrl)
  if (uploadUrl) core.setOutput('upload_url', uploadUrl)
  if (tagName) core.setOutput('tag_name', tagName)
  if (name) core.setOutput('name', name)
  if (resolvedVersion) core.setOutput('resolved_version', resolvedVersion)
  if (majorVersion) core.setOutput('major_version', majorVersion)
  if (minorVersion) core.setOutput('minor_version', minorVersion)
  if (patchVersion) core.setOutput('patch_version', patchVersion)
  core.setOutput('body', body)
}


/***/ }),

/***/ 95023:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const _ = __nccwpck_require__(52356)
const { log } = __nccwpck_require__(87707)
const { paginate } = __nccwpck_require__(50345)
const Joi = __nccwpck_require__(81154)
const core = __nccwpck_require__(37484)

const findCommitsWithPathChangesQuery = /* GraphQL */ `
  query findCommitsWithPathChangesQuery(
    $name: String!
    $owner: String!
    $targetCommitish: String!
    $since: GitTimestamp
    $after: String
    $path: String
  ) {
    repository(name: $name, owner: $owner) {
      object(expression: $targetCommitish) {
        ... on Commit {
          history(path: $path, since: $since, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
            }
          }
        }
      }
    }
  }
`

const findCommitsWithAssociatedPullRequestsQuery = /* GraphQL */ `
  query findCommitsWithAssociatedPullRequests(
    $name: String!
    $owner: String!
    $targetCommitish: String!
    $withPullRequestBody: Boolean!
    $withPullRequestURL: Boolean!
    $since: GitTimestamp
    $after: String
    $withBaseRefName: Boolean!
    $withHeadRefName: Boolean!
    $pullRequestLimit: Int!
    $historyLimit: Int!
  ) {
    repository(name: $name, owner: $owner) {
      object(expression: $targetCommitish) {
        ... on Commit {
          history(first: $historyLimit, since: $since, after: $after) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              committedDate
              message
              author {
                name
                user {
                  login
                }
              }
              associatedPullRequests(first: $pullRequestLimit) {
                nodes {
                  title
                  number
                  url @include(if: $withPullRequestURL)
                  body @include(if: $withPullRequestBody)
                  author {
                    login
                    __typename
                    url
                  }
                  baseRepository {
                    nameWithOwner
                  }
                  mergedAt
                  isCrossRepository
                  labels(first: 100) {
                    nodes {
                      name
                    }
                  }
                  merged
                  baseRefName @include(if: $withBaseRefName)
                  headRefName @include(if: $withHeadRefName)
                }
              }
            }
          }
        }
      }
    }
  }
`

const findCommitsWithAssociatedPullRequests = async ({
  context,
  targetCommitish,
  lastRelease,
  config,
}) => {
  const { owner, repo } = context.repo()
  const variables = {
    name: repo,
    owner,
    targetCommitish,
    withPullRequestBody: config['change-template'].includes('$BODY'),
    withPullRequestURL: config['change-template'].includes('$URL'),
    withBaseRefName: config['change-template'].includes('$BASE_REF_NAME'),
    withHeadRefName: config['change-template'].includes('$HEAD_REF_NAME'),
    pullRequestLimit: config['pull-request-limit'],
    historyLimit: config['history-limit'],
  }
  const includePaths = config['include-paths']
  const dataPath = ['repository', 'object', 'history']
  const repoNameWithOwner = `${owner}/${repo}`

  let data,
    allCommits,
    includedIds = {}

  const since = lastRelease
    ? lastRelease.created_at
    : config['initial-commits-since']
  const validationResult = Joi.date().iso().validate(since)

  log({
    context,
    message: `since value: ${since}`,
    debug: true,
  })
  log({
    context,
    message: `since value validation.value: ${JSON.stringify(
      validationResult,
      null,
      2
    )}`,
    debug: true,
  })
  log({
    context,
    message: `since value validation.error: ${JSON.stringify(
      validationResult.error,
      null,
      2
    )}`,
    debug: true,
  })

  // The validation result contains either an error or the validated value
  if (validationResult.error) {
    core.setFailed(validationResult.error.message)
    throw new Error(validationResult.error.message)
  }

  if (includePaths.length > 0) {
    var anyChanges = false
    for (const path of includePaths) {
      const pathData = await paginate(
        context.octokit.graphql,
        findCommitsWithPathChangesQuery,
        { ...variables, since: since, path },
        dataPath
      )
      const commitsWithPathChanges = _.get(pathData, [...dataPath, 'nodes'])

      includedIds[path] = includedIds[path] || new Set([])
      for (const { id } of commitsWithPathChanges) {
        anyChanges = true
        includedIds[path].add(id)
      }
    }

    if (!anyChanges) {
      // Short circuit to avoid blowing GraphQL budget
      return { commits: [], pullRequests: [] }
    }
  }

  if (since) {
    log({
      context,
      message: `Fetching parent commits of ${targetCommitish} since ${since}`,
    })

    data = await paginate(
      context.octokit.graphql,
      findCommitsWithAssociatedPullRequestsQuery,
      { ...variables, since: since },
      dataPath
    )
    // GraphQL call is inclusive of commits from the specified dates.  This means the final
    // commit from the last tag is included, so we remove this here.
    allCommits = _.get(data, [...dataPath, 'nodes']).filter(
      (commit) => commit.committedDate != since
    )
  } else {
    log({ context, message: `Fetching parent commits of ${targetCommitish}` })

    data = await paginate(
      context.octokit.graphql,
      findCommitsWithAssociatedPullRequestsQuery,
      variables,
      dataPath
    )
    allCommits = _.get(data, [...dataPath, 'nodes'])
  }

  const commits =
    includePaths.length > 0
      ? allCommits.filter((commit) =>
          includePaths.some((path) => includedIds[path].has(commit.id))
        )
      : allCommits

  const pullRequests = _.uniqBy(
    commits.flatMap((commit) => commit.associatedPullRequests.nodes),
    'number'
  ).filter(
    (pr) => pr.baseRepository.nameWithOwner === repoNameWithOwner && pr.merged
  )

  return { commits, pullRequests }
}

exports.findCommitsWithAssociatedPullRequestsQuery =
  findCommitsWithAssociatedPullRequestsQuery

exports.findCommitsWithPathChangesQuery = findCommitsWithPathChangesQuery

exports.findCommitsWithAssociatedPullRequests =
  findCommitsWithAssociatedPullRequests


/***/ }),

/***/ 65751:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const core = __nccwpck_require__(37484)
const Table = __nccwpck_require__(25832)
const { validateSchema } = __nccwpck_require__(62594)
const { log } = __nccwpck_require__(87707)
const { runnerIsActions } = __nccwpck_require__(13008)

const DEFAULT_CONFIG_NAME = 'release-drafter.yml'

async function getConfig({ context, configName }) {
  try {
    const repoConfig = await context.config(
      configName || DEFAULT_CONFIG_NAME,
      null
    )
    if (repoConfig == null) {
      const name = configName || DEFAULT_CONFIG_NAME
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(
        `Configuration file .github/${name} is not found. The configuration file must reside in your default branch.`
      )
    }

    const config = validateSchema(context, repoConfig)

    return config
  } catch (error) {
    log({ context, error, message: 'Invalid config file' })

    if (error.isJoi) {
      log({
        context,
        message:
          'Config validation errors, please fix the following issues in ' +
          (configName || DEFAULT_CONFIG_NAME) +
          ':\n' +
          joiValidationErrorsAsTable(error),
      })
    }

    if (runnerIsActions()) {
      core.setFailed('Invalid config file')
    }
    return null
  }
}

function joiValidationErrorsAsTable(error) {
  const table = new Table({ head: ['Property', 'Error'] })
  for (const { path, message } of error.details) {
    const prettyPath = path
      .map((pathPart) =>
        Number.isInteger(pathPart) ? `[${pathPart}]` : pathPart
      )
      .join('.')
    table.push([prettyPath, message])
  }
  return table.toString()
}

exports.getConfig = getConfig


/***/ }),

/***/ 72659:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const { SORT_BY, SORT_DIRECTIONS } = __nccwpck_require__(65472)

const DEFAULT_CONFIG = Object.freeze({
  'name-template': '',
  'tag-template': '',
  'tag-prefix': '',
  'change-template': `* $TITLE (#$NUMBER) @$AUTHOR`,
  'change-title-escapes': '',
  'no-changes-template': `* No changes`,
  'version-template': `$MAJOR.$MINOR.$PATCH$PRERELEASE`,
  'version-resolver': {
    major: { labels: [] },
    minor: { labels: [] },
    patch: { labels: [] },
    default: 'patch',
  },
  categories: [],
  'exclude-labels': [],
  'include-labels': [],
  'include-paths': [],
  'exclude-contributors': [],
  'no-contributors-template': 'No contributors',
  replacers: [],
  autolabeler: [],
  'sort-by': SORT_BY.mergedAt,
  'sort-direction': SORT_DIRECTIONS.descending,
  prerelease: false,
  'prerelease-identifier': '',
  'include-pre-releases': false,
  latest: 'true',
  'filter-by-commitish': false,
  commitish: '',
  'pull-request-limit': 5,
  'history-limit': 15,
  'category-template': `## $TITLE`,
  header: '',
  footer: '',
})

exports.DEFAULT_CONFIG = DEFAULT_CONFIG


/***/ }),

/***/ 87707:
/***/ ((__unused_webpack_module, exports) => {

const log = ({ context, message, error, debug }) => {
  const repo = context.payload.repository
  const prefix = repo ? `${repo.full_name}: ` : ''
  const logString = `${prefix}${message}`
  if (error) {
    context.log.warn(error, logString)
  } else if (debug) {
    typeof debug === 'object'
      ? context.log.debug({ ...debug }, logString)
      : context.log.debug({}, logString)
  } else {
    context.log.info(logString)
  }
}

exports.log = log


/***/ }),

/***/ 50345:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const _ = __nccwpck_require__(52356)

/**
 * Utility function to paginate a GraphQL function using Relay-style cursor pagination.
 *
 * @param {Function} queryFn - function used to query the GraphQL API
 * @param {string} query - GraphQL query, must include `nodes` and `pageInfo` fields for the field that will be paginated
 * @param {Object} variables
 * @param {string[]} paginatePath - path to field to paginate
 */
async function paginate(queryFunction, query, variables, paginatePath) {
  const nodesPath = [...paginatePath, 'nodes']
  const pageInfoPath = [...paginatePath, 'pageInfo']
  const endCursorPath = [...pageInfoPath, 'endCursor']
  const hasNextPagePath = [...pageInfoPath, 'hasNextPage']
  const hasNextPage = (data) => _.get(data, hasNextPagePath)

  let data = await queryFunction(query, variables)

  if (!_.has(data, nodesPath)) {
    throw new Error(
      "Data doesn't contain `nodes` field. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `nodes` field."
    )
  }

  if (
    !_.has(data, pageInfoPath) ||
    !_.has(data, endCursorPath) ||
    !_.has(data, hasNextPagePath)
  ) {
    throw new Error(
      "Data doesn't contain `pageInfo` field with `endCursor` and `hasNextPage` fields. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `pageInfo` field."
    )
  }

  while (hasNextPage(data)) {
    const newData = await queryFunction(query, {
      ...variables,
      after: _.get(data, [...pageInfoPath, 'endCursor']),
    })
    const newNodes = _.get(newData, nodesPath)
    const newPageInfo = _.get(newData, pageInfoPath)

    _.set(data, pageInfoPath, newPageInfo)
    _.update(data, nodesPath, (d) => [...d, ...newNodes])
  }

  return data
}

exports.paginate = paginate


/***/ }),

/***/ 37091:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const compareVersions = __nccwpck_require__(28595)
const regexEscape = __nccwpck_require__(31199)

const { getVersionInfo } = __nccwpck_require__(1608)
const { template } = __nccwpck_require__(96575)
const { log } = __nccwpck_require__(87707)

const sortReleases = (releases, tagPrefix) => {
  // For semver, we find the greatest release number
  // For non-semver, we use the most recently merged
  const tagPrefixRexExp = new RegExp(`^${regexEscape(tagPrefix)}`)
  return releases.sort((r1, r2) => {
    try {
      return compareVersions(
        r1.tag_name.replace(tagPrefixRexExp, ''),
        r2.tag_name.replace(tagPrefixRexExp, '')
      )
    } catch {
      return new Date(r1.created_at) - new Date(r2.created_at)
    }
  })
}

// GitHub API currently returns a 500 HTTP response if you attempt to fetch over 1000 releases.
const RELEASE_COUNT_LIMIT = 1000

const findReleases = async ({
  context,
  targetCommitish,
  filterByCommitish,
  includePreReleases,
  isPreRelease,
  tagPrefix,
}) => {
  let releaseCount = 0
  /**
   * @type {object[]}
   */
  let releases = await context.octokit.paginate(
    context.octokit.repos.listReleases.endpoint.merge(
      context.repo({
        per_page: 100,
      })
    ),
    (response, done) => {
      releaseCount += response.data.length
      if (releaseCount >= RELEASE_COUNT_LIMIT) {
        done()
      }
      return response.data
    }
  )

  log({ context, message: `Found ${releases.length} releases` })

  // Filter releases
  const headRefRegex = /^refs\/heads\// // `refs/heads/branch` and `branch` are the same thing in this context
  const targetCommitishName = targetCommitish.replace(headRefRegex, '')
  const commitishFilteredReleases = filterByCommitish
    ? releases.filter(
        (r) =>
          targetCommitishName === r.target_commitish.replace(headRefRegex, '')
      )
    : releases
  const filteredReleases = tagPrefix
    ? commitishFilteredReleases.filter((r) => r.tag_name.startsWith(tagPrefix))
    : commitishFilteredReleases

  // Split drafts and published releases
  let publishedReleases = filteredReleases.filter((r) => !r.draft)
  let draftReleases = filteredReleases.filter((r) => r.draft)

  // Handle prereleases
  publishedReleases = publishedReleases.filter(
    (publishedRelease) =>
      isPreRelease || includePreReleases // `includePreReleases` will be removed in future versions
        ? publishedRelease.prerelease || !publishedRelease.prerelease // Both prerelease and regular published-releases
        : !publishedRelease.prerelease // Only regular published-releases
  )
  draftReleases = draftReleases.filter(
    (draftRelease) =>
      isPreRelease
        ? draftRelease.prerelease // Only pre-releases drafts
        : !draftRelease.prerelease // Only regular drafts
  )

  // Sort results
  const draftRelease = draftReleases[0] // Should this be sorted ?
  const lastRelease = sortReleases(publishedReleases, tagPrefix)?.at(-1)

  if (draftRelease) {
    if (draftReleases.length > 1) {
      log({
        context,
        message: `Multiple draft releases found : ${draftReleases
          .map((r) => r.tag_name)
          .join(', ')}`,
      })
      log({
        context,
        message: `Returning the first one (octokit response order)`,
      })
    }
    log({ context, message: `Draft release: ${draftRelease.tag_name}` })
  } else {
    log({ context, message: `No draft release found` })
  }

  if (lastRelease) {
    log({
      context,
      message: `Last release${isPreRelease ? ' (including prerelease)' : ''}: ${
        lastRelease.tag_name
      }`,
    })
  } else {
    log({ context, message: `No last release found` })
  }

  return { draftRelease, lastRelease }
}

const contributorsSentence = ({ commits, pullRequests, config }) => {
  const { 'exclude-contributors': excludeContributors } = config

  const contributors = new Set()

  for (const commit of commits) {
    if (commit.author.user) {
      if (!excludeContributors.includes(commit.author.user.login)) {
        contributors.add(`@${commit.author.user.login}`)
      }
    } else {
      contributors.add(commit.author.name)
    }
  }

  for (const pullRequest of pullRequests) {
    if (
      pullRequest.author &&
      !excludeContributors.includes(pullRequest.author.login)
    ) {
      if (pullRequest.author.__typename === 'Bot') {
        contributors.add(
          `[${pullRequest.author.login}[bot]](${pullRequest.author.url})`
        )
      } else {
        contributors.add(`@${pullRequest.author.login}`)
      }
    }
  }

  const sortedContributors = [...contributors].sort()
  if (sortedContributors.length > 1) {
    return (
      sortedContributors.slice(0, -1).join(', ') +
      ' and ' +
      sortedContributors.slice(-1)
    )
  } else if (sortedContributors.length === 1) {
    return sortedContributors[0]
  } else {
    return config['no-contributors-template']
  }
}

const getFilterExcludedPullRequests = (excludeLabels) => {
  return (pullRequest) => {
    const labels = pullRequest.labels.nodes
    if (labels.some((label) => excludeLabels.includes(label.name))) {
      return false
    }
    return true
  }
}

const getFilterIncludedPullRequests = (includeLabels) => {
  return (pullRequest) => {
    const labels = pullRequest.labels.nodes
    if (
      includeLabels.length === 0 ||
      labels.some((label) => includeLabels.includes(label.name))
    ) {
      return true
    }
    return false
  }
}

const categorizePullRequests = (pullRequests, config) => {
  const {
    'exclude-labels': excludeLabels,
    'include-labels': includeLabels,
    categories,
  } = config
  const allCategoryLabels = new Set(
    categories.flatMap((category) => category.labels)
  )
  const uncategorizedPullRequests = []
  const categorizedPullRequests = [...categories].map((category) => {
    return { ...category, pullRequests: [] }
  })

  const uncategorizedCategoryIndex = categories.findIndex(
    (category) => category.labels.length === 0
  )

  const filterUncategorizedPullRequests = (pullRequest) => {
    const labels = pullRequest.labels.nodes

    if (
      labels.length === 0 ||
      !labels.some((label) => allCategoryLabels.has(label.name))
    ) {
      if (uncategorizedCategoryIndex === -1) {
        uncategorizedPullRequests.push(pullRequest)
      } else {
        categorizedPullRequests[uncategorizedCategoryIndex].pullRequests.push(
          pullRequest
        )
      }
      return false
    }
    return true
  }

  // we only want pull requests that have yet to be categorized
  const filteredPullRequests = pullRequests
    .filter(getFilterExcludedPullRequests(excludeLabels))
    .filter(getFilterIncludedPullRequests(includeLabels))
    .filter((pullRequest) => filterUncategorizedPullRequests(pullRequest))

  for (const category of categorizedPullRequests) {
    for (const pullRequest of filteredPullRequests) {
      // lets categorize some pull request based on labels
      // note that having the same label in multiple categories
      // then it is intended to "duplicate" the pull request into each category
      const labels = pullRequest.labels.nodes
      if (labels.some((label) => category.labels.includes(label.name))) {
        category.pullRequests.push(pullRequest)
      }
    }
  }

  return [uncategorizedPullRequests, categorizedPullRequests]
}

const generateChangeLog = (mergedPullRequests, config) => {
  if (mergedPullRequests.length === 0) {
    return config['no-changes-template']
  }

  const [uncategorizedPullRequests, categorizedPullRequests] =
    categorizePullRequests(mergedPullRequests, config)

  const escapeTitle = (title) =>
    // If config['change-title-escapes'] contains backticks, then they will be escaped along with content contained inside backticks
    // If not, the entire backtick block is matched so that it will become a markdown code block without escaping any of its content
    title.replace(
      new RegExp(
        `[${regexEscape(config['change-title-escapes'])}]|\`.*?\``,
        'g'
      ),
      (match) => {
        if (match.length > 1) return match
        if (match == '@' || match == '#') return `${match}<!---->`
        return `\\${match}`
      }
    )

  const pullRequestToString = (pullRequests) =>
    pullRequests
      .map((pullRequest) => {
        var pullAuthor = 'ghost'
        if (pullRequest.author) {
          pullAuthor =
            pullRequest.author.__typename &&
            pullRequest.author.__typename === 'Bot'
              ? `[${pullRequest.author.login}[bot]](${pullRequest.author.url})`
              : pullRequest.author.login
        }

        return template(config['change-template'], {
          $TITLE: escapeTitle(pullRequest.title),
          $NUMBER: pullRequest.number,
          $AUTHOR: pullAuthor,
          $BODY: pullRequest.body,
          $URL: pullRequest.url,
          $BASE_REF_NAME: pullRequest.baseRefName,
          $HEAD_REF_NAME: pullRequest.headRefName,
        })
      })
      .join('\n')

  const changeLog = []

  if (uncategorizedPullRequests.length > 0) {
    changeLog.push(pullRequestToString(uncategorizedPullRequests), '\n\n')
  }

  for (const [index, category] of categorizedPullRequests.entries()) {
    if (category.pullRequests.length === 0) {
      continue
    }

    // Add the category title to the changelog.
    changeLog.push(
      template(config['category-template'], { $TITLE: category.title }),
      '\n\n'
    )

    // Define the pull requests into a single string.
    const pullRequestString = pullRequestToString(category.pullRequests)

    // Determine the collapse status.
    const shouldCollapse =
      category['collapse-after'] !== 0 &&
      category.pullRequests.length > category['collapse-after']

    // Add the pull requests to the changelog.
    if (shouldCollapse) {
      changeLog.push(
        '<details>',
        '\n',
        `<summary>${category.pullRequests.length} changes</summary>`,
        '\n\n',
        pullRequestString,
        '\n',
        '</details>'
      )
    } else {
      changeLog.push(pullRequestString)
    }

    if (index + 1 !== categorizedPullRequests.length) changeLog.push('\n\n')
  }

  return changeLog.join('').trim()
}

const resolveVersionKeyIncrement = (
  mergedPullRequests,
  config,
  isPreRelease,
  context
) => {
  const priorityMap = {
    patch: 1,
    minor: 2,
    major: 3,
  }

  const labelToKeyMap = Object.fromEntries(
    Object.keys(priorityMap)
      .flatMap((key) => [
        config['version-resolver'][key].labels.map((label) => [label, key]),
      ])
      .flat()
  )

  log({
    context,
    message: `labelToKeyMap`,
    debug: labelToKeyMap,
  })

  const keys = mergedPullRequests
    .filter(getFilterExcludedPullRequests(config['exclude-labels']))
    .filter(getFilterIncludedPullRequests(config['include-labels']))
    .flatMap((pr) => pr.labels.nodes.map((node) => labelToKeyMap[node.name]))
    .filter(Boolean)

  log({
    context,
    message: `keys`,
    debug: keys,
  })

  const keyPriorities = keys.map((key) => priorityMap[key])
  const priority = Math.max(...keyPriorities)
  const versionKey = Object.keys(priorityMap).find(
    (key) => priorityMap[key] === priority
  )

  log({
    context,
    message: `versionKey`,
    debug: versionKey,
  })

  const versionKeyIncrement = versionKey || config['version-resolver'].default

  const shouldIncrementAsPrerelease =
    isPreRelease && config['prerelease-identifier']

  if (!shouldIncrementAsPrerelease) {
    return versionKeyIncrement
  }

  return `pre${versionKeyIncrement}`
}

const generateReleaseInfo = ({
  context,
  commits,
  config,
  lastRelease,
  mergedPullRequests,
  version,
  tag,
  name,
  isPreRelease,
  latest,
  shouldDraft,
  targetCommitish,
}) => {
  const { owner, repo } = context.repo()

  let body = config['header'] + config.template + config['footer']
  body = template(
    body,
    {
      $PREVIOUS_TAG: lastRelease ? lastRelease.tag_name : '',
      $CHANGES: generateChangeLog(mergedPullRequests, config),
      $CONTRIBUTORS: contributorsSentence({
        commits,
        pullRequests: mergedPullRequests,
        config,
      }),
      $OWNER: owner,
      $REPOSITORY: repo,
    },
    config.replacers
  )

  const versionKeyIncrement = resolveVersionKeyIncrement(
    mergedPullRequests,
    config,
    isPreRelease,
    context
  )

  log({
    context,
    message: `versionKeyIncrement`,
    debug: versionKeyIncrement,
  })

  const versionInfo = getVersionInfo(
    lastRelease,
    config['version-template'],
    // Use the first override parameter to identify
    // a version, from the most accurate to the least
    version || tag || name,
    versionKeyIncrement,
    config['tag-prefix'],
    config['prerelease-identifier']
  )

  log({
    context,
    message: `versionInfo`,
    debug: versionInfo,
  })

  if (versionInfo) {
    body = template(body, versionInfo)
  }

  if (tag === undefined) {
    tag = versionInfo ? template(config['tag-template'] || '', versionInfo) : ''
  } else if (versionInfo) {
    tag = template(tag, versionInfo)
  }

  log({
    context,
    message: `tag: ${tag}`,
    debug: true,
  })

  if (name === undefined) {
    name = versionInfo
      ? template(config['name-template'] || '', versionInfo)
      : ''
  } else if (versionInfo) {
    name = template(name, versionInfo)
  }

  log({
    context,
    message: `name: ${name}`,
    debug: true,
  })

  // Tags are not supported as `target_commitish` by Github API.
  // GITHUB_REF or the ref from webhook start with `refs/tags/`, so we handle
  // those here. If it doesn't but is still a tag - it must have been set
  // explicitly by the user, so it's fair to just let the API respond with an error.
  if (targetCommitish.startsWith('refs/tags/')) {
    log({
      context,
      message: `${targetCommitish} is not supported as release target, falling back to default branch`,
    })
    targetCommitish = ''
  }

  let resolvedVersion = versionInfo.$RESOLVED_VERSION.version
  let majorVersion = versionInfo.$RESOLVED_VERSION.$MAJOR
  let minorVersion = versionInfo.$RESOLVED_VERSION.$MINOR
  let patchVersion = versionInfo.$RESOLVED_VERSION.$PATCH

  return {
    name,
    tag,
    body,
    targetCommitish,
    prerelease: isPreRelease,
    make_latest: latest,
    draft: shouldDraft,
    resolvedVersion,
    majorVersion,
    minorVersion,
    patchVersion,
  }
}

const createRelease = ({ context, releaseInfo }) => {
  return context.octokit.repos.createRelease(
    context.repo({
      target_commitish: releaseInfo.targetCommitish,
      name: releaseInfo.name,
      tag_name: releaseInfo.tag,
      body: releaseInfo.body,
      draft: releaseInfo.draft,
      prerelease: releaseInfo.prerelease,
      make_latest: releaseInfo.make_latest,
    })
  )
}

const updateRelease = ({ context, draftRelease, releaseInfo }) => {
  const updateReleaseParameters = updateDraftReleaseParameters({
    name: releaseInfo.name || draftRelease.name,
    tag_name: releaseInfo.tag || draftRelease.tag_name,
    target_commitish: releaseInfo.targetCommitish,
  })

  return context.octokit.repos.updateRelease(
    context.repo({
      release_id: draftRelease.id,
      body: releaseInfo.body,
      draft: releaseInfo.draft,
      prerelease: releaseInfo.prerelease,
      make_latest: releaseInfo.make_latest,
      ...updateReleaseParameters,
    })
  )
}

function updateDraftReleaseParameters(parameters) {
  const updateReleaseParameters = { ...parameters }

  // Let GitHub figure out `name` and `tag_name` if undefined
  if (!updateReleaseParameters.name) {
    delete updateReleaseParameters.name
  }
  if (!updateReleaseParameters.tag_name) {
    delete updateReleaseParameters.tag_name
  }

  // Keep existing `target_commitish` if not overriden
  // (sending `null` resets it to the default branch)
  if (!updateReleaseParameters.target_commitish) {
    delete updateReleaseParameters.target_commitish
  }

  return updateReleaseParameters
}

exports.findReleases = findReleases
exports.generateChangeLog = generateChangeLog
exports.generateReleaseInfo = generateReleaseInfo
exports.createRelease = createRelease
exports.updateRelease = updateRelease


/***/ }),

/***/ 62594:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const _ = __nccwpck_require__(52356)
const Joi = __nccwpck_require__(81154)
const { SORT_BY, SORT_DIRECTIONS } = __nccwpck_require__(65472)
const { DEFAULT_CONFIG } = __nccwpck_require__(72659)
const {
  validateReplacers,
  validateAutolabeler,
  validateCategories,
} = __nccwpck_require__(96575)
const merge = __nccwpck_require__(2569)

const schema = (context) => {
  const defaultBranch = _.get(
    context,
    'payload.repository.default_branch',
    'master'
  )
  return Joi.object()
    .keys({
      references: Joi.array().items(Joi.string()).default([defaultBranch]),

      'change-template': Joi.string().default(
        DEFAULT_CONFIG['change-template']
      ),

      'change-title-escapes': Joi.string()
        .allow('')
        .default(DEFAULT_CONFIG['change-title-escapes']),

      'no-changes-template': Joi.string().default(
        DEFAULT_CONFIG['no-changes-template']
      ),

      'version-template': Joi.string().default(
        DEFAULT_CONFIG['version-template']
      ),

      'name-template': Joi.string()
        .allow('')
        .default(DEFAULT_CONFIG['name-template']),

      'tag-prefix': Joi.string()
        .allow('')
        .default(DEFAULT_CONFIG['tag-prefix']),

      'tag-template': Joi.string()
        .allow('')
        .default(DEFAULT_CONFIG['tag-template']),

      'exclude-labels': Joi.array()
        .items(Joi.string())
        .default(DEFAULT_CONFIG['exclude-labels']),

      'include-labels': Joi.array()
        .items(Joi.string())
        .default(DEFAULT_CONFIG['include-labels']),

      'include-paths': Joi.array()
        .items(Joi.string())
        .default(DEFAULT_CONFIG['include-paths']),

      'exclude-contributors': Joi.array()
        .items(Joi.string())
        .default(DEFAULT_CONFIG['exclude-contributors']),

      'no-contributors-template': Joi.string().default(
        DEFAULT_CONFIG['no-contributors-template']
      ),

      'sort-by': Joi.string()
        .valid(SORT_BY.mergedAt, SORT_BY.title)
        .default(DEFAULT_CONFIG['sort-by']),

      'sort-direction': Joi.string()
        .valid(SORT_DIRECTIONS.ascending, SORT_DIRECTIONS.descending)
        .default(DEFAULT_CONFIG['sort-direction']),

      prerelease: Joi.boolean().default(DEFAULT_CONFIG.prerelease),

      'prerelease-identifier': Joi.string()
        .allow('')
        .default(DEFAULT_CONFIG['prerelease-identifier']),

      latest: Joi.string()
        .allow('', 'true', 'false', 'legacy')
        .default(DEFAULT_CONFIG.latest),

      'filter-by-commitish': Joi.boolean().default(
        DEFAULT_CONFIG['filter-by-commitish']
      ),

      'initial-commits-since': Joi.date().iso().allow(''),

      'include-pre-releases': Joi.boolean().default(
        DEFAULT_CONFIG['include-pre-releases']
      ),

      commitish: Joi.string().allow('').default(DEFAULT_CONFIG['commitish']),

      'pull-request-limit': Joi.number()
        .positive()
        .integer()
        .default(DEFAULT_CONFIG['pull-request-limit']),

      'history-limit': Joi.number()
        .positive()
        .integer()
        .default(DEFAULT_CONFIG['history-limit']),

      replacers: Joi.array()
        .items(
          Joi.object().keys({
            search: Joi.string()
              .required()
              .error(
                new Error(
                  '"search" is required and must be a regexp or a string'
                )
              ),
            replace: Joi.string().allow('').required(),
          })
        )
        .default(DEFAULT_CONFIG.replacers),

      autolabeler: Joi.array()
        .items(
          Joi.object().keys({
            label: Joi.string().required(),
            files: Joi.array().items(Joi.string()).single().default([]),
            branch: Joi.array().items(Joi.string()).single().default([]),
            title: Joi.array().items(Joi.string()).single().default([]),
            body: Joi.array().items(Joi.string()).single().default([]),
          })
        )
        .default(DEFAULT_CONFIG.autolabeler),

      categories: Joi.array()
        .items(
          Joi.object()
            .keys({
              title: Joi.string().required(),
              'collapse-after': Joi.number().integer().min(0).default(0),
              label: Joi.string(),
              labels: Joi.array().items(Joi.string()).single().default([]),
            })
            .rename('label', 'labels', {
              ignoreUndefined: true,
              override: true,
            })
        )
        .default(DEFAULT_CONFIG.categories),

      'version-resolver': Joi.object()
        .keys({
          major: Joi.object({
            labels: Joi.array()
              .items(Joi.string())
              .single()
              .default(DEFAULT_CONFIG['version-resolver']['major']['labels']),
          }),
          minor: Joi.object({
            labels: Joi.array()
              .items(Joi.string())
              .single()
              .default(DEFAULT_CONFIG['version-resolver']['minor']['labels']),
          }),
          patch: Joi.object({
            labels: Joi.array()
              .items(Joi.string())
              .single()
              .default(DEFAULT_CONFIG['version-resolver']['patch']['labels']),
          }),
          default: Joi.string()
            .valid('major', 'minor', 'patch')
            .default('patch'),
        })
        .default(DEFAULT_CONFIG['version-resolver']),

      'category-template': Joi.string()
        .allow('')
        .default(DEFAULT_CONFIG['category-template']),

      header: Joi.string().allow('').default(DEFAULT_CONFIG.header),

      template: Joi.string().required(),

      footer: Joi.string().allow('').default(DEFAULT_CONFIG.footer),

      _extends: Joi.string(),
    })
    .rename('branches', 'references', {
      ignoreUndefined: true,
      override: true,
    })
}

const validateSchema = (context, repoConfig) => {
  const mergedRepoConfig = merge.all([DEFAULT_CONFIG, repoConfig])
  const { error, value: config } = schema(context).validate(mergedRepoConfig, {
    abortEarly: false,
    allowUnknown: true,
  })

  if (error) throw error

  validateCategories({ categories: config.categories })

  try {
    config.replacers = validateReplacers({
      context,
      replacers: config.replacers,
    })
  } catch {
    config.replacers = []
  }

  try {
    config.autolabeler = validateAutolabeler({
      context,
      autolabeler: config.autolabeler,
    })
  } catch {
    config.autolabeler = []
  }

  if (config['include-pre-releases']) {
    context.log.info(
      "'include-pre-releases' will be deprecated in next version. Use 'prerelease: true' instead. See PR #1515 for more"
    )
  }

  return config
}

exports.schema = schema
exports.validateSchema = validateSchema


/***/ }),

/***/ 65472:
/***/ ((__unused_webpack_module, exports) => {

const SORT_BY = {
  mergedAt: 'merged_at',
  title: 'title',
}

const SORT_DIRECTIONS = {
  ascending: 'ascending',
  descending: 'descending',
}

const sortPullRequests = (pullRequests, sortBy, sortDirection) => {
  const getSortField = sortBy === SORT_BY.title ? getTitle : getMergedAt

  const sort =
    sortDirection === SORT_DIRECTIONS.ascending
      ? dateSortAscending
      : dateSortDescending

  return [...pullRequests].sort((a, b) =>
    sort(getSortField(a), getSortField(b))
  )
}

function getMergedAt(pullRequest) {
  return new Date(pullRequest.mergedAt)
}

function getTitle(pullRequest) {
  return pullRequest.title
}

function dateSortAscending(date1, date2) {
  if (date1 > date2) return 1
  if (date1 < date2) return -1
  return 0
}

function dateSortDescending(date1, date2) {
  if (date1 > date2) return -1
  if (date1 < date2) return 1
  return 0
}

exports.SORT_BY = SORT_BY
exports.SORT_DIRECTIONS = SORT_DIRECTIONS
exports.sortPullRequests = sortPullRequests


/***/ }),

/***/ 96575:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const { log } = __nccwpck_require__(87707)
const regexParser = __nccwpck_require__(89773)
const regexEscape = __nccwpck_require__(31199)

/**
 * replaces all uppercase dollar templates with their string representation from object
 * if replacement is undefined in object the dollar template string is left untouched
 */

const template = (string, object, customReplacers) => {
  let input = string.replace(/(\$[A-Z_]+)/g, (_, k) => {
    let result
    if (object[k] === undefined || object[k] === null) {
      result = k
    } else if (typeof object[k] === 'object') {
      result = template(object[k].template, object[k])
    } else {
      result = `${object[k]}`
    }
    return result
  })
  if (customReplacers) {
    for (const { search, replace } of customReplacers) {
      input = input.replace(search, replace)
    }
  }
  return input
}

function toRegex(search) {
  return /^\/.+\/[AJUXgimsux]*$/.test(search)
    ? regexParser(search)
    : new RegExp(regexEscape(search), 'g')
}

function validateReplacers({ context, replacers }) {
  return replacers
    .map((replacer) => {
      try {
        return { ...replacer, search: toRegex(replacer.search) }
      } catch {
        log({
          context,
          message: `Bad replacer regex: '${replacer.search}'`,
        })
        return false
      }
    })
    .filter(Boolean)
}

function validateAutolabeler({ context, autolabeler }) {
  return autolabeler
    .map((autolabel) => {
      try {
        return {
          ...autolabel,
          branch: autolabel.branch.map((reg) => {
            return toRegex(reg)
          }),
          title: autolabel.title.map((reg) => {
            return toRegex(reg)
          }),
          body: autolabel.body.map((reg) => {
            return toRegex(reg)
          }),
        }
      } catch {
        log({
          context,
          message: `Bad autolabeler regex: '${autolabel.branch}', '${autolabel.title}' or '${autolabel.body}'`,
        })
        return false
      }
    })
    .filter(Boolean)
}

function validateCategories({ categories }) {
  if (
    categories.filter((category) => category.labels.length === 0).length > 1
  ) {
    throw new Error(
      'Multiple categories detected with no labels.\nOnly one category with no labels is supported for uncategorized pull requests.'
    )
  }
}

exports.template = template
exports.validateReplacers = validateReplacers
exports.validateAutolabeler = validateAutolabeler
exports.validateCategories = validateCategories


/***/ }),

/***/ 71917:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const { log } = __nccwpck_require__(87707)

const isTriggerableReference = ({ context, ref, config }) => {
  const { GITHUB_ACTIONS } = process.env
  if (GITHUB_ACTIONS) {
    // Let GitHub Action determine when to run the action based on the workflow's on syntax
    // See https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#on
    return true
  }
  const referenceRegex = /^refs\/(?:heads|tags)\//
  const refernces = config.references.map((r) => r.replace(referenceRegex, ''))
  const shortReference = ref.replace(referenceRegex, '')
  const validReference = new RegExp(refernces.join('|'))
  const relevant = validReference.test(shortReference)
  if (!relevant) {
    log({
      context,
      message: `Ignoring push. ${shortReference} does not match: ${refernces.join(
        ', '
      )}`,
    })
  }
  return relevant
}

exports.isTriggerableReference = isTriggerableReference


/***/ }),

/***/ 13008:
/***/ ((__unused_webpack_module, exports) => {

function runnerIsActions() {
  return process.env['GITHUB_ACTIONS'] !== undefined
}

exports.runnerIsActions = runnerIsActions


/***/ }),

/***/ 1608:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const semver = __nccwpck_require__(62088)

const splitSemVersion = (input, versionKey = 'version') => {
  if (!input[versionKey]) {
    return
  }

  const version = input.inc
    ? semver.inc(input[versionKey], input.inc, true, input.preReleaseIdentifier)
    : input[versionKey].version

  const prereleaseVersion = semver.prerelease(version)?.join('.') || ''

  return {
    ...input,
    version,
    $MAJOR: semver.major(version),
    $MINOR: semver.minor(version),
    $PATCH: semver.patch(version),
    $PRERELEASE: prereleaseVersion ? `-${prereleaseVersion}` : '',
    $COMPLETE: version,
  }
}

const defaultVersionInfo = {
  $NEXT_MAJOR_VERSION: {
    version: '1.0.0',
    template: '$MAJOR.$MINOR.$PATCH',
    inputVersion: null,
    versionKeyIncrement: 'patch',
    inc: 'major',
    $MAJOR: 1,
    $MINOR: 0,
    $PATCH: 0,
    $PRERELEASE: '',
  },
  $NEXT_MINOR_VERSION: {
    version: '0.1.0',
    template: '$MAJOR.$MINOR.$PATCH',
    inputVersion: null,
    versionKeyIncrement: 'patch',
    inc: 'minor',
    $MAJOR: 0,
    $MINOR: 1,
    $PATCH: 0,
    $PRERELEASE: '',
  },
  $NEXT_PATCH_VERSION: {
    version: '0.1.0',
    template: '$MAJOR.$MINOR.$PATCH',
    inputVersion: null,
    versionKeyIncrement: 'patch',
    inc: 'patch',
    $MAJOR: 0,
    $MINOR: 1,
    $PATCH: 0,
    $PRERELEASE: '',
  },
  $NEXT_PRERELEASE_VERSION: {
    version: '0.1.0-rc.0',
    template: '$MAJOR.$MINOR.$PATCH$PRERELEASE',
    inputVersion: null,
    versionKeyIncrement: 'prerelease',
    inc: 'prerelease',
    preReleaseIdentifier: 'rc',
    $MAJOR: 0,
    $MINOR: 1,
    $PATCH: 0,
    $PRERELEASE: '-rc.0',
  },
  $INPUT_VERSION: null,
  $RESOLVED_VERSION: {
    version: '0.1.0',
    template: '$MAJOR.$MINOR.$PATCH',
    inputVersion: null,
    versionKeyIncrement: 'patch',
    inc: 'patch',
    $MAJOR: 0,
    $MINOR: 1,
    $PATCH: 0,
    $PRERELEASE: '',
  },
}

const getTemplatableVersion = (input) => {
  const templatableVersion = {
    $NEXT_MAJOR_VERSION: splitSemVersion({ ...input, inc: 'major' }),
    $NEXT_MAJOR_VERSION_MAJOR: splitSemVersion({
      ...input,
      inc: 'major',
      template: '$MAJOR',
    }),
    $NEXT_MAJOR_VERSION_MINOR: splitSemVersion({
      ...input,
      inc: 'major',
      template: '$MINOR',
    }),
    $NEXT_MAJOR_VERSION_PATCH: splitSemVersion({
      ...input,
      inc: 'major',
      template: '$PATCH',
    }),
    $NEXT_MINOR_VERSION: splitSemVersion({ ...input, inc: 'minor' }),
    $NEXT_MINOR_VERSION_MAJOR: splitSemVersion({
      ...input,
      inc: 'minor',
      template: '$MAJOR',
    }),
    $NEXT_MINOR_VERSION_MINOR: splitSemVersion({
      ...input,
      inc: 'minor',
      template: '$MINOR',
    }),
    $NEXT_MINOR_VERSION_PATCH: splitSemVersion({
      ...input,
      inc: 'minor',
      template: '$PATCH',
    }),
    $NEXT_PATCH_VERSION: splitSemVersion({ ...input, inc: 'patch' }),
    $NEXT_PATCH_VERSION_MAJOR: splitSemVersion({
      ...input,
      inc: 'patch',
      template: '$MAJOR',
    }),
    $NEXT_PATCH_VERSION_MINOR: splitSemVersion({
      ...input,
      inc: 'patch',
      template: '$MINOR',
    }),
    $NEXT_PATCH_VERSION_PATCH: splitSemVersion({
      ...input,
      inc: 'patch',
      template: '$PATCH',
    }),
    $NEXT_PRERELEASE_VERSION: splitSemVersion({
      ...input,
      inc: 'prerelease',
      template: '$PRERELEASE',
    }),
    $INPUT_VERSION: splitSemVersion(input, 'inputVersion'),
    $RESOLVED_VERSION: splitSemVersion({
      ...input,
      inc: input.versionKeyIncrement || 'patch',
    }),
  }

  templatableVersion.$RESOLVED_VERSION =
    templatableVersion.$INPUT_VERSION || templatableVersion.$RESOLVED_VERSION

  return templatableVersion
}

const toSemver = (version) => {
  const result = semver.parse(version)
  if (result) {
    return result
  }

  // doesn't handle prerelease
  return semver.coerce(version)
}

const coerceVersion = (input, tagPrefix) => {
  if (!input) {
    return
  }

  const stripTag = (input) =>
    tagPrefix && input.startsWith(tagPrefix)
      ? input.slice(tagPrefix.length)
      : input

  return typeof input === 'object'
    ? toSemver(stripTag(input.tag_name)) || toSemver(stripTag(input.name))
    : toSemver(stripTag(input))
}

const getVersionInfo = (
  release,
  template,
  inputVersion,
  versionKeyIncrement,
  tagPrefix,
  preReleaseIdentifier
) => {
  const version = coerceVersion(release, tagPrefix)
  inputVersion = coerceVersion(inputVersion, tagPrefix)

  const isPreVersionKeyIncrement = versionKeyIncrement?.startsWith('pre')

  if (!version && !inputVersion) {
    if (isPreVersionKeyIncrement) {
      defaultVersionInfo['$RESOLVED_VERSION'] = {
        ...defaultVersionInfo['$NEXT_PRERELEASE_VERSION'],
      }
    }

    // Apply custom version template to default version info
    if (template && template !== '$MAJOR.$MINOR.$PATCH') {
      const defaultVersion = toSemver('0.1.0')
      const templateableVersion = getTemplatableVersion({
        version: defaultVersion,
        template,
        inputVersion,
        versionKeyIncrement: versionKeyIncrement || 'patch',
        preReleaseIdentifier,
      })

      // Apply template formatting to all version objects
      const { template: templateFunc } = __nccwpck_require__(96575)

      for (const key of Object.keys(templateableVersion)) {
        if (
          templateableVersion[key] &&
          typeof templateableVersion[key] === 'object' &&
          templateableVersion[key].template
        ) {
          templateableVersion[key].version = templateFunc(
            templateableVersion[key].template,
            templateableVersion[key]
          )
        }
      }

      // For first release, override $RESOLVED_VERSION to not increment
      const resolvedVersionObj = splitSemVersion({
        version: defaultVersion,
        template,
        inputVersion,
        versionKeyIncrement: versionKeyIncrement || 'patch',
        preReleaseIdentifier,
      })
      resolvedVersionObj.version = templateFunc(template, resolvedVersionObj)
      templateableVersion.$RESOLVED_VERSION = resolvedVersionObj

      return templateableVersion
    }

    return defaultVersionInfo
  }

  const shouldIncrementAsPrerelease =
    isPreVersionKeyIncrement && version?.prerelease?.length

  if (shouldIncrementAsPrerelease) {
    versionKeyIncrement = 'prerelease'
  }

  const templateableVersion = getTemplatableVersion({
    version,
    template,
    inputVersion,
    versionKeyIncrement,
    preReleaseIdentifier,
  })

  // Apply custom version template formatting if provided
  if (template && template !== '$MAJOR.$MINOR.$PATCH') {
    const { template: templateFunc } = __nccwpck_require__(96575)

    for (const key of Object.keys(templateableVersion)) {
      if (
        templateableVersion[key] &&
        typeof templateableVersion[key] === 'object' &&
        templateableVersion[key].template
      ) {
        templateableVersion[key].version = templateFunc(
          templateableVersion[key].template,
          templateableVersion[key]
        )
      }
    }
  }

  return templateableVersion
}

exports.getVersionInfo = getVersionInfo
exports.defaultVersionInfo = defaultVersionInfo


/***/ }),

/***/ 27182:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const WritableStream = (__nccwpck_require__(57075).Writable)
const inherits = (__nccwpck_require__(57975).inherits)

const StreamSearch = __nccwpck_require__(84136)

const PartStream = __nccwpck_require__(50612)
const HeaderParser = __nccwpck_require__(62271)

const DASH = 45
const B_ONEDASH = Buffer.from('-')
const B_CRLF = Buffer.from('\r\n')
const EMPTY_FN = function () {}

function Dicer (cfg) {
  if (!(this instanceof Dicer)) { return new Dicer(cfg) }
  WritableStream.call(this, cfg)

  if (!cfg || (!cfg.headerFirst && typeof cfg.boundary !== 'string')) { throw new TypeError('Boundary required') }

  if (typeof cfg.boundary === 'string') { this.setBoundary(cfg.boundary) } else { this._bparser = undefined }

  this._headerFirst = cfg.headerFirst

  this._dashes = 0
  this._parts = 0
  this._finished = false
  this._realFinish = false
  this._isPreamble = true
  this._justMatched = false
  this._firstWrite = true
  this._inHeader = true
  this._part = undefined
  this._cb = undefined
  this._ignoreData = false
  this._partOpts = { highWaterMark: cfg.partHwm }
  this._pause = false

  const self = this
  this._hparser = new HeaderParser(cfg)
  this._hparser.on('header', function (header) {
    self._inHeader = false
    self._part.emit('header', header)
  })
}
inherits(Dicer, WritableStream)

Dicer.prototype.emit = function (ev) {
  if (ev === 'finish' && !this._realFinish) {
    if (!this._finished) {
      const self = this
      process.nextTick(function () {
        self.emit('error', new Error('Unexpected end of multipart data'))
        if (self._part && !self._ignoreData) {
          const type = (self._isPreamble ? 'Preamble' : 'Part')
          self._part.emit('error', new Error(type + ' terminated early due to unexpected end of multipart data'))
          self._part.push(null)
          process.nextTick(function () {
            self._realFinish = true
            self.emit('finish')
            self._realFinish = false
          })
          return
        }
        self._realFinish = true
        self.emit('finish')
        self._realFinish = false
      })
    }
  } else { WritableStream.prototype.emit.apply(this, arguments) }
}

Dicer.prototype._write = function (data, encoding, cb) {
  // ignore unexpected data (e.g. extra trailer data after finished)
  if (!this._hparser && !this._bparser) { return cb() }

  if (this._headerFirst && this._isPreamble) {
    if (!this._part) {
      this._part = new PartStream(this._partOpts)
      if (this.listenerCount('preamble') !== 0) { this.emit('preamble', this._part) } else { this._ignore() }
    }
    const r = this._hparser.push(data)
    if (!this._inHeader && r !== undefined && r < data.length) { data = data.slice(r) } else { return cb() }
  }

  // allows for "easier" testing
  if (this._firstWrite) {
    this._bparser.push(B_CRLF)
    this._firstWrite = false
  }

  this._bparser.push(data)

  if (this._pause) { this._cb = cb } else { cb() }
}

Dicer.prototype.reset = function () {
  this._part = undefined
  this._bparser = undefined
  this._hparser = undefined
}

Dicer.prototype.setBoundary = function (boundary) {
  const self = this
  this._bparser = new StreamSearch('\r\n--' + boundary)
  this._bparser.on('info', function (isMatch, data, start, end) {
    self._oninfo(isMatch, data, start, end)
  })
}

Dicer.prototype._ignore = function () {
  if (this._part && !this._ignoreData) {
    this._ignoreData = true
    this._part.on('error', EMPTY_FN)
    // we must perform some kind of read on the stream even though we are
    // ignoring the data, otherwise node's Readable stream will not emit 'end'
    // after pushing null to the stream
    this._part.resume()
  }
}

Dicer.prototype._oninfo = function (isMatch, data, start, end) {
  let buf; const self = this; let i = 0; let r; let shouldWriteMore = true

  if (!this._part && this._justMatched && data) {
    while (this._dashes < 2 && (start + i) < end) {
      if (data[start + i] === DASH) {
        ++i
        ++this._dashes
      } else {
        if (this._dashes) { buf = B_ONEDASH }
        this._dashes = 0
        break
      }
    }
    if (this._dashes === 2) {
      if ((start + i) < end && this.listenerCount('trailer') !== 0) { this.emit('trailer', data.slice(start + i, end)) }
      this.reset()
      this._finished = true
      // no more parts will be added
      if (self._parts === 0) {
        self._realFinish = true
        self.emit('finish')
        self._realFinish = false
      }
    }
    if (this._dashes) { return }
  }
  if (this._justMatched) { this._justMatched = false }
  if (!this._part) {
    this._part = new PartStream(this._partOpts)
    this._part._read = function (n) {
      self._unpause()
    }
    if (this._isPreamble && this.listenerCount('preamble') !== 0) {
      this.emit('preamble', this._part)
    } else if (this._isPreamble !== true && this.listenerCount('part') !== 0) {
      this.emit('part', this._part)
    } else {
      this._ignore()
    }
    if (!this._isPreamble) { this._inHeader = true }
  }
  if (data && start < end && !this._ignoreData) {
    if (this._isPreamble || !this._inHeader) {
      if (buf) { shouldWriteMore = this._part.push(buf) }
      shouldWriteMore = this._part.push(data.slice(start, end))
      if (!shouldWriteMore) { this._pause = true }
    } else if (!this._isPreamble && this._inHeader) {
      if (buf) { this._hparser.push(buf) }
      r = this._hparser.push(data.slice(start, end))
      if (!this._inHeader && r !== undefined && r < end) { this._oninfo(false, data, start + r, end) }
    }
  }
  if (isMatch) {
    this._hparser.reset()
    if (this._isPreamble) { this._isPreamble = false } else {
      if (start !== end) {
        ++this._parts
        this._part.on('end', function () {
          if (--self._parts === 0) {
            if (self._finished) {
              self._realFinish = true
              self.emit('finish')
              self._realFinish = false
            } else {
              self._unpause()
            }
          }
        })
      }
    }
    this._part.push(null)
    this._part = undefined
    this._ignoreData = false
    this._justMatched = true
    this._dashes = 0
  }
}

Dicer.prototype._unpause = function () {
  if (!this._pause) { return }

  this._pause = false
  if (this._cb) {
    const cb = this._cb
    this._cb = undefined
    cb()
  }
}

module.exports = Dicer


/***/ }),

/***/ 62271:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const EventEmitter = (__nccwpck_require__(78474).EventEmitter)
const inherits = (__nccwpck_require__(57975).inherits)
const getLimit = __nccwpck_require__(22393)

const StreamSearch = __nccwpck_require__(84136)

const B_DCRLF = Buffer.from('\r\n\r\n')
const RE_CRLF = /\r\n/g
const RE_HDR = /^([^:]+):[ \t]?([\x00-\xFF]+)?$/ // eslint-disable-line no-control-regex

function HeaderParser (cfg) {
  EventEmitter.call(this)

  cfg = cfg || {}
  const self = this
  this.nread = 0
  this.maxed = false
  this.npairs = 0
  this.maxHeaderPairs = getLimit(cfg, 'maxHeaderPairs', 2000)
  this.maxHeaderSize = getLimit(cfg, 'maxHeaderSize', 80 * 1024)
  this.buffer = ''
  this.header = {}
  this.finished = false
  this.ss = new StreamSearch(B_DCRLF)
  this.ss.on('info', function (isMatch, data, start, end) {
    if (data && !self.maxed) {
      if (self.nread + end - start >= self.maxHeaderSize) {
        end = self.maxHeaderSize - self.nread + start
        self.nread = self.maxHeaderSize
        self.maxed = true
      } else { self.nread += (end - start) }

      self.buffer += data.toString('binary', start, end)
    }
    if (isMatch) { self._finish() }
  })
}
inherits(HeaderParser, EventEmitter)

HeaderParser.prototype.push = function (data) {
  const r = this.ss.push(data)
  if (this.finished) { return r }
}

HeaderParser.prototype.reset = function () {
  this.finished = false
  this.buffer = ''
  this.header = {}
  this.ss.reset()
}

HeaderParser.prototype._finish = function () {
  if (this.buffer) { this._parseHeader() }
  this.ss.matches = this.ss.maxMatches
  const header = this.header
  this.header = {}
  this.buffer = ''
  this.finished = true
  this.nread = this.npairs = 0
  this.maxed = false
  this.emit('header', header)
}

HeaderParser.prototype._parseHeader = function () {
  if (this.npairs === this.maxHeaderPairs) { return }

  const lines = this.buffer.split(RE_CRLF)
  const len = lines.length
  let m, h

  for (var i = 0; i < len; ++i) { // eslint-disable-line no-var
    if (lines[i].length === 0) { continue }
    if (lines[i][0] === '\t' || lines[i][0] === ' ') {
      // folded header content
      // RFC2822 says to just remove the CRLF and not the whitespace following
      // it, so we follow the RFC and include the leading whitespace ...
      if (h) {
        this.header[h][this.header[h].length - 1] += lines[i]
        continue
      }
    }

    const posColon = lines[i].indexOf(':')
    if (
      posColon === -1 ||
      posColon === 0
    ) {
      return
    }
    m = RE_HDR.exec(lines[i])
    h = m[1].toLowerCase()
    this.header[h] = this.header[h] || []
    this.header[h].push((m[2] || ''))
    if (++this.npairs === this.maxHeaderPairs) { break }
  }
}

module.exports = HeaderParser


/***/ }),

/***/ 50612:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const inherits = (__nccwpck_require__(57975).inherits)
const ReadableStream = (__nccwpck_require__(57075).Readable)

function PartStream (opts) {
  ReadableStream.call(this, opts)
}
inherits(PartStream, ReadableStream)

PartStream.prototype._read = function (n) {}

module.exports = PartStream


/***/ }),

/***/ 84136:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


/**
 * Copyright Brian White. All rights reserved.
 *
 * @see https://github.com/mscdex/streamsearch
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 * Based heavily on the Streaming Boyer-Moore-Horspool C++ implementation
 * by Hongli Lai at: https://github.com/FooBarWidget/boyer-moore-horspool
 */
const EventEmitter = (__nccwpck_require__(78474).EventEmitter)
const inherits = (__nccwpck_require__(57975).inherits)

function SBMH (needle) {
  if (typeof needle === 'string') {
    needle = Buffer.from(needle)
  }

  if (!Buffer.isBuffer(needle)) {
    throw new TypeError('The needle has to be a String or a Buffer.')
  }

  const needleLength = needle.length

  if (needleLength === 0) {
    throw new Error('The needle cannot be an empty String/Buffer.')
  }

  if (needleLength > 256) {
    throw new Error('The needle cannot have a length bigger than 256.')
  }

  this.maxMatches = Infinity
  this.matches = 0

  this._occ = new Array(256)
    .fill(needleLength) // Initialize occurrence table.
  this._lookbehind_size = 0
  this._needle = needle
  this._bufpos = 0

  this._lookbehind = Buffer.alloc(needleLength)

  // Populate occurrence table with analysis of the needle,
  // ignoring last letter.
  for (var i = 0; i < needleLength - 1; ++i) { // eslint-disable-line no-var
    this._occ[needle[i]] = needleLength - 1 - i
  }
}
inherits(SBMH, EventEmitter)

SBMH.prototype.reset = function () {
  this._lookbehind_size = 0
  this.matches = 0
  this._bufpos = 0
}

SBMH.prototype.push = function (chunk, pos) {
  if (!Buffer.isBuffer(chunk)) {
    chunk = Buffer.from(chunk, 'binary')
  }
  const chlen = chunk.length
  this._bufpos = pos || 0
  let r
  while (r !== chlen && this.matches < this.maxMatches) { r = this._sbmh_feed(chunk) }
  return r
}

SBMH.prototype._sbmh_feed = function (data) {
  const len = data.length
  const needle = this._needle
  const needleLength = needle.length
  const lastNeedleChar = needle[needleLength - 1]

  // Positive: points to a position in `data`
  //           pos == 3 points to data[3]
  // Negative: points to a position in the lookbehind buffer
  //           pos == -2 points to lookbehind[lookbehind_size - 2]
  let pos = -this._lookbehind_size
  let ch

  if (pos < 0) {
    // Lookbehind buffer is not empty. Perform Boyer-Moore-Horspool
    // search with character lookup code that considers both the
    // lookbehind buffer and the current round's haystack data.
    //
    // Loop until
    //   there is a match.
    // or until
    //   we've moved past the position that requires the
    //   lookbehind buffer. In this case we switch to the
    //   optimized loop.
    // or until
    //   the character to look at lies outside the haystack.
    while (pos < 0 && pos <= len - needleLength) {
      ch = this._sbmh_lookup_char(data, pos + needleLength - 1)

      if (
        ch === lastNeedleChar &&
        this._sbmh_memcmp(data, pos, needleLength - 1)
      ) {
        this._lookbehind_size = 0
        ++this.matches
        this.emit('info', true)

        return (this._bufpos = pos + needleLength)
      }
      pos += this._occ[ch]
    }

    // No match.

    if (pos < 0) {
      // There's too few data for Boyer-Moore-Horspool to run,
      // so let's use a different algorithm to skip as much as
      // we can.
      // Forward pos until
      //   the trailing part of lookbehind + data
      //   looks like the beginning of the needle
      // or until
      //   pos == 0
      while (pos < 0 && !this._sbmh_memcmp(data, pos, len - pos)) { ++pos }
    }

    if (pos >= 0) {
      // Discard lookbehind buffer.
      this.emit('info', false, this._lookbehind, 0, this._lookbehind_size)
      this._lookbehind_size = 0
    } else {
      // Cut off part of the lookbehind buffer that has
      // been processed and append the entire haystack
      // into it.
      const bytesToCutOff = this._lookbehind_size + pos
      if (bytesToCutOff > 0) {
        // The cut off data is guaranteed not to contain the needle.
        this.emit('info', false, this._lookbehind, 0, bytesToCutOff)
      }

      this._lookbehind.copy(this._lookbehind, 0, bytesToCutOff,
        this._lookbehind_size - bytesToCutOff)
      this._lookbehind_size -= bytesToCutOff

      data.copy(this._lookbehind, this._lookbehind_size)
      this._lookbehind_size += len

      this._bufpos = len
      return len
    }
  }

  pos += (pos >= 0) * this._bufpos

  // Lookbehind buffer is now empty. We only need to check if the
  // needle is in the haystack.
  if (data.indexOf(needle, pos) !== -1) {
    pos = data.indexOf(needle, pos)
    ++this.matches
    if (pos > 0) { this.emit('info', true, data, this._bufpos, pos) } else { this.emit('info', true) }

    return (this._bufpos = pos + needleLength)
  } else {
    pos = len - needleLength
  }

  // There was no match. If there's trailing haystack data that we cannot
  // match yet using the Boyer-Moore-Horspool algorithm (because the trailing
  // data is less than the needle size) then match using a modified
  // algorithm that starts matching from the beginning instead of the end.
  // Whatever trailing data is left after running this algorithm is added to
  // the lookbehind buffer.
  while (
    pos < len &&
    (
      data[pos] !== needle[0] ||
      (
        (Buffer.compare(
          data.subarray(pos, pos + len - pos),
          needle.subarray(0, len - pos)
        ) !== 0)
      )
    )
  ) {
    ++pos
  }
  if (pos < len) {
    data.copy(this._lookbehind, 0, pos, pos + (len - pos))
    this._lookbehind_size = len - pos
  }

  // Everything until pos is guaranteed not to contain needle data.
  if (pos > 0) { this.emit('info', false, data, this._bufpos, pos < len ? pos : len) }

  this._bufpos = len
  return len
}

SBMH.prototype._sbmh_lookup_char = function (data, pos) {
  return (pos < 0)
    ? this._lookbehind[this._lookbehind_size + pos]
    : data[pos]
}

SBMH.prototype._sbmh_memcmp = function (data, pos, len) {
  for (var i = 0; i < len; ++i) { // eslint-disable-line no-var
    if (this._sbmh_lookup_char(data, pos + i) !== this._needle[i]) { return false }
  }
  return true
}

module.exports = SBMH


/***/ }),

/***/ 89581:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const WritableStream = (__nccwpck_require__(57075).Writable)
const { inherits } = __nccwpck_require__(57975)
const Dicer = __nccwpck_require__(27182)

const MultipartParser = __nccwpck_require__(41192)
const UrlencodedParser = __nccwpck_require__(80855)
const parseParams = __nccwpck_require__(8929)

function Busboy (opts) {
  if (!(this instanceof Busboy)) { return new Busboy(opts) }

  if (typeof opts !== 'object') {
    throw new TypeError('Busboy expected an options-Object.')
  }
  if (typeof opts.headers !== 'object') {
    throw new TypeError('Busboy expected an options-Object with headers-attribute.')
  }
  if (typeof opts.headers['content-type'] !== 'string') {
    throw new TypeError('Missing Content-Type-header.')
  }

  const {
    headers,
    ...streamOptions
  } = opts

  this.opts = {
    autoDestroy: false,
    ...streamOptions
  }
  WritableStream.call(this, this.opts)

  this._done = false
  this._parser = this.getParserByHeaders(headers)
  this._finished = false
}
inherits(Busboy, WritableStream)

Busboy.prototype.emit = function (ev) {
  if (ev === 'finish') {
    if (!this._done) {
      this._parser?.end()
      return
    } else if (this._finished) {
      return
    }
    this._finished = true
  }
  WritableStream.prototype.emit.apply(this, arguments)
}

Busboy.prototype.getParserByHeaders = function (headers) {
  const parsed = parseParams(headers['content-type'])

  const cfg = {
    defCharset: this.opts.defCharset,
    fileHwm: this.opts.fileHwm,
    headers,
    highWaterMark: this.opts.highWaterMark,
    isPartAFile: this.opts.isPartAFile,
    limits: this.opts.limits,
    parsedConType: parsed,
    preservePath: this.opts.preservePath
  }

  if (MultipartParser.detect.test(parsed[0])) {
    return new MultipartParser(this, cfg)
  }
  if (UrlencodedParser.detect.test(parsed[0])) {
    return new UrlencodedParser(this, cfg)
  }
  throw new Error('Unsupported Content-Type.')
}

Busboy.prototype._write = function (chunk, encoding, cb) {
  this._parser.write(chunk, cb)
}

module.exports = Busboy
module.exports["default"] = Busboy
module.exports.Busboy = Busboy

module.exports.Dicer = Dicer


/***/ }),

/***/ 41192:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


// TODO:
//  * support 1 nested multipart level
//    (see second multipart example here:
//     http://www.w3.org/TR/html401/interact/forms.html#didx-multipartform-data)
//  * support limits.fieldNameSize
//     -- this will require modifications to utils.parseParams

const { Readable } = __nccwpck_require__(57075)
const { inherits } = __nccwpck_require__(57975)

const Dicer = __nccwpck_require__(27182)

const parseParams = __nccwpck_require__(8929)
const decodeText = __nccwpck_require__(72747)
const basename = __nccwpck_require__(20692)
const getLimit = __nccwpck_require__(22393)

const RE_BOUNDARY = /^boundary$/i
const RE_FIELD = /^form-data$/i
const RE_CHARSET = /^charset$/i
const RE_FILENAME = /^filename$/i
const RE_NAME = /^name$/i

Multipart.detect = /^multipart\/form-data/i
function Multipart (boy, cfg) {
  let i
  let len
  const self = this
  let boundary
  const limits = cfg.limits
  const isPartAFile = cfg.isPartAFile || ((fieldName, contentType, fileName) => (contentType === 'application/octet-stream' || fileName !== undefined))
  const parsedConType = cfg.parsedConType || []
  const defCharset = cfg.defCharset || 'utf8'
  const preservePath = cfg.preservePath
  const fileOpts = { highWaterMark: cfg.fileHwm }

  for (i = 0, len = parsedConType.length; i < len; ++i) {
    if (Array.isArray(parsedConType[i]) &&
      RE_BOUNDARY.test(parsedConType[i][0])) {
      boundary = parsedConType[i][1]
      break
    }
  }

  function checkFinished () {
    if (nends === 0 && finished && !boy._done) {
      finished = false
      self.end()
    }
  }

  if (typeof boundary !== 'string') { throw new Error('Multipart: Boundary not found') }

  const fieldSizeLimit = getLimit(limits, 'fieldSize', 1 * 1024 * 1024)
  const fileSizeLimit = getLimit(limits, 'fileSize', Infinity)
  const filesLimit = getLimit(limits, 'files', Infinity)
  const fieldsLimit = getLimit(limits, 'fields', Infinity)
  const partsLimit = getLimit(limits, 'parts', Infinity)
  const headerPairsLimit = getLimit(limits, 'headerPairs', 2000)
  const headerSizeLimit = getLimit(limits, 'headerSize', 80 * 1024)

  let nfiles = 0
  let nfields = 0
  let nends = 0
  let curFile
  let curField
  let finished = false

  this._needDrain = false
  this._pause = false
  this._cb = undefined
  this._nparts = 0
  this._boy = boy

  const parserCfg = {
    boundary,
    maxHeaderPairs: headerPairsLimit,
    maxHeaderSize: headerSizeLimit,
    partHwm: fileOpts.highWaterMark,
    highWaterMark: cfg.highWaterMark
  }

  this.parser = new Dicer(parserCfg)
  this.parser.on('drain', function () {
    self._needDrain = false
    if (self._cb && !self._pause) {
      const cb = self._cb
      self._cb = undefined
      cb()
    }
  }).on('part', function onPart (part) {
    if (++self._nparts > partsLimit) {
      self.parser.removeListener('part', onPart)
      self.parser.on('part', skipPart)
      boy.hitPartsLimit = true
      boy.emit('partsLimit')
      return skipPart(part)
    }

    // hack because streams2 _always_ doesn't emit 'end' until nextTick, so let
    // us emit 'end' early since we know the part has ended if we are already
    // seeing the next part
    if (curField) {
      const field = curField
      field.emit('end')
      field.removeAllListeners('end')
    }

    part.on('header', function (header) {
      let contype
      let fieldname
      let parsed
      let charset
      let encoding
      let filename
      let nsize = 0

      if (header['content-type']) {
        parsed = parseParams(header['content-type'][0])
        if (parsed[0]) {
          contype = parsed[0].toLowerCase()
          for (i = 0, len = parsed.length; i < len; ++i) {
            if (RE_CHARSET.test(parsed[i][0])) {
              charset = parsed[i][1].toLowerCase()
              break
            }
          }
        }
      }

      if (contype === undefined) { contype = 'text/plain' }
      if (charset === undefined) { charset = defCharset }

      if (header['content-disposition']) {
        parsed = parseParams(header['content-disposition'][0])
        if (!RE_FIELD.test(parsed[0])) { return skipPart(part) }
        for (i = 0, len = parsed.length; i < len; ++i) {
          if (RE_NAME.test(parsed[i][0])) {
            fieldname = parsed[i][1]
          } else if (RE_FILENAME.test(parsed[i][0])) {
            filename = parsed[i][1]
            if (!preservePath) { filename = basename(filename) }
          }
        }
      } else { return skipPart(part) }

      if (header['content-transfer-encoding']) { encoding = header['content-transfer-encoding'][0].toLowerCase() } else { encoding = '7bit' }

      let onData,
        onEnd

      if (isPartAFile(fieldname, contype, filename)) {
        // file/binary field
        if (nfiles === filesLimit) {
          if (!boy.hitFilesLimit) {
            boy.hitFilesLimit = true
            boy.emit('filesLimit')
          }
          return skipPart(part)
        }

        ++nfiles

        if (boy.listenerCount('file') === 0) {
          self.parser._ignore()
          return
        }

        ++nends
        const file = new FileStream(fileOpts)
        curFile = file
        file.on('end', function () {
          --nends
          self._pause = false
          checkFinished()
          if (self._cb && !self._needDrain) {
            const cb = self._cb
            self._cb = undefined
            cb()
          }
        })
        file._read = function (n) {
          if (!self._pause) { return }
          self._pause = false
          if (self._cb && !self._needDrain) {
            const cb = self._cb
            self._cb = undefined
            cb()
          }
        }
        boy.emit('file', fieldname, file, filename, encoding, contype)

        onData = function (data) {
          if ((nsize += data.length) > fileSizeLimit) {
            const extralen = fileSizeLimit - nsize + data.length
            if (extralen > 0) { file.push(data.slice(0, extralen)) }
            file.truncated = true
            file.bytesRead = fileSizeLimit
            part.removeAllListeners('data')
            file.emit('limit')
            return
          } else if (!file.push(data)) { self._pause = true }

          file.bytesRead = nsize
        }

        onEnd = function () {
          curFile = undefined
          file.push(null)
        }
      } else {
        // non-file field
        if (nfields === fieldsLimit) {
          if (!boy.hitFieldsLimit) {
            boy.hitFieldsLimit = true
            boy.emit('fieldsLimit')
          }
          return skipPart(part)
        }

        ++nfields
        ++nends
        let buffer = ''
        let truncated = false
        curField = part

        onData = function (data) {
          if ((nsize += data.length) > fieldSizeLimit) {
            const extralen = (fieldSizeLimit - (nsize - data.length))
            buffer += data.toString('binary', 0, extralen)
            truncated = true
            part.removeAllListeners('data')
          } else { buffer += data.toString('binary') }
        }

        onEnd = function () {
          curField = undefined
          if (buffer.length) { buffer = decodeText(buffer, 'binary', charset) }
          boy.emit('field', fieldname, buffer, false, truncated, encoding, contype)
          --nends
          checkFinished()
        }
      }

      /* As of node@2efe4ab761666 (v0.10.29+/v0.11.14+), busboy had become
         broken. Streams2/streams3 is a huge black box of confusion, but
         somehow overriding the sync state seems to fix things again (and still
         seems to work for previous node versions).
      */
      part._readableState.sync = false

      part.on('data', onData)
      part.on('end', onEnd)
    }).on('error', function (err) {
      if (curFile) { curFile.emit('error', err) }
    })
  }).on('error', function (err) {
    boy.emit('error', err)
  }).on('finish', function () {
    finished = true
    checkFinished()
  })
}

Multipart.prototype.write = function (chunk, cb) {
  const r = this.parser.write(chunk)
  if (r && !this._pause) {
    cb()
  } else {
    this._needDrain = !r
    this._cb = cb
  }
}

Multipart.prototype.end = function () {
  const self = this

  if (self.parser.writable) {
    self.parser.end()
  } else if (!self._boy._done) {
    process.nextTick(function () {
      self._boy._done = true
      self._boy.emit('finish')
    })
  }
}

function skipPart (part) {
  part.resume()
}

function FileStream (opts) {
  Readable.call(this, opts)

  this.bytesRead = 0

  this.truncated = false
}

inherits(FileStream, Readable)

FileStream.prototype._read = function (n) {}

module.exports = Multipart


/***/ }),

/***/ 80855:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const Decoder = __nccwpck_require__(11496)
const decodeText = __nccwpck_require__(72747)
const getLimit = __nccwpck_require__(22393)

const RE_CHARSET = /^charset$/i

UrlEncoded.detect = /^application\/x-www-form-urlencoded/i
function UrlEncoded (boy, cfg) {
  const limits = cfg.limits
  const parsedConType = cfg.parsedConType
  this.boy = boy

  this.fieldSizeLimit = getLimit(limits, 'fieldSize', 1 * 1024 * 1024)
  this.fieldNameSizeLimit = getLimit(limits, 'fieldNameSize', 100)
  this.fieldsLimit = getLimit(limits, 'fields', Infinity)

  let charset
  for (var i = 0, len = parsedConType.length; i < len; ++i) { // eslint-disable-line no-var
    if (Array.isArray(parsedConType[i]) &&
        RE_CHARSET.test(parsedConType[i][0])) {
      charset = parsedConType[i][1].toLowerCase()
      break
    }
  }

  if (charset === undefined) { charset = cfg.defCharset || 'utf8' }

  this.decoder = new Decoder()
  this.charset = charset
  this._fields = 0
  this._state = 'key'
  this._checkingBytes = true
  this._bytesKey = 0
  this._bytesVal = 0
  this._key = ''
  this._val = ''
  this._keyTrunc = false
  this._valTrunc = false
  this._hitLimit = false
}

UrlEncoded.prototype.write = function (data, cb) {
  if (this._fields === this.fieldsLimit) {
    if (!this.boy.hitFieldsLimit) {
      this.boy.hitFieldsLimit = true
      this.boy.emit('fieldsLimit')
    }
    return cb()
  }

  let idxeq; let idxamp; let i; let p = 0; const len = data.length

  while (p < len) {
    if (this._state === 'key') {
      idxeq = idxamp = undefined
      for (i = p; i < len; ++i) {
        if (!this._checkingBytes) { ++p }
        if (data[i] === 0x3D/* = */) {
          idxeq = i
          break
        } else if (data[i] === 0x26/* & */) {
          idxamp = i
          break
        }
        if (this._checkingBytes && this._bytesKey === this.fieldNameSizeLimit) {
          this._hitLimit = true
          break
        } else if (this._checkingBytes) { ++this._bytesKey }
      }

      if (idxeq !== undefined) {
        // key with assignment
        if (idxeq > p) { this._key += this.decoder.write(data.toString('binary', p, idxeq)) }
        this._state = 'val'

        this._hitLimit = false
        this._checkingBytes = true
        this._val = ''
        this._bytesVal = 0
        this._valTrunc = false
        this.decoder.reset()

        p = idxeq + 1
      } else if (idxamp !== undefined) {
        // key with no assignment
        ++this._fields
        let key; const keyTrunc = this._keyTrunc
        if (idxamp > p) { key = (this._key += this.decoder.write(data.toString('binary', p, idxamp))) } else { key = this._key }

        this._hitLimit = false
        this._checkingBytes = true
        this._key = ''
        this._bytesKey = 0
        this._keyTrunc = false
        this.decoder.reset()

        if (key.length) {
          this.boy.emit('field', decodeText(key, 'binary', this.charset),
            '',
            keyTrunc,
            false)
        }

        p = idxamp + 1
        if (this._fields === this.fieldsLimit) { return cb() }
      } else if (this._hitLimit) {
        // we may not have hit the actual limit if there are encoded bytes...
        if (i > p) { this._key += this.decoder.write(data.toString('binary', p, i)) }
        p = i
        if ((this._bytesKey = this._key.length) === this.fieldNameSizeLimit) {
          // yep, we actually did hit the limit
          this._checkingBytes = false
          this._keyTrunc = true
        }
      } else {
        if (p < len) { this._key += this.decoder.write(data.toString('binary', p)) }
        p = len
      }
    } else {
      idxamp = undefined
      for (i = p; i < len; ++i) {
        if (!this._checkingBytes) { ++p }
        if (data[i] === 0x26/* & */) {
          idxamp = i
          break
        }
        if (this._checkingBytes && this._bytesVal === this.fieldSizeLimit) {
          this._hitLimit = true
          break
        } else if (this._checkingBytes) { ++this._bytesVal }
      }

      if (idxamp !== undefined) {
        ++this._fields
        if (idxamp > p) { this._val += this.decoder.write(data.toString('binary', p, idxamp)) }
        this.boy.emit('field', decodeText(this._key, 'binary', this.charset),
          decodeText(this._val, 'binary', this.charset),
          this._keyTrunc,
          this._valTrunc)
        this._state = 'key'

        this._hitLimit = false
        this._checkingBytes = true
        this._key = ''
        this._bytesKey = 0
        this._keyTrunc = false
        this.decoder.reset()

        p = idxamp + 1
        if (this._fields === this.fieldsLimit) { return cb() }
      } else if (this._hitLimit) {
        // we may not have hit the actual limit if there are encoded bytes...
        if (i > p) { this._val += this.decoder.write(data.toString('binary', p, i)) }
        p = i
        if ((this._val === '' && this.fieldSizeLimit === 0) ||
            (this._bytesVal = this._val.length) === this.fieldSizeLimit) {
          // yep, we actually did hit the limit
          this._checkingBytes = false
          this._valTrunc = true
        }
      } else {
        if (p < len) { this._val += this.decoder.write(data.toString('binary', p)) }
        p = len
      }
    }
  }
  cb()
}

UrlEncoded.prototype.end = function () {
  if (this.boy._done) { return }

  if (this._state === 'key' && this._key.length > 0) {
    this.boy.emit('field', decodeText(this._key, 'binary', this.charset),
      '',
      this._keyTrunc,
      false)
  } else if (this._state === 'val') {
    this.boy.emit('field', decodeText(this._key, 'binary', this.charset),
      decodeText(this._val, 'binary', this.charset),
      this._keyTrunc,
      this._valTrunc)
  }
  this.boy._done = true
  this.boy.emit('finish')
}

module.exports = UrlEncoded


/***/ }),

/***/ 11496:
/***/ ((module) => {

"use strict";


const RE_PLUS = /\+/g

const HEX = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
]

function Decoder () {
  this.buffer = undefined
}
Decoder.prototype.write = function (str) {
  // Replace '+' with ' ' before decoding
  str = str.replace(RE_PLUS, ' ')
  let res = ''
  let i = 0; let p = 0; const len = str.length
  for (; i < len; ++i) {
    if (this.buffer !== undefined) {
      if (!HEX[str.charCodeAt(i)]) {
        res += '%' + this.buffer
        this.buffer = undefined
        --i // retry character
      } else {
        this.buffer += str[i]
        ++p
        if (this.buffer.length === 2) {
          res += String.fromCharCode(parseInt(this.buffer, 16))
          this.buffer = undefined
        }
      }
    } else if (str[i] === '%') {
      if (i > p) {
        res += str.substring(p, i)
        p = i
      }
      this.buffer = ''
      ++p
    }
  }
  if (p < len && this.buffer === undefined) { res += str.substring(p) }
  return res
}
Decoder.prototype.reset = function () {
  this.buffer = undefined
}

module.exports = Decoder


/***/ }),

/***/ 20692:
/***/ ((module) => {

"use strict";


module.exports = function basename (path) {
  if (typeof path !== 'string') { return '' }
  for (var i = path.length - 1; i >= 0; --i) { // eslint-disable-line no-var
    switch (path.charCodeAt(i)) {
      case 0x2F: // '/'
      case 0x5C: // '\'
        path = path.slice(i + 1)
        return (path === '..' || path === '.' ? '' : path)
    }
  }
  return (path === '..' || path === '.' ? '' : path)
}


/***/ }),

/***/ 72747:
/***/ (function(module) {

"use strict";


// Node has always utf-8
const utf8Decoder = new TextDecoder('utf-8')
const textDecoders = new Map([
  ['utf-8', utf8Decoder],
  ['utf8', utf8Decoder]
])

function getDecoder (charset) {
  let lc
  while (true) {
    switch (charset) {
      case 'utf-8':
      case 'utf8':
        return decoders.utf8
      case 'latin1':
      case 'ascii': // TODO: Make these a separate, strict decoder?
      case 'us-ascii':
      case 'iso-8859-1':
      case 'iso8859-1':
      case 'iso88591':
      case 'iso_8859-1':
      case 'windows-1252':
      case 'iso_8859-1:1987':
      case 'cp1252':
      case 'x-cp1252':
        return decoders.latin1
      case 'utf16le':
      case 'utf-16le':
      case 'ucs2':
      case 'ucs-2':
        return decoders.utf16le
      case 'base64':
        return decoders.base64
      default:
        if (lc === undefined) {
          lc = true
          charset = charset.toLowerCase()
          continue
        }
        return decoders.other.bind(charset)
    }
  }
}

const decoders = {
  utf8: (data, sourceEncoding) => {
    if (data.length === 0) {
      return ''
    }
    if (typeof data === 'string') {
      data = Buffer.from(data, sourceEncoding)
    }
    return data.utf8Slice(0, data.length)
  },

  latin1: (data, sourceEncoding) => {
    if (data.length === 0) {
      return ''
    }
    if (typeof data === 'string') {
      return data
    }
    return data.latin1Slice(0, data.length)
  },

  utf16le: (data, sourceEncoding) => {
    if (data.length === 0) {
      return ''
    }
    if (typeof data === 'string') {
      data = Buffer.from(data, sourceEncoding)
    }
    return data.ucs2Slice(0, data.length)
  },

  base64: (data, sourceEncoding) => {
    if (data.length === 0) {
      return ''
    }
    if (typeof data === 'string') {
      data = Buffer.from(data, sourceEncoding)
    }
    return data.base64Slice(0, data.length)
  },

  other: (data, sourceEncoding) => {
    if (data.length === 0) {
      return ''
    }
    if (typeof data === 'string') {
      data = Buffer.from(data, sourceEncoding)
    }

    if (textDecoders.has(this.toString())) {
      try {
        return textDecoders.get(this).decode(data)
      } catch {}
    }
    return typeof data === 'string'
      ? data
      : data.toString()
  }
}

function decodeText (text, sourceEncoding, destEncoding) {
  if (text) {
    return getDecoder(destEncoding)(text, sourceEncoding)
  }
  return text
}

module.exports = decodeText


/***/ }),

/***/ 22393:
/***/ ((module) => {

"use strict";


module.exports = function getLimit (limits, name, defaultLimit) {
  if (
    !limits ||
    limits[name] === undefined ||
    limits[name] === null
  ) { return defaultLimit }

  if (
    typeof limits[name] !== 'number' ||
    isNaN(limits[name])
  ) { throw new TypeError('Limit ' + name + ' is not a valid number') }

  return limits[name]
}


/***/ }),

/***/ 8929:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
/* eslint-disable object-property-newline */


const decodeText = __nccwpck_require__(72747)

const RE_ENCODED = /%[a-fA-F0-9][a-fA-F0-9]/g

const EncodedLookup = {
  '%00': '\x00', '%01': '\x01', '%02': '\x02', '%03': '\x03', '%04': '\x04',
  '%05': '\x05', '%06': '\x06', '%07': '\x07', '%08': '\x08', '%09': '\x09',
  '%0a': '\x0a', '%0A': '\x0a', '%0b': '\x0b', '%0B': '\x0b', '%0c': '\x0c',
  '%0C': '\x0c', '%0d': '\x0d', '%0D': '\x0d', '%0e': '\x0e', '%0E': '\x0e',
  '%0f': '\x0f', '%0F': '\x0f', '%10': '\x10', '%11': '\x11', '%12': '\x12',
  '%13': '\x13', '%14': '\x14', '%15': '\x15', '%16': '\x16', '%17': '\x17',
  '%18': '\x18', '%19': '\x19', '%1a': '\x1a', '%1A': '\x1a', '%1b': '\x1b',
  '%1B': '\x1b', '%1c': '\x1c', '%1C': '\x1c', '%1d': '\x1d', '%1D': '\x1d',
  '%1e': '\x1e', '%1E': '\x1e', '%1f': '\x1f', '%1F': '\x1f', '%20': '\x20',
  '%21': '\x21', '%22': '\x22', '%23': '\x23', '%24': '\x24', '%25': '\x25',
  '%26': '\x26', '%27': '\x27', '%28': '\x28', '%29': '\x29', '%2a': '\x2a',
  '%2A': '\x2a', '%2b': '\x2b', '%2B': '\x2b', '%2c': '\x2c', '%2C': '\x2c',
  '%2d': '\x2d', '%2D': '\x2d', '%2e': '\x2e', '%2E': '\x2e', '%2f': '\x2f',
  '%2F': '\x2f', '%30': '\x30', '%31': '\x31', '%32': '\x32', '%33': '\x33',
  '%34': '\x34', '%35': '\x35', '%36': '\x36', '%37': '\x37', '%38': '\x38',
  '%39': '\x39', '%3a': '\x3a', '%3A': '\x3a', '%3b': '\x3b', '%3B': '\x3b',
  '%3c': '\x3c', '%3C': '\x3c', '%3d': '\x3d', '%3D': '\x3d', '%3e': '\x3e',
  '%3E': '\x3e', '%3f': '\x3f', '%3F': '\x3f', '%40': '\x40', '%41': '\x41',
  '%42': '\x42', '%43': '\x43', '%44': '\x44', '%45': '\x45', '%46': '\x46',
  '%47': '\x47', '%48': '\x48', '%49': '\x49', '%4a': '\x4a', '%4A': '\x4a',
  '%4b': '\x4b', '%4B': '\x4b', '%4c': '\x4c', '%4C': '\x4c', '%4d': '\x4d',
  '%4D': '\x4d', '%4e': '\x4e', '%4E': '\x4e', '%4f': '\x4f', '%4F': '\x4f',
  '%50': '\x50', '%51': '\x51', '%52': '\x52', '%53': '\x53', '%54': '\x54',
  '%55': '\x55', '%56': '\x56', '%57': '\x57', '%58': '\x58', '%59': '\x59',
  '%5a': '\x5a', '%5A': '\x5a', '%5b': '\x5b', '%5B': '\x5b', '%5c': '\x5c',
  '%5C': '\x5c', '%5d': '\x5d', '%5D': '\x5d', '%5e': '\x5e', '%5E': '\x5e',
  '%5f': '\x5f', '%5F': '\x5f', '%60': '\x60', '%61': '\x61', '%62': '\x62',
  '%63': '\x63', '%64': '\x64', '%65': '\x65', '%66': '\x66', '%67': '\x67',
  '%68': '\x68', '%69': '\x69', '%6a': '\x6a', '%6A': '\x6a', '%6b': '\x6b',
  '%6B': '\x6b', '%6c': '\x6c', '%6C': '\x6c', '%6d': '\x6d', '%6D': '\x6d',
  '%6e': '\x6e', '%6E': '\x6e', '%6f': '\x6f', '%6F': '\x6f', '%70': '\x70',
  '%71': '\x71', '%72': '\x72', '%73': '\x73', '%74': '\x74', '%75': '\x75',
  '%76': '\x76', '%77': '\x77', '%78': '\x78', '%79': '\x79', '%7a': '\x7a',
  '%7A': '\x7a', '%7b': '\x7b', '%7B': '\x7b', '%7c': '\x7c', '%7C': '\x7c',
  '%7d': '\x7d', '%7D': '\x7d', '%7e': '\x7e', '%7E': '\x7e', '%7f': '\x7f',
  '%7F': '\x7f', '%80': '\x80', '%81': '\x81', '%82': '\x82', '%83': '\x83',
  '%84': '\x84', '%85': '\x85', '%86': '\x86', '%87': '\x87', '%88': '\x88',
  '%89': '\x89', '%8a': '\x8a', '%8A': '\x8a', '%8b': '\x8b', '%8B': '\x8b',
  '%8c': '\x8c', '%8C': '\x8c', '%8d': '\x8d', '%8D': '\x8d', '%8e': '\x8e',
  '%8E': '\x8e', '%8f': '\x8f', '%8F': '\x8f', '%90': '\x90', '%91': '\x91',
  '%92': '\x92', '%93': '\x93', '%94': '\x94', '%95': '\x95', '%96': '\x96',
  '%97': '\x97', '%98': '\x98', '%99': '\x99', '%9a': '\x9a', '%9A': '\x9a',
  '%9b': '\x9b', '%9B': '\x9b', '%9c': '\x9c', '%9C': '\x9c', '%9d': '\x9d',
  '%9D': '\x9d', '%9e': '\x9e', '%9E': '\x9e', '%9f': '\x9f', '%9F': '\x9f',
  '%a0': '\xa0', '%A0': '\xa0', '%a1': '\xa1', '%A1': '\xa1', '%a2': '\xa2',
  '%A2': '\xa2', '%a3': '\xa3', '%A3': '\xa3', '%a4': '\xa4', '%A4': '\xa4',
  '%a5': '\xa5', '%A5': '\xa5', '%a6': '\xa6', '%A6': '\xa6', '%a7': '\xa7',
  '%A7': '\xa7', '%a8': '\xa8', '%A8': '\xa8', '%a9': '\xa9', '%A9': '\xa9',
  '%aa': '\xaa', '%Aa': '\xaa', '%aA': '\xaa', '%AA': '\xaa', '%ab': '\xab',
  '%Ab': '\xab', '%aB': '\xab', '%AB': '\xab', '%ac': '\xac', '%Ac': '\xac',
  '%aC': '\xac', '%AC': '\xac', '%ad': '\xad', '%Ad': '\xad', '%aD': '\xad',
  '%AD': '\xad', '%ae': '\xae', '%Ae': '\xae', '%aE': '\xae', '%AE': '\xae',
  '%af': '\xaf', '%Af': '\xaf', '%aF': '\xaf', '%AF': '\xaf', '%b0': '\xb0',
  '%B0': '\xb0', '%b1': '\xb1', '%B1': '\xb1', '%b2': '\xb2', '%B2': '\xb2',
  '%b3': '\xb3', '%B3': '\xb3', '%b4': '\xb4', '%B4': '\xb4', '%b5': '\xb5',
  '%B5': '\xb5', '%b6': '\xb6', '%B6': '\xb6', '%b7': '\xb7', '%B7': '\xb7',
  '%b8': '\xb8', '%B8': '\xb8', '%b9': '\xb9', '%B9': '\xb9', '%ba': '\xba',
  '%Ba': '\xba', '%bA': '\xba', '%BA': '\xba', '%bb': '\xbb', '%Bb': '\xbb',
  '%bB': '\xbb', '%BB': '\xbb', '%bc': '\xbc', '%Bc': '\xbc', '%bC': '\xbc',
  '%BC': '\xbc', '%bd': '\xbd', '%Bd': '\xbd', '%bD': '\xbd', '%BD': '\xbd',
  '%be': '\xbe', '%Be': '\xbe', '%bE': '\xbe', '%BE': '\xbe', '%bf': '\xbf',
  '%Bf': '\xbf', '%bF': '\xbf', '%BF': '\xbf', '%c0': '\xc0', '%C0': '\xc0',
  '%c1': '\xc1', '%C1': '\xc1', '%c2': '\xc2', '%C2': '\xc2', '%c3': '\xc3',
  '%C3': '\xc3', '%c4': '\xc4', '%C4': '\xc4', '%c5': '\xc5', '%C5': '\xc5',
  '%c6': '\xc6', '%C6': '\xc6', '%c7': '\xc7', '%C7': '\xc7', '%c8': '\xc8',
  '%C8': '\xc8', '%c9': '\xc9', '%C9': '\xc9', '%ca': '\xca', '%Ca': '\xca',
  '%cA': '\xca', '%CA': '\xca', '%cb': '\xcb', '%Cb': '\xcb', '%cB': '\xcb',
  '%CB': '\xcb', '%cc': '\xcc', '%Cc': '\xcc', '%cC': '\xcc', '%CC': '\xcc',
  '%cd': '\xcd', '%Cd': '\xcd', '%cD': '\xcd', '%CD': '\xcd', '%ce': '\xce',
  '%Ce': '\xce', '%cE': '\xce', '%CE': '\xce', '%cf': '\xcf', '%Cf': '\xcf',
  '%cF': '\xcf', '%CF': '\xcf', '%d0': '\xd0', '%D0': '\xd0', '%d1': '\xd1',
  '%D1': '\xd1', '%d2': '\xd2', '%D2': '\xd2', '%d3': '\xd3', '%D3': '\xd3',
  '%d4': '\xd4', '%D4': '\xd4', '%d5': '\xd5', '%D5': '\xd5', '%d6': '\xd6',
  '%D6': '\xd6', '%d7': '\xd7', '%D7': '\xd7', '%d8': '\xd8', '%D8': '\xd8',
  '%d9': '\xd9', '%D9': '\xd9', '%da': '\xda', '%Da': '\xda', '%dA': '\xda',
  '%DA': '\xda', '%db': '\xdb', '%Db': '\xdb', '%dB': '\xdb', '%DB': '\xdb',
  '%dc': '\xdc', '%Dc': '\xdc', '%dC': '\xdc', '%DC': '\xdc', '%dd': '\xdd',
  '%Dd': '\xdd', '%dD': '\xdd', '%DD': '\xdd', '%de': '\xde', '%De': '\xde',
  '%dE': '\xde', '%DE': '\xde', '%df': '\xdf', '%Df': '\xdf', '%dF': '\xdf',
  '%DF': '\xdf', '%e0': '\xe0', '%E0': '\xe0', '%e1': '\xe1', '%E1': '\xe1',
  '%e2': '\xe2', '%E2': '\xe2', '%e3': '\xe3', '%E3': '\xe3', '%e4': '\xe4',
  '%E4': '\xe4', '%e5': '\xe5', '%E5': '\xe5', '%e6': '\xe6', '%E6': '\xe6',
  '%e7': '\xe7', '%E7': '\xe7', '%e8': '\xe8', '%E8': '\xe8', '%e9': '\xe9',
  '%E9': '\xe9', '%ea': '\xea', '%Ea': '\xea', '%eA': '\xea', '%EA': '\xea',
  '%eb': '\xeb', '%Eb': '\xeb', '%eB': '\xeb', '%EB': '\xeb', '%ec': '\xec',
  '%Ec': '\xec', '%eC': '\xec', '%EC': '\xec', '%ed': '\xed', '%Ed': '\xed',
  '%eD': '\xed', '%ED': '\xed', '%ee': '\xee', '%Ee': '\xee', '%eE': '\xee',
  '%EE': '\xee', '%ef': '\xef', '%Ef': '\xef', '%eF': '\xef', '%EF': '\xef',
  '%f0': '\xf0', '%F0': '\xf0', '%f1': '\xf1', '%F1': '\xf1', '%f2': '\xf2',
  '%F2': '\xf2', '%f3': '\xf3', '%F3': '\xf3', '%f4': '\xf4', '%F4': '\xf4',
  '%f5': '\xf5', '%F5': '\xf5', '%f6': '\xf6', '%F6': '\xf6', '%f7': '\xf7',
  '%F7': '\xf7', '%f8': '\xf8', '%F8': '\xf8', '%f9': '\xf9', '%F9': '\xf9',
  '%fa': '\xfa', '%Fa': '\xfa', '%fA': '\xfa', '%FA': '\xfa', '%fb': '\xfb',
  '%Fb': '\xfb', '%fB': '\xfb', '%FB': '\xfb', '%fc': '\xfc', '%Fc': '\xfc',
  '%fC': '\xfc', '%FC': '\xfc', '%fd': '\xfd', '%Fd': '\xfd', '%fD': '\xfd',
  '%FD': '\xfd', '%fe': '\xfe', '%Fe': '\xfe', '%fE': '\xfe', '%FE': '\xfe',
  '%ff': '\xff', '%Ff': '\xff', '%fF': '\xff', '%FF': '\xff'
}

function encodedReplacer (match) {
  return EncodedLookup[match]
}

const STATE_KEY = 0
const STATE_VALUE = 1
const STATE_CHARSET = 2
const STATE_LANG = 3

function parseParams (str) {
  const res = []
  let state = STATE_KEY
  let charset = ''
  let inquote = false
  let escaping = false
  let p = 0
  let tmp = ''
  const len = str.length

  for (var i = 0; i < len; ++i) { // eslint-disable-line no-var
    const char = str[i]
    if (char === '\\' && inquote) {
      if (escaping) { escaping = false } else {
        escaping = true
        continue
      }
    } else if (char === '"') {
      if (!escaping) {
        if (inquote) {
          inquote = false
          state = STATE_KEY
        } else { inquote = true }
        continue
      } else { escaping = false }
    } else {
      if (escaping && inquote) { tmp += '\\' }
      escaping = false
      if ((state === STATE_CHARSET || state === STATE_LANG) && char === "'") {
        if (state === STATE_CHARSET) {
          state = STATE_LANG
          charset = tmp.substring(1)
        } else { state = STATE_VALUE }
        tmp = ''
        continue
      } else if (state === STATE_KEY &&
        (char === '*' || char === '=') &&
        res.length) {
        state = char === '*'
          ? STATE_CHARSET
          : STATE_VALUE
        res[p] = [tmp, undefined]
        tmp = ''
        continue
      } else if (!inquote && char === ';') {
        state = STATE_KEY
        if (charset) {
          if (tmp.length) {
            tmp = decodeText(tmp.replace(RE_ENCODED, encodedReplacer),
              'binary',
              charset)
          }
          charset = ''
        } else if (tmp.length) {
          tmp = decodeText(tmp, 'binary', 'utf8')
        }
        if (res[p] === undefined) { res[p] = tmp } else { res[p][1] = tmp }
        tmp = ''
        ++p
        continue
      } else if (!inquote && (char === ' ' || char === '\t')) { continue }
    }
    tmp += char
  }
  if (charset && tmp.length) {
    tmp = decodeText(tmp.replace(RE_ENCODED, encodedReplacer),
      'binary',
      charset)
  } else if (tmp) {
    tmp = decodeText(tmp, 'binary', 'utf8')
  }

  if (res[p] === undefined) {
    if (tmp) { res[p] = tmp }
  } else { res[p][1] = tmp }

  return res
}

module.exports = parseParams


/***/ }),

/***/ 1043:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/**
 * @module LRUCache
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LRUCache = void 0;
const perf = typeof performance === 'object' &&
    performance &&
    typeof performance.now === 'function'
    ? performance
    : Date;
const warned = new Set();
/* c8 ignore start */
const PROCESS = (typeof process === 'object' && !!process ? process : {});
/* c8 ignore start */
const emitWarning = (msg, type, code, fn) => {
    typeof PROCESS.emitWarning === 'function'
        ? PROCESS.emitWarning(msg, type, code, fn)
        : console.error(`[${code}] ${type}: ${msg}`);
};
