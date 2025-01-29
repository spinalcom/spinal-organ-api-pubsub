import { SpinalContext, SpinalNode } from 'spinal-model-graph';
import { ISubscribeOptions } from './ISubscribeOptions';
export interface INodeId {
    nodeId: string;
    contextId?: string;
    options?: ISubscribeOptions;
}
export interface INodeData {
    nodeId: string | number;
    contextId?: string | number;
    options?: ISubscribeOptions;
    node?: SpinalNode;
    contextNode?: SpinalContext<any>;
    subscription_data?: INodeId;
    error?: string;
}
