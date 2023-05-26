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
exports._formatNode = exports.getRoomNameFunc = exports.checkAndFormatIds = void 0;
const interfaces_1 = require("../interfaces");
const constants_1 = require("../constants");
const spinal_model_graph_1 = require("spinal-model-graph");
const lodash = require("lodash");
function checkAndFormatIds(socket, spinalIOMiddleware, nodeIds, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const idsFormatted = _structureDataFunc(nodeIds, options);
        const nodes = yield _getNodes(socket, spinalIOMiddleware, idsFormatted);
        return _removeDuplicate(nodes);
    });
}
exports.checkAndFormatIds = checkAndFormatIds;
function getRoomNameFunc(nodeId, contextId, obj, options) {
    var _a, _b;
    const node = (_a = obj[nodeId]) === null || _a === void 0 ? void 0 : _a.node;
    const context = (_b = obj[nodeId]) === null || _b === void 0 ? void 0 : _b.contextNode;
    let error = obj[nodeId].error;
    if (error) {
        return { error, nodeId, status: constants_1.NOK_STATUS };
    }
    if (!node || !(node instanceof spinal_model_graph_1.SpinalNode)) {
        error = !node
            ? `${nodeId} is not found`
            : `${nodeId} must be a spinalNode, SpinalContext`;
        // error = new Error(message);
        return { error, nodeId, status: constants_1.NOK_STATUS };
    }
    if (!context || !(context instanceof spinal_model_graph_1.SpinalContext)) {
        error = !context
            ? `the context ${contextId} is not found`
            : `${contextId} must be a SpinalContext`;
        // error = new Error(message);
        return { error, nodeId, status: constants_1.NOK_STATUS };
    }
    let roomId = node.getId().get();
    let eventNames = [roomId];
    if (options.subscribeChildren &&
        [interfaces_1.IScope.in_context, interfaces_1.IScope.tree_in_context].indexOf(options.subscribeChildScope) !== -1) {
        if (!context || !(context instanceof spinal_model_graph_1.SpinalContext)) {
            let contextError;
            if (!contextId)
                contextError = `you did not specify the context id`;
            else
                contextError = `${contextId} is not a valid context id`;
            error = `You try to subscribe somme data in context but, ${contextError}`;
            return { error, nodeId, status: constants_1.NOK_STATUS };
        }
        const namespaceId = context.getId().get();
        eventNames.push(`${namespaceId}:${roomId}`);
    }
    return {
        error,
        nodeId,
        status: constants_1.OK_STATUS,
        eventNames,
        options,
    };
}
exports.getRoomNameFunc = getRoomNameFunc;
function _formatNode(node, model) {
    return __awaiter(this, void 0, void 0, function* () {
        if (model) {
            return {
                info: model.info,
                element: model.element,
            };
        }
        const info = node.info;
        const element = yield node.getElement(true);
        return { info: info.get(), element: element && element.get() };
    });
}
exports._formatNode = _formatNode;
/////////////////////////////////////////////////////////
//                  PRIVATES                           //
/////////////////////////////////////////////////////////
function _structureDataFunc(ids, options) {
    ids = lodash.flattenDeep(ids);
    // let options = args[args.length - 1];
    // options = typeof options === "object" ? options : {};
    return ids.map((id) => (Object.assign(Object.assign({}, _formatId(id)), { options: _getOptions(id) || options })));
}
function _getNodes(socket, spinalMiddleware, ids) {
    // const obj = {};
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
    // const idsToSave = [];
    const obj = {};
    const data = nodes.reduce((arr, item) => {
        const found = arr.find(({ node, contextNode, options }) => {
            var _a, _b;
            return ((node === null || node === void 0 ? void 0 : node._server_id) === ((_a = item.node) === null || _a === void 0 ? void 0 : _a._server_id) &&
                (contextNode === null || contextNode === void 0 ? void 0 : contextNode._server_id) === ((_b = item.contextNode) === null || _b === void 0 ? void 0 : _b._server_id) &&
                options.subscribeChildScope === item.options.subscribeChildScope &&
                options.subscribeChildren === item.options.subscribeChildren);
        });
        if (!found) {
            obj[item.nodeId] = item;
            // if (item.node && item.contextNode) {
            //     idsToSave.push({
            //         nodeId: item.node.getId().get(),
            //         contextId: item.contextNode.getId().get(),
            //         options: item.options
            //     })
            // }
            return arr.concat([item]);
        }
        return arr;
    }, []);
    return { obj, ids: data };
}
// function _getNodeToSave(nodes: INodeData[]): INodeId[] {
//     return nodes.reduce((arr,item) => {
//     },[])
// }
//# sourceMappingURL=SocketHandlerUtils.js.map