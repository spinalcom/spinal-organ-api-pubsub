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

import { FileSystem, spinalCore } from "spinal-core-connectorjs";
import { ISpinalIOMiddleware, IConfig } from "./interfaces";
import { config } from "./config";
import { SpinalContext, SpinalGraph, SpinalNode } from "spinal-model-graph";
import { SpinalGraphService } from "spinal-env-viewer-graph-service";

export class Middleware implements ISpinalIOMiddleware {
  config: IConfig = <any>config;
  conn: FileSystem;
  // loadedPtr: Map<number, any>;
  iteratorGraph: AsyncGenerator<SpinalGraph, never> | undefined;

  constructor(connect?: spinal.FileSystem, argConfig?: IConfig) {
    if (argConfig) this.config = argConfig;
    if (connect) {
      this.conn = connect;
    } else {
      const protocol = this.config.spinalConnector.protocol ? this.config.spinalConnector.protocol : "http";
      const host = this.config.spinalConnector.host + (this.config.spinalConnector.port ? `:${this.config.spinalConnector.port}` : "");
      const login = `${this.config.spinalConnector.user}:${this.config.spinalConnector.password}`;

      const connect_opt = `${protocol}://${login}@${host}/`;

      this.conn = spinalCore.connect(connect_opt);
      this.iteratorGraph = this.geneGraph();
    }
  }

  private async *geneGraph(): AsyncGenerator<SpinalGraph<any>, never> {
    const init = new Promise<SpinalGraph<any>>((resolve, reject) => {
      spinalCore.load(this.conn, this.config.file.path, (graph: any) => {
        resolve(graph);
      }, () => {
        console.error(`File does not exist in location ${config.file.path}`);
        reject();
      },
      );
    });

    const graph = await init;
    while (true) {
      yield graph;
    }
  }

  public async getNode(nodeId: string | number, contextId?: string | number): Promise<SpinalNode | undefined> {

    if (!isNaN(Number(nodeId))) {
      const node = await this.getNodeWithServerId(<number>nodeId);
      if (node && node instanceof SpinalNode) SpinalGraphService._addNode(node);

      return node;
    }

    return this.getNodeWithStaticId(nodeId.toString(), contextId);
  }

  public getNodeWithServerId(server_id: number): Promise<SpinalNode | undefined> {
    return new Promise((resolve) => {
      if (typeof FileSystem._objects[server_id] !== "undefined") {
        return resolve(FileSystem._objects[server_id] as SpinalNode);
      }
      this.conn.load_ptr(server_id, (node) => {
        resolve(node as SpinalNode);
      });
    });
  }

  public async getNodeWithStaticId(nodeId: string, contextId?: string | number): Promise<SpinalNode | undefined> {
    if (nodeId === contextId) {
      return this.getContext(nodeId);
    }

    if (!contextId) throw new Error("ContextId is required when nodeId is not a static id");

    const context = await this.getContext(contextId);
    if (!(context instanceof SpinalContext)) throw new Error("Context not found");

    const found = await context.findInContext(context, (node, stop) => {
      if (node.getId().get() === nodeId) {
        SpinalGraphService._addNode(node);
        if (stop) stop();
        return true;
      }

      return false;
    });

    return Array.isArray(found) ? found[0] : found;

  }

  public async getGraph(): Promise<SpinalGraph | undefined> {
    if (!this.iteratorGraph) return;

    const g = await this.iteratorGraph.next();
    return g.value;
  }

  public async getProfileGraph(): Promise<SpinalGraph | undefined> {
    return this.getGraph();
  }

  async getContext(contextId: number | string): Promise<SpinalContext | undefined> {
    if (typeof contextId === "undefined") return;

    let context = SpinalGraphService.getRealNode(contextId.toString());
    if (context) return context;

    context = FileSystem._objects[Number(contextId)] as SpinalContext;
    if (context) return context;


    const graph = await this.getGraph();
    if (!graph) return;

    const contexts = await graph.getChildren();

    for (const ctx of contexts) {
      if (ctx.getId().get() === contextId || ctx._server_id == contextId) {
        SpinalGraphService._addNode(ctx);
        return ctx;
      }
    }

  }

}
