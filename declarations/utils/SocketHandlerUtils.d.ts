import { ISubscribeOptions, INodeId, IGetNodeRes, INodeData } from "../lib";
export declare function checkAndFormatIds(nodeIds: (string | number | INodeId)[], options: ISubscribeOptions): Promise<{
    ids: INodeData[];
    obj: {
        [key: string]: INodeData;
    };
}>;
export declare function getRoomNameFunc(nodeId: string | number, contextId: string | number, obj: {
    [key: string]: INodeData;
}, options: ISubscribeOptions): IGetNodeRes;
