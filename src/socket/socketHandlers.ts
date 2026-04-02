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

import { Server, Socket as SocketIOBase } from "socket.io";
import { _formatNode, checkAndFormatIds, checkAndFormatNodeData, spinalGraphUtils } from "../utils";
import { INodeId, INodeData, IGetNodeRes, IAction, ISpinalIOMiddleware, IRecursionArg, ISubscribeOptions } from "../interfaces";
import { OK_STATUS, SUBSCRIBE_EVENT, SUBSCRIBED, SESSION_EVENT, UNSUBSCRIBE_EVENT, UNSUBSCRIBED, EVENT_NAMES, ERROR_EVENT, NOK_STATUS } from "../constants";

// Extend Socket type to include sessionId
interface SocketWithSession extends SocketIOBase {
	sessionId?: string;
}

type Socket = SocketWithSession;

import { SessionStore } from "../store";
import { v4 as uuidv4 } from "uuid";
import { SpinalNode } from "spinal-model-graph";
import { UpdateDataType } from "../types";
import { send } from "process";

const sessionStore = SessionStore.getInstance();



export class SocketHandler {
	subscriptionMap: Map<string, { [key: string]: INodeId[] }> = new Map();

	constructor(private io: Server, private spinalIOMiddleware: ISpinalIOMiddleware) {
		if (this.spinalIOMiddleware.tokenCheckMiddleware != undefined) this.spinalIOMiddleware.tokenCheckMiddleware(this.io);

		this._setSessionMiddleware();
		this.listenConnectionEvent();
	}

	public saveSubscriptionData(sessionId: string, eventName: string, subscription_data: INodeId) {
		const data = this.subscriptionMap.get(eventName) || {};
		if (!data[sessionId]) data[sessionId] = [];

		data[sessionId].push(subscription_data);

		// remove duplicates
		data[sessionId] = Array.from(new Set(data[sessionId].map((v) => JSON.stringify(v)))).map((v) => JSON.parse(v));

		this.subscriptionMap.set(eventName, data);
	}

	public getSubscriptionData(eventName: string, sessionId: string): INodeId[] {
		const data = this.subscriptionMap.get(eventName);
		if (!data) return [];
		return data[sessionId] || [];
	}

	public listenConnectionEvent() {
		this.io.on("connection", async (socket: Socket) => {
			const sessionId = this._getSessionId(socket);

			socket.emit(SESSION_EVENT, sessionId);

			console.log(`${sessionId} is connected`);

			this.listenSubscribeEvent(socket);
			this.listenUnsubscribeEvent(socket);
			this.listenDisconnectEvent(socket);
		});
	}

	public listenSubscribeEvent(socket: Socket) {
		socket.on(SUBSCRIBE_EVENT, async (...args) => {
			const sessionId = this._getSessionId(socket);
			console.log("get subscribe request from", sessionId);
			await this._subscribe(socket, args);
		});
	}

	public listenUnsubscribeEvent(socket: Socket) {
		socket.on(UNSUBSCRIBE_EVENT, async (...args) => {
			const sessionId = this._getSessionId(socket);
			console.log("received unsubscribe request from", sessionId);
			const nodes = await this._checkAndFormatParams(socket, args);
			const result = nodes.map((item) => checkAndFormatNodeData(item));

			const idsToRemove = await this._leaveRoom(socket, result);

			await sessionStore.deleteSubscriptionData(sessionId, idsToRemove);
		});
	}

	public listenDisconnectEvent(socket: Socket) {
		socket.on("disconnect", async (reason) => {
			const sessionId = this._getSessionId(socket);
			console.log(`${sessionId} is disconnected for reason : ${reason}`);
		});
	}

	public async sendSocketEvent(node: SpinalNode, model: UpdateDataType, eventName: string, action?: IAction, socket?: Socket) {
		const status = OK_STATUS;
		const dataFormatted = await _formatNode(node, model);
		const data = {
			event: action || { name: eventName, type: EVENT_NAMES.updated, nodeId: node.getId().get() },
			node: dataFormatted,
		};

		console.log(`[${dataFormatted.info.name}] changed! send new data to socket`, data);

		const sockets = socket ? [socket] : await this._getAllSocketInRooms(eventName);

		for (const _socket of sockets || []) {
			const sessionId = this._getSessionId(_socket);
			const subscription_data = this.getSubscriptionData(eventName, sessionId);
			_socket.emit(eventName, { data: { ...data, subscription_data }, status });
		}
	}

	//////////////////////////////////////////
	//              PRIVATES                //
	//////////////////////////////////////////

	private async _subscribe(socket: Socket, ids: INodeId[], save: boolean = true) {
		const sessionId = this._getSessionId(socket);

		const nodesData = await this._checkAndFormatParams(socket, ids);

		const result = nodesData.map((nodeData) => checkAndFormatNodeData(nodeData));

		// for (const obj of result) {
		// 	socket.emit(SUBSCRIBED, obj);
		// }

		const idsToSave = await this._launchNodeBinding(socket, result, sessionId);

		// if (save) await sessionStore.saveSubscriptionData(sessionId, idsToSave);
	}

	private _launchNodeBinding(socket: Socket, result: IGetNodeRes[], sessionId: string): Promise<INodeId[]> {

		const promises = [];

		for (const item of result) {
			const { error, nodeId, status, options } = item;
			if (error || status === NOK_STATUS) {
				// if there's an error, we emit it to the socket and skip the binding for this node
				socket.emit(SUBSCRIBED, { error, nodeId, status });
				continue;
			}

			// const { node, contextNode, subscription_data } = nodes[nodeId];
			const recursionArg: IRecursionArg = { node: item.node, context: item.contextNode, options, eventName: undefined, socket, subscription_data: item.subscription_data };
			promises.push(this._bindNodeChildren(recursionArg));
		}

		return Promise.allSettled(promises).then((result) => {
			const arr = [];

			for (const element of result) {
				if (element.status === "fulfilled") {
					const value = element.value;
					arr.push(value);
				}
			}

			return arr;
		})

		// return result.reduce(async (prom, { error, nodeId, status, eventNames, options }) => {
		// 	const arr = await prom;
		// 	if (error && status !== OK_STATUS) return arr;

		// 	const { node, contextNode, subscription_data } = nodes[nodeId];

		// 	const recursionArg: IRecursionArg = { node, context: contextNode, options, eventName: undefined, socket, subscription_data };

		// 	await spinalGraphUtils.bindNodeChildren(recursionArg);
		// 	arr.push({ nodeId: node.getId().get(), contextId: contextNode?.getId().get(), options });

		// 	return arr;

		// }, Promise.resolve([]));
	}

	private async _bindNodeChildren(arg: IRecursionArg): Promise<INodeId> {
		return spinalGraphUtils.bindNodeChildren(arg)
			.then((result) => {
				if (!arg.node) throw new Error("Node not found");

				return { nodeId: arg.node?.getId().get(), contextId: arg.context?.getId().get(), options: arg.options };
			})
	}


	public _joinRoom(socket: Socket, subscription_data: INodeId, eventNames: string[]) {
		const sessionId = this._getSessionId(socket);
		return eventNames.map((roomId) => {
			// this.saveSubscriptionData(sessionId, roomId, subscription_data);
			socket.join(roomId);
			return roomId;
		});
	}

	private async _leaveRoom(socket: Socket, result: IGetNodeRes[]): Promise<INodeId[]> {
		const resultFiltered = [];

		for (const item of result) {
			const { error, nodeId, status, options } = item;
			if (error && status !== OK_STATUS) continue;

			// const { node, contextNode } = nodes[nodeId];
			if (!item.node) continue;
			//TODO : socket.leave for all rooms related to the node
			// I don't call socket.leave because not integredated yet

			resultFiltered.push({ nodeId: item.node?.getId().get(), contextId: item.contextNode?.getId().get(), options });
		}

		return resultFiltered;

		// return result.reduce(async (prom, { error, nodeId, status, options }) => {

		// 	let arr = await prom;

		// 	if (!error && status === OK_STATUS) {
		// 		const { node, contextNode, subscription_data } = nodes[nodeId];

		// 		const recursionArg: IRecursionArg = { node, context: contextNode, options, eventName: undefined, socket, subscription_data };

		// 		// await spinalGraphUtils.bindNodeChildren(recursionArg, (arg: IRecursionArg) => {
		// 		// 	if (!arg.eventName || !arg.socket) return;
		// 		// 	arg.socket.emit(UNSUBSCRIBED, arg.eventName);
		// 		// 	arg.socket.leave(arg.eventName);
		// 		// });


		// 		// await spinalGraphUtils.bindNodeChildren(recursionArg, (arg: IRecursionArg) => {
		// 		// 	if (!arg.eventName || !arg.socket) return;
		// 		// 	arg.socket.emit(UNSUBSCRIBED, arg.eventName);
		// 		// 	arg.socket.leave(arg.eventName);
		// 		// });

		// 		arr.push({ nodeId: node.getId().get(), contextId: contextNode.getId().get(), options });
		// 	}

		// 	return arr;
		// }, Promise.resolve([]));
	}


	private _checkAndFormatParams(socket: Socket, args: any[], oldIds?: INodeId[]): Promise<INodeData[]> {
		let options = args[args.length - 1];
		options = typeof options === "object" ? options : {};
		let ids = args.slice(0, args.length - 1).concat(oldIds || []);

		return checkAndFormatIds(socket, this.spinalIOMiddleware, ids, options);
	}

	public _getSessionId(socket: Socket): string {
		if (socket.sessionId) return socket.sessionId;

		const { auth, header, query } = socket.handshake as any;
		return auth?.sessionId || header?.sessionId || query?.sessionId;
	}

	////////////////////////////////////////////////
	//                  Middlewares               //
	////////////////////////////////////////////////

	private _setSessionMiddleware() {
		this.io.use((socket: any, next) => {
			socket.sessionId = socket.handshake.auth.sessionId || socket.handshake.query.sessionId || uuidv4();
			next();
		});
	}

	private _getAllSocketInRooms(roomName: string): Socket[] {
		const socketIdSet = this.io.sockets.adapter.rooms.get(roomName);
		if (!socketIdSet) return [];

		return Array.from(socketIdSet).map((id) => {
			return this.io.sockets.sockets.get(id) as Socket;
		});
	}
}

export default SocketHandler;
