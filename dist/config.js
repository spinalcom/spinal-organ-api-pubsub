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
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv").config();
exports.config = {
    spinalConnector: {
        user: process.env.SPINAL_USER_ID || "EDIT_ME",
        password: process.env.SPINAL_PASSWORD || "EDIT_ME",
        protocol: process.env.SPINALHUB_PROTOCOL,
        host: process.env.SPINALHUB_HOST || "localhost",
        port: process.env.SPINALHUB_PORT || 10120, // port
    },
    server: {
        port: process.env.REQUESTS_PORT || 3000, // internal port
    },
    file: {
        // path to a digital twin in spinalhub filesystem
        path: process.env.SPINAL_DTWIN_PATH || "EDIT_ME",
    },
    runLocalServer: process.env.RUN_LOCAL_SERVER || false, // Change it to true, if you want run the local server
};
exports.default = exports.config;
//# sourceMappingURL=config.js.map