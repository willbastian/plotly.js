/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var d3 = require('d3');
var createREGL = require('regl');
var glslify = require('glslify');
var vertexShaderSource = glslify('./shaders/vertex.glsl');
var fragmentShaderSource = glslify('./shaders/fragment.glsl');

var depthLimitEpsilon = 1e-6; // don't change; otherwise near/far plane lines are lost
var filterEpsilon = 1e-3; // don't change; otherwise filter may lose lines on domain boundaries

var dummyPixel = new Uint8Array(4);
function ensureDraw(regl) {
    regl.read({
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        data: dummyPixel
    });
}

function clear(regl, x, y, width, height) {
    var gl = regl._gl;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, y, width, height);
    regl.clear({color: [0, 0, 0, 0], depth: 1}); // clearing is done in scissored panel only
}

function renderBlock(regl, glAes, renderState, blockLineCount, sampleCount, item) {

    var blockNumber = 0;
    var rafKey = item.key;

    if(!renderState.drawCompleted) {
        ensureDraw(regl);
        renderState.drawCompleted = true;
    }

    function render(blockNumber) {

        var count;

        count = Math.min(blockLineCount, sampleCount - blockNumber * blockLineCount);

        item.offset = 2 * blockNumber * blockLineCount;
        item.count = 2 * count;
        if(blockNumber === 0) {
            window.cancelAnimationFrame(renderState.currentRafs[rafKey]); // stop drawing possibly stale glyphs before clearing
            clear(regl, item.scissorX, 0, item.scissorWidth, item.viewBoxSize[1]);
        }

        if(renderState.clearOnly) {
            return;
        }

        glAes(item);
        blockNumber++;

        if(blockNumber * blockLineCount + count < sampleCount) {
            renderState.currentRafs[rafKey] = window.requestAnimationFrame(function() {
                render(blockNumber);
            });
        }

        renderState.drawCompleted = false;
    }

    render(blockNumber);
}

module.exports = function(canvasGL, lines, canvasWidth, canvasHeight, data, unitToColor, context) {

    var renderState = {
        currentRafs: {},
        drawCompleted: true,
        clearOnly: false
    };

    var dimensions = data;
    var dimensionCount = dimensions.length;
    var sampleCount = dimensions[0].values.length;

    var focusAlphaBlending = context; // controlConfig.focusAlphaBlending;

    var canvasPixelRatio = lines.pixelratio;
    var canvasPanelSizeY = canvasHeight;

    var gpuDimensionCount = 64;
    var strideableVectorAttributeCount = gpuDimensionCount - 4; // stride can't be an exact 256

    var paddedUnit = function paddedUnit(d) {
        var unitPad = lines.verticalpadding / canvasPanelSizeY;
        return unitPad + d * (1 - 2 * unitPad);
    };

    var color = lines.color.map(paddedUnit);
    var overdrag = lines.overdrag * canvasPixelRatio;

    var points = [];
    var i, j;
    for(j = 0; j < sampleCount; j++) {
        for(i = 0; i < strideableVectorAttributeCount; i++) {
            points.push(i < dimensionCount ? paddedUnit(dimensions[i].domainToUnitScale(data[i].values[j])) : 0.5);
        }
    }

    var pointPairs = [];

    for(j = 0; j < sampleCount; j++) {
        for(i = 0; i < strideableVectorAttributeCount; i++) {
            pointPairs.push(points[j * strideableVectorAttributeCount + i]);
        }
        for(i = 0; i < strideableVectorAttributeCount; i++) {
            pointPairs.push(points[j * strideableVectorAttributeCount + i]);
        }
    }

    function adjustDepth(d) {
        return Math.max(depthLimitEpsilon, Math.min(1 - depthLimitEpsilon, d));
    }

    var ccolor = [];
    for(j = 0; j < 256; j++) {
        var c = unitToColor(j / 255);
        ccolor.push((focusAlphaBlending ? lines.contextcolor : c).concat([focusAlphaBlending ? lines.contextopacity : 255]));
    }

    var styling = [];
    for(j = 0; j < sampleCount; j++) {
        for(var k = 0; k < 2; k++) {
            styling.push(points[(j + 1) * strideableVectorAttributeCount]);
            styling.push(points[(j + 1) * strideableVectorAttributeCount + 1]);
            styling.push(points[(j + 1) * strideableVectorAttributeCount + 2]);
            styling.push(Math.round(2 * ((k % 2) - 0.5)) * adjustDepth(color[j]));
        }
    }

    var positionStride = strideableVectorAttributeCount * 4;

    var shownDimensionCount = dimensionCount;
    var shownPanelCount = shownDimensionCount - 1;

    var regl = createREGL({
        canvas: canvasGL,
        attributes: {
            preserveDrawingBuffer: true
        }
    });

    var paletteTexture = regl.texture({
        shape: [256, 1],
        format: 'rgba',
        type: 'uint8',
        mag: 'nearest',
        min: 'nearest',
        data: ccolor
    });

    var positionBuffer = regl.buffer(new Float32Array(pointPairs));

    var attributes = {
        pf: styling
    };

    for(i = 0; i < strideableVectorAttributeCount / 4; i++) {
        attributes['p' + i.toString(16)] = {
            offset: i * 16,
            stride: positionStride,
            buffer: positionBuffer
        };
    }

    var glAes = regl({

        profile: false,

        blend: {
            enable: focusAlphaBlending,
            func: {
                srcRGB: 'src alpha',
                dstRGB: 'one minus src alpha',
                srcAlpha: 1,
                dstAlpha: 1 // 'one minus src alpha'
            },
            equation: {
                rgb: 'add',
                alpha: 'add'
            },
            color: [0, 0, 0, 0]
        },

        depth: {
            enable: !focusAlphaBlending,
            mask: true,
            func: 'less',
            range: [0, 1]
        },

        // for polygons
        cull: {
            enable: true,
            face: 'back'
        },

        scissor: {
            enable: true,
            box: {
                x: regl.prop('scissorX'),
                y: 0,
                width: regl.prop('scissorWidth'),
                height: canvasPanelSizeY
            }
        },

        dither: false,

        vert: vertexShaderSource,

        frag: fragmentShaderSource,

        primitive: 'lines',
        lineWidth: 1,
        attributes: attributes,
        uniforms: {
            resolution: regl.prop('resolution'),
            viewBoxPosition: regl.prop('viewBoxPosition'),
            viewBoxSize: regl.prop('viewBoxSize'),
            dim1A: regl.prop('dim1A'),
            dim2A: regl.prop('dim2A'),
            dim1B: regl.prop('dim1B'),
            dim2B: regl.prop('dim2B'),
            dim1C: regl.prop('dim1C'),
            dim2C: regl.prop('dim2C'),
            dim1D: regl.prop('dim1D'),
            dim2D: regl.prop('dim2D'),
            loA: regl.prop('loA'),
            hiA: regl.prop('hiA'),
            loB: regl.prop('loB'),
            hiB: regl.prop('hiB'),
            loC: regl.prop('loC'),
            hiC: regl.prop('hiC'),
            loD: regl.prop('loD'),
            hiD: regl.prop('hiD'),
            palette: paletteTexture,
            colorClamp: regl.prop('colorClamp'),
            scatter: regl.prop('scatter')
        },
        offset: regl.prop('offset'),
        count: regl.prop('count')
    });

    var colorClamp = [0, 1];

    function setColorDomain(unitDomain) {
        colorClamp[0] = unitDomain[0];
        colorClamp[1] = unitDomain[1];
    }

    function approach(/* dimension */) {
        // console.log('Approached ', JSON.stringify(dimension.name));
    }

    var previousAxisOrder = [];

    var dims = d3.range(2).map(function() {return d3.range(4).map(function() {return d3.range(16)});});
    var lims = d3.range(2).map(function() {return d3.range(4).map(function() {return d3.range(16)});});

    function renderGLParcoords(dimensionViews, setChanged, clearOnly) {

        var I;

        function valid(i, offset) {
            return i < shownDimensionCount && i + offset < dimensionViews.length;
        }

        function orig(i) {
            var index = dimensionViews.map(function(v) {return v.originalXIndex;}).indexOf(i);
            return dimensionViews[index];
        }

        var leftmostIndex, rightmostIndex, lowestX = Infinity, highestX = -Infinity;
        for(I = 0; I < shownPanelCount; I++) {
            if(dimensionViews[I].x > highestX) {
                highestX = dimensionViews[I].x;
                rightmostIndex = I;
            }
            if(dimensionViews[I].x < lowestX) {
                lowestX = dimensionViews[I].x;
                leftmostIndex = I;
            }
        }

        function makeItem(i, ii, x, panelSizeX, originalXIndex, scatter) {
            var loHi, abcd, d, index;
            var leftRight = [i, ii];

            for(loHi = 0; loHi < 2; loHi++) {
                index = leftRight[loHi]
                for(abcd = 0; abcd < 4; abcd++) {
                    for (d = 0; d < 16; d++) {
                        dims[loHi][abcd][d] = d + 16 * abcd === index ? 1 : 0;
                        lims[loHi][abcd][d] = paddedUnit((!context && valid(d, 16 * abcd) ? orig(d + 16 * abcd).filter[loHi] : loHi)) + (2 * loHi - 1)  * filterEpsilon;
                    }
                }
            }

            return {
                key: originalXIndex,
                resolution: [canvasWidth, canvasHeight],
                viewBoxPosition: [x + overdrag, 0],
                viewBoxSize: [panelSizeX, canvasPanelSizeY],

                dim1A: dims[0][0],
                dim1B: dims[0][1],
                dim1C: dims[0][2],
                dim1D: dims[0][3],
                dim2A: dims[1][0],
                dim2B: dims[1][1],
                dim2C: dims[1][2],
                dim2D: dims[1][3],

                loA: lims[0][0],
                loB: lims[0][1],
                loC: lims[0][2],
                loD: lims[0][3],
                hiA: lims[1][0],
                hiB: lims[1][1],
                hiC: lims[1][2],
                hiD: lims[1][3],

                colorClamp: colorClamp,
                scatter: scatter || 0,
                scissorX: I === leftmostIndex ? 0 : x + overdrag,
                scissorWidth: I === rightmostIndex ? 2 * panelSizeX : panelSizeX + 1 + (I === leftmostIndex ? x + overdrag : 0)
            };
        }

        for(I = 0; I < shownPanelCount; I++) {
            var dimensionView = dimensionViews[I];
            var i = dimensionView.originalXIndex;
            var x = dimensionView.x * canvasPixelRatio;
            var nextDim = dimensionViews[(I + 1) % shownDimensionCount];
            var ii = nextDim.originalXIndex;
            var panelSizeX = nextDim.x * canvasPixelRatio - x;
            if(setChanged || !previousAxisOrder[i] || previousAxisOrder[i][0] !== x || previousAxisOrder[i][1] !== nextDim.x) {
                previousAxisOrder[i] = [x, nextDim.x];
                var item = makeItem(i, ii, x, panelSizeX, dimensionView.originalXIndex, dimensionView.scatter);
                renderState.clearOnly = clearOnly;
                renderBlock(regl, glAes, renderState, setChanged ? lines.blocklinecount : sampleCount, sampleCount, item);
            }
        }
    }

    function destroy() {
        regl.destroy();
    }

    return {
        setColorDomain: setColorDomain,
        approach: approach,
        render: renderGLParcoords,
        destroy: destroy
    };
};
