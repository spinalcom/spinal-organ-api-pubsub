export interface IConnectionInfo {
    userId: string | number;
    password: string;
    protocol: string;
    port: string | number;
    host: string;
    digitalTwinPath: string;
}
