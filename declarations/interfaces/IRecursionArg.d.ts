import { SpinalNode, SpinalContext } from 'spinal-env-viewer-graph-service';
import { INodeId, ISubscribeOptions } from '../';
import { Socket } from 'socket.io';
export interface IRecursionArg {
    node: SpinalNode<any>;
    context: SpinalContext<any>;
    options: ISubscribeOptions;
    eventName?: string;
    socket?: Socket;
    subscription_data?: INodeId;
}
