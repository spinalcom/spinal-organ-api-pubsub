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
const lib_1 = require("../lib");
const spinal_core_connectorjs_1 = require("spinal-core-connectorjs");
const config = require("../../config");
const lodash = require("lodash");
const relationToExclude = [spinal_model_timeseries_1.SpinalTimeSeries.relationName];
class SpinalGraphUtils {
    constructor() {
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
    init(conn, graph) {
        return __awaiter(this, void 0, void 0, function* () {
            this.spinalConnection = conn;
            const old_graph = graph || spinal_env_viewer_graph_service_1.SpinalGraphService.getGraph();
            if (old_graph)
                return old_graph;
            return new Promise((resolve, reject) => {
                spinal_core_connectorjs_1.spinalCore.load(conn, config.file.path, (graph) => __awaiter(this, void 0, void 0, function* () {
                    yield spinal_env_viewer_graph_service_1.SpinalGraphService.setGraph(graph);
                    resolve(graph);
                }));
            });
        });
    }
    setIo(io) {
        this.io = io;
    }
    getNode(nodeId, contextId) {
        return __awaiter(this, void 0, void 0, function* () {
            //@ts-ignore
            if (!isNaN(nodeId)) {
                const node = yield this.getNodeWithServerId(nodeId);
                //@ts-ignore
                if (node && node instanceof spinal_env_viewer_graph_service_1.SpinalNode)
                    spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(node);
                return node;
            }
            return this.getNodeWithStaticId(nodeId.toString(), contextId);
        });
    }
    getNodeWithServerId(server_id) {
        return new Promise((resolve) => {
            if (typeof spinal_core_connectorjs_1.FileSystem._objects[server_id] !== "undefined") {
                return resolve(spinal_core_connectorjs_1.FileSystem._objects[server_id]);
            }
            this.spinalConnection.load_ptr(server_id, (node) => {
                resolve(node);
            });
        });
    }
    getContext(contextId) {
        return __awaiter(this, void 0, void 0, function* () {
            let node = spinal_env_viewer_graph_service_1.SpinalGraphService.getRealNode(contextId.toString());
            if (node)
                return node;
            node = spinal_core_connectorjs_1.FileSystem._objects[contextId];
            if (node)
                return node;
            const graph = spinal_env_viewer_graph_service_1.SpinalGraphService.getGraph();
            if (graph) {
                const contexts = yield graph.getChildren();
                return contexts.find(el => {
                    if (el.getId().get() === contextId || el._server_id == contextId) {
                        //@ts-ignore
                        spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(el);
                        return true;
                    }
                    return false;
                });
            }
        });
    }
    getNodeWithStaticId(nodeId, contextId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (nodeId === contextId) {
                return this.getContext(nodeId);
            }
            const context = yield this.getContext(contextId);
            if (context instanceof spinal_env_viewer_graph_service_1.SpinalContext) {
                const found = yield context.findInContext(context, (node, stop) => {
                    if (node.getId().get() === nodeId) {
                        // @ts-ignore
                        spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(node);
                        stop();
                        return true;
                    }
                    return false;
                });
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
        });
    }
    bindNode(node, context, options, eventName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // const model = new Model({ info, element });
                const _eventName = eventName || node.getId().get();
                yield this._bindInfoAndElement(_eventName, node, options);
                // model.bind(lodash.debounce(() => callback(null, _eventName, this._formatNode(model.get())), 1000), false);
                if (options.subscribeChildren) {
                    switch (options.subscribeChildScope) {
                        case lib_1.IScope.in_context:
                            this._bindChildInContext(node, context);
                            break;
                        case lib_1.IScope.tree_in_context:
                            this.bindContextTree(node, context);
                            break;
                        case lib_1.IScope.not_in_context:
                            this.bindChildNotInContext(node);
                            break;
                        case lib_1.IScope.all:
                            this._bindAllChild(node);
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
    bindContextTree(startNode, context) {
        const eventName = `${context.getId().get()}:${startNode.getId().get()}`;
        startNode.findInContext(context, (node) => {
            this._activeEventSender(node);
            this.bindNode(node, context, {}, eventName);
            return false;
        });
    }
    bindChildNotInContext(node) {
        return __awaiter(this, void 0, void 0, function* () {
            this._activeEventSender(node);
            const eventName = node.getId().get();
            const relations = this._getRelationNameNotInContext(node);
            const children = yield node.getChildren(relations.filter(el => relationToExclude.indexOf(el) !== -1));
            children.forEach((child) => this.bindNode(child, null, {}, eventName));
        });
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                      PRIVATE                                                          //
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    _bindAllChild(node) {
        return __awaiter(this, void 0, void 0, function* () {
            this._activeEventSender(node);
            const eventName = node.getId().get();
            const relationNames = this._getRelationNames(node);
            const children = yield node.getChildren(relationNames.filter(el => relationToExclude.indexOf(el) !== -1));
            children.forEach((child) => this.bindNode(child, null, {}, eventName));
        });
    }
    _bindChildInContext(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            this._activeEventSender(node);
            const eventName = `${context.getId().get()}:${node.getId().get()}`;
            const children = yield node.getChildrenInContext(context);
            children.forEach((child) => this.bindNode(child, context, {}, eventName));
        });
    }
    _getRelationNameNotInContext(node) {
        const relationKeys = node.children.keys();
        const t = relationKeys.map(key => {
            const relationsMap = node.children[key];
            const relationNames = relationsMap.keys();
            return relationNames.filter(relationName => {
                const contextIds = relationsMap[relationName].contextIds.keys();
                return !contextIds || contextIds.length === 0;
            });
        });
        return lodash.flattenDeep(t);
    }
    _getRelationNames(node) {
        const relationKeys = node.children.keys();
        const t = relationKeys.map(key => {
            const relationsMap = node.children[key];
            return relationsMap.keys();
        });
        return lodash.flattenDeep(t);
    }
    _bindInfoAndElement(eventName, node, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const nodeId = node.getId().get();
            this._addNodeToBindedNode(nodeId, eventName, options);
            let info = node.info;
            let element = yield node.getElement(true);
            const model = new spinal_core_connectorjs_1.Model({ info, element });
            model.bind(lodash.debounce(() => this._sendSocketEvent(node, model.get(), eventName), 1000), false);
            // model.bind(lodash.debounce(() => callback(null, eventName, this._formatNode(model.get())), 1000), false);
        });
    }
    _addNodeToBindedNode(nodeId, eventName, options) {
        const value = this.nodeBinded.get(nodeId) || { events: {}, bindTypes: {} };
        value.events[eventName] = eventName;
        if (options.subscribeChildren) {
            const key = options.subscribeChildScope;
            if (!!key)
                value.bindTypes[key] = key;
        }
        this.nodeBinded.set(nodeId, value);
    }
    _formatNode(node, model) {
        return __awaiter(this, void 0, void 0, function* () {
            if (model) {
                return {
                    info: model.info,
                    element: model.element
                };
            }
            const info = node.info;
            const element = yield node.getElement(true);
            return { info: info.get(), element: element && element.get() };
        });
    }
    _sendSocketEvent(node, model, eventName, action) {
        return __awaiter(this, void 0, void 0, function* () {
            const status = lib_1.OK_STATUS;
            const data = { event: action || { name: lib_1.EVENT_NAMES.updated, nodeId: node.getId().get() }, node: yield this._formatNode(node, model) };
            console.log("send", data, "data");
            this.io.to(eventName).emit(eventName, { data, status });
        });
    }
    _listenAddChildEvent() {
        spinal_env_viewer_plugin_event_emitter_1.spinalEventEmitter.on(spinal_model_graph_1.ADD_CHILD_EVENT, ({ nodeId, childId }) => __awaiter(this, void 0, void 0, function* () {
            const node = yield this._callbackListen(nodeId, childId, undefined, nodeId, [lib_1.IScope.all, lib_1.IScope.not_in_context]);
            if (node instanceof spinal_env_viewer_graph_service_1.SpinalNode) {
                let action = { name: lib_1.EVENT_NAMES.addChild, parentId: nodeId, nodeId: childId };
                this._sendSocketEvent(node, undefined, nodeId, action);
            }
        }));
    }
    _listenAddChildInContextEvent() {
        spinal_env_viewer_plugin_event_emitter_1.spinalEventEmitter.on(spinal_model_graph_1.ADD_CHILD_IN_CONTEXT_EVENT, ({ nodeId, childId, contextId }) => __awaiter(this, void 0, void 0, function* () {
            const node = yield this._callbackListen(nodeId, childId, contextId, nodeId, [lib_1.IScope.all, lib_1.IScope.not_in_context]);
            if (node instanceof spinal_env_viewer_graph_service_1.SpinalNode) {
                const eventName = `${contextId}:${nodeId}`;
                let action = { name: lib_1.EVENT_NAMES.addChildInContext, parentId: nodeId, nodeId: childId, contextId };
                this._sendSocketEvent(node, undefined, eventName, action);
            }
        }));
    }
    _listenRemoveChildEvent() {
        spinal_env_viewer_plugin_event_emitter_1.spinalEventEmitter.on(spinal_model_graph_1.REMOVE_CHILD_EVENT, ({ nodeId, childId }) => {
            const data = this.nodeBinded.get(nodeId);
            if (data) {
                const node = spinal_env_viewer_graph_service_1.SpinalGraphService.getRealNode(nodeId);
                const event = nodeId;
                const action = { name: lib_1.EVENT_NAMES.childRemoved, parentId: nodeId, nodeId: childId };
                this._sendSocketEvent(node, undefined, event, action);
            }
        });
    }
    _listenAddChildrenEvent() {
        spinal_env_viewer_plugin_event_emitter_1.spinalEventEmitter.on(spinal_model_graph_1.REMOVE_CHILDREN_EVENT, ({ nodeId, childrenIds }) => {
            const data = this.nodeBinded.get(nodeId);
            if (data) {
                const node = spinal_env_viewer_graph_service_1.SpinalGraphService.getRealNode(nodeId);
                const event = nodeId;
                const action = { name: lib_1.EVENT_NAMES.childrenRemoved, parentId: nodeId, nodeIds: childrenIds };
                this._sendSocketEvent(node, undefined, event, action);
            }
        });
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
                    node = children.find(el => el.getId().get() === childId);
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
                const found = bindTypes.find(el => _bindTypes[el]);
                if (found) {
                    const node = yield this._findNode(nodeId, childId);
                    if (node instanceof spinal_env_viewer_graph_service_1.SpinalNode) {
                        const context = contextId ? spinal_env_viewer_graph_service_1.SpinalGraphService.getRealNode(contextId) : undefined;
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