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

import { ISubscribeOptions, INodeId, IGetNodeRes, IScope, INodeData, ISpinalIOMiddleware } from '../interfaces';
import { OK_STATUS, NOK_STATUS } from '../constants';
import { SpinalContext, SpinalNode } from 'spinal-model-graph';
import * as lodash from 'lodash';
import { Socket } from 'socket.io';
import { IdTypes, UpdateDataType } from "../types";

const net = require('net');

export async function getPortValid(port: number = 1): Promise<number> {
  let validPort = port;
  let success = false;

  do {
    success = await checkPortAvailability(validPort);
    if (!success) {
      validPort++;
    }
  } while (!success);

  return validPort;
}

function checkPortAvailability(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));

    server.once('listening', () => {
      server.close();
      resolve(true);  // Le port est disponible
    });

    server.listen(port);
  });
}

export async function checkAndFormatIds(socket: Socket, spinalIOMiddleware: ISpinalIOMiddleware, nodeIds: (IdTypes | INodeId)[], options: ISubscribeOptions): Promise<INodeData[]> {
  const idsFormatted = _structureDataFunc(nodeIds, options);
  const nodes = await _getNodes(socket, spinalIOMiddleware, idsFormatted);
  return _removeDuplicate(nodes);
}

export function checkAndFormatNodeData(nodeData: INodeData): IGetNodeRes {

  const { node, contextNode, error: _error, nodeId, contextId, options } = nodeData;

  if (!node) return { error: _error || `the node ${nodeId} is not found`, nodeId, status: NOK_STATUS, node, contextNode };

  let error = _error || _checkError({ nodeId, contextId }, node, contextNode, options);
  if (error) return { error, nodeId, status: NOK_STATUS, node, contextNode };

  let roomId = node.getId().get();

  return { error: error || "", nodeId, status: OK_STATUS, eventNames: [roomId], options, node, contextNode };
}

export async function _formatNode(node: SpinalNode, model?: UpdateDataType): Promise<any> {
  if (model) {
    return {
      dynamicId: model?.dynamicId || node._server_id,
      info: model.info,
      element: model.element,
    };
  }

  const info = node.info;
  const element = await node.getElement(true);
  return { dynamicId: node._server_id, info: info.get(), element: element && element.get() };
}

/////////////////////////////////////////////////////////
//                  PRIVATES                           //
/////////////////////////////////////////////////////////

function _structureDataFunc(ids: (IdTypes | INodeId)[], options: ISubscribeOptions): INodeId[] {
  ids = lodash.flattenDeep(ids);

  return ids.map((id) => ({
    ..._formatId(id),
    options: _getOptions(id) || options,
  }));
}

function _getNodes(socket: Socket, spinalMiddleware: ISpinalIOMiddleware, ids: INodeId[]): Promise<INodeData[]> {

  const promises = ids.map(async ({ nodeId, contextId, options }) => {
    const res: INodeData = {
      subscription_data: { nodeId, contextId },
      nodeId,
      contextId,
      node: undefined,
      contextNode: undefined,
      options,
      error: undefined,
    };

    try {
      res.contextNode = await spinalMiddleware.getContext(contextId as string, socket);
      res.node = await spinalMiddleware.getNode(nodeId as string, contextId as string, socket);
    } catch (error) {
      res.error = (error as Error).message;
    }

    return res;
  });

  return Promise.all(promises);
}

function _formatId(id: IdTypes | INodeId): INodeId {
  let node: INodeId = { nodeId: "", contextId: undefined };

  if (typeof id === 'string') {
    const [contextId, nodeId] = id.split('/');

    if (contextId && nodeId) {
      node.nodeId = nodeId;
      node.contextId = contextId;

    } else if (contextId && !nodeId) {
      node.nodeId = contextId;
    }

  } else if (typeof id === 'number') {
    node.nodeId = id as any;
  } else if (typeof id === 'object') {
    node = id;
  }

  return node;
}

function _getOptions(id: IdTypes | INodeId): ISubscribeOptions {
  if (typeof id === 'string' || typeof id === 'number') return { subscribeChildren: false };
  if (id.options) return id.options;

  return { subscribeChildren: false };
}

function _removeDuplicate(nodes: INodeData[]): INodeData[] {
  const obj: { [key: string]: INodeData } = {};

  for (const item of nodes) {
    const { node, contextNode, options, nodeId } = item;
    const id = _getKey(node!, contextNode, options!);
    obj[id] = item;
  }

  return Array.from(Object.values(obj));
}

function _getKey(node: SpinalNode, context: SpinalContext | undefined, options: ISubscribeOptions): string {

  // join all values with underscore to create a unique key for the subscription 
  //(don't remove undefined or null values because they are important to differentiate between different subscriptions)
  return `${node?._server_id}_${context?._server_id}_${options?.subscribeChildScope}_${options?.subscribeChildren}`;

  // // remove undefined and null values and join with underscore
  // const ids = [node?._server_id, context?._server_id, options?.subscribeChildScope, options?.subscribeChildren];
  // return ids.filter(id => id !== undefined && id !== null).join('_');
}


function _checkError(ids: { nodeId?: IdTypes; contextId?: IdTypes }, node?: SpinalNode, context?: SpinalContext, options?: ISubscribeOptions) {

  if (!node || !(node instanceof SpinalNode)) {
    return !node ? `${ids.nodeId} is not found` : `${ids.nodeId} must be a spinalNode, SpinalContext`;
  }

  // if the subscription is for children in context, we need to check if the context is valid
  if (options?.subscribeChildScope && [IScope.in_context, IScope.tree_in_context].includes(options.subscribeChildScope)) {
    const contextError = _checkContextError(ids.contextId, context!);
    if (contextError) return contextError;
  }


  // if(options?.subscribeChildren && options?.)

  // if (options?.subscribeChildren && options?.subscribeChildScope !== undefined && [IScope.in_context, IScope.tree_in_context].includes(options.subscribeChildScope))
  //   return _checkContextError(ids.contextId, context);
}

function _checkContextError(contextId: IdTypes | undefined, context: SpinalContext) {
  if (context instanceof SpinalContext) return;

  let error, subString;

  if (!contextId) subString = `you did not specify the context id`;
  else subString = `${contextId} is no node found for context id`;

  error = `You try to subscribe some data in context but, ${subString}`;

  return error;
}