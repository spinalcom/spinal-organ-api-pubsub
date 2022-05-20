require("dotenv").config();

module.exports = {
  spinalConnector: {
    user: process.env.SPINAL_USER_ID || "EDIT_ME", // user id
    password: process.env.SPINAL_PASSWORD || "EDIT_ME", // user password
    host: process.env.SPINALHUB_IP || "localhost", // can be an ip address
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
