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

import { Server, Socket } from "socket.io";
import { checkAndFormatIds, getRoomNameFunc, spinalGraphUtils } from "../utils";
import { OK_STATUS, SUBSCRIBE_EVENT, SUBSCRIBED, INodeId, SESSION_EVENT, INodeData, IGetNodeRes, UNSUBSCRIBE_EVENT, UNSUBSCRIBED } from '../lib';
import sessionStore from "./SessionStore";


export class SocketHandler {
    constructor(private io: Server) {
        this.connection();
    }

    public connection() {
        this.io.on("connection", async (socket: Socket) => {
            const sessionId = this._getSessionId(socket);
            socket.emit(SESSION_EVENT, sessionId);
            console.log(`${sessionId} is connected`);

            const old_subscribed_data = sessionStore.getSubscribedData(sessionId);
            if (old_subscribed_data && old_subscribed_data.length > 0) await this._subscribe(socket, old_subscribed_data, false);

            this.listenSubscribeEvent(socket);
            this.listenUnsubscribeEvent(socket);
            this.listenDisconnectEvent(socket);
        })
    }

    public listenSubscribeEvent(socket: Socket) {
        socket.on(SUBSCRIBE_EVENT, async (...args) => {
            const sessionId = this._getSessionId(socket);
            console.log("get subscribe request from", sessionId);
            this._subscribe(socket, args)
        })
    }

    public listenUnsubscribeEvent(socket: Socket) {
        socket.on(UNSUBSCRIBE_EVENT, async (...args) => {
            const sessionId = socket["sessionId"];
            console.log("received unsubscribe request from", sessionId);
            const { obj: nodes, ids: idsFormatted } = await this._checkAndFormatParams(args);
            const result = idsFormatted.map((item) => getRoomNameFunc(item.nodeId, item.contextId, nodes, item.options));
            const idsToRemove = await this._leaveRoom(socket, result, nodes);
            socket.emit(UNSUBSCRIBED, result.length == 1 ? result[0] : result);

            sessionStore.deleteSubscriptionData(sessionId, idsToRemove);
        })
    }

    public listenDisconnectEvent(socket: Socket) {
        socket.on("disconnect", (reason) => {
            console.log(`${socket["sessionId"]} is disconnected for reason : ${reason}`);
        })
    }


    //////////////////////////////////////////
    //              PRIVATES                //
    //////////////////////////////////////////


    private async _subscribe(socket: Socket, ids: INodeId[], save: boolean = true) {
        const sessionId = this._getSessionId(socket);

        const { obj: nodes, ids: idsFormatted } = await this._checkAndFormatParams(ids);

        const result = idsFormatted.map((item) => getRoomNameFunc(item.nodeId, item.contextId, nodes, item.options));

        for (const obj of result) {
            socket.emit(SUBSCRIBED, obj);
        }

        const idsToSave = await this._bindNodes(socket, result, nodes);

        if (save) sessionStore.saveSubscriptionData(sessionId, idsToSave);
    }

    private _checkAndFormatParams(args, oldIds?: INodeId[]): Promise<{ ids: INodeData[], obj: { [ke: string]: INodeData } }> {
        let options = args[args.length - 1];
        options = typeof options === "object" ? options : {};
        let ids = args.slice(0, args.length - 1).concat(oldIds || []);

        return checkAndFormatIds(ids, options);
    }

    private _bindNodes(socket: Socket, result: IGetNodeRes[], nodes: { [key: string]: INodeData }): Promise<INodeId[]> {
        return result.reduce(async (prom, { error, nodeId, status, eventNames, options }) => {
            const arr = await prom
            if (!error && status === OK_STATUS) {
                const { node, contextNode } = nodes[nodeId];
                eventNames.forEach(roomId => socket.join(roomId));

                await spinalGraphUtils.bindNode(node, contextNode, options, undefined, socket);
                arr.push({
                    nodeId: node.getId().get(),
                    contextId: contextNode.getId().get(),
                    options
                })
            }

            return arr;
        }, Promise.resolve([]));
    }

    private _leaveRoom(socket: Socket, result: IGetNodeRes[], nodes: { [key: string]: INodeData }): INodeId[] {
        return result.reduce((arr, { error, nodeId, status, eventNames, options }) => {
            if (!error && status === OK_STATUS) {
                const { node, contextNode } = nodes[nodeId];
                eventNames.forEach(roomId => socket.leave(roomId));

                arr.push({
                    nodeId: node.getId().get(),
                    contextId: contextNode.getId().get(),
                    options
                })
            }

            return arr;
        }, []);
    }

    private _getSessionId(socket: Socket): string {
        if (socket["sessionId"]) return socket["sessionId"];

        const { auth, header, query } = (<any>socket.handshake);
        return auth?.sessionId || header?.sessionId || query?.sessionId;
    }
}

export default SocketHandler;