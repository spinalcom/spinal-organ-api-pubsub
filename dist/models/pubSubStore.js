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
// /*
//  * Copyright 2022 SpinalCom - www.spinalcom.com
//  * 
//  * This file is part of SpinalCore.
//  * 
//  * Please read all of the following terms and conditions
//  * of the Free Software license Agreement ("Agreement")
//  * carefully.
//  * 
//  * This Agreement is a legally binding contract between
//  * the Licensee (as defined below) and SpinalCom that
//  * sets forth the terms and conditions that govern your
//  * use of the Program. By installing and/or using the
//  * Program, you agree to abide by all the terms and
//  * conditions stated or referenced herein.
//  * 
//  * If you do not agree to abide by these terms and
//  * conditions, do not demonstrate your acceptance and do
//  * not install or use the Program.
//  * You should have received a copy of the license along
//  * with this file. If not, see
//  * <http://resources.spinalcom.com/licenses.pdf>.
//  */
// import { Mode } from "fs";
// import { Lst, Model, Ptr, spinalCore } from "spinal-core-connectorjs";
// import { v4 as uuidv4 } from "uuid";
// import { INodeId, ISubscribeOptions } from "../lib";
// export default class PubSubStore extends Model {
//     constructor() {
//         super();
//         this.add_attr({
//             id: uuidv4(),
//             store: new Ptr(new Model({}))
//         })
//     }
//     public addToStore(sessionId: string, nodeIds: INodeId | INodeId[]): Promise<INodeId[]> {
//         return new Promise((resolve, reject) => {
//             if (!Array.isArray(nodeIds)) nodeIds = [nodeIds];
//             this.store.load((model) => {
//                 if (!model[sessionId]) {
//                     model.add_attr({})
//                 }
//             })
//         });
//     }
// }
// spinalCore.register_models(PubSubStore);
// export { PubSubStore };
//# sourceMappingURL=pubSubStore.js.map