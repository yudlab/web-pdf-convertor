exports.pathSeparator = (path) => {
    return path.replace(/\\/g, `/`);
};

exports.generateFileName = () => {
    const today = new Date();
    var dd = today.getDate();
    var mo = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    var hh = today.getHours();
    var mm = today.getMinutes();
    var ss = today.getSeconds();
    var ms = today.getMilliseconds();

    return `${dd < 9 ? `0` + dd : dd}-${mo < 9 ? `0` + mo : mo}-${yyyy}--${hh < 9 ? `0` + hh : hh}-${mm < 9 ? `0` + mm : mm}-${ss < 9 ? `0` + ss : ss}-${ms < 9 ? `0` + ms : ms}`;
};

exports.getIPAddress = () => {
    var interfaces = require("os").networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];

        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (
                alias.family === "IPv4" &&
                alias.address !== "127.0.0.1" &&
                !alias.internal
            )
                return alias.address;
        }
    }
    return "localhost";
}

exports.getFileWithoutExt = (str) => {
    return str.replace(/\.[^/.]+$/, "");
  }