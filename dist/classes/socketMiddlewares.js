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
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeMiddleWare = void 0;
const uuid_1 = require("uuid");
function storeMiddleWare(io) {
    io.use((socket, next) => {
        const sessionID = socket.handshake.auth.sessionId || socket.handshake.query.sessionId;
        if (!sessionID) {
            socket.sessionId = (0, uuid_1.v4)();
        }
        else {
            socket.sessionId = sessionID;
        }
        next();
    });
}
exports.storeMiddleWare = storeMiddleWare;
//# sourceMappingURL=socketMiddlewares.js.map