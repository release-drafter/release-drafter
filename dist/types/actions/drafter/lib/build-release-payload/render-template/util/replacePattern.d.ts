export declare class ReplacePattern {
    static fromStaticValue(value: string): ReplacePattern;
    private readonly _state;
    get hasReplacementPatterns(): boolean;
    constructor(pieces: ReplacePiece[] | null);
    buildReplaceString(matches: string[] | null, preserveCase?: boolean): string;
    private static _substitute;
}
/**
 * A replace piece can either be a static string or an index to a specific match.
 */
export declare class ReplacePiece {
    static staticValue(value: string): ReplacePiece;
    static matchIndex(index: number): ReplacePiece;
    static caseOps(index: number, caseOps: string[]): ReplacePiece;
    readonly staticValue: string | null;
    readonly matchIndex: number;
    readonly caseOps: string[] | null;
    private constructor();
}
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
export declare function parseReplaceString(replaceString: string): ReplacePattern;
