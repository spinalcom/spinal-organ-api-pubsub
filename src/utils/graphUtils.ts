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
import { spinalEventEmitter } from "spinal-env-viewer-plugin-event-emitter";
import { ADD_CHILD_EVENT, ADD_CHILD_IN_CONTEXT_EVENT, REMOVE_CHILD_EVENT, REMOVE_CHILDREN_EVENT } from 'spinal-model-graph';
import { SpinalGraphService, SpinalNode, SpinalContext, SpinalGraph } from 'spinal-env-viewer-graph-service';
import { SpinalTimeSeries } from "spinal-model-timeseries";
import { OK_STATUS, EVENT_NAMES, IAction, IScope, ISubscribeOptions, SUBSCRIBED } from '../lib';
import { Model, FileSystem, spinalCore, BindProcess } from "spinal-core-connectorjs";
import { Server, Socket } from "socket.io";
import { config } from "../config";
import * as lodash from "lodash";




const relationToExclude = [SpinalTimeSeries.relationName]

class SpinalGraphUtils {
    public spinalConnection: spinal.FileSystem;
    // private nodeBinded: Map<string, { bindTypes: { [key: string]: string }, events: { [key: string]: string } }> = new Map();
    private nodeBinded: Map<string, { [event: string]: { server_id: number, context_id: number, bindProcesses: BindProcess[], eventName: string; options: ISubscribeOptions } }> = new Map();

    private static instance: SpinalGraphUtils;
    private io: Server;

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

    public async init(conn: spinal.FileSystem, graph?: SpinalGraph): Promise<SpinalGraph> {
        this.spinalConnection = conn;
        const old_graph = graph || SpinalGraphService.getGraph();
        if (old_graph) return old_graph;
        return new Promise((resolve, reject) => {
            spinalCore.load(conn, config.file.path, async (graph: SpinalGraph) => {
                await SpinalGraphService.setGraph(graph);
                resolve(graph);
            });
        });
    }

    public setIo(io: Server) {
        this.io = io;
    }

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

    public getNodeWithServerId(server_id: number): Promise<any> {
        return new Promise((resolve) => {
            if (typeof FileSystem._objects[server_id] !== "undefined") {
                return resolve(FileSystem._objects[server_id]);
            }
            this.spinalConnection.load_ptr(server_id, (node) => {
                resolve(node);
            })
        });
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

    public async bindNode(node: SpinalNode<any>, context: SpinalContext<any>, options: ISubscribeOptions, eventName?: string, socket?: Socket): Promise<void> {

        try {
            // const model = new Model({ info, element });
            const _eventName = eventName || node.getId().get();

            if (socket && eventName) {
                socket.emit(SUBSCRIBED, { error: null, eventNames: [_eventName], options, status: OK_STATUS })
                socket.join(_eventName);
            }

            await this._bindInfoAndElement(node, context, _eventName, options);

            if (options.subscribeChildren) {
                switch (options.subscribeChildScope) {
                    case IScope.in_context:
                        await this._bindChildInContext(node, context, socket);
                        break;
                    case IScope.tree_in_context:
                        await this.bindContextTree(node, context, socket);
                        break;
                    case IScope.not_in_context:
                        await this.bindChildNotInContext(node, socket);
                        break;
                    case IScope.all:
                        await this._bindAllChild(node, socket);
                        break;
                    case IScope.tree_not_in_context:
                        await this.bindTreeNotInContext(node, socket);
                        break;
                }
            }
        } catch (error) {
            // console.error(error);
            const err_message = error.message;
            console.error(err_message);

        }
    }

    public bindContextTree(startNode: SpinalNode<any>, context: SpinalContext<any>, socket: Socket): void {
        const eventName = `${context.getId().get()}:${startNode.getId().get()}`;
        startNode.findInContext(context, (node) => {
            this._activeEventSender(node);
            this.bindNode(node, context, {}, eventName, socket);
            return false;
        })
    }

    public async bindChildNotInContext(node: SpinalNode<any>, socket: Socket): Promise<void> {
        this._activeEventSender(node);
        const eventName = node.getId().get();
        const relations = this._getRelationNameNotInContext(node);
        const children = await node.getChildren(relations.filter(el => relationToExclude.indexOf(el) !== -1));

        children.forEach((child) => this.bindNode(child, null, {}, eventName, socket));
    }

    public async rebindAllNodes() {
        this._unbindAllNodes();
        const idsIter = this.nodeBinded.keys();
        let item = idsIter.next();
        for (; !item.done; item = idsIter.next()) {
            await this._rebindNode(item.value);
        }
    }


    public async bindTreeNotInContext(node: SpinalNode<any>, socket: Socket) {
        const nodes = await this._getTreeNotInContext(node);

        for (const n of nodes) {
            const eventName = n.getId().get();
            await this.bindNode(n, null, {}, eventName, socket);
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
            const children = await node.getChildren(relations.filter(el => relationToExclude.indexOf(el) !== -1));

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

                if (node) await this.bindNode(node, context, options, eventName);
            }
        }
    }

    private _unbindAllNodes() {
        this.nodeBinded.forEach((value, key) => {
            this._unbindNode(key);
        })
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
        })

    }

    private _unbindBindProcess(process: BindProcess) {
        const models = process._models;
        return models.forEach(el => el.unbind(process));
    }

    private async _bindAllChild(node: SpinalNode<any>, socket: Socket): Promise<void> {
        this._activeEventSender(node);
        const eventName = node.getId().get();
        const relationNames = this._getRelationNames(node);
        const children = await node.getChildren(relationNames.filter(el => relationToExclude.indexOf(el) !== -1));

        children.forEach((child) => this.bindNode(child, null, {}, eventName, socket));
    }

    private async _bindChildInContext(node: SpinalNode<any>, context: SpinalContext<any>, socket: Socket): Promise<void> {
        this._activeEventSender(node);
        const eventName = `${context.getId().get()}:${node.getId().get()}`;
        const children = await node.getChildrenInContext(context);
        children.forEach((child) => this.bindNode(child, context, {}, eventName, socket));
    }

    private _getRelationNameNotInContext(node: SpinalNode<any>): string[] {
        const relationKeys = node.children.keys();
        const t = relationKeys.map(key => {
            const relationsMap = node.children[key];
            const relationNames = relationsMap.keys();
            return relationNames.filter(relationName => {
                const contextIds = relationsMap[relationName].contextIds.keys();
                return !contextIds || contextIds.length === 0;
            })
        })

        return lodash.flattenDeep(t);
    }

    private _getRelationNames(node: SpinalNode<any>) {
        const relationKeys = node.children.keys();
        const t = relationKeys.map(key => {
            const relationsMap = node.children[key];
            return relationsMap.keys();

        })

        return lodash.flattenDeep(t);
    }

    private async _bindInfoAndElement(node: SpinalNode<any>, context: SpinalContext, eventName: string, options: ISubscribeOptions = {}) {

        const nodeId = node.getId().get();

        const _temp = this.nodeBinded.get(nodeId)
        if (_temp && _temp[eventName]?.bindProcesses?.length > 0) return;

        const processes = [];
        let info = node.info;
        let element = await node.getElement(true);


        let infoProcess = info.bind(lodash.debounce(() => {
            console.log(`(${info.id.get()} info changed) spinalCore bind execution`);
            this._sendSocketEvent(node, {
                info: info.get(),
                element: element?.get()
            }, eventName)
        }, 1000), false);

        processes.push(infoProcess);

        if (element) {
            const elementProcess = element.bind(lodash.debounce(() => {
                console.log(`(${info.id.get()} element changed) spinalCore bind execution`);
                this._sendSocketEvent(node, {
                    info: info.get(),
                    element: element?.get()
                }, eventName)
            }, 1000), false);

            processes.push(elementProcess);
        }

        this._addNodeToBindedNode(node, context, eventName, options, processes);

    }

    private _addNodeToBindedNode(node: SpinalNode, context: SpinalContext, eventName: string, options: ISubscribeOptions, processes: BindProcess[]) {
        const nodeId = node.getId().get();

        let registered = this.nodeBinded.get(nodeId);
        if (!registered) {
            registered = {}
            this.nodeBinded.set(nodeId, registered);
        }

        let value = registered[eventName];

        if (!value) {
            value = { server_id: node._server_id, context_id: context?._server_id, bindProcesses: [], eventName, options };
            registered[eventName] = value;
        }

        value.bindProcesses.push(...processes);
        this.nodeBinded.set(nodeId, registered);

    }

    private async _formatNode(node: SpinalNode<any>, model?: { info: { [key: string]: any }, element: { [key: string]: any } }): Promise<any> {
        if (model) {
            return {
                info: model.info,
                element: model.element
            }
        }
        const info = node.info;
        const element = await node.getElement(true);
        return { info: info.get(), element: element && element.get() }
    }

    private async _sendSocketEvent(node: SpinalNode<any>, model: { info: { [key: string]: any }, element: { [key: string]: any } }, eventName: string, action?: IAction) {
        const status = OK_STATUS;
        const dataFormatted = await this._formatNode(node, model);
        const data = { event: action || { name: EVENT_NAMES.updated, nodeId: node.getId().get() }, node: dataFormatted };

        console.log(`(${dataFormatted.info.id} changed) send new data with socket`, data);

        this.io.to(eventName).emit(eventName, { data, status });
    }

    private _listenAddChildEvent() {
        spinalEventEmitter.on(ADD_CHILD_EVENT, async ({ nodeId, childId }) => {
            const node = await this._callbackListen(nodeId, childId, undefined, nodeId, [IScope.all, IScope.not_in_context]);
            if (node instanceof SpinalNode) {
                let action = { name: EVENT_NAMES.addChild, parentId: nodeId, nodeId: childId }
                this._sendSocketEvent(node, undefined, nodeId, action);
            }
        })
    }

    private _listenAddChildInContextEvent() {
        spinalEventEmitter.on(ADD_CHILD_IN_CONTEXT_EVENT, async ({ nodeId, childId, contextId }) => {
            const node = await this._callbackListen(nodeId, childId, contextId, nodeId, [IScope.all, IScope.not_in_context]);
            if (node instanceof SpinalNode) {
                const eventName = `${contextId}:${nodeId}`;
                let action = { name: EVENT_NAMES.addChildInContext, parentId: nodeId, nodeId: childId, contextId }
                this._sendSocketEvent(node, undefined, eventName, action);
            }
        })
    }

    private _listenRemoveChildEvent() {
        spinalEventEmitter.on(REMOVE_CHILD_EVENT, ({ nodeId, childId }) => {
            const data = this.nodeBinded.get(nodeId);
            if (data) {
                const node = SpinalGraphService.getRealNode(nodeId);
                const event = nodeId
                const action = { name: EVENT_NAMES.childRemoved, parentId: nodeId, nodeId: childId };
                this._sendSocketEvent(node, undefined, event, action)
            }
        })
    }

    private _listenAddChildrenEvent() {
        spinalEventEmitter.on(REMOVE_CHILDREN_EVENT, ({ nodeId, childrenIds }) => {
            const data = this.nodeBinded.get(nodeId);
            if (data) {
                const node = SpinalGraphService.getRealNode(nodeId);
                const event = nodeId
                const action = { name: EVENT_NAMES.childrenRemoved, parentId: nodeId, nodeIds: childrenIds };
                this._sendSocketEvent(node, undefined, event, action);
            }
        })
    }

    private _activeEventSender(node: SpinalNode<any>) {
        if (node.info.activeEventSender) node.info.activeEventSender.set(true);
        else node.info.add_attr({ activeEventSender: true });
    }


    private async _findNode(childId: string, parentId: string): Promise<SpinalNode<any>> {
        let node = SpinalGraphService.getRealNode(childId);
        if (!node && parentId) {
            const parentNode = SpinalGraphService.getRealNode(parentId);
            if (parentNode) {
                const children = await parentNode.getChildren();
                node = children.find(el => el.getId().get() === childId);
            }
        }

        return node;
    }

    private async _callbackListen(nodeId: string, childId: string, contextId: string, eventName: string, bindTypes: string[]): Promise<SpinalNode<any>> {
        const data = this.nodeBinded.get(nodeId);
        let binded = false;
        if (data) {
            const _bindTypes = data.bindTypes;
            const found = bindTypes.find(el => _bindTypes[el]);

            if (found) {
                const node = await this._findNode(nodeId, childId);
                if (node instanceof SpinalNode) {
                    const context = contextId ? SpinalGraphService.getRealNode(contextId) : undefined;
                    this.bindNode(node, context, {}, eventName);
                    return node;
                }
            }
        }
    }

}

export const spinalGraphUtils = SpinalGraphUtils.getInstance();