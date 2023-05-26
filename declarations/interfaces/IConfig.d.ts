export interface IConfig {
    spinalConnector: {
        protocol: string;
        user: string;
        password: string;
        host: string;
        port: number | string;
    };
    api: {
        port: number | string;
    };
    file: {
        path: string;
    };
}
