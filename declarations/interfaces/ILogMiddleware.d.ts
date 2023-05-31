export interface ILogMiddleware {
    createLog: (type: string, action: string, targetInfo?: {
        id: string;
        name: string;
    }, nodeInfo?: {
        id: string;
        name: string;
        [key: string]: string;
    }) => void | Promise<void>;
}
