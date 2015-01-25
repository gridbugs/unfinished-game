var fs = require('fs')
var vm = require('vm')

/* most code is not written to be required, so we run the necessary code here
 * so it's available when we export it to node
 */
function include(filename) {
    var path = __dirname + "/" + filename
    vm.runInThisContext(fs.readFileSync(path), path)
}

include('gl-matrix-min.js')

module.exports = {
    setMatrixArrayType: glMatrix.setMatrixArrayType,
    vec2: vec2
}
