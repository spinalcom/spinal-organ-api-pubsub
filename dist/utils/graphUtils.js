"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spinalGraphUtils = void 0;
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
const spinal_env_viewer_plugin_event_emitter_1 = require("spinal-env-viewer-plugin-event-emitter");
const spinal_model_graph_1 = require("spinal-model-graph");
const spinal_env_viewer_graph_service_1 = require("spinal-env-viewer-graph-service");
const spinal_model_timeseries_1 = require("spinal-model-timeseries");
const interfaces_1 = require("../interfaces");
const constants_1 = require("../constants");
const spinal_core_connectorjs_1 = require("spinal-core-connectorjs");
const lodash = require("lodash");
const relationToExclude = [spinal_model_timeseries_1.SpinalTimeSeries.relationName];
class SpinalGraphUtils {
    constructor() {
        // private nodeBinded: Map<string, { bindTypes: { [key: string]: string }, events: { [key: string]: string } }> = new Map();
        this.nodeBinded = new Map();
        this._listenAddChildEvent();
        this._listenAddChildInContextEvent();
        this._listenRemoveChildEvent();
        this._listenAddChildrenEvent();
    }
    static getInstance() {
        if (!this.instance)
            this.instance = new SpinalGraphUtils();
        return this.instance;
    }
    init(socketHandler) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
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
    bindNode(node, context, options, eventName, socket, subscription_data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // const model = new Model({ info, element });
                const _eventName = eventName || node.getId().get();
                //@ts-ignore
                const sessionId = this.socketHandler._getSessionId(socket);
                yield this.socketHandler.saveSubscriptionData(sessionId, eventName, subscription_data);
                if (socket && eventName) {
                    socket.emit(constants_1.SUBSCRIBED, {
                        error: null,
                        eventNames: [_eventName],
                        options,
                        status: constants_1.OK_STATUS,
                    });
                    socket.join(_eventName);
                }
                yield this._bindInfoAndElement(node, context, _eventName, options, subscription_data);
                if (options.subscribeChildren) {
                    switch (options.subscribeChildScope) {
                        case interfaces_1.IScope.in_context:
                            yield this._bindChildInContext(node, context, socket, subscription_data);
                            break;
                        case interfaces_1.IScope.tree_in_context:
                            yield this.bindContextTree(node, context, socket, subscription_data);
                            break;
                        case interfaces_1.IScope.not_in_context:
                            yield this.bindChildNotInContext(node, socket, subscription_data);
                            break;
                        case interfaces_1.IScope.all:
                            yield this._bindAllChild(node, socket, subscription_data);
                            break;
                        case interfaces_1.IScope.tree_not_in_context:
                            yield this.bindTreeNotInContext(node, socket, subscription_data);
                            break;
                    }
                }
            }
            catch (error) {
                console.error(error);
                const err_message = error.message;
                console.error(err_message);
            }
        });
    }
    bindContextTree(startNode, context, socket, subscription_data) {
        const eventName = `${context.getId().get()}:${startNode.getId().get()}`;
        startNode.findInContext(context, (node) => {
            this._activeEventSender(node);
            this.bindNode(node, context, {}, eventName, socket, subscription_data);
            return false;
        });
    }
    bindChildNotInContext(node, socket, subscription_data) {
        return __awaiter(this, void 0, void 0, function* () {
            this._activeEventSender(node);
            const eventName = node.getId().get();
            const relations = this._getRelationNameNotInContext(node);
            const children = yield node.getChildren(relations.filter((el) => relationToExclude.indexOf(el) !== -1));
            children.forEach((child) => this.bindNode(child, null, {}, eventName, socket, subscription_data));
        });
    }
    rebindAllNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            this._unbindAllNodes();
            const idsIter = this.nodeBinded.keys();
            let item = idsIter.next();
            for (; !item.done; item = idsIter.next()) {
                yield this._rebindNode(item.value);
            }
        });
    }
    bindTreeNotInContext(node, socket, subscription_data) {
        return __awaiter(this, void 0, void 0, function* () {
            const nodes = yield this._getTreeNotInContext(node);
            for (const n of nodes) {
                const eventName = n.getId().get();
                yield this.bindNode(n, null, {}, eventName, socket, subscription_data);
            }
        });
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                      PRIVATE                                                          //
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    _getTreeNotInContext(start) {
        return __awaiter(this, void 0, void 0, function* () {
            const nodes = [];
            let queue = [start];
            while (queue.length > 0) {
                const node = queue.pop();
                nodes.push(node);
                const relations = this._getRelationNameNotInContext(node);
                const children = yield node.getChildren(relations.filter((el) => relationToExclude.indexOf(el) !== -1));
                queue = queue.concat(children);
            }
            return nodes;
        });
    }
    _rebindNode(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = this.nodeBinded.get(nodeId);
            if (!data)
                return;
            for (const event in data) {
                if (Object.prototype.hasOwnProperty.call(data, event)) {
                    const { server_id, context_id, eventName, options } = data[event];
                    const node = spinal_core_connectorjs_1.FileSystem._objects[server_id];
                    const context = context_id && spinal_core_connectorjs_1.FileSystem._objects[context_id];
                    if (node)
                        yield this.bindNode(node, context, options, eventName);
                }
            }
        });
    }
    _unbindAllNodes() {
        this.nodeBinded.forEach((value, key) => {
            this._unbindNode(key);
        });
    }
    _unbindNode(nodeId, eventNames) {
        const data = this.nodeBinded.get(nodeId);
        if (!data)
            return;
        let events = eventNames || Object.keys(data);
        if (!Array.isArray(events))
            events = [events];
        events.forEach((name) => {
            const bindProcesses = data[name].bindProcesses || [];
            while (bindProcesses.length) {
                const process = bindProcesses.pop();
                this._unbindBindProcess(process);
            }
        });
    }
    _unbindBindProcess(process) {
        const models = process._models;
        return models.forEach((el) => el.unbind(process));
    }
    _bindAllChild(node, socket, subscription_data) {
        return __awaiter(this, void 0, void 0, function* () {
            this._activeEventSender(node);
            const eventName = node.getId().get();
            const relationNames = this._getRelationNames(node);
            const children = yield node.getChildren(relationNames.filter((el) => relationToExclude.indexOf(el) !== -1));
            children.forEach((child) => this.bindNode(child, null, {}, eventName, socket, subscription_data));
        });
    }
    _bindChildInContext(node, context, socket, subscription_data) {
        return __awaiter(this, void 0, void 0, function* () {
            this._activeEventSender(node);
            const eventName = `${context.getId().get()}:${node.getId().get()}`;
            const children = yield node.getChildrenInContext(context);
            children.forEach((child) => this.bindNode(child, context, {}, eventName, socket, subscription_data));
        });
    }
    _getRelationNameNotInContext(node) {
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
    _getRelationNames(node) {
        const relationKeys = node.children.keys();
        const t = relationKeys.map((key) => {
            const relationsMap = node.children[key];
            return relationsMap.keys();
        });
        return lodash.flattenDeep(t);
    }
    _bindInfoAndElement(node, context, eventName, options = {}, subscription_data) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const nodeId = node.getId().get();
            const _temp = this.nodeBinded.get(nodeId);
            if (_temp && ((_b = (_a = _temp[eventName]) === null || _a === void 0 ? void 0 : _a.bindProcesses) === null || _b === void 0 ? void 0 : _b.length) > 0)
                return;
            const processes = [];
            let info = node.info;
            let element = yield node.getElement(true);
            let infoProcess = info.bind(lodash.debounce(() => __awaiter(this, void 0, void 0, function* () {
                console.log(`(${info.id.get()} info changed) spinalCore bind execution`);
                yield this.socketHandler.sendSocketEvent(node, {
                    info: info.get(),
                    element: element === null || element === void 0 ? void 0 : element.get(),
                }, eventName);
            }), 1000), false);
            processes.push(infoProcess);
            if (element) {
                const elementProcess = element.bind(lodash.debounce(() => __awaiter(this, void 0, void 0, function* () {
                    console.log(`(${info.id.get()} element changed) spinalCore bind execution`);
                    yield this.socketHandler.sendSocketEvent(node, {
                        info: info.get(),
                        element: element === null || element === void 0 ? void 0 : element.get(),
                    }, eventName);
                }), 1000), false);
                processes.push(elementProcess);
            }
            this._addNodeToBindedNode(node, context, eventName, options, processes);
        });
    }
    _addNodeToBindedNode(node, context, eventName, options, processes) {
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
                context_id: context === null || context === void 0 ? void 0 : context._server_id,
                bindProcesses: [],
                eventName,
                options,
            };
            registered[eventName] = value;
        }
        value.bindProcesses.push(...processes);
        this.nodeBinded.set(nodeId, registered);
    }
    _listenAddChildEvent() {
        spinal_env_viewer_plugin_event_emitter_1.spinalEventEmitter.on(spinal_model_graph_1.ADD_CHILD_EVENT, ({ nodeId, childId }) => __awaiter(this, void 0, void 0, function* () {
            const node = yield this._callbackListen(nodeId, childId, undefined, nodeId, [interfaces_1.IScope.all, interfaces_1.IScope.not_in_context]);
            if (node instanceof spinal_env_viewer_graph_service_1.SpinalNode) {
                let action = {
                    name: constants_1.EVENT_NAMES.addChild,
                    parentId: nodeId,
                    nodeId: childId,
                };
                yield this.socketHandler.sendSocketEvent(node, undefined, nodeId, action);
            }
        }));
    }
    _listenAddChildInContextEvent() {
        spinal_env_viewer_plugin_event_emitter_1.spinalEventEmitter.on(spinal_model_graph_1.ADD_CHILD_IN_CONTEXT_EVENT, ({ nodeId, childId, contextId }) => __awaiter(this, void 0, void 0, function* () {
            const node = yield this._callbackListen(nodeId, childId, contextId, nodeId, [interfaces_1.IScope.all, interfaces_1.IScope.not_in_context]);
            if (node instanceof spinal_env_viewer_graph_service_1.SpinalNode) {
                const eventName = `${contextId}:${nodeId}`;
                let action = {
                    name: constants_1.EVENT_NAMES.addChildInContext,
                    parentId: nodeId,
                    nodeId: childId,
                    contextId,
                };
                yield this.socketHandler.sendSocketEvent(node, undefined, eventName, action);
            }
        }));
    }
    _listenRemoveChildEvent() {
        spinal_env_viewer_plugin_event_emitter_1.spinalEventEmitter.on(spinal_model_graph_1.REMOVE_CHILD_EVENT, ({ nodeId, childId }) => __awaiter(this, void 0, void 0, function* () {
            const data = this.nodeBinded.get(nodeId);
            if (data) {
                const node = spinal_env_viewer_graph_service_1.SpinalGraphService.getRealNode(nodeId);
                const event = nodeId;
                const action = {
                    name: constants_1.EVENT_NAMES.childRemoved,
                    parentId: nodeId,
                    nodeId: childId,
                };
                yield this.socketHandler.sendSocketEvent(node, undefined, event, action);
            }
        }));
    }
    _listenAddChildrenEvent() {
        spinal_env_viewer_plugin_event_emitter_1.spinalEventEmitter.on(spinal_model_graph_1.REMOVE_CHILDREN_EVENT, ({ nodeId, childrenIds }) => __awaiter(this, void 0, void 0, function* () {
            const data = this.nodeBinded.get(nodeId);
            if (data) {
                const node = spinal_env_viewer_graph_service_1.SpinalGraphService.getRealNode(nodeId);
                const event = nodeId;
                const action = {
                    name: constants_1.EVENT_NAMES.childrenRemoved,
                    parentId: nodeId,
                    nodeIds: childrenIds,
                };
                yield this.socketHandler.sendSocketEvent(node, undefined, event, action);
            }
        }));
    }
    _activeEventSender(node) {
        if (node.info.activeEventSender)
            node.info.activeEventSender.set(true);
        else
            node.info.add_attr({ activeEventSender: true });
    }
    _findNode(childId, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            let node = spinal_env_viewer_graph_service_1.SpinalGraphService.getRealNode(childId);
            if (!node && parentId) {
                const parentNode = spinal_env_viewer_graph_service_1.SpinalGraphService.getRealNode(parentId);
                if (parentNode) {
                    const children = yield parentNode.getChildren();
                    node = children.find((el) => el.getId().get() === childId);
                }
            }
            return node;
        });
    }
    _callbackListen(nodeId, childId, contextId, eventName, bindTypes) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = this.nodeBinded.get(nodeId);
            let binded = false;
            if (data) {
                const _bindTypes = data.bindTypes;
                const found = bindTypes.find((el) => _bindTypes[el]);
                if (found) {
                    const node = yield this._findNode(nodeId, childId);
                    if (node instanceof spinal_env_viewer_graph_service_1.SpinalNode) {
                        const context = contextId
                            ? spinal_env_viewer_graph_service_1.SpinalGraphService.getRealNode(contextId)
                            : undefined;
                        this.bindNode(node, context, {}, eventName);
                        return node;
                    }
                }
            }
        });
    }
}
exports.spinalGraphUtils = SpinalGraphUtils.getInstance();
//# sourceMappingURL=graphUtils.js.map