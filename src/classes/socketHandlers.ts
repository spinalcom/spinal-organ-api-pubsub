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

    connection() {
        this.io.on("connection", (socket: Socket) => {
            const sessionId = socket["sessionID"];
            socket.emit(SESSION_EVENT, sessionId);
            console.log(`${sessionId} is connected`);

            const old_subscribed_data = sessionStore.getSubscribedData(sessionId);

            console.log(old_subscribed_data);

            this.subscribe(socket, old_subscribed_data);
            this.unsubscribe(socket);
            this.disconnect(socket);
        })
    }

    subscribe(socket: Socket, oldIds?: INodeId[]) {
        socket.on(SUBSCRIBE_EVENT, async (...args) => {
            const sessionId = socket["sessionID"];
            console.log("received subscribe request from", sessionId);

            const { obj: nodes, ids: idsFormatted } = await this._checkAndFormatParams(args, oldIds);

            const result = idsFormatted.map((item) => getRoomNameFunc(item.nodeId, item.contextId, nodes, item.options));

            socket.emit(SUBSCRIBED, result.length == 1 ? result[0] : result);

            const idsToSave = await this._bindNodes(socket, result, nodes);

            sessionStore.saveSubscriptionData(sessionId, idsToSave);

        })
    }

    unsubscribe(socket: Socket) {
        socket.on(UNSUBSCRIBE_EVENT, async (...args) => {
            const sessionId = socket["sessionID"];
            console.log("received unsubscribe request from", sessionId);
            const { obj: nodes, ids: idsFormatted } = await this._checkAndFormatParams(args);
            const result = idsFormatted.map((item) => getRoomNameFunc(item.nodeId, item.contextId, nodes, item.options));
            const idsToRemove = await this._leaveRoom(socket, result, nodes);
            socket.emit(UNSUBSCRIBED, result.length == 1 ? result[0] : result);

            sessionStore.deleteSubscriptionData(sessionId, idsToRemove);
        })
    }

    disconnect(socket: Socket) {
        socket.on("disconnect", (reason) => {
            console.log(`${socket["sessionID"]} is disconnected for reason : ${reason}`);
        })
    }

    private _checkAndFormatParams(args, oldIds?: INodeId[]): Promise<{ ids: INodeData[], obj: { [ke: string]: INodeData } }> {
        let options = args[args.length - 1];
        options = typeof options === "object" ? options : {};
        let ids = args.slice(0, args.length - 1).concat(oldIds || []);

        return checkAndFormatIds(ids, options);
    }

    private _bindNodes(socket: Socket, result: IGetNodeRes[], nodes: { [key: string]: INodeData }): INodeId[] {
        return result.reduce((arr, { error, nodeId, status, eventNames, options }) => {
            if (!error && status === OK_STATUS) {
                const { node, contextNode } = nodes[nodeId];
                eventNames.forEach(roomId => socket.join(roomId));

                spinalGraphUtils.bindNode(node, contextNode, options);
                arr.push({
                    nodeId: node.getId().get(),
                    contextId: contextNode.getId().get(),
                    options
                })
            }

            return arr;
        }, []);
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
}

export default SocketHandler;