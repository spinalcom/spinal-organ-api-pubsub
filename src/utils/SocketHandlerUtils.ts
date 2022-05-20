/*
 * Copyright 2022 SpinalCom - www.spinalcom.com
 * 
 * This file is part of SpinalCore.
 * 
 * Please read all of the following terms and conditions
 * of the Free Software license Agreement ("Agreement")
 * carefully.
 * 
 * This Agreement is a legally binding contract between
 * the Licensee (as defined below) and SpinalCom that
 * sets forth the terms and conditions that govern your
 * use of the Program. By installing and/or using the
 * Program, you agree to abide by all the terms and
 * conditions stated or referenced herein.
 * 
 * If you do not agree to abide by these terms and
 * conditions, do not demonstrate your acceptance and do
 * not install or use the Program.
 * You should have received a copy of the license along
 * with this file. If not, see
 * <http://resources.spinalcom.com/licenses.pdf>.
 */

import { ISubscribeOptions, INodeId, OK_STATUS, NOK_STATUS, IGetNodeRes, IScope, INodeData } from "../lib";
import { SpinalContext, SpinalNode } from "spinal-model-graph";
import { spinalGraphUtils } from "./graphUtils";
import * as lodash from "lodash";


export async function checkAndFormatIds(nodeIds: (string | number | INodeId)[], options: ISubscribeOptions): Promise<{ ids: INodeData[], obj: { [key: string]: INodeData } }> {
    const idsFormatted = _structureDataFunc(nodeIds, options);
    const nodes = await _getNodes(idsFormatted);
    return _removeDuplicate(nodes);
}

export function getRoomNameFunc(nodeId: string | number, contextId: string | number, obj: { [key: string]: INodeData }, options: ISubscribeOptions): IGetNodeRes {
    const node = obj[nodeId]?.node;
    const context = obj[nodeId]?.contextNode;

    let error = null;

    if (!node || !(node instanceof SpinalNode)) {
        error = !node ? `${nodeId} is not found` : `${nodeId} must be a spinalNode, SpinalContext`;
        // error = new Error(message);
        return { error, nodeId, status: NOK_STATUS };
    }

    if (!context || !(context instanceof SpinalContext)) {
        error = !context ? `the context ${contextId} is not found` : `${contextId} must be a SpinalContext`;
        // error = new Error(message);
        return { error, nodeId, status: NOK_STATUS };
    }

    let roomId = node.getId().get();
    let eventNames = [roomId];

    if (options.subscribeChildren && [IScope.in_context, IScope.tree_in_context].indexOf(options.subscribeChildScope) !== -1) {
        if (!context || !(context instanceof SpinalContext)) {
            let contextError;
            if (!contextId) contextError = `you did not specify the context id`;
            else contextError = `${contextId} is not a valid context id`;

            error = `You try to subscribe somme data in context but, ${contextError}`;

            return { error, nodeId, status: NOK_STATUS };
        }
        const namespaceId = context.getId().get();
        eventNames.push(`${namespaceId}:${roomId}`)
    }


    return { error, nodeId, status: OK_STATUS, eventNames, options };
}


/////////////////////////////////////////////////////////
//                  PRIVATES                           //
/////////////////////////////////////////////////////////

function _structureDataFunc(ids: (string | number | INodeId)[], options: ISubscribeOptions): INodeId[] {

    ids = lodash.flattenDeep(ids);

    // let options = args[args.length - 1];

    // options = typeof options === "object" ? options : {};


    return ids.map(id => ({ ..._formatId(id), options: _getOptions(id) || options }));

}

function _getNodes(ids: INodeId[]): Promise<INodeData[]> {
    // const obj = {};

    const promises = ids.map(async ({ nodeId, contextId, options }) => {
        let context;
        if (contextId) context = await spinalGraphUtils.getNode(contextId, contextId);
        let tempContextId = context && context instanceof SpinalContext ? contextId : undefined;
        const node = await spinalGraphUtils.getNode(nodeId, tempContextId);
        return {
            nodeId,
            contextId,
            node,
            contextNode: context,
            options
        }
        // obj[nodeId] = {
        //     nodeId,
        //     contextId,
        //     node,
        //     contextNode: context,
        //     options
        // }
    });

    return Promise.all(promises);
    // return Promise.all(promises).then((result) => {
    //     return obj;
    // })
}


function _formatId(id: number | string | INodeId): INodeId {
    let node: INodeId = { nodeId: undefined, contextId: undefined }
    if (typeof id === "string") {
        const ids = id.split("/");

        node.nodeId = ids.length <= 1 ? ids[0] : ids[1];
        node.contextId = ids.length <= 1 ? undefined : ids[0];
    } else if (typeof id === "number") {
        node.nodeId = <any>id;
    } else if (typeof id === "object") {
        node = id;
    }

    return node;

}

function _getOptions(id: string | number | INodeId): ISubscribeOptions {
    if (typeof id === "string" || typeof id === "number") return;
    if (id.options) return id.options;
}

function _removeDuplicate(nodes: INodeData[]): { ids: INodeData[], obj: { [key: string]: INodeData } } {
    // const idsToSave = [];
    const obj = {};

    const data = nodes.reduce((arr, item) => {
        const found = arr.find(({ node, contextNode, options }) => {
            return node._server_id === item.node?._server_id &&
                contextNode._server_id === item.contextNode?._server_id &&
                options.subscribeChildScope === item.options.subscribeChildScope &&
                options.subscribeChildren === item.options.subscribeChildren
        });

        if (!found) {
            obj[item.nodeId] = item;

            // if (item.node && item.contextNode) {
            //     idsToSave.push({
            //         nodeId: item.node.getId().get(),
            //         contextId: item.contextNode.getId().get(),
            //         options: item.options
            //     })
            // }
            return arr.concat([item]);
        }
        return arr;
    }, []);

    return { obj, ids: data };
}

// function _getNodeToSave(nodes: INodeData[]): INodeId[] {

//     return nodes.reduce((arr,item) => {

//     },[])
// }