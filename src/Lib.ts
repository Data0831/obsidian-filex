export const ROOT_FOLDER_PATH = "/";

export const Debug = {
    log: (...args: any[]) => {
        console.log(...args);
    }
};

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return function (this: any, ...args: Parameters<T>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
