/*
 * Copyright 2023 SpinalCom - www.spinalcom.com
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

/*
 * Copyright 2021 SpinalCom - www.spinalcom.com
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
import { spinalEventEmitter } from 'spinal-env-viewer-plugin-event-emitter';
import {
  ADD_CHILD_EVENT,
  ADD_CHILD_IN_CONTEXT_EVENT,
  REMOVE_CHILD_EVENT,
  REMOVE_CHILDREN_EVENT,
} from 'spinal-model-graph';
import {
  SpinalGraphService,
  SpinalNode,
  SpinalContext,
  SpinalGraph,
} from 'spinal-env-viewer-graph-service';
import { SpinalTimeSeries } from 'spinal-model-timeseries';
import { INodeId, IScope, ISubscribeOptions } from '../interfaces';
import { EVENT_NAMES, OK_STATUS, SUBSCRIBED } from '../constants';
import { FileSystem, BindProcess, Process } from 'spinal-core-connectorjs';
import * as lodash from 'lodash';
import SocketHandler from '../socket/socketHandlers';
import { IRecursionArg } from '../interfaces';
import { BindDataType } from '../types';


const relationToExclude = [SpinalTimeSeries.relationName];

class SpinalGraphUtils {
  public spinalConnection: spinal.FileSystem;
  private nodeBinded: Map<string, { [event: string]: BindDataType }> = new Map();

  private static instance: SpinalGraphUtils;
  private socketHandler: SocketHandler;

  private constructor() {
    this._listenAddChildEvent();
    this._listenAddChildInContextEvent();
    this._listenRemoveChildEvent();
    this._listenAddChildrenEvent();
  }

  public static getInstance() {
    if (!this.instance) this.instance = new SpinalGraphUtils();
    return this.instance;
  }

  public async init(socketHandler: SocketHandler) {
    this.socketHandler = socketHandler;
  }

  public async bindNode(data: IRecursionArg): Promise<void> {
    try {
      // const _eventName = data.eventName || data.node.getId().get();
      const _eventName = data.node.getId().get();

      // save session data to the database
      // const sessionId = this.socketHandler._getSessionId(data.socket);
      // await this.socketHandler.saveSubscriptionData(sessionId, data.eventName, data.subscription_data);
      // await this.socketHandler.saveSubscriptionData(sessionId, _eventName, data.subscription_data);
      // end save session data

      if (data.socket && _eventName) {
        // const subscription_data =
        // data.socket.join(_eventName);
        this.socketHandler._joinRoom(data.socket, data.subscription_data, [_eventName]);
        data.socket.emit(SUBSCRIBED, { error: null, eventNames: [_eventName], options: data.options, status: OK_STATUS });
      }

      // await this._bindInfoAndElement(data.node, data.context, _eventName, data.options, data.socket);
      await this._bindInfoAndElement(data.node, data.context, _eventName, data.options);
    } catch (error) {
      const err_message = error.message;
      console.error(err_message);
    }
  }


  public async bindNodeChildren(data: IRecursionArg): Promise<void> {
    try {

      await this.bindNode(data);

      switch (data.options.subscribeChildScope) {
        case IScope.in_context:
          await this._browseChildInContext(data);
          break;
        case IScope.tree_in_context:
          await this.browseContextTree(data);
          break;
        case IScope.not_in_context:
          await this.browseChildNotInContext(data);
          break;
        case IScope.all:
          await this._browseAllChild(data);
          break;
        case IScope.tree_not_in_context:
          await this.browseTreeNotInContext(data);
          break;
      }

    } catch (error) {
      const err_message = error.message;
      console.error(err_message);
    }
  }

  public browseContextTree(data: IRecursionArg): void {
    // const eventName = `${data.context.getId().get()}:${data.node
    //   .getId()
    //   .get()}`;
    data.node.findInContext(data.context, (node) => {
      this._activeEventSender(node);
      const _data = { node, context: data.context, options: {}, socket: data.socket, subscription_data: data.subscription_data };
      this.bindNodeChildren(_data);
      return false;
    });
  }

  public async browseChildNotInContext(data: IRecursionArg): Promise<void> {
    this._activeEventSender(data.node);
    const eventName = data.node.getId().get();
    const relations = this._getRelationNameNotInContext(data.node);
    const relationFiltered = relations.filter((el) => relationToExclude.indexOf(el) !== -1)
    const children = await data.node.getChildren(relationFiltered);

    this._bindNodeChildrenLoop(children, eventName, data);

    // children.forEach((child) => {
    //   const childData = {
    //     node: child,
    //     context: null,
    //     options: {},
    //     eventName,
    //     socket: data.socket,
    //     subscription_data: data.subscription_data,
    //   };
    //   this.bindNodeChildren(childData, callback);
    // });
  }

  public async browseTreeNotInContext(data: IRecursionArg) {
    const nodes = await this._getTreeNotInContext(data.node);
    const temp = Object.assign({ context: null }, data);

    for (const n of nodes) {
      const eventName = n.getId().get();
      // const childData = {
      //   node: n,
      //   context: null,
      //   options: {},
      //   eventName,
      //   socket: data.socket,
      //   subscription_data: data.subscription_data,
      // };
      // this.bindNodeChildren(childData, callback);
      this._bindNodeChildrenLoop([n], eventName, temp);
    }
  }

  private async _browseAllChild(data: IRecursionArg): Promise<void> {
    this._activeEventSender(data.node);
    const eventName = data.node.getId().get();
    const relationNames = this._getRelationNames(data.node);
    const children = await data.node.getChildren(relationNames.filter((el) => relationToExclude.indexOf(el) !== -1));

    const temp = Object.assign({ context: null }, data);

    this._bindNodeChildrenLoop(children, eventName, temp);
  }

  private async _browseChildInContext(data: IRecursionArg): Promise<void> {
    this._activeEventSender(data.node);
    // const eventName = `${data.context.getId().get()}:${data.node.getId().get()}`;
    const eventName = data.node.getId().get();
    const children = await data.node.getChildrenInContext(data.context);

    this._bindNodeChildrenLoop(children, eventName, data);
  }




  public async rebindAllNodes() {
    this._unbindAllNodes();
    const idsIter = this.nodeBinded.keys();
    let item = idsIter.next();
    for (; !item.done; item = idsIter.next()) {
      await this._rebindNode(item.value);
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  //                                      PRIVATE                                                          //
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  private _bindNodeChildrenLoop(children: SpinalNode[], eventName: string, data: IRecursionArg) {
    for (const child of children) {
      const childData = {
        node: child,
        context: data.context,
        options: {},
        eventName,
        socket: data.socket,
        subscription_data: data.subscription_data,
      };

      this.bindNodeChildren(childData);
    }
  }


  private async _getTreeNotInContext(start: SpinalNode): Promise<SpinalNode[]> {
    const nodes = [];
    let queue = [start];

    while (queue.length > 0) {
      const node = queue.pop();
      nodes.push(node);
      const relations = this._getRelationNameNotInContext(node);
      const children = await node.getChildren(
        relations.filter((el) => relationToExclude.indexOf(el) !== -1)
      );

      queue = queue.concat(children);
    }

    return nodes;
  }

  private async _rebindNode(nodeId: string) {
    const data = this.nodeBinded.get(nodeId);
    if (!data) return;

    for (const event in data) {
      if (Object.prototype.hasOwnProperty.call(data, event)) {
        const { server_id, context_id, eventName, options } = data[event];

        const node: any = FileSystem._objects[server_id];
        const context: any = context_id && FileSystem._objects[context_id];

        if (node) await this.bindNode({ node, context, options, eventName });
      }
    }
  }

  private _getRelationNameNotInContext(node: SpinalNode): string[] {
    const relationKeys = node.children.keys();
    const t = relationKeys.map((key) => {
      const relationsMap = node.children[key];
      const relationNames = relationsMap.keys();
      return relationNames.filter((relationName) => {
        const contextIds = relationsMap[relationName].contextIds.keys();
        return !contextIds || contextIds.length === 0;
      });
    });

    return lodash.flattenDeep(t);
  }

  private _getRelationNames(node: SpinalNode) {
    const relationKeys = node.children.keys();
    const t = relationKeys.map((key) => {
      const relationsMap = node.children[key];
      return relationsMap.keys();
    });

    return lodash.flattenDeep(t);
  }

  private async _bindInfoAndElement(node: SpinalNode, context: SpinalContext, eventName: string, options: ISubscribeOptions = {}) {
    const nodeId = node.getId().get();
    let info = node.info;
    let element = await node.getElement(true);


    // callback to send the socket event
    const callbackDebounce = lodash.debounce(async () => {
      console.log(`[${info.name.get()}] change has been detected in spinalCore`);
      await this.socketHandler.sendSocketEvent(node, { dynamicId: node._server_id, info: info.get(), element: element?.get(), }, eventName);
    }, 1000);

    const _temp = this.nodeBinded.get(nodeId);

    // check if the node is already binded
    if (_temp && _temp[eventName]?.bindProcesses?.length > 0) {
      callbackDebounce();
      return;
    }


    // bind info and element
    let infoProcess = info.bind(callbackDebounce, true);
    const processes = [infoProcess];

    if (element) {
      const elementProcess = element.bind(callbackDebounce, true);
      processes.push(elementProcess);
    }

    this._addNodeToBindedNode(node, context, eventName, options, processes);
  }

  private _addNodeToBindedNode(node: SpinalNode, context: SpinalContext, eventName: string, options: ISubscribeOptions, processes: Process[]) {
    const nodeId = node.getId().get();

    let registered = this.nodeBinded.get(nodeId);

    if (!registered) {
      registered = {};
      this.nodeBinded.set(nodeId, registered);
    }

    let value = registered[eventName];

    if (!value) {
      value = {
        server_id: node._server_id,
        context_id: context?._server_id,
        bindProcesses: [],
        eventName,
        options,
      };

      registered[eventName] = value;
    }

    value.bindProcesses.push(...processes);
    this.nodeBinded.set(nodeId, registered);
  }

  private _listenAddChildEvent() {
    spinalEventEmitter.on(ADD_CHILD_EVENT, async ({ nodeId, childId }) => {
      const node = await this._callbackListen(nodeId, childId, undefined, nodeId, [IScope.all, IScope.not_in_context]);

      if (node instanceof SpinalNode) {
        let action = { name: EVENT_NAMES.addChild, parentId: nodeId, nodeId: childId };
        await this.socketHandler.sendSocketEvent(node, undefined, nodeId, action);
      }
    });
  }

  private _listenAddChildInContextEvent() {
    spinalEventEmitter.on(ADD_CHILD_IN_CONTEXT_EVENT, async ({ nodeId, childId, contextId }) => {
      const node = await this._callbackListen(nodeId, childId, contextId, nodeId, [IScope.all, IScope.not_in_context]);

      if (node instanceof SpinalNode) {
        const eventName = `${contextId}:${nodeId}`;
        let action = { name: EVENT_NAMES.addChildInContext, parentId: nodeId, nodeId: childId, contextId };
        await this.socketHandler.sendSocketEvent(node, undefined, eventName, action);
      }
    });
  }

  private _listenRemoveChildEvent() {
    spinalEventEmitter.on(REMOVE_CHILD_EVENT, async ({ nodeId, childId }) => {
      const data = this.nodeBinded.get(nodeId);
      if (!data) return;

      const node = SpinalGraphService.getRealNode(nodeId);
      const event = nodeId;
      const action = { name: EVENT_NAMES.childRemoved, parentId: nodeId, nodeId: childId };
      await this.socketHandler.sendSocketEvent(node, undefined, event, action);
    });
  }

  private _listenAddChildrenEvent() {
    spinalEventEmitter.on(REMOVE_CHILDREN_EVENT, async ({ nodeId, childrenIds }) => {
      const data = this.nodeBinded.get(nodeId);
      if (!data) return;

      const node = SpinalGraphService.getRealNode(nodeId);
      const event = nodeId;
      const action = { name: EVENT_NAMES.childrenRemoved, parentId: nodeId, nodeIds: childrenIds };
      await this.socketHandler.sendSocketEvent(node, undefined, event, action);

    });
  }

  private _activeEventSender(node: SpinalNode) {
    if (node.info.activeEventSender) node.info.activeEventSender.set(true);
    else node.info.add_attr({ activeEventSender: true });
  }

  private async _findNode(childId: string, parentId: string): Promise<SpinalNode> {
    let node = SpinalGraphService.getRealNode(childId);

    if (!node && parentId) {
      const parentNode = SpinalGraphService.getRealNode(parentId);
      if (parentNode) {
        const children = await parentNode.getChildren();
        node = children.find((el) => el.getId().get() === childId);
      }
    }

    return node;
  }

  private async _callbackListen(nodeId: string, childId: string, contextId: string, eventName: string, bindTypes: string[]): Promise<SpinalNode> {
    const data = this.nodeBinded.get(nodeId);
    if (!data) return;


    const _bindTypes = data.bindTypes;
    const found = bindTypes.find((el) => _bindTypes[el]);
    if (!found) return;

    const node = await this._findNode(nodeId, childId);
    if (!(node instanceof SpinalNode)) return;

    const context = contextId && SpinalGraphService.getRealNode(contextId);
    this.bindNode({ node, context, options: {}, eventName });
    return node;
  }


  private _unbindAllNodes() {
    this.nodeBinded.forEach((value, key) => {
      this._unbindNode(key);
    });
  }

  private _unbindNode(nodeId: string, eventNames?: string | string[]): void[] {
    const data = this.nodeBinded.get(nodeId);
    if (!data) return;
    let events = eventNames || Object.keys(data);
    if (!Array.isArray(events)) events = [events];

    events.forEach((name) => {
      const bindProcesses = data[name].bindProcesses || [];
      while (bindProcesses.length) {
        const process = bindProcesses.pop();
        this._unbindBindProcess(process);
      }
    });
  }

  private _unbindBindProcess(process: Process) {
    const models = process._models;
    return models.forEach((el) => el.unbind(process));
  }
}

export const spinalGraphUtils = SpinalGraphUtils.getInstance();
