var Shape;
(function (Shape) {
    Shape[Shape["Cube"] = 0] = "Cube";
    Shape[Shape["Sphere"] = 1] = "Sphere";
})(Shape || (Shape = {}));
var App = (function () {
    function App(canvas) {
        this._definedColors = [
            /*[1.0,  1.0,  1.0,  1.0],    // Front face: white*/
            [1.0, 0.0, 0.0, 1.0],
            [0.0, 1.0, 0.0, 1.0],
            [0.0, 0.0, 1.0, 1.0],
        ];
        this._animating = false;
        this._canvas = canvas;
        this._ctx = canvas.getContext('webgl');
        this._ctx.viewport(0, 0, canvas.width, canvas.height);
        this._canvas.setAttribute('width', this._canvas.clientWidth.toString());
        this._canvas.setAttribute('height', this._canvas.clientHeight.toString());
        this._config =
            {
                DrawMode: this._ctx.TRIANGLES,
                Quality: 3,
                ZoomLevel: -4.0,
                Rotation: {
                    X: 0,
                    Y: 0,
                    Z: 0
                },
                Shape: Shape.Cube
            };
    }
    App.prototype._generateColors = function (vertices, indices, solid) {
        if (solid === void 0) { solid = true; }
        var colors = [];
        var outerIterations = solid === true
            ? this._faceLength
            : (this._faceLength * this._facePointLength);
        var innerIterations = solid === true
            ? this._facePointLength
            : 1;
        for (var i = 0; i < outerIterations; i++) {
            var color = this._definedColors[(i + 1) % this._definedColors.length];
            // set the same color for each vertex so the face will be drawn as a solid color
            for (var j = 0; j < innerIterations; j++) {
                colors = colors.concat(color);
            }
        }
        // returns one RGBA for each INDEX
        return colors;
    };
    App.prototype._animate = function (proj_matrix, view_matrix, mov_matrix) {
        var _this = this;
        if (this._animating)
            return;
        this._animating = true;
        var ctx = this._ctx;
        var rotThetas = this._config.Rotation;
        var timeThen = 0;
        var zoomLevel_old = 0;
        ctx.enable(ctx.DEPTH_TEST);
        ctx.depthFunc(ctx.LEQUAL);
        ctx.clearDepth(1.0);
        ctx.viewport(0.0, 0.0, this._canvas.width, this._canvas.height);
        ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
        var angle = 0;
        var execAnimation = function () {
            var timeNow = new Date().getTime();
            if (timeThen !== 0) {
                angle += 0.05 * (timeNow - timeThen);
            }
            timeThen = timeNow;
            for (var axis in rotThetas) {
                var theta = rotThetas[axis];
                if (theta > 0.0 || theta < 0.0) {
                    Matrix[("Rotate" + axis)](mov_matrix, 50 * theta);
                }
            }
            if (Math.abs(_this._config.ZoomLevel - zoomLevel_old) >= 0.01) {
                view_matrix[14] = view_matrix[14] + (zoomLevel_old * -1) + _this._config.ZoomLevel;
                zoomLevel_old = _this._config.ZoomLevel;
            }
            //Matrix.Identity(mov_matrix);
            //Matrix.Translate(mov_matrix, mov_matrix, [0,0,-2]); // offset the object from the camera
            //Matrix.Rotate(mov_matrix, mov_matrix, App.DegToRad(angle), [0, 1, 0]);
            //Matrix.Translate(mov_matrix, mov_matrix, [5.0,0,0]); // x offset for rotation
            ctx.uniformMatrix4fv(_this._shader.Pmatrix, false, proj_matrix);
            ctx.uniformMatrix4fv(_this._shader.Vmatrix, false, view_matrix);
            ctx.uniformMatrix4fv(_this._shader.Mmatrix, false, mov_matrix);
            ctx.drawElements(_this._config.DrawMode, _this._indices.length, ctx.UNSIGNED_SHORT, 0);
            window.requestAnimationFrame(execAnimation);
        };
        execAnimation();
    };
    App.prototype.Draw = function (shape) {
        if (shape === void 0) { shape = this._config.Shape; }
        var ctx = this._ctx;
        var buffers = this.SetShape(shape);
        this._shader = App.UseQuarternionShaderProgram(this._ctx, buffers);
        ctx.bindBuffer(ctx.ARRAY_BUFFER, buffers.Vertex);
        var position = ctx.getAttribLocation(this._shader.ShaderProgram, "position");
        ctx.vertexAttribPointer(position, 3, ctx.FLOAT, false, 0, 0);
        ctx.enableVertexAttribArray(position);
        ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
        ctx.bindBuffer(ctx.ARRAY_BUFFER, buffers.Color);
        var color = ctx.getAttribLocation(this._shader.ShaderProgram, "color");
        ctx.vertexAttribPointer(color, 4, ctx.FLOAT, false, 0, 0);
        ctx.enableVertexAttribArray(color);
        ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
        var proj_matrix = new Float32Array(Matrix.GetProjection(40, this._canvas.width / this._canvas.height, 1, 100));
        var view_matrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        var mov_matrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        Matrix.Translate(mov_matrix, mov_matrix, [0, 0, 0]); // offset the object from the camera
        Matrix.Rotate(mov_matrix, mov_matrix, App.DegToRad(45), [1, 0, 0]);
        Matrix.Rotate(mov_matrix, mov_matrix, App.DegToRad(45), [0, 1, 0]);
        this._animate(proj_matrix, view_matrix, mov_matrix);
    };
    App.prototype.SetDrawMode = function (value) {
        var modeValue = this._ctx[value];
        if (modeValue === undefined && typeof modeValue !== 'number')
            throw new Error("Invalid mode value '" + value + "'");
        this._config.DrawMode = modeValue;
    };
    App.prototype.SetQuality = function (value, shape) {
        if (shape === void 0) { shape = this._config.Shape; }
        var intValue = parseInt(value, 10);
        if (isNaN(intValue))
            throw new Error("Quality value must be a number.");
        this._config.Quality = intValue;
        var buffers = this.SetShape(shape);
        this._shader = App.UseQuarternionShaderProgram(this._ctx, buffers);
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
    App.prototype.SetShape = function (shape) {
        var ctx = this._ctx;
        var geometry;
        switch (shape) {
            case Shape.Sphere:
                geometry = new Icosahedron3D(this._config.Quality);
            case Shape.Cube:
            default:
                geometry = new Cube3D();
        }
        this._vertices = geometry.Vertices;
        this._indices = geometry.Indices;
        // dividing the number of indices by 3 will give us the total number of triangles drawn
        // on the mesh. Dividing the number of vertices by the number of triangles will give us the
        // number of faces on the mesh.
        this._triangleLength = this._indices.length / 3;
        this._vertexLength = this._vertices.length / 3;
        this._faceLength = this._vertices.length / this._triangleLength;
        this._facePointLength = this._vertexLength / this._faceLength;
        this._colors = this._generateColors(this._vertices, this._indices);
        var vertex_buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, vertex_buffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(this._vertices), ctx.STATIC_DRAW);
        vertex_buffer.itemSize = 3;
        vertex_buffer.length = this._vertices.length / 3;
        ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
        var color_buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, color_buffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(this._colors), ctx.STATIC_DRAW);
        color_buffer.itemSize = 4;
        color_buffer.length = this._colors.length / 4;
        ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
        var index_buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, index_buffer);
        ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._indices), ctx.STATIC_DRAW);
        index_buffer.itemSize = 3;
        index_buffer.length = this._indices.length / 3;
        ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
        return {
            Vertex: vertex_buffer,
            Color: color_buffer,
            Index: index_buffer
        };
    };
    App.DegToRad = function (degrees) {
        return degrees * Math.PI / 180;
    };
    App.UseQuarternionVertShader = function (context) {
        var vertCode = "\n\t\t\tattribute vec3 position;\n\t\t\t\n\t\t\tuniform mat4 Pmatrix;\n\t\t\tuniform mat4 Vmatrix;\n\t\t\tuniform mat4 Mmatrix;\n\n\t\t\tattribute vec4 color;\n\t\t\tvarying lowp vec4 vColor;\n\n\t\t\tvarying vec3 vLightWeighting;\n\t\t\t\n\t\t\tuniform vec3 uAmbientColor;\n\t\t\tuniform vec3 uPointLightingLocation;\n\t\t\tuniform vec3 uPointLightingColor;\n\n\t\t\tvoid main(void) {\n\t\t\t\tvec4 mvPosition = Mmatrix * vec4(position, 1.);\n\t\t\t\tgl_Position = Pmatrix*Vmatrix*mvPosition;\n\t\t\t\tgl_PointSize = 4.0;\n\t\t\t\tvColor = color;\n\n\t\t\t\t//vec3 lightDirection = normalize(uPointLightingLocation - mvPosition.xyz);\n\t\t\t\t//vec3 transformedNormal = vec3(Vmatrix) * position;\n\t\t\t\t//float directionalLightWeighting = max(dot(transformedNormal, lightDirection), 0.0);\n\t\t\t\t//vLightWeighting = uAmbientColor + uPointLightingColor * directionalLightWeighting;\n\t\t\t}";
        var vertShader = context.createShader(context.VERTEX_SHADER);
        context.shaderSource(vertShader, vertCode);
        context.compileShader(vertShader);
        return vertShader;
    };
    App.UseVariableFragShader = function (context) {
        var fragCode = "\n\t\t\tprecision mediump float;\n\t\t\tvarying lowp vec4 vColor;\n\t\t\tvarying vec3 vLightWeighting;\n\t\t\tvoid main(void) {\n\t\t\t\tgl_FragColor = vColor;//vec4(vColor.rgb * vLightWeighting, 1.0);\n\t\t\t}";
        var fragShader = context.createShader(context.FRAGMENT_SHADER);
        context.shaderSource(fragShader, fragCode);
        context.compileShader(fragShader);
        return fragShader;
    };
    App.UseQuarternionShaderProgram = function (ctx, buffers) {
        var vertShader = App.UseQuarternionVertShader(ctx);
        var fragShader = App.UseVariableFragShader(ctx);
        var shaderProgram = ctx.createProgram();
        ctx.attachShader(shaderProgram, vertShader);
        ctx.attachShader(shaderProgram, fragShader);
        ctx.linkProgram(shaderProgram);
        var Pmatrix = ctx.getUniformLocation(shaderProgram, "Pmatrix");
        var Vmatrix = ctx.getUniformLocation(shaderProgram, "Vmatrix");
        var Mmatrix = ctx.getUniformLocation(shaderProgram, "Mmatrix");
        ctx.useProgram(shaderProgram);
        var ambientColor = ctx.getUniformLocation(shaderProgram, "uAmbientColor");
        var pointLightingLocation = ctx.getUniformLocation(shaderProgram, "uPointLightingLocation");
        var pointLightingColor = ctx.getUniformLocation(shaderProgram, "uPointLightingColor");
        ctx.uniform3f(ambientColor, 0.2, 0.2, 0.2);
        ctx.uniform3f(pointLightingLocation, 0.0, 0.0, 0.0);
        ctx.uniform3f(pointLightingColor, 1, 1, 1);
        return {
            Pmatrix: Pmatrix,
            Vmatrix: Vmatrix,
            Mmatrix: Mmatrix,
            ShaderProgram: shaderProgram,
            Buffers: buffers
        };
    };
    return App;
})();
var Matrix = (function () {
    function Matrix() {
    }
    // some of these are borrowed from https://github.com/toji/gl-matrix
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
    /**
     * Translate a mat4 by the given vector not using SIMD
     * https://github.com/toji/gl-matrix/blob/v2.3.2/src/gl-matrix/mat4.js#L757
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the matrix to translate
     * @param {vec3} v vector to translate by
     * @returns {mat4} out
     */
    Matrix.Translate = function (out, a, v) {
        var x = v[0], y = v[1], z = v[2], a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23;
        if (a === out) {
            out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
            out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
            out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
            out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        }
        else {
            a00 = a[0];
            a01 = a[1];
            a02 = a[2];
            a03 = a[3];
            a10 = a[4];
            a11 = a[5];
            a12 = a[6];
            a13 = a[7];
            a20 = a[8];
            a21 = a[9];
            a22 = a[10];
            a23 = a[11];
            out[0] = a00;
            out[1] = a01;
            out[2] = a02;
            out[3] = a03;
            out[4] = a10;
            out[5] = a11;
            out[6] = a12;
            out[7] = a13;
            out[8] = a20;
            out[9] = a21;
            out[10] = a22;
            out[11] = a23;
            out[12] = a00 * x + a10 * y + a20 * z + a[12];
            out[13] = a01 * x + a11 * y + a21 * z + a[13];
            out[14] = a02 * x + a12 * y + a22 * z + a[14];
            out[15] = a03 * x + a13 * y + a23 * z + a[15];
        }
        return out;
    };
    /**
     * Set a mat4 to the identity matrix
     * https://github.com/toji/gl-matrix/blob/v2.3.2/src/gl-matrix/mat4.js#L203
     * @param {mat4} out the receiving matrix
     * @returns {mat4} out
     */
    Matrix.Identity = function (out) {
        out[0] = 1;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = 1;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = 1;
        out[11] = 0;
        out[12] = 0;
        out[13] = 0;
        out[14] = 0;
        out[15] = 1;
        return out;
    };
    Matrix.EPSILON = 0.000001;
    /**
     *
     * Rotates a mat4 by the given angle around the given axis
     * https://github.com/toji/gl-matrix/blob/v2.3.2/src/gl-matrix/mat4.js#L907
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the matrix to rotate
     * @param {Number} rad the angle to rotate the matrix by
     * @param {vec3} axis the axis to rotate around
     * @returns {mat4} out
     */
    Matrix.Rotate = function (out, a, rad, axis) {
        var x = axis[0], y = axis[1], z = axis[2], len = Math.sqrt(x * x + y * y + z * z), s, c, t, a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, b00, b01, b02, b10, b11, b12, b20, b21, b22;
        if (Math.abs(len) < Matrix.EPSILON) {
            return null;
        }
        len = 1 / len;
        x *= len;
        y *= len;
        z *= len;
        s = Math.sin(rad);
        c = Math.cos(rad);
        t = 1 - c;
        a00 = a[0];
        a01 = a[1];
        a02 = a[2];
        a03 = a[3];
        a10 = a[4];
        a11 = a[5];
        a12 = a[6];
        a13 = a[7];
        a20 = a[8];
        a21 = a[9];
        a22 = a[10];
        a23 = a[11];
        // Construct the elements of the rotation matrix
        b00 = x * x * t + c;
        b01 = y * x * t + z * s;
        b02 = z * x * t - y * s;
        b10 = x * y * t - z * s;
        b11 = y * y * t + c;
        b12 = z * y * t + x * s;
        b20 = x * z * t + y * s;
        b21 = y * z * t - x * s;
        b22 = z * z * t + c;
        // Perform rotation-specific matrix multiplication
        out[0] = a00 * b00 + a10 * b01 + a20 * b02;
        out[1] = a01 * b00 + a11 * b01 + a21 * b02;
        out[2] = a02 * b00 + a12 * b01 + a22 * b02;
        out[3] = a03 * b00 + a13 * b01 + a23 * b02;
        out[4] = a00 * b10 + a10 * b11 + a20 * b12;
        out[5] = a01 * b10 + a11 * b11 + a21 * b12;
        out[6] = a02 * b10 + a12 * b11 + a22 * b12;
        out[7] = a03 * b10 + a13 * b11 + a23 * b12;
        out[8] = a00 * b20 + a10 * b21 + a20 * b22;
        out[9] = a01 * b20 + a11 * b21 + a21 * b22;
        out[10] = a02 * b20 + a12 * b21 + a22 * b22;
        out[11] = a03 * b20 + a13 * b21 + a23 * b22;
        if (a !== out) {
            out[12] = a[12];
            out[13] = a[13];
            out[14] = a[14];
            out[15] = a[15];
        }
        return out;
    };
    return Matrix;
})();
var Icosahedron3D = (function () {
    function Icosahedron3D(quality) {
        this._quality = quality;
        this._calculateGeometry();
    }
    Object.defineProperty(Icosahedron3D.prototype, "Vertices", {
        get: function () {
            return this._vertices.reduce(function (a, b, i) { return i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : a.concat([b.x, b.y, b.z]); });
        },
        enumerable: true,
        configurable: true
    });
    Icosahedron3D.prototype._calculateGeometry = function () {
        this._vertices = [];
        this.Indices = [];
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
        this._vertices.push({
            x: x / length,
            y: y / length,
            z: z / length
        });
        return this._index++;
    };
    Icosahedron3D.prototype._addFace = function (x, y, z) {
        this.Indices.push(x);
        this.Indices.push(y);
        this.Indices.push(z);
    };
    Icosahedron3D.prototype._refineVertices = function () {
        for (var i = 0; i < this._quality; i++) {
            var faceCount = this.Indices.length;
            for (var face = 0; face < faceCount; face += 3) {
                var x1 = this.Indices[face];
                var y1 = this.Indices[face + 1];
                var z1 = this.Indices[face + 2];
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
        var point1 = this._vertices[p1];
        var point2 = this._vertices[p2];
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
var Cone3D = (function () {
    function Cone3D(quality) {
        this._quality = quality;
        this._calculateGeometry();
    }
    Cone3D.prototype._calculateGeometry = function () {
        var pt = [], nt = [];
        var h = 1, r1 = .5, r2 = .2, nPhi = 100;
        var Phi = 0, dPhi = 2 * Math.PI / (nPhi - 1), Nx = r1 - r2, Ny = h, N = Math.sqrt(Nx * Nx + Ny * Ny);
        Nx /= N;
        Ny /= N;
        for (var i = 0; i < nPhi; i++) {
            var cosPhi = Math.cos(Phi);
            var sinPhi = Math.sin(Phi);
            var cosPhi2 = Math.cos(Phi + dPhi / 2);
            var sinPhi2 = Math.sin(Phi + dPhi / 2);
            pt.push(-h / 2, cosPhi * r1, sinPhi * r1); // points
            nt.push(Nx, Ny * cosPhi, Ny * sinPhi); // normals
            pt.push(h / 2, cosPhi2 * r2, sinPhi2 * r2); // points
            nt.push(Nx, Ny * cosPhi2, Ny * sinPhi2); // normals
            Phi += dPhi;
        }
        this.Vertices = pt;
        this.Indices = nt;
        console.log(this);
    };
    return Cone3D;
})();
var Cube3D = (function () {
    function Cube3D() {
        this.Vertices = [
            // Front face
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,
            // Back face
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, -1.0, -1.0,
            // Top face
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, -1.0,
            // Bottom face
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,
            // Right face
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0
        ];
        /*public Indices =
        [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
        ];*/
        this.Indices = [
            0, 1, 2, 0, 2, 3,
            4, 6, 7, 4, 5, 6,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23,
        ];
    }
    return Cube3D;
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
    var shape = document.getElementById('shape');
    shape.addEventListener('change', function (e) { return app.Draw(shape.options[shape.selectedIndex].value); });
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