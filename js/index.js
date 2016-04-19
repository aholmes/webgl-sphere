// Following http://www.tutorialspoint.com/webgl/webgl_modes_of_drawing.htm
var App = (function () {
    function App(canvas) {
        this._canvas = canvas;
        this._ctx = canvas.getContext('webgl');
        this._ctx.viewport(0, 0, canvas.width, canvas.height);
    }
    App.prototype.draw = function () {
        var icosahedron = new Icosahedron3D(3);
        var vertices = icosahedron.Points.reduce(function (a, b, i) { return i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : a.concat([b.x, b.y, b.z]); });
        var indices = icosahedron.TriangleIndices;
        var preDefColors = [
            [.1, .1, .1, 1],
            [.1, .0, .0, 1],
            [.0, .1, .0, 1],
            [.0, .0, .1, 1],
            [.1, .1, .0, 1],
            [.1, .0, .1, 1] // purple
        ];
        var colors = [];
        for (var i = 0; i < vertices.length; i++) {
            colors[i] = preDefColors[colors.length % preDefColors.length];
        }
        colors = colors.reduce(function (a, b) { return a.concat(b); });
        var ctx = this._ctx;
        var canvas = this._canvas;
        var vertex_buffer = ctx.createBuffer();
        this._ctx.bindBuffer(ctx.ARRAY_BUFFER, vertex_buffer);
        this._ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(vertices), ctx.STATIC_DRAW);
        var color_buffer = ctx.createBuffer();
        this._ctx.bindBuffer(ctx.ARRAY_BUFFER, color_buffer);
        this._ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(colors), ctx.STATIC_DRAW);
        var index_buffer = ctx.createBuffer();
        this._ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, index_buffer);
        this._ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), ctx.STATIC_DRAW);
        var shader = App.UseQuarternionShaderProgram(ctx, vertex_buffer, color_buffer);
        var proj_matrix = Matrix.GetProjection(40, canvas.width / canvas.height, 1, 100);
        var view_matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        var mov_matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        view_matrix[14] = view_matrix[14] - 2;
        var time_old = 0;
        var animate = function (time) {
            var dt = time - time_old;
            Matrix.RotateX(mov_matrix, dt * 0.0001);
            Matrix.RotateY(mov_matrix, dt * 0.00005);
            time_old = time;
            ctx.enable(ctx.DEPTH_TEST);
            ctx.depthFunc(ctx.LEQUAL);
            ctx.clearColor(0.0, 0.333, 0.333, 1);
            ctx.clearDepth(1.0);
            ctx.viewport(0.0, 0.0, canvas.width, canvas.height);
            ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
            ctx.uniformMatrix4fv(shader.Pmatrix, false, new Float32Array(proj_matrix));
            ctx.uniformMatrix4fv(shader.Vmatrix, false, new Float32Array(view_matrix));
            ctx.uniformMatrix4fv(shader.Mmatrix, false, new Float32Array(mov_matrix));
            ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, index_buffer);
            ctx.drawElements(ctx.POINTS, indices.length, ctx.UNSIGNED_SHORT, 0);
            window.requestAnimationFrame(animate);
        };
        animate(0);
    };
    App.UseQuarternionVertShader = function (context) {
        var vertCode = "\n\t\t\tattribute vec3 position;\n\t\t\tattribute highp vec3 aVertexNormal;\n\t\t\tuniform mat4 Pmatrix;\n\t\t\tuniform mat4 Vmatrix;\n\t\t\tuniform mat4 Mmatrix;\n\n\t\t\tattribute vec4 color;\n\t\t\tvarying lowp vec4 vColor;\n\n\t\t\tvarying highp vec2 vTextureCoord;\n\t\t\tvarying highp vec3 vLighting;\n\n\t\t\tvoid main(void) {\n\t\t\t\tgl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(position, 1.);\n\t\t\t\tvColor = color;\n\n\t\t\t\thighp vec3 ambientLight = vec3(1.0, 1.0, 1.0);\n\t\t\t\thighp vec3 directionalLightColor = vec3(1.0, 1.0, 0);\n\t\t\t\thighp vec3 directionalVector = vec3(0.85, 0.75, 0.0);\n\n\t\t\t\thighp vec4 transformedNormal = Vmatrix * vec4(aVertexNormal, 1.0);\n\t\t\t\thighp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);\n\t\t\t\tvLighting = ambientLight + (directionalLightColor * directional);\n\t\t\t}";
        var vertShader = context.createShader(context.VERTEX_SHADER);
        context.shaderSource(vertShader, vertCode);
        context.compileShader(vertShader);
        return vertShader;
    };
    App.UseVariableFragShader = function (context) {
        var fragCode = "\n\t\t\tprecision mediump float;\n\t\t\tvarying lowp vec4 vColor;\n\t\t\tvarying highp vec3 vLighting;\n\t\t\tuniform sampler2D uSampler;\n\t\t\tvoid main(void) {\n\t\t\t\tgl_FragColor = vec4(vColor.rgb * vLighting, 1.);\n\t\t\t\tgl_PointSize = 10.0;\n\t\t\t}";
        var fragShader = context.createShader(context.FRAGMENT_SHADER);
        context.shaderSource(fragShader, fragCode);
        context.compileShader(fragShader);
        return fragShader;
    };
    App.UseQuarternionShaderProgram = function (context, vertex_buffer, color_buffer) {
        var vertShader = App.UseQuarternionVertShader(context);
        var fragShader = App.UseVariableFragShader(context);
        var shaderProgram = context.createProgram();
        context.attachShader(shaderProgram, vertShader);
        context.attachShader(shaderProgram, fragShader);
        context.linkProgram(shaderProgram);
        var Pmatrix = context.getUniformLocation(shaderProgram, "Pmatrix");
        var Vmatrix = context.getUniformLocation(shaderProgram, "Vmatrix");
        var Mmatrix = context.getUniformLocation(shaderProgram, "Mmatrix");
        context.bindBuffer(context.ARRAY_BUFFER, vertex_buffer);
        var position = context.getAttribLocation(shaderProgram, "position");
        context.vertexAttribPointer(position, 3, context.FLOAT, false, 0, 0);
        context.enableVertexAttribArray(position);
        context.bindBuffer(context.ARRAY_BUFFER, color_buffer);
        var color = context.getAttribLocation(shaderProgram, "color");
        context.vertexAttribPointer(color, 3, context.FLOAT, false, 0, 0);
        context.enableVertexAttribArray(color);
        context.useProgram(shaderProgram);
        return {
            Pmatrix: Pmatrix,
            Vmatrix: Vmatrix,
            Mmatrix: Mmatrix,
            shaderProgram: shaderProgram
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
var app = new App(document.getElementById('canvas'));
app.draw();
//# sourceMappingURL=index.js.map