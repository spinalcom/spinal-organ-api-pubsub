import { SpinalNode } from 'spinal-model-graph';
import { ISubscribeOptions } from './ISubscribeOptions';
import { INodeId } from './INodeIds';
export interface IGetNodeRes {
    node?: SpinalNode;
    status: string;
    eventNames?: string[];
    nodeId: string | number;
    error: string;
    options?: ISubscribeOptions;
    subscription_data?: INodeId;
}
