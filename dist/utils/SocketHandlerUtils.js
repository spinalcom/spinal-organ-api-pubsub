"use strict";
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
exports._formatNode = exports.getRoomNameFunc = exports.checkAndFormatIds = exports.getPortValid = void 0;
const interfaces_1 = require("../interfaces");
const constants_1 = require("../constants");
const spinal_model_graph_1 = require("spinal-model-graph");
const lodash = require("lodash");
const net = require('net');
function getPortValid(port = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        let validPort = port;
        let success = false;
        do {
            success = yield checkPortAvailability(validPort);
            if (!success) {
                validPort++;
            }
        } while (!success);
        return validPort;
    });
}
exports.getPortValid = getPortValid;
function checkPortAvailability(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true); // Le port est disponible
        });
        server.listen(port);
    });
}
function checkAndFormatIds(socket, spinalIOMiddleware, nodeIds, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const idsFormatted = _structureDataFunc(nodeIds, options);
        const nodes = yield _getNodes(socket, spinalIOMiddleware, idsFormatted);
        return _removeDuplicate(nodes);
    });
}
exports.checkAndFormatIds = checkAndFormatIds;
function getRoomNameFunc(nodeId, contextId, obj, options) {
    const { node, contextNode: context, error: _error } = obj[nodeId];
    let error = _error || _checkError({ nodeId, contextId }, node, context, options);
    if (error)
        return { error, nodeId, status: constants_1.NOK_STATUS };
    let roomId = node.getId().get();
    return { error, nodeId, status: constants_1.OK_STATUS, eventNames: [roomId], options };
}
exports.getRoomNameFunc = getRoomNameFunc;
function _formatNode(node, model) {
    return __awaiter(this, void 0, void 0, function* () {
        if (model) {
            return {
                dynamicId: (model === null || model === void 0 ? void 0 : model.dynamicId) || node._server_id,
                info: model.info,
                element: model.element,
            };
        }
        const info = node.info;
        const element = yield node.getElement(true);
        return { dynamicId: node._server_id, info: info.get(), element: element && element.get() };
    });
}
exports._formatNode = _formatNode;
/////////////////////////////////////////////////////////
//                  PRIVATES                           //
/////////////////////////////////////////////////////////
function _structureDataFunc(ids, options) {
    ids = lodash.flattenDeep(ids);
    return ids.map((id) => (Object.assign(Object.assign({}, _formatId(id)), { options: _getOptions(id) || options })));
}
function _getNodes(socket, spinalMiddleware, ids) {
    const promises = ids.map(({ nodeId, contextId, options }) => __awaiter(this, void 0, void 0, function* () {
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
            res.contextNode = yield spinalMiddleware.getContext(contextId, socket);
            res.node = yield spinalMiddleware.getNode(nodeId, contextId, socket);
        }
        catch (error) {
            res.error = error.message;
        }
        return res;
    }));
    return Promise.all(promises);
}
function _formatId(id) {
    let node = { nodeId: undefined, contextId: undefined };
    if (typeof id === 'string') {
        const ids = id.split('/');
        node.nodeId = ids.length <= 1 ? ids[0] : ids[1];
        node.contextId = ids.length <= 1 ? undefined : ids[0];
    }
    else if (typeof id === 'number') {
        node.nodeId = id;
    }
    else if (typeof id === 'object') {
        node = id;
    }
    return node;
}
function _getOptions(id) {
    if (typeof id === 'string' || typeof id === 'number')
        return;
    if (id.options)
        return id.options;
}
function _removeDuplicate(nodes) {
    const obj = {};
    const data = nodes.reduce((res, item) => {
        const { node, contextNode, options, nodeId } = item;
        const id = `${node === null || node === void 0 ? void 0 : node._server_id}_${contextNode === null || contextNode === void 0 ? void 0 : contextNode._server_id}_${options.subscribeChildScope}_${options.subscribeChildren}`;
        if (!res[id]) {
            obj[nodeId] = item;
            res[id] = item;
        }
        return res;
    }, {});
    const ids = Object.values(data);
    return { obj, ids: Array.from(ids) };
}
function _checkError(ids, node, context, options) {
    if (!node || !(node instanceof spinal_model_graph_1.SpinalNode)) {
        return !node ? `${ids.nodeId} is not found` : `${ids.nodeId} must be a spinalNode, SpinalContext`;
    }
    if (!context || !(context instanceof spinal_model_graph_1.SpinalContext)) {
        return !context ? `the context ${ids.contextId} is not found` : `${ids.contextId} must be a SpinalContext`;
    }
    if (options.subscribeChildren && [interfaces_1.IScope.in_context, interfaces_1.IScope.tree_in_context].includes(options.subscribeChildScope))
        return _checkContextError(ids.contextId, context);
}
function _checkContextError(contextId, context) {
    if (context instanceof spinal_model_graph_1.SpinalContext)
        return;
    let error, subString;
    if (!contextId)
        subString = `you did not specify the context id`;
    else
        subString = `${contextId} is not a valid context id`;
    error = `You try to subscribe some data in context but, ${subString}`;
    return error;
}
//# sourceMappingURL=SocketHandlerUtils.js.map