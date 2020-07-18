const os = require('os');

function testAgent() {
  return {
    arch: os.arch(),
    platform: os.platform(),
    cpus: {
      cores: os.cpus().length,
      model: os.cpus()[0].model,
      speed: os.cpus()[0].speed
    },
    freeMem: os.freemem(),
    release: os.release(),
    totalMem: os.totalmem(),
    type: os.type(),
    endianness: os.endianness()
  };
}

module.exports = { testAgent };
