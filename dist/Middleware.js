"use strict";
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
exports.Middleware = void 0;
const spinal_core_connectorjs_1 = require("spinal-core-connectorjs");
const config_1 = require("./config");
const spinal_model_graph_1 = require("spinal-model-graph");
const spinal_env_viewer_graph_service_1 = require("spinal-env-viewer-graph-service");
class Middleware {
    constructor(connect, argConfig) {
        this.config = config_1.config;
        if (argConfig)
            this.config = argConfig;
        if (connect)
            this.conn = connect;
        else {
            const protocol = this.config.spinalConnector.protocol ? this.config.spinalConnector.protocol : 'http';
            const host = this.config.spinalConnector.host + (this.config.spinalConnector.port ? `:${this.config.spinalConnector.port}` : '');
            const login = `${this.config.spinalConnector.user}:${this.config.spinalConnector.password}`;
            const connect_opt = `${protocol}://${login}@${host}/`;
            this.conn = spinal_core_connectorjs_1.spinalCore.connect(connect_opt);
        }
    }
    getNode(nodeId, contextId) {
        return __awaiter(this, void 0, void 0, function* () {
            //@ts-ignore
            if (!isNaN(nodeId)) {
                const node = yield this.getNodeWithServerId(nodeId);
                //@ts-ignore
                if (node && node instanceof spinal_model_graph_1.SpinalNode)
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
            this.conn.load_ptr(server_id, (node) => {
                resolve(node);
            });
        });
    }
    getNodeWithStaticId(nodeId, contextId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (nodeId === contextId) {
                return this.getContext(nodeId);
            }
            const context = yield this.getContext(contextId);
            if (context instanceof spinal_model_graph_1.SpinalContext) {
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
            }
        });
    }
    getGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            return spinal_env_viewer_graph_service_1.SpinalGraphService.getGraph();
        });
    }
    getProfileGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            return spinal_env_viewer_graph_service_1.SpinalGraphService.getGraph();
        });
    }
    getContext(contextId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof contextId === "undefined")
                return;
            let node = spinal_env_viewer_graph_service_1.SpinalGraphService.getRealNode(contextId.toString());
            if (node)
                return node;
            node = spinal_core_connectorjs_1.FileSystem._objects[contextId];
            if (node)
                return node;
            const graph = yield this.getGraph();
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
}
exports.Middleware = Middleware;
//# sourceMappingURL=Middleware.js.map