define([], function() {
    // Remove extra whitespace on the right of lines
    var whitespace = function(str) {
        return str.split('\n')
        .map(function(line) { return line.trimRight(); })
        .join('\n');
    };

    // Ensure file is correctly termined by a newline
    var eof = function(str) {
        return str[str.length-1] === '\n' ? str : str + '\n';
    };

    // Convert data uri to buffer
    var dataTobuffer = function(data) {
        var matches = data.match(/^data:.+\/(.+);base64,(.*)$/);
        return new Buffer(matches[2], 'base64');
    };

    return {
        eof: eof,
        whitespace: whitespace,
        dataTobuffer: dataTobuffer
    };
});
