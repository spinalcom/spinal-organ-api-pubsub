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

    server.once('error', (err) => resolve(false));

    server.once('listening', () => {
      server.close();
      resolve(true);  // Le port est disponible
    });

    server.listen(port);
  });
}

export async function checkAndFormatIds(socket: Socket, spinalIOMiddleware: ISpinalIOMiddleware, nodeIds: (IdTypes | INodeId)[], options: ISubscribeOptions): Promise<{ ids: INodeData[]; obj: { [key: string]: INodeData } }> {
  const idsFormatted = _structureDataFunc(nodeIds, options);
  const nodes = await _getNodes(socket, spinalIOMiddleware, idsFormatted);
  return _removeDuplicate(nodes);
}

export function getRoomNameFunc(nodeId: IdTypes, contextId: IdTypes, obj: { [key: string]: INodeData }, options: ISubscribeOptions): IGetNodeRes {

  const { node, contextNode: context, error: _error } = obj[nodeId];

  let error = _error || _checkError({ nodeId, contextId }, node, context, options);
  if (error) return { error, nodeId, status: NOK_STATUS };

  let roomId = node.getId().get();

  return { error, nodeId, status: OK_STATUS, eventNames: [roomId], options };
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
    const res = {
      subscription_data: { nodeId, contextId },
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

function _formatId(id: IdTypes | INodeId): INodeId {
  let node: INodeId = { nodeId: undefined, contextId: undefined };
  if (typeof id === 'string') {
    const ids = id.split('/');

    node.nodeId = ids.length <= 1 ? ids[0] : ids[1];
    node.contextId = ids.length <= 1 ? undefined : ids[0];
  } else if (typeof id === 'number') {
    node.nodeId = id as any;
  } else if (typeof id === 'object') {
    node = id;
  }

  return node;
}

function _getOptions(id: IdTypes | INodeId): ISubscribeOptions {
  if (typeof id === 'string' || typeof id === 'number') return;
  if (id.options) return id.options;
}

function _removeDuplicate(nodes: INodeData[]): { ids: INodeData[]; obj: { [key: string]: INodeData } } {
  const obj = {};

  const data = nodes.reduce((res: { [key: string]: INodeData }, item: INodeData) => {
    const { node, contextNode, options, nodeId } = item;
    const id = `${node?._server_id}_${contextNode?._server_id}_${options.subscribeChildScope}_${options.subscribeChildren}`

    if (!res[id]) {
      obj[nodeId] = item;
      res[id] = item;
    }

    return res;
  }, {});

  const ids = Object.values(data);
  return { obj, ids: Array.from(ids) };
}


function _checkError(ids: { nodeId?: IdTypes; contextId?: IdTypes }, node: SpinalNode, context: SpinalContext, options: ISubscribeOptions) {

  if (!node || !(node instanceof SpinalNode)) {
    return !node ? `${ids.nodeId} is not found` : `${ids.nodeId} must be a spinalNode, SpinalContext`;
  }

  if (!context || !(context instanceof SpinalContext)) {
    return !context ? `the context ${ids.contextId} is not found` : `${ids.contextId} must be a SpinalContext`;
  }

  if (options.subscribeChildren && [IScope.in_context, IScope.tree_in_context].includes(options.subscribeChildScope))
    return _checkContextError(ids.contextId, context);
}

function _checkContextError(contextId: IdTypes, context: SpinalContext) {
  if (context instanceof SpinalContext) return;

  let error, subString;

  if (!contextId) subString = `you did not specify the context id`;
  else subString = `${contextId} is not a valid context id`;

  error = `You try to subscribe some data in context but, ${subString}`;

  return error;
}