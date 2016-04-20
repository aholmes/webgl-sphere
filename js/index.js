var App = (function () {
    function App(canvas) {
        this._definedColors = [
            //[.1, .1, .1, 1],    // white
            [.1, .0, .0, 1],
            [.0, .1, .0, 1],
            [.0, .0, .1, 1],
        ];
        this._canvas = canvas;
        this._ctx = canvas.getContext('webgl');
        this._ctx.viewport(0, 0, canvas.width, canvas.height);
        this._canvas.setAttribute('width', this._canvas.clientWidth.toString());
        this._canvas.setAttribute('height', this._canvas.clientHeight.toString());
        this._config =
            {
                DrawMode: this._ctx.TRIANGLES,
                Quality: 3,
                ZoomLevel: -2.8,
                Rotation: {
                    X: 0.0001,
                    Y: 0.00005,
                    Z: 0
                }
            };
    }
    App.prototype._setData = function () {
        var ctx = this._ctx;
        var icosahedron = new Icosahedron3D(this._config.Quality);
        this._vertices = icosahedron.Points.reduce(function (a, b, i) { return i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : a.concat([b.x, b.y, b.z]); });
        this._indices = icosahedron.TriangleIndices;
        this._colors = this._generateColors(this._vertices);
        var vertex_buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, vertex_buffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(this._vertices), ctx.STATIC_DRAW);
        var color_buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, color_buffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(this._colors), ctx.STATIC_DRAW);
        var index_buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, index_buffer);
        ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._indices), ctx.STATIC_DRAW);
        return {
            vertex: vertex_buffer,
            color: color_buffer,
            index: index_buffer
        };
    };
    App.prototype._generateColors = function (vertices) {
        var colors = [];
        for (var i = 0; i < vertices.length; i += 4) {
            colors[i] = this._definedColors[colors.length % this._definedColors.length];
        }
        return colors.reduce(function (a, b) { return a.concat(b); });
    };
    App.prototype._animate = function (proj_matrix, view_matrix, mov_matrix) {
        var _this = this;
        var ctx = this._ctx;
        var rotThetas = this._config.Rotation;
        var time_old = 0;
        var zoomLevel_old = 0;
        var execAnimation = function (time) {
            var dt = time - time_old;
            time_old = time;
            for (var axis in rotThetas) {
                var theta = rotThetas[axis];
                if (theta > 0.0 || theta < 0.0) {
                    Matrix[("Rotate" + axis)](mov_matrix, dt * theta);
                }
            }
            if (Math.abs(_this._config.ZoomLevel - zoomLevel_old) >= 0.01) {
                view_matrix[14] = view_matrix[14] + (zoomLevel_old * -1) + _this._config.ZoomLevel;
                zoomLevel_old = _this._config.ZoomLevel;
                console.log(_this._config.ZoomLevel);
            }
            ctx.enable(ctx.DEPTH_TEST);
            ctx.depthFunc(ctx.LEQUAL);
            ctx.clearDepth(1.0);
            ctx.viewport(0.0, 0.0, _this._canvas.width, _this._canvas.height);
            ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
            ctx.uniformMatrix4fv(_this._shader.Pmatrix, false, proj_matrix);
            ctx.uniformMatrix4fv(_this._shader.Vmatrix, false, view_matrix);
            ctx.uniformMatrix4fv(_this._shader.Mmatrix, false, mov_matrix);
            ctx.drawElements(_this._config.DrawMode, _this._indices.length, ctx.UNSIGNED_SHORT, 0);
            window.requestAnimationFrame(execAnimation);
        };
        execAnimation(0);
    };
    App.prototype.Draw = function () {
        var buffers = this._setData();
        this._shader = App.UseQuarternionShaderProgram(this._ctx, buffers.vertex, buffers.color);
        var proj_matrix = new Float32Array(Matrix.GetProjection(40, this._canvas.width / this._canvas.height, 1, 100));
        var view_matrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        var mov_matrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        this._animate(proj_matrix, view_matrix, mov_matrix);
    };
    App.prototype.SetDrawMode = function (value) {
        var modeValue = this._ctx[value];
        if (modeValue === undefined && typeof modeValue !== 'number')
            throw new Error("Invalid mode value '" + value + "'");
        this._config.DrawMode = modeValue;
    };
    App.prototype.SetQuality = function (value) {
        var intValue = parseInt(value, 10);
        if (isNaN(intValue))
            throw new Error("Quality value must be a number.");
        this._config.Quality = intValue;
        var buffers = this._setData();
        this._shader = App.UseQuarternionShaderProgram(this._ctx, buffers.vertex, buffers.color);
    };
    App.prototype.GetRotation = function (axis) {
        return this._config.Rotation[axis];
    };
    App.prototype.SetRotation = function (axis, value) {
        if (this._config.Rotation[axis] === undefined)
            throw new Error("Invalid axis '" + axis + "'");
        if (isNaN(value) || typeof value !== 'number')
            throw new Error("Rotation value must be a number.");
        this._config.Rotation[axis] = value;
    };
    App.prototype.GetZoom = function () {
        return this._config.ZoomLevel;
    };
    App.prototype.SetZoom = function (value) {
        if (isNaN(value) || typeof value !== 'number')
            throw new Error("Zoom value must be a number.");
        this._config.ZoomLevel = value;
    };
    App.UseQuarternionVertShader = function (context) {
        var vertCode = "\n\t\t\tattribute vec3 position;\n\t\t\tattribute highp vec3 aVertexNormal;\n\t\t\t\n\t\t\tuniform mat4 Pmatrix;\n\t\t\tuniform mat4 Vmatrix;\n\t\t\tuniform mat4 Mmatrix;\n\n\t\t\tattribute vec4 color;\n\t\t\tvarying lowp vec4 vColor;\n\n\t\t\tvarying vec3 vLightWeighting;\n\t\t\t\n\t\t\tuniform vec3 uAmbientColor;\n\t\t\tuniform vec3 uPointLightingLocation;\n\t\t\tuniform vec3 uPointLightingColor;\n\n\t\t\tvoid main(void) {\n\t\t\t\tvec4 mvPosition = Mmatrix * vec4(position, 1.);\n\t\t\t\tgl_Position = Pmatrix*Vmatrix*mvPosition;\n\t\t\t\tgl_PointSize = 4.0;\n\t\t\t\tvColor = color;\n\n\t\t\t\tvec3 lightDirection = normalize(uPointLightingLocation - mvPosition.xyz);\n\t\t\t\tvec3 transformedNormal = vec3(Vmatrix) * aVertexNormal;\n\t\t\t\tfloat directionalLightWeighting = max(dot(transformedNormal, lightDirection), 0.0);\n\t\t\t\tvLightWeighting = uAmbientColor + uPointLightingColor * directionalLightWeighting;\n\t\t\t}";
        var vertShader = context.createShader(context.VERTEX_SHADER);
        context.shaderSource(vertShader, vertCode);
        context.compileShader(vertShader);
        return vertShader;
    };
    App.UseVariableFragShader = function (context) {
        var fragCode = "\n\t\t\tprecision mediump float;\n\t\t\tvarying lowp vec4 vColor;\n\t\t\tvarying vec3 vLightWeighting;\n\t\t\tvoid main(void) {\n\t\t\t\tgl_FragColor = vec4(vColor.rgb, 1.);\n\t\t\t}";
        var fragShader = context.createShader(context.FRAGMENT_SHADER);
        context.shaderSource(fragShader, fragCode);
        context.compileShader(fragShader);
        return fragShader;
    };
    App.UseQuarternionShaderProgram = function (ctx, vertex_buffer, color_buffer) {
        var vertShader = App.UseQuarternionVertShader(ctx);
        var fragShader = App.UseVariableFragShader(ctx);
        var shaderProgram = ctx.createProgram();
        ctx.attachShader(shaderProgram, vertShader);
        ctx.attachShader(shaderProgram, fragShader);
        ctx.linkProgram(shaderProgram);
        var Pmatrix = ctx.getUniformLocation(shaderProgram, "Pmatrix");
        var Vmatrix = ctx.getUniformLocation(shaderProgram, "Vmatrix");
        var Mmatrix = ctx.getUniformLocation(shaderProgram, "Mmatrix");
        ctx.bindBuffer(ctx.ARRAY_BUFFER, vertex_buffer);
        var position = ctx.getAttribLocation(shaderProgram, "position");
        ctx.vertexAttribPointer(position, 3, ctx.FLOAT, false, 0, 0);
        ctx.enableVertexAttribArray(position);
        ctx.bindBuffer(ctx.ARRAY_BUFFER, color_buffer);
        var color = ctx.getAttribLocation(shaderProgram, "color");
        ctx.vertexAttribPointer(color, 3, ctx.FLOAT, false, 0, 0);
        ctx.enableVertexAttribArray(color);
        ctx.useProgram(shaderProgram);
        var ambientColor = ctx.getUniformLocation(shaderProgram, "uAmbientColor");
        var pointLightingLocation = ctx.getUniformLocation(shaderProgram, "uPointLightingLocation");
        var pointLightingColor = ctx.getUniformLocation(shaderProgram, "uPointLightingColor");
        ctx.uniform3f(ambientColor, 0.2, 0.2, 0.2);
        ctx.uniform3f(pointLightingLocation, 0.0, 0.0, -20.0);
        ctx.uniform3f(pointLightingColor, 0.8, 0.8, 0.8);
        return {
            Pmatrix: Pmatrix,
            Vmatrix: Vmatrix,
            Mmatrix: Mmatrix,
            ShaderProgram: shaderProgram
        };
    };
    return App;
})();
var Matrix = (function () {
    function Matrix() {
    }
    Matrix.GetProjection = function (angle, a, zMin, zMax) {
        var ang = Math.tan((angle * .5) * Math.PI / 180);
        return [
            0.5 / ang, 0, 0, 0,
            0, 0.5 * a / ang, 0, 0,
            0, 0, -(zMax + zMin) / (zMax - zMin), -1,
            0, 0, (-2 * zMax * zMin) / (zMax - zMin), 0
        ];
    };
    Matrix.RotateX = function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv1 = m[1], mv5 = m[5], mv9 = m[9];
        m[1] = m[1] * c - m[2] * s;
        m[5] = m[5] * c - m[6] * s;
        m[9] = m[9] * c - m[10] * s;
        m[2] = m[2] * c + mv1 * s;
        m[6] = m[6] * c + mv5 * s;
        m[10] = m[10] * c + mv9 * s;
    };
    Matrix.RotateY = function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv0 = m[0], mv4 = m[4], mv8 = m[8];
        m[0] = c * m[0] + s * m[2];
        m[4] = c * m[4] + s * m[6];
        m[8] = c * m[8] + s * m[10];
        m[2] = c * m[2] - s * mv0;
        m[6] = c * m[6] - s * mv4;
        m[10] = c * m[10] - s * mv8;
    };
    Matrix.RotateZ = function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv0 = m[0], mv4 = m[4], mv8 = m[8];
        m[0] = c * m[0] - s * m[1];
        m[4] = c * m[4] - s * m[5];
        m[8] = c * m[8] - s * m[9];
        m[1] = c * m[1] + s * mv0;
        m[5] = c * m[5] + s * mv4;
        m[9] = c * m[9] + s * mv8;
    };
    Matrix.Translate = function (a, b, c) {
        var d = b[0], e = b[1], s = b[2];
        if (!c || a == c) {
            a[12] = a[0] * d + a[4] * e + a[8] * s + a[12];
            a[13] = a[1] * d + a[5] * e + a[9] * s + a[13];
            a[14] = a[2] * d + a[6] * e + a[10] * s + a[14];
            a[15] = a[3] * d + a[7] * e + a[11] * s + a[15];
            return a;
        }
        var g = a[0], f = a[1], h = a[2], i = a[3], j = a[4], k = a[5], l = a[6], o = a[7], m = a[8], n = a[9], p = a[10], r = a[11];
        c[0] = g;
        c[1] = f;
        c[2] = h;
        c[3] = i;
        c[4] = j;
        c[5] = k;
        c[6] = l;
        c[7] = o;
        c[8] = m;
        c[9] = n;
        c[10] = p;
        c[11] = r;
        c[12] = g * d + j * e + m * s + a[12];
        c[13] = f * d + k * e + n * s + a[13];
        c[14] = h * d + l * e + p * s + a[14];
        c[15] = i * d + o * e + r * s + a[15];
        return c;
    };
    ;
    return Matrix;
})();
var Icosahedron3D = (function () {
    function Icosahedron3D(quality) {
        this._quality = quality;
        this._calculateGeometry();
    }
    Icosahedron3D.prototype._calculateGeometry = function () {
        this.Points = [];
        this.TriangleIndices = [];
        this._middlePointIndexCache = {};
        this._index = 0;
        var t = (1.0 + Math.sqrt(5.0)) / 2.0;
        this._addVertex(-1, t, 0);
        this._addVertex(1, t, 0);
        this._addVertex(-1, -t, 0);
        this._addVertex(1, -t, 0);
        this._addVertex(0, -1, t);
        this._addVertex(0, 1, t);
        this._addVertex(0, -1, -t);
        this._addVertex(0, 1, -t);
        this._addVertex(t, 0, -1);
        this._addVertex(t, 0, 1);
        this._addVertex(-t, 0, -1);
        this._addVertex(-t, 0, 1);
        this._addFace(0, 11, 5);
        this._addFace(0, 5, 1);
        this._addFace(0, 1, 7);
        this._addFace(0, 7, 10);
        this._addFace(0, 10, 11);
        this._addFace(1, 5, 9);
        this._addFace(5, 11, 4);
        this._addFace(11, 10, 2);
        this._addFace(10, 7, 6);
        this._addFace(7, 1, 8);
        this._addFace(3, 9, 4);
        this._addFace(3, 4, 2);
        this._addFace(3, 2, 6);
        this._addFace(3, 6, 8);
        this._addFace(3, 8, 9);
        this._addFace(4, 9, 5);
        this._addFace(2, 4, 11);
        this._addFace(6, 2, 10);
        this._addFace(8, 6, 7);
        this._addFace(9, 8, 1);
        this._refineVertices();
    };
    Icosahedron3D.prototype._addVertex = function (x, y, z) {
        var length = Math.sqrt(x * x + y * y + z * z);
        this.Points.push({
            x: x / length,
            y: y / length,
            z: z / length
        });
        return this._index++;
    };
    Icosahedron3D.prototype._addFace = function (x, y, z) {
        this.TriangleIndices.push(x);
        this.TriangleIndices.push(y);
        this.TriangleIndices.push(z);
    };
    Icosahedron3D.prototype._refineVertices = function () {
        for (var i = 0; i < this._quality; i++) {
            var faceCount = this.TriangleIndices.length;
            for (var face = 0; face < faceCount; face += 3) {
                var x1 = this.TriangleIndices[face];
                var y1 = this.TriangleIndices[face + 1];
                var z1 = this.TriangleIndices[face + 2];
                var x2 = this._getMiddlePoint(x1, y1);
                var y2 = this._getMiddlePoint(y1, z1);
                var z2 = this._getMiddlePoint(z1, x1);
                this._addFace(x1, x2, z2);
                this._addFace(y1, y2, x2);
                this._addFace(z1, z2, y2);
                this._addFace(x2, y2, z2);
            }
        }
    };
    Icosahedron3D.prototype._getMiddlePoint = function (p1, p2) {
        var firstIsSmaller = p1 < p2;
        var smallerIndex = firstIsSmaller ? p1 : p2;
        var greaterIndex = firstIsSmaller ? p2 : p1;
        var key = (smallerIndex << 32) + greaterIndex;
        var p = this._middlePointIndexCache[key];
        if (p !== undefined)
            p;
        var point1 = this.Points[p1];
        var point2 = this.Points[p2];
        var middle = {
            x: (point1.x + point2.x) / 2.0,
            y: (point1.y + point2.y) / 2.0,
            z: (point1.z + point2.z) / 2.0,
        };
        var i = this._addVertex(middle.x, middle.y, middle.z);
        this._middlePointIndexCache[key] = i;
        return i;
    };
    return Icosahedron3D;
})();
function showRangeValue(prepend, sliderId, inputId) {
    document.getElementById(inputId).value = prepend + document.getElementById(sliderId).value;
}
(function () {
    var app = new App(document.getElementById('canvas'));
    var drawMode = document.getElementById('drawMode');
    drawMode.addEventListener('change', function (e) { return app.SetDrawMode(drawMode.options[drawMode.selectedIndex].value); });
    var quality = document.getElementById('quality');
    quality.addEventListener('change', function (e) { return app.SetQuality(quality.options[quality.selectedIndex].value); });
    var sliderX = document.getElementById('sliderX');
    var sliderY = document.getElementById('sliderY');
    var sliderZ = document.getElementById('sliderZ');
    var sliderZoom = document.getElementById('sliderZoom');
    sliderX.value = app.GetRotation('X').toString();
    sliderY.value = app.GetRotation('Y').toString();
    sliderZ.value = app.GetRotation('Z').toString();
    sliderZoom.value = app.GetZoom().toString();
    sliderX.addEventListener('input', function () { return app.SetRotation(sliderX.getAttribute('data-axis'), parseFloat(sliderX.value)); });
    sliderY.addEventListener('input', function () { return app.SetRotation(sliderY.getAttribute('data-axis'), parseFloat(sliderY.value)); });
    sliderZ.addEventListener('input', function () { return app.SetRotation(sliderZ.getAttribute('data-axis'), parseFloat(sliderZ.value)); });
    sliderZoom.addEventListener('input', function () { return app.SetZoom(parseFloat(sliderZoom.value)); });
    showRangeValue('X:', 'sliderX', 'sliderInputX');
    showRangeValue('Y:', 'sliderY', 'sliderInputY');
    showRangeValue('Z:', 'sliderZ', 'sliderInputZ');
    showRangeValue('', 'sliderZoom', 'sliderInputZoom');
    app.Draw();
})();
//# sourceMappingURL=index.js.map