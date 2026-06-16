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
exports._formatNode = exports.checkAndFormatNodeData = exports.checkAndFormatIds = exports.getPortValid = void 0;
const interfaces_1 = require("../interfaces");
const constants_1 = require("../constants");
const spinal_model_graph_1 = require("spinal-model-graph");
const lodash = require("lodash");
const net = require("net");
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
        server.once("error", () => resolve(false));
        server.once("listening", () => {
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
function checkAndFormatNodeData(nodeData) {
    const { node, contextNode, error: _error, nodeId, contextId, options } = nodeData;
    if (!node)
        return { error: _error || `the node ${nodeId} is not found`, nodeId, status: constants_1.NOK_STATUS, node, contextNode };
    let error = _error || _checkError({ nodeId, contextId }, node, contextNode, options);
    if (error)
        return { error, nodeId, status: constants_1.NOK_STATUS, node, contextNode };
    let roomId = node.getId().get();
    return { error: error || "", nodeId, status: constants_1.OK_STATUS, eventNames: [roomId], options, node, contextNode };
}
exports.checkAndFormatNodeData = checkAndFormatNodeData;
function _formatNode(node, model) {
    return __awaiter(this, void 0, void 0, function* () {
        if (model) {
            return Object.assign({ dynamicId: (model === null || model === void 0 ? void 0 : model.dynamicId) || node._server_id, info: model.info, element: model.element }, (model.attributes ? { attributes: model.attributes } : {}));
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
    return ids.map((id) => (Object.assign(Object.assign({}, _formatId(id)), { options: options || _getOptions(id) })));
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
    let node = { nodeId: "", contextId: undefined };
    if (typeof id === "string") {
        const [contextId, nodeId] = id.split("/");
        if (contextId && nodeId) {
            node.nodeId = nodeId;
            node.contextId = contextId;
        }
        else if (contextId && !nodeId) {
            node.nodeId = contextId;
        }
    }
    else if (typeof id === "number") {
        node.nodeId = id;
    }
    else if (typeof id === "object") {
        node = id;
    }
    return node;
}
function _getOptions(id) {
    if (typeof id === "string" || typeof id === "number")
        return { subscribeChildren: false };
    if (id.options)
        return id.options;
    return { subscribeChildren: false };
}
function _removeDuplicate(nodes) {
    const obj = {};
    for (const item of nodes) {
        const { node, contextNode, options, nodeId } = item;
        const id = _getKey(node, contextNode, options);
        obj[id] = item;
    }
    return Array.from(Object.values(obj));
}
function _getKey(node, context, options) {
    // join all values with underscore to create a unique key for the subscription
    //(don't remove undefined or null values because they are important to differentiate between different subscriptions)
    return `${node === null || node === void 0 ? void 0 : node._server_id}_${context === null || context === void 0 ? void 0 : context._server_id}_${options === null || options === void 0 ? void 0 : options.subscribeChildScope}_${options === null || options === void 0 ? void 0 : options.subscribeChildren}`;
    // // remove undefined and null values and join with underscore
    // const ids = [node?._server_id, context?._server_id, options?.subscribeChildScope, options?.subscribeChildren];
    // return ids.filter(id => id !== undefined && id !== null).join('_');
}
function _checkError(ids, node, context, options) {
    if (!node || !(node instanceof spinal_model_graph_1.SpinalNode)) {
        return !node ? `${ids.nodeId} is not found` : `${ids.nodeId} must be a spinalNode, SpinalContext`;
    }
    // if the subscription is for children in context, we need to check if the context is valid
    if ((options === null || options === void 0 ? void 0 : options.subscribeChildScope) && [interfaces_1.IScope.in_context, interfaces_1.IScope.tree_in_context].includes(options.subscribeChildScope)) {
        const contextError = _checkContextError(ids.contextId, context);
        if (contextError)
            return contextError;
    }
    // if(options?.subscribeChildren && options?.)
    // if (options?.subscribeChildren && options?.subscribeChildScope !== undefined && [IScope.in_context, IScope.tree_in_context].includes(options.subscribeChildScope))
    //   return _checkContextError(ids.contextId, context);
}
function _checkContextError(contextId, context) {
    if (context instanceof spinal_model_graph_1.SpinalContext)
        return;
    let error, subString;
    if (!contextId)
        subString = `you did not specify the context id`;
    else
        subString = `${contextId} is no node found for context id`;
    error = `You try to subscribe some data in context but, ${subString}`;
    return error;
}
//# sourceMappingURL=SocketHandlerUtils.js.map