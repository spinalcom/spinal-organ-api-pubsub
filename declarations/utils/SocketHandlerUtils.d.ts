import { ISubscribeOptions, INodeId, IGetNodeRes, INodeData, ISpinalIOMiddleware } from '../interfaces';
import { SpinalNode } from 'spinal-model-graph';
import { Socket } from 'socket.io';
export declare function checkAndFormatIds(socket: Socket, spinalIOMiddleware: ISpinalIOMiddleware, nodeIds: (string | number | INodeId)[], options: ISubscribeOptions): Promise<{
    ids: INodeData[];
    obj: {
        [key: string]: INodeData;
    };
}>;
export declare function getRoomNameFunc(nodeId: string | number, contextId: string | number, obj: {
    [key: string]: INodeData;
}, options: ISubscribeOptions): IGetNodeRes;
export declare function _formatNode(node: SpinalNode<any>, model?: {
    info: {
        [key: string]: any;
    };
    element: {
        [key: string]: any;
    };
}): Promise<any>;
