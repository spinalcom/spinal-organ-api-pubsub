import { ISubscribeOptions, INodeId, IGetNodeRes, INodeData, ISpinalIOMiddleware } from "../interfaces";
import { SpinalNode } from "spinal-model-graph";
import { Socket } from "socket.io";
import { IdTypes, UpdateDataType } from "../types";
export declare function getPortValid(port?: number): Promise<number>;
export declare function checkAndFormatIds(socket: Socket, spinalIOMiddleware: ISpinalIOMiddleware, nodeIds: (IdTypes | INodeId)[], options: ISubscribeOptions): Promise<INodeData[]>;
export declare function checkAndFormatNodeData(nodeData: INodeData): IGetNodeRes;
export declare function _formatNode(node: SpinalNode, model?: UpdateDataType): Promise<any>;
