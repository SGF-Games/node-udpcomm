// Generated by CoffeeScript 1.3.3
(function() {
  var ALLOW_HOST1, ALLOW_HOST2, LAZY_TIMEOUT, SGF_SIGNATURE, SGF_UDP_HEAD_LENGTH, UDPHub, dgram;

  dgram = require("dgram");

  LAZY_TIMEOUT = 10000;

  ALLOW_HOST1 = "127.0.0.1";

  ALLOW_HOST2 = "localhost";

  SGF_SIGNATURE = 6258000;

  SGF_UDP_HEAD_LENGTH = 11;

  UDPHub = (function() {

    function UDPHub(listenToPort) {
      var _this = this;
      this.server = dgram.createSocket("udp4");
      this.clientPorts = {};
      this.clientChannelId = {};
      this.deadPorts = [];
      this.listenToPort = listenToPort;
      this.server.on("message", function(buf, rinfo) {
        var channelId, ip, port;
        port = rinfo.port;
        ip = rinfo.address;
        if (!(ip === ALLOW_HOST1 || ip === ALLOW_HOST2)) {
          return console.error("[UDPHub(" + _this.listenToPort + ")::onMessage] ignore msg from outside server " + ip + " ");
        }
        if (!Buffer.isBuffer(buf) || buf.length <= SGF_UDP_HEAD_LENGTH || buf.readUInt32BE(0) !== SGF_SIGNATURE) {
          return console.warn("[UDPHub(" + _this.listenToPort + ")::onMessage] invalid buf:" + buf);
        }
        channelId = buf.readUInt32BE(4);
        _this.clientPorts[port] = Date.now();
        _this.clientChannelId[port] = channelId;
        _this.broadcast(buf, channelId, port);
      });
      this.server.on("listening", function() {
        var address;
        address = _this.server.address();
        return console.info("[udphub::listening] listening " + address.address + ":" + address.port);
      });
      return;
    }

    UDPHub.prototype.start = function() {
      this.server.bind(this.listenToPort);
    };

    UDPHub.prototype.stop = function() {
      this.server.close();
    };

    UDPHub.prototype.broadcast = function(buf, channelId, ignorePort) {
      var aliveLine, port, timestamp, _i, _len, _ref, _ref1;
      console.log("[broadcast] ignorePort:" + ignorePort + ", buf.length:" + buf.length);
      ignorePort = ignorePort.toString();
      if (this.deadPorts.length > 0) {
        this.deadPorts.splice(0, this.deadPorts.length);
      }
      aliveLine = Date.now() - LAZY_TIMEOUT;
      _ref = this.clientPorts;
      for (port in _ref) {
        timestamp = _ref[port];
        if (port === ignorePort) {
          continue;
        }
        if (timestamp < aliveLine) {
          this.deadPorts.push(port);
        } else if (this.clientChannelId[port] === channelId) {
          this.server.send(buf, SGF_UDP_HEAD_LENGTH, buf.length - SGF_UDP_HEAD_LENGTH, port, "127.0.0.1");
        }
      }
      _ref1 = this.deadPorts;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        port = _ref1[_i];
        delete this.clientPorts[port];
        delete this.clientChannelId[port];
      }
    };

    return UDPHub;

  })();

  module.exports = UDPHub;

}).call(this);