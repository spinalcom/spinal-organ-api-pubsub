import { SpinalNode } from "spinal-model-graph";
export declare function _getAttributes(node: SpinalNode): Promise<{
    [key: string]: string | number | boolean;
}>;
export declare function getAndFormatTicketAttributes(attributes: {
    [key: string]: any;
}): Record<string, any>;
export declare function isTicketNode(type: string): boolean;
