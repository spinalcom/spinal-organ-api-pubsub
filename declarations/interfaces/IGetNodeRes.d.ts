import { SpinalNode } from "spinal-model-graph";
import { ISubscribeOptions } from "./ISubscribeOptions";
export interface IGetNodeRes {
    node?: SpinalNode<any>;
    status: string;
    eventNames?: string[];
    nodeId: string | number;
    error: string;
    options?: ISubscribeOptions;
}
