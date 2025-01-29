import { Process } from "spinal-core-connectorjs";
import { ISubscribeOptions } from "../interfaces";
export type IdTypes = string | number;
export type BindDataType = {
    server_id: number;
    context_id: number;
    bindProcesses: Process[];
    eventName: string;
    options: ISubscribeOptions;
};
export type UpdateDataType = {
    dynamicId?: number;
    info: {
        [key: string]: any;
    };
    element: {
        [key: string]: any;
    };
};
