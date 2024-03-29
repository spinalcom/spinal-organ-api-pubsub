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

import {
  ISubscribeOptions,
  INodeId,
  IGetNodeRes,
  IScope,
  INodeData,
  ISpinalIOMiddleware,
} from '../interfaces';
import {OK_STATUS, NOK_STATUS} from '../constants';
import {SpinalContext, SpinalNode} from 'spinal-model-graph';
import * as lodash from 'lodash';
import {Socket} from 'socket.io';

export async function checkAndFormatIds(
  socket: Socket,
  spinalIOMiddleware: ISpinalIOMiddleware,
  nodeIds: (string | number | INodeId)[],
  options: ISubscribeOptions
): Promise<{ids: INodeData[]; obj: {[key: string]: INodeData}}> {
  const idsFormatted = _structureDataFunc(nodeIds, options);
  const nodes = await _getNodes(socket, spinalIOMiddleware, idsFormatted);
  return _removeDuplicate(nodes);
}

export function getRoomNameFunc(
  nodeId: string | number,
  contextId: string | number,
  obj: {[key: string]: INodeData},
  options: ISubscribeOptions
): IGetNodeRes {
  const node = obj[nodeId]?.node;
  const context = obj[nodeId]?.contextNode;
  let error = obj[nodeId].error;

  if (error) {
    return {error, nodeId, status: NOK_STATUS};
  }

  if (!node || !(node instanceof SpinalNode)) {
    error = !node
      ? `${nodeId} is not found`
      : `${nodeId} must be a spinalNode, SpinalContext`;
    // error = new Error(message);
    return {error, nodeId, status: NOK_STATUS};
  }

  if (!context || !(context instanceof SpinalContext)) {
    error = !context
      ? `the context ${contextId} is not found`
      : `${contextId} must be a SpinalContext`;
    // error = new Error(message);
    return {error, nodeId, status: NOK_STATUS};
  }

  let roomId = node.getId().get();
  let eventNames = [roomId];

  if (
    options.subscribeChildren &&
    [IScope.in_context, IScope.tree_in_context].indexOf(
      options.subscribeChildScope
    ) !== -1
  ) {
    if (!context || !(context instanceof SpinalContext)) {
      let contextError;
      if (!contextId) contextError = `you did not specify the context id`;
      else contextError = `${contextId} is not a valid context id`;

      error = `You try to subscribe somme data in context but, ${contextError}`;

      return {error, nodeId, status: NOK_STATUS};
    }
    const namespaceId = context.getId().get();
    eventNames.push(`${namespaceId}:${roomId}`);
  }

  return {
    error,
    nodeId,
    status: OK_STATUS,
    eventNames,
    options,
  };
}

export async function _formatNode(
  node: SpinalNode<any>,
  model?: {info: {[key: string]: any}; element: {[key: string]: any}}
): Promise<any> {
  if (model) {
    return {
      info: model.info,
      element: model.element,
    };
  }
  const info = node.info;
  const element = await node.getElement(true);
  return {info: info.get(), element: element && element.get()};
}

/////////////////////////////////////////////////////////
//                  PRIVATES                           //
/////////////////////////////////////////////////////////

function _structureDataFunc(
  ids: (string | number | INodeId)[],
  options: ISubscribeOptions
): INodeId[] {
  ids = lodash.flattenDeep(ids);

  // let options = args[args.length - 1];

  // options = typeof options === "object" ? options : {};

  return ids.map((id) => ({
    ..._formatId(id),
    options: _getOptions(id) || options,
  }));
}

function _getNodes(
  socket: Socket,
  spinalMiddleware: ISpinalIOMiddleware,
  ids: INodeId[]
): Promise<INodeData[]> {
  // const obj = {};

  const promises = ids.map(async ({nodeId, contextId, options}) => {
    const res = {
      subscription_data: {nodeId, contextId},
      nodeId,
      contextId,
      node: undefined,
      contextNode: undefined,
      options,
      error: undefined,
    };

    try {
      res.contextNode = await spinalMiddleware.getContext(contextId, socket);
      res.node = await spinalMiddleware.getNode(nodeId, contextId, socket);
    } catch (error) {
      res.error = error.message;
    }

    return res;
  });

  return Promise.all(promises);
}

function _formatId(id: number | string | INodeId): INodeId {
  let node: INodeId = {nodeId: undefined, contextId: undefined};
  if (typeof id === 'string') {
    const ids = id.split('/');

    node.nodeId = ids.length <= 1 ? ids[0] : ids[1];
    node.contextId = ids.length <= 1 ? undefined : ids[0];
  } else if (typeof id === 'number') {
    node.nodeId = <any>id;
  } else if (typeof id === 'object') {
    node = id;
  }

  return node;
}

function _getOptions(id: string | number | INodeId): ISubscribeOptions {
  if (typeof id === 'string' || typeof id === 'number') return;
  if (id.options) return id.options;
}

function _removeDuplicate(nodes: INodeData[]): {
  ids: INodeData[];
  obj: {[key: string]: INodeData};
} {
  // const idsToSave = [];
  const obj = {};

  const data = nodes.reduce((arr, item) => {
    const found = arr.find(({node, contextNode, options}) => {
      return (
        node?._server_id === item.node?._server_id &&
        contextNode?._server_id === item.contextNode?._server_id &&
        options.subscribeChildScope === item.options.subscribeChildScope &&
        options.subscribeChildren === item.options.subscribeChildren
      );
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

  return {obj, ids: data};
}

// function _getNodeToSave(nodes: INodeData[]): INodeId[] {

//     return nodes.reduce((arr,item) => {

//     },[])
// }
