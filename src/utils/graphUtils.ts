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
import {spinalEventEmitter} from 'spinal-env-viewer-plugin-event-emitter';
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
import {SpinalTimeSeries} from 'spinal-model-timeseries';
import {INodeId, IScope, ISubscribeOptions} from '../interfaces';
import {EVENT_NAMES, OK_STATUS, SUBSCRIBED} from '../constants';
import {FileSystem, BindProcess} from 'spinal-core-connectorjs';
import * as lodash from 'lodash';
import SocketHandler from '../socket/socketHandlers';
import {Socket} from 'socket.io';
import {IRecursionArg} from '../interfaces';

const relationToExclude = [SpinalTimeSeries.relationName];

class SpinalGraphUtils {
  public spinalConnection: spinal.FileSystem;
  // private nodeBinded: Map<string, { bindTypes: { [key: string]: string }, events: { [key: string]: string } }> = new Map();
  private nodeBinded: Map<
    string,
    {
      [event: string]: {
        server_id: number;
        context_id: number;
        bindProcesses: BindProcess[];
        eventName: string;
        options: ISubscribeOptions;
      };
    }
  > = new Map();

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

    // this.spinalConnection = conn;
    // const old_graph = graph || SpinalGraphService.getGraph();
    // if (old_graph) return old_graph;
    // return new Promise((resolve, reject) => {
    //     spinalCore.load(conn, config.file.path, async (graph: SpinalGraph) => {
    //         await SpinalGraphService.setGraph(graph);
    //         resolve(graph);
    //     });
    // });
  }

  /*
        public async getNode(nodeId: string | number, contextId?: string | number): Promise<SpinalNode<any>> {
            //@ts-ignore
            if (!isNaN(nodeId)) {
                const node = await this.getNodeWithServerId(<number>nodeId);
                //@ts-ignore
                if (node && node instanceof SpinalNode) SpinalGraphService._addNode(node);
    
                return node;
            }
    
            return this.getNodeWithStaticId(nodeId.toString(), contextId);
        }
    
        public getNodeWithServerId(server_id: number): Promise<SpinalNode> {
            return new Promise((resolve) => {
                if (typeof FileSystem._objects[server_id] !== "undefined") {
                    return resolve(FileSystem._objects[server_id] as SpinalNode);
                }
                this.spinalConnection.load_ptr(server_id, (node) => {
                    resolve(node as SpinalNode);
                })
            });
        }
    
        public async getNodeWithStaticId(nodeId: string, contextId: string | number): Promise<SpinalNode<any>> {
            if (nodeId === contextId) {
                return this.getContext(nodeId);
            }
    
            const context = await this.getContext(contextId);
    
            if (context instanceof SpinalContext) {
    
                const found = await context.findInContext(context, (node, stop) => {
                    if (node.getId().get() === nodeId) {
                        // @ts-ignore
                        SpinalGraphService._addNode(node);
                        stop()
                        return true;
                    }
    
                    return false;
                })
    
                return Array.isArray(found) ? found[0] : found;
                // const queue = [context];
    
                // while (queue.length > 0) {
                //     const tail = queue.shift();
                //     for await (const node of tail.visitChildrenInContext(context)) {
                //         if (node.getId().get() === nodeId) {
                //             // @ts-ignore
                //             SpinalGraphService._addNode(node);
                //             return node;
                //         }
    
                //         queue.push(node);
                //     }
                // }
    
            }
        }
    
        async getContext(contextId: number | string): Promise<SpinalContext> {
            if (typeof contextId === "undefined") return;
    
            let node = SpinalGraphService.getRealNode(contextId.toString());
            if (node) return node;
            node = FileSystem._objects[contextId];
            if (node) return node;
            const graph = SpinalGraphService.getGraph();
            if (graph) {
                const contexts = await graph.getChildren();
                return contexts.find(el => {
                    if (el.getId().get() === contextId || el._server_id == contextId) {
                        //@ts-ignore
                        SpinalGraphService._addNode(el);
                        return true;
                    }
                    return false;
                })
            }
        }
    */

  public async recursionFunction(
    data: IRecursionArg,
    callback: Function
  ): Promise<void> {
    try {
      // const model = new Model({ info, element });
      callback(data);

      if (data.options.subscribeChildren) {
        switch (data.options.subscribeChildScope) {
          case IScope.in_context:
            await this._browseChildInContext(data, callback);
            break;
          case IScope.tree_in_context:
            await this.browseContextTree(data, callback);
            break;
          case IScope.not_in_context:
            await this.browseChildNotInContext(data, callback);
            break;
          case IScope.all:
            await this._browseAllChild(data, callback);
            break;
          case IScope.tree_not_in_context:
            await this.browseTreeNotInContext(data, callback);
            break;
        }
      }
    } catch (error) {
      console.error(error);

      const err_message = error.message;
      console.error(err_message);
    }
  }

  public async bindNode(data: IRecursionArg): Promise<void> {
    try {
      // const model = new Model({ info, element });
      const _eventName = data.eventName || data.node.getId().get();

      //@ts-ignore
      const sessionId = this.socketHandler._getSessionId(data.socket);
      await this.socketHandler.saveSubscriptionData(
        sessionId,
        data.eventName,
        data.subscription_data
      );

      if (data.socket && data.eventName) {
        data.socket.emit(SUBSCRIBED, {
          error: null,
          eventNames: [_eventName],
          options: data.options,
          status: OK_STATUS,
        });

        data.socket.join(_eventName);
      }

      await this._bindInfoAndElement(
        data.node,
        data.context,
        _eventName,
        data.options,
        data.socket
      );

      // if (options.subscribeChildren) {
      //   switch (options.subscribeChildScope) {
      //     case IScope.in_context:
      //       await this._browseChildInContext(
      //         node,
      //         context,
      //         socket,
      //         subscription_data
      //       );
      //       break;
      //     case IScope.tree_in_context:
      //       await this.browseContextTree(
      //         node,
      //         context,
      //         socket,
      //         subscription_data
      //       );
      //       break;
      //     case IScope.not_in_context:
      //       await this.browseChildNotInContext(node, socket, subscription_data);
      //       break;
      //     case IScope.all:
      //       await this._browseAllChild(node, socket, subscription_data);
      //       break;
      //     case IScope.tree_not_in_context:
      //       await this.browseTreeNotInContext(node, socket, subscription_data);
      //       break;
      //   }
      // }
    } catch (error) {
      console.error(error);

      const err_message = error.message;
      console.error(err_message);
    }
  }

  public browseContextTree(data: IRecursionArg, callback: Function): void {
    const eventName = `${data.context.getId().get()}:${data.node
      .getId()
      .get()}`;
    data.node.findInContext(data.context, (node) => {
      this._activeEventSender(node);
      const _data = {
        node,
        context: data.context,
        options: {},
        socket: data.socket,
        subscription_data: data.subscription_data,
      };
      this.recursionFunction(_data, callback);
      return false;
    });
  }

  public async browseChildNotInContext(
    data: IRecursionArg,
    callback: Function
  ): Promise<void> {
    this._activeEventSender(data.node);
    const eventName = data.node.getId().get();
    const relations = this._getRelationNameNotInContext(data.node);
    const children = await data.node.getChildren(
      relations.filter((el) => relationToExclude.indexOf(el) !== -1)
    );

    children.forEach((child) => {
      const childData = {
        node: child,
        context: null,
        options: {},
        eventName,
        socket: data.socket,
        subscription_data: data.subscription_data,
      };
      this.recursionFunction(childData, callback);
    });
  }

  public async browseTreeNotInContext(data: IRecursionArg, callback: Function) {
    const nodes = await this._getTreeNotInContext(data.node);

    for (const n of nodes) {
      const eventName = n.getId().get();
      const childData = {
        node: n,
        context: null,
        options: {},
        eventName,
        socket: data.socket,
        subscription_data: data.subscription_data,
      };
      this.recursionFunction(childData, callback);
    }
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
        const {server_id, context_id, eventName, options} = data[event];

        const node: any = FileSystem._objects[server_id];
        const context: any = context_id && FileSystem._objects[context_id];

        if (node) await this.bindNode({node, context, options, eventName});
      }
    }
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

  private _unbindBindProcess(process: BindProcess) {
    const models = process._models;
    return models.forEach((el) => el.unbind(process));
  }

  private async _browseAllChild(
    data: IRecursionArg,
    callback: Function
  ): Promise<void> {
    this._activeEventSender(data.node);
    const eventName = data.node.getId().get();
    const relationNames = this._getRelationNames(data.node);
    const children = await data.node.getChildren(
      relationNames.filter((el) => relationToExclude.indexOf(el) !== -1)
    );

    children.forEach((child) => {
      const childData = {
        node: child,
        context: null,
        options: {},
        eventName,
        socket: data.socket,
        subscription_data: data.subscription_data,
      };
      this.recursionFunction(childData, callback);
    });
  }

  private async _browseChildInContext(
    data: IRecursionArg,
    callback: Function
  ): Promise<void> {
    this._activeEventSender(data.node);
    const eventName = `${data.context.getId().get()}:${data.node
      .getId()
      .get()}`;
    const children = await data.node.getChildrenInContext(data.context);
    children.forEach((child) => {
      const childData = {
        node: child,
        context: data.context,
        options: {},
        eventName,
        socket: data.socket,
        subscription_data: data.subscription_data,
      };
      this.recursionFunction(childData, callback);
    });
  }

  private _getRelationNameNotInContext(node: SpinalNode<any>): string[] {
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

  private _getRelationNames(node: SpinalNode<any>) {
    const relationKeys = node.children.keys();
    const t = relationKeys.map((key) => {
      const relationsMap = node.children[key];
      return relationsMap.keys();
    });

    return lodash.flattenDeep(t);
  }

  private async _bindInfoAndElement(
    node: SpinalNode<any>,
    context: SpinalContext,
    eventName: string,
    options: ISubscribeOptions = {},
    socket: Socket
  ) {
    const nodeId = node.getId().get();
    let info = node.info;
    let element = await node.getElement(true);

    const callbackDebounce = lodash.debounce(async () => {
      console.log(`(${info.name.get()} changed) spinalCore bind execution`);

      await this.socketHandler.sendSocketEvent(
        node,
        {
          info: info.get(),
          element: element?.get(),
        },
        eventName
      );
    }, 1000);

    const _temp = this.nodeBinded.get(nodeId);
    if (_temp && _temp[eventName]?.bindProcesses?.length > 0) {
      callbackDebounce();
      return;
    }

    const processes = [];

    let infoProcess = info.bind(callbackDebounce, true);
    processes.push(infoProcess);

    if (element) {
      const elementProcess = element.bind(callbackDebounce, true);
      processes.push(elementProcess);
    }

    this._addNodeToBindedNode(node, context, eventName, options, processes);
  }

  private _addNodeToBindedNode(
    node: SpinalNode,
    context: SpinalContext,
    eventName: string,
    options: ISubscribeOptions,
    processes: BindProcess[]
  ) {
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
    spinalEventEmitter.on(ADD_CHILD_EVENT, async ({nodeId, childId}) => {
      const node = await this._callbackListen(
        nodeId,
        childId,
        undefined,
        nodeId,
        [IScope.all, IScope.not_in_context]
      );
      if (node instanceof SpinalNode) {
        let action = {
          name: EVENT_NAMES.addChild,
          parentId: nodeId,
          nodeId: childId,
        };
        await this.socketHandler.sendSocketEvent(
          node,
          undefined,
          nodeId,
          action
        );
      }
    });
  }

  private _listenAddChildInContextEvent() {
    spinalEventEmitter.on(
      ADD_CHILD_IN_CONTEXT_EVENT,
      async ({nodeId, childId, contextId}) => {
        const node = await this._callbackListen(
          nodeId,
          childId,
          contextId,
          nodeId,
          [IScope.all, IScope.not_in_context]
        );
        if (node instanceof SpinalNode) {
          const eventName = `${contextId}:${nodeId}`;
          let action = {
            name: EVENT_NAMES.addChildInContext,
            parentId: nodeId,
            nodeId: childId,
            contextId,
          };
          await this.socketHandler.sendSocketEvent(
            node,
            undefined,
            eventName,
            action
          );
        }
      }
    );
  }

  private _listenRemoveChildEvent() {
    spinalEventEmitter.on(REMOVE_CHILD_EVENT, async ({nodeId, childId}) => {
      const data = this.nodeBinded.get(nodeId);
      if (data) {
        const node = SpinalGraphService.getRealNode(nodeId);
        const event = nodeId;
        const action = {
          name: EVENT_NAMES.childRemoved,
          parentId: nodeId,
          nodeId: childId,
        };
        await this.socketHandler.sendSocketEvent(
          node,
          undefined,
          event,
          action
        );
      }
    });
  }

  private _listenAddChildrenEvent() {
    spinalEventEmitter.on(
      REMOVE_CHILDREN_EVENT,
      async ({nodeId, childrenIds}) => {
        const data = this.nodeBinded.get(nodeId);
        if (data) {
          const node = SpinalGraphService.getRealNode(nodeId);
          const event = nodeId;
          const action = {
            name: EVENT_NAMES.childrenRemoved,
            parentId: nodeId,
            nodeIds: childrenIds,
          };
          await this.socketHandler.sendSocketEvent(
            node,
            undefined,
            event,
            action
          );
        }
      }
    );
  }

  private _activeEventSender(node: SpinalNode<any>) {
    if (node.info.activeEventSender) node.info.activeEventSender.set(true);
    else node.info.add_attr({activeEventSender: true});
  }

  private async _findNode(
    childId: string,
    parentId: string
  ): Promise<SpinalNode<any>> {
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

  private async _callbackListen(
    nodeId: string,
    childId: string,
    contextId: string,
    eventName: string,
    bindTypes: string[]
  ): Promise<SpinalNode<any>> {
    const data = this.nodeBinded.get(nodeId);
    let binded = false;
    if (data) {
      const _bindTypes = data.bindTypes;
      const found = bindTypes.find((el) => _bindTypes[el]);

      if (found) {
        const node = await this._findNode(nodeId, childId);
        if (node instanceof SpinalNode) {
          const context = contextId
            ? SpinalGraphService.getRealNode(contextId)
            : undefined;
          this.bindNode({node, context, options: {}, eventName});
          return node;
        }
      }
    }
  }
}

export const spinalGraphUtils = SpinalGraphUtils.getInstance();
