// Generated by CoffeeScript 1.6.3
(function() {
  var LAZY_TIMEOUT, SGF_UDP_HEAD_LENGTH, SIGNATURE, UDPHub, debuglog, dgram;

  dgram = require("dgram");

  debuglog = require("debug")("udpcomm::UDPHub");

  LAZY_TIMEOUT = 10000;

  SIGNATURE = 6258000;

  SGF_UDP_HEAD_LENGTH = 11;

  UDPHub = (function() {
    function UDPHub(listenToPort, host) {
      var _this = this;
      this.listenToPort = listenToPort;
      this.host = host != null ? host : "127.0.0.1";
      this.server = dgram.createSocket("udp4");
      this.clientPorts = {};
      this.clientChannelId = {};
      this.deadPorts = [];
      this.server.on("message", function(buf, rinfo) {
        var channelId, ip, port;
        port = rinfo.port;
        ip = rinfo.address;
        if (ip !== _this.host) {
          return console.error("[UDPHub(" + _this.listenToPort + ")::onMessage] ignore msg from outside server " + ip + " ");
        }
        if (!Buffer.isBuffer(buf) || buf.length <= SGF_UDP_HEAD_LENGTH || buf.readUInt32BE(0) !== SIGNATURE) {
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
        debuglog("[on listening] listening " + address.address + ":" + address.port);
      });
      return;
    }

    UDPHub.prototype.start = function() {
      debuglog("[start] " + this.host + ":" + this.listenToPort);
      this.server.bind(this.listenToPort, this.host);
    };

    UDPHub.prototype.stop = function() {
      this.server.close();
    };

    UDPHub.prototype.broadcast = function(buf, channelId, ignorePort) {
      var aliveLine, port, timestamp, _i, _len, _ref, _ref1;
      ignorePort = ignorePort.toString();
      this.deadPorts.length = 0;
      aliveLine = Date.now() - LAZY_TIMEOUT;
      _ref = this.clientPorts;
      for (port in _ref) {
        timestamp = _ref[port];
        if (timestamp < aliveLine) {
          this.deadPorts.push(port);
        } else if (this.clientChannelId[port] === channelId) {
          debuglog("[broadcast] from:" + ignorePort + " to:" + port + " buf.length:" + buf.length);
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
