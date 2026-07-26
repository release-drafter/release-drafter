export type Logger = {
    debug: (message: string) => void;
    error: (message: string | Error) => void;
    info: (message: string) => void;
    warning: (message: string | Error) => void;
};
export declare const noopLogger: Logger;
