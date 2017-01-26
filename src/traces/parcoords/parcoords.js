/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var lineLayerMaker = require('./lines');
var c = require('./constants');
var Lib = require('../../lib');
var d3 = require('d3');


function keyFun(d) {return d.key;}

function repeat(d) {return [d];}

function visible(dimension) {return !('visible' in dimension) || dimension.visible;}

function dimensionExtent(dimension) {

    var lo = dimension.range ? dimension.range[0] : d3.min(dimension.values);
    var hi = dimension.range ? dimension.range[1] : d3.max(dimension.values);

    if(isNaN(lo) || !isFinite(lo)) {
        lo = 0;
    }

    if(isNaN(hi) || !isFinite(hi)) {
        hi = 0;
    }

    // avoid a degenerate (zero-width) domain
    if(lo === hi) {
        if(lo === void(0)) {
            lo = 0;
            hi = 1;
        } else if(lo === 0) {
            // no use to multiplying zero, so add/subtract in this case
            lo -= 1;
            hi += 1;
        } else {
            // this keeps the range in the order of magnitude of the data
            lo *= 0.9;
            hi *= 1.1;
        }
    }

    return [lo, hi];
}

function ordinalScaleSnap(scale, v) {
    var i, a, prevDiff, prevValue, diff;
    for(i = 0, a = scale.range(), prevDiff = Infinity, prevValue = a[0], diff; i < a.length; i++) {
        if((diff = Math.abs(a[i] - v)) > prevDiff) {
            return prevValue;
        }
        prevDiff = diff;
        prevValue = a[i];
    }
    return a[a.length - 1];
}

function domainScale(height, padding, dimension) {
    var extent = dimensionExtent(dimension);
    return dimension.tickvals ?
        d3.scale.ordinal()
            .domain(dimension.tickvals)
            .range(dimension.tickvals
                .map(function(d) {return (d - extent[0]) / (extent[1] - extent[0]);})
                .map(function(d) {return (height - padding + d * (padding - (height - padding)));})) :
        d3.scale.linear()
            .domain(extent)
            .range([height - padding, padding]);
}

function unitScale(height, padding) {return d3.scale.linear().range([height - padding, padding]);}
function domainToUnitScale(dimension) {return d3.scale.linear().domain(dimensionExtent(dimension));}

function ordinalScale(dimension) {
    var extent = dimensionExtent(dimension);
    return dimension.tickvals && d3.scale.ordinal()
            .domain(dimension.tickvals)
            .range(dimension.tickvals.map(function(d) {return (d - extent[0]) / (extent[1] - extent[0]);}));
}

function unitToColorScale(cscale, cmin, cmax, coloringArray) {

    var colorStops = cscale.map(function(d) {return d[0];});
    var colorStrings = cscale.map(function(d) {return d[1];});
    var colorTuples = colorStrings.map(function(c) {return d3.rgb(c);});
    var prop = function(n) {return function(o) {return o[n];};};

    // We can't use d3 color interpolation as we may have non-uniform color palette raster
    // (various color stop distances).
    var polylinearUnitScales = 'rgb'.split('').map(function(key) {
        return d3.scale.linear()
            .clamp(true)
            .domain(colorStops)
            .range(colorTuples.map(prop(key)));
    });

    var colorToUnitScale = d3.scale.linear()
        .domain(d3.extent(coloringArray));

    var unitMin = colorToUnitScale(cmin);
    var unitMax = colorToUnitScale(cmax);

    var cScale = d3.scale.linear()
        .clamp(true)
        .domain([unitMin, unitMax]);

    return function(d) {
        return polylinearUnitScales.map(function(s) {
            return s(cScale(d));
        });
    };
}

function model(layout, d, i, a) {

    var lines = Lib.extendDeep({}, d.line, {
        color: d.line.color.map(domainToUnitScale({values: d.line.color})),
        blockLineCount: c.blockLineCount,
        canvasOverdrag: c.overdrag * c.canvasPixelRatio
    });

    var groupCount = a.length;
    var groupWidth = layout.width * (d.domain.x[1] - d.domain.x[0]);
    var groupHeight = layout.height * (d.domain.y[1] - d.domain.y[0]) / groupCount;

    var pad = d.pad || {l: 80, r: 80, t: 80, b: 80};
    var rowPad = pad; // for now, row padding is identical with (group) padding
    var rowContentWidth = groupWidth - pad.l - pad.r - c.legendWidth; // leavig room for the colorbar
    var rowHeight = groupHeight - rowPad.t - rowPad.b;

    return {
        key: i,
        colCount: d.dimensions.filter(visible).length,
        _gdDimensions: d._gdDataItem.dimensions,
        _gdDimensionsOriginalOrder: d._gdDataItem.dimensions.slice(),
        dimensions: d.dimensions,
        tickDistance: c.tickDistance,
        unitToColor: unitToColorScale(d.line.colorscale, d.line.cmin, d.line.cmax, d.line.color),
        lines: lines,
        translateX: (d.domain.x[0] || 0) * layout.width,
        translateY: (d.domain.y[0] || 0) * layout.height,
        pad: pad,
        canvasWidth: rowContentWidth * c.canvasPixelRatio + 2 * lines.canvasOverdrag,
        canvasHeight: rowHeight * c.canvasPixelRatio,
        width: rowContentWidth,
        height: rowHeight,
        canvasPixelRatio: c.canvasPixelRatio
    };
}

function viewModel(model) {

    var width = model.width;
    var height = model.height;
    var dimensions = model.dimensions;
    var canvasPixelRatio = model.canvasPixelRatio;

    var xScale = function(d) {return width * d / Math.max(1, model.colCount - 1);};

    var unitPad = c.verticalPadding / (height * canvasPixelRatio);
    var unitPadScale = (1 - 2 * unitPad);
    var paddedUnitScale = function(d) {return unitPad + unitPadScale * d;};

    var viewModel = {
        key: model.key,
        xScale: xScale,
        model: model
    };

    var uniqueKeys = {};

    viewModel.dimensions = dimensions.filter(visible).map(function(dimension, i) {
        var domainToUnit = domainToUnitScale(dimension);
        var foundKey = uniqueKeys[dimension.label];
        uniqueKeys[dimension.label] = (foundKey ? 0 : foundKey) + 1;
        var key = dimension.label + (foundKey ? '__' + foundKey : '');
        return {
            key: key,
            label: dimension.label,
            tickvals: dimension.tickvals || false,
            ticktext: dimension.ticktext || false,
            ordinal: !!dimension.tickvals,
            scatter: c.scatter || dimension.scatter,
            xIndex: i,
            crossfilterDimensionIndex: i,
            height: height,
            values: dimension.values,
            paddedUnitValues: dimension.values.map(domainToUnit).map(paddedUnitScale),
            xScale: xScale,
            x: xScale(i),
            canvasX: xScale(i) * canvasPixelRatio,
            unitScale: unitScale(height, c.verticalPadding),
            domainScale: domainScale(height, c.verticalPadding, dimension),
            ordinalScale: ordinalScale(dimension),
            domainToUnitScale: domainToUnit,
            filter: dimension.constraintrange ? dimension.constraintrange.map(domainToUnit) : [0, 1],
            parent: viewModel,
            model: model
        };
    });

    return viewModel;
}

function lineLayerModel(vm) {
    return c.layers.map(function(key) {
        return {
            key: key,
            context: key === 'contextLineLayer',
            pick: key === 'pickLineLayer',
            viewModel: vm,
            model: vm.model
        };
    });
}

function styleExtentTexts(selection) {
    selection
        .classed('axisExtentText', true)
        .attr('text-anchor', 'middle')
        .style('font-family', 'monospace')
        .style('font-weight', 100)
        .style('font-size', 'x-small')
        .style('cursor', 'default')
        .style('user-select', 'none');
}

module.exports = function(gd, root, svg, styledData, layout, callbacks) {

    var domainBrushing = false;
    var linePickActive = true;

    function enterSvgDefs(root) {
        var defs = root.selectAll('defs')
            .data(repeat, keyFun);

        defs.enter()
            .append('defs');

        var filterBarPattern = defs.selectAll('#filterBarPattern')
            .data(repeat, keyFun);

        filterBarPattern.enter()
            .append('pattern')
            .attr('id', 'filterBarPattern')
            .attr('patternUnits', 'userSpaceOnUse');

        filterBarPattern
            .attr('x', -c.bar.width)
            .attr('width', c.bar.capturewidth)
            .attr('height', function(d) {return d.model.height;});

        var filterBarPatternGlyph = filterBarPattern.selectAll('rect')
            .data(repeat, keyFun);

        filterBarPatternGlyph.enter()
            .append('rect')
            .attr('shape-rendering', 'crispEdges');

        filterBarPatternGlyph
            .attr('height', function(d) {return d.model.height;})
            .attr('width', c.bar.width)
            .attr('x', c.bar.width / 2)
            .attr('fill', c.bar.fillcolor)
            .attr('fill-opacity', c.bar.fillopacity)
            .attr('stroke', c.bar.strokecolor)
            .attr('stroke-opacity', c.bar.strokeopacity)
            .attr('stroke-width', c.bar.strokewidth);
    }

    var vm = styledData
        .filter(function(d) {return !!d.dimensions && d.dimensions.length > 0;})
        .map(model.bind(0, layout))
        .map(viewModel);

    var parcoordsLineLayers = root.selectAll('.parcoords-line-layers')
        .data(vm, keyFun);

    parcoordsLineLayers.enter()
        .insert('div', '.' + svg.attr('class').split(' ').join(' .')) // not hardcoding .main-svg
        .classed('parcoords-line-layers', true)
        .style('box-sizing', 'content-box');

    parcoordsLineLayers
        .style('transform', function(d, i) {
            var translateY = i * (d.model.height + d.model.pad.t + d.model.pad.b);
            return 'translate(' + d.model.translateX + 'px,' + (d.model.translateY + translateY) + 'px)';
        });

    var parcoordsLineLayer = parcoordsLineLayers.selectAll('.parcoords-lines')
        .data(lineLayerModel, keyFun);

    var tweakables = {renderers: [], dimensions: []};

    var lastHovered = null;

    parcoordsLineLayer.enter()
        .append('canvas')
        .attr('class', function(d) {return 'parcoords-lines ' + (d.context ? 'context' : d.pick ? 'pick' : 'focus');})
        .style('box-sizing', 'content-box')
        .style('transform', 'translate(' + (-c.overdrag) + 'px, 0)')
        .style('float', 'left')
        .style('clear', 'both')
        .style('left', 0)
        .style('overflow', 'visible')
        .style('position', function(d, i) {return i > 0 ? 'absolute' : 'absolute';})
        .filter(function(d) {return d.pick;})
        .on('mousemove', function(d) {
            if(linePickActive && d.lineLayer && callbacks && callbacks.hover) {
                var event = d3.event;
                var cw = this.width;
                var ch = this.height;
                var translateY = d.model.key * (d.model.height + d.model.pad.t + d.model.pad.b);
                var x = event.layerX - d.model.pad.l + c.overdrag;
                var y = event.layerY - d.model.pad.t - translateY;
                if(x < 0 || y < 0 || x >= cw || y >= ch) {
                    return;
                }
                var pixel = d.lineLayer.readPixel(x, ch - 1 - y);
                var found = pixel[3] !== 0;
                var curveNumber = found ? pixel[2] + 256 * (pixel[1] + 256 * pixel[0]) : null;
                var eventData = {
                    x: x,
                    y: y,
                    dataIndex: d.model.key,
                    curveNumber: curveNumber
                };
                if(curveNumber !== lastHovered) { // don't unnecessarily repeat the same hit (or miss)
                    if(found) {
                        callbacks.hover(eventData);
                    } else if(callbacks.unhover) {
                        callbacks.unhover(eventData);
                    }
                    lastHovered = curveNumber;
                }
            }
        });

    parcoordsLineLayer
        .style('padding', function(d) {
            var p = d.viewModel.model.pad;
            return p.t + 'px ' + p.r + 'px ' + p.b + 'px ' + p.l + 'px';
        })
        .attr('width', function(d) {return d.viewModel.model.canvasWidth;})
        .attr('height', function(d) {return d.viewModel.model.canvasHeight;})
        .style('width', function(d) {return (d.viewModel.model.width + 2 * c.overdrag) + 'px';})
        .style('height', function(d) {return d.viewModel.model.height + 'px';})
        .style('opacity', function(d) {return d.pick ? 0.01 : 1;});

    svg.style('background', 'rgba(255, 255, 255, 0)');
    var parcoordsControlOverlay = svg.selectAll('.parcoords')
        .data(vm, keyFun);

    parcoordsControlOverlay.enter()
        .append('g')
        .classed('parcoords', true)
        .attr('overflow', 'visible')
        .style('box-sizing', 'content-box')
        .style('position', 'absolute')
        .style('left', 0)
        .style('overflow', 'visible')
        .style('shape-rendering', 'crispEdges')
        .style('pointer-events', 'none')
        .call(enterSvgDefs);

    parcoordsControlOverlay
        .attr('width', function(d) {return d.model.width + d.model.pad.l + d.model.pad.r;})
        .attr('height', function(d) {return d.model.height + d.model.pad.t + d.model.pad.b;})
        .attr('transform', function(d, i) {
            var translateY = i * (d.model.height + d.model.pad.t + d.model.pad.b);
            return 'translate(0,' + translateY + ')';
        });

    var parcoordsControlView = parcoordsControlOverlay.selectAll('.parcoordsControlView')
        .data(repeat, keyFun);

    parcoordsControlView.enter()
        .append('g')
        .classed('parcoordsControlView', true)
        .style('box-sizing', 'content-box');

    parcoordsControlView
        .attr('transform', function(d) {return 'translate(' + d.model.pad.l + ',' + d.model.pad.t + ')';});

    var yAxis = parcoordsControlView.selectAll('.yAxis')
        .data(function(vm) {return vm.dimensions;}, keyFun);

    function someFiltersActive(view) {
        return view.dimensions.some(function(p) {return p.filter[0] !== 0 || p.filter[1] !== 1;});
    }

    function updatePanelLayoutParcoords(yAxis, vm) {
        var panels = vm.panels || (vm.panels = []);
        var yAxes = yAxis.each(function(d) {return d;})[vm.key].map(function(e) {return e.__data__;});
        var panelCount = yAxes.length - 1;
        var rowCount = 1;
        for(var row = 0; row < rowCount; row++) {
            for(var p = 0; p < panelCount; p++) {
                var panel = panels[p + row * panelCount] || (panels[p + row * panelCount] = {});
                var dim1 = yAxes[p];
                var dim2 = yAxes[p + 1];
                panel.dim1 = dim1;
                panel.dim2 = dim2;
                panel.canvasX = dim1.canvasX;
                panel.panelSizeX = dim2.canvasX - dim1.canvasX;
                panel.panelSizeY = vm.model.canvasHeight / rowCount;
                panel.y = row * panel.panelSizeY;
                panel.canvasY = vm.model.canvasHeight - panel.y - panel.panelSizeY;
            }
        }
    }

    function updatePanelLayoutScatter(yAxis, vm) {
        var panels = vm.panels || (vm.panels = []);
        var yAxes = yAxis.each(function(d) {return d;})[vm.key].map(function(e) {return e.__data__;});
        var panelCount = yAxes.length - 1;
        var rowCount = panelCount;
        for(var row = 0; row < panelCount; row++) {
            for(var p = 0; p < panelCount; p++) {
                var panel = panels[p + row * panelCount] || (panels[p + row * panelCount] = {});
                var dim1 = yAxes[p];
                var dim2 = yAxes[p + 1];
                panel.dim1 = yAxes[row + 1];
                panel.dim2 = dim2;
                panel.canvasX = dim1.canvasX;
                panel.panelSizeX = dim2.canvasX - dim1.canvasX;
                panel.panelSizeY = vm.model.canvasHeight / rowCount;
                panel.y = row * panel.panelSizeY;
                panel.canvasY = vm.model.canvasHeight - panel.y - panel.panelSizeY;
            }
        }
    }

    function updatePanelLayout(yAxis, vm) {
        return (c.scatter ? updatePanelLayoutScatter : updatePanelLayoutParcoords)(yAxis, vm);
    }

    yAxis.enter()
        .append('g')
        .classed('yAxis', true)
        .each(function(d) {tweakables.dimensions.push(d);});

    parcoordsControlView.each(function(vm) {
        updatePanelLayout(yAxis, vm);
    });

    parcoordsLineLayer
        .each(function(d) {
            d.lineLayer = lineLayerMaker(this, d.model.lines, d.model.canvasWidth, d.model.canvasHeight, d.viewModel.dimensions, d.viewModel.panels, d.model.unitToColor, d.context, d.pick, c.scatter);
            d.viewModel[d.key] = d.lineLayer;
            tweakables.renderers.push(function() {d.lineLayer.render(d.viewModel.panels, true);});
            d.lineLayer.render(d.viewModel.panels, !d.context, d.context && !someFiltersActive(d.viewModel));
        });

    yAxis
        .attr('transform', function(d) {return 'translate(' + d.xScale(d.xIndex) + ', 0)';});

    yAxis
        .call(d3.behavior.drag()
            .origin(function(d) {return d;})
            .on('drag', function(d) {
                var p = d.parent;
                linePickActive = false;
                if(domainBrushing) {
                    return;
                }
                d.x = Math.max(-c.overdrag, Math.min(d.model.width + c.overdrag, d3.event.x));
                d.canvasX = d.x * d.model.canvasPixelRatio;
                yAxis
                    .sort(function(a, b) {return a.x - b.x;})
                    .each(function(dd, i) {
                        dd.xIndex = i;
                        dd.x = d === dd ? dd.x : dd.xScale(dd.xIndex);
                        dd.canvasX = dd.x * dd.model.canvasPixelRatio;
                    });

                updatePanelLayout(yAxis, p);

                yAxis.filter(function(dd) {return Math.abs(d.xIndex - dd.xIndex) !== 0;})
                    .attr('transform', function(d) {return 'translate(' + d.xScale(d.xIndex) + ', 0)';});
                d3.select(this).attr('transform', 'translate(' + d.x + ', 0)');
                yAxis.each(function(dd, i, ii) {if(ii === d.parent.key) p.dimensions[i] = dd;});
                p.contextLineLayer && p.contextLineLayer.render(p.panels, false, !someFiltersActive(p));
                p.focusLineLayer.render && p.focusLineLayer.render(p.panels);
            })
            .on('dragend', function(d) {
                var p = d.parent;
                if(domainBrushing) {
                    if(domainBrushing === 'ending') {
                        domainBrushing = false;
                    }
                    return;
                }
                d.x = d.xScale(d.xIndex);
                d.canvasX = d.x * d.model.canvasPixelRatio;
                updatePanelLayout(yAxis, p);
                d3.select(this)
                    .attr('transform', function(d) {return 'translate(' + d.x + ', 0)';});
                p.contextLineLayer && p.contextLineLayer.render(p.panels, false, !someFiltersActive(p));
                p.focusLineLayer && p.focusLineLayer.render(p.panels);
                p.pickLineLayer && p.pickLineLayer.render(p.panels, true);
                linePickActive = true;

                // Have updated order data on `gd.data` and raise `Plotly.restyle` event
                // without having to incur heavy UI blocking due to an actual `Plotly.restyle` call

                var orig = p.model._gdDimensionsOriginalOrder
                    .filter(function(d) {return d.visible === void(0) || d.visible;});
                function newIdx(dim) {
                    var origIndex = orig.indexOf(dim);
                    var currentIndex = p.dimensions.map(function(dd) {return dd.crossfilterDimensionIndex;}).indexOf(origIndex);
                    if(currentIndex === -1) {
                        // invisible dimensions go to the end, retaining their original order
                        currentIndex += orig.length;
                    }
                    return currentIndex;
                }
                d.model._gdDimensions.sort(function(d1, d2) {
                    var i1 = newIdx(d1);
                    var i2 = newIdx(d2);
                    return i1 - i2;
                });
                gd.emit('plotly_restyle');
            })
        );

    yAxis.exit()
        .remove();

    var axisOverlays = yAxis.selectAll('.axisOverlays')
        .data(repeat, keyFun);

    axisOverlays.enter()
        .append('g')
        .classed('axisOverlays', true);

    var axis = axisOverlays.selectAll('.axis')
        .data(repeat, keyFun);

    var axisEnter = axis.enter()
        .append('g')
        .classed('axis', true);

    axis
        .each(function(d) {
            var wantedTickCount = d.model.height / d.model.tickDistance;
            var scale = d.domainScale;
            var sdom = scale.domain();
            var texts = d.ticktext;
            d3.select(this)
                .call(d3.svg.axis()
                    .orient('left')
                    .tickSize(4)
                    .outerTickSize(2)
                    .ticks(wantedTickCount, '3s') // works for continuous scales only...
                    .tickValues(d.ordinal ? // and this works for ordinal scales
                        sdom.filter(function(d, i) {return !(i % Math.round((sdom.length / wantedTickCount)));})
                            .map(function(d, i) {return texts && texts[i] || d;}) :
                        null)
                    .scale(scale));
        });

    axisEnter
        .selectAll('.domain, .tick')
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-opacity', 0.25)
        .attr('stroke-width', '1px');

    axisEnter
        .selectAll('text')
        .style('font-family', 'monospace')
        .style('font-weight', 100)
        .style('font-size', 'x-small')
        .style('fill', 'black')
        .style('fill-opacity', 1)
        .style('stroke', 'none')
        .style('text-shadow', '1px 1px 1px #fff, -1px -1px 1px #fff, 1px -1px 1px #fff, -1px 1px 1px #fff')
        .style('cursor', 'default')
        .style('user-select', 'none');

    var axisHeading = axisOverlays.selectAll('.axisHeading')
        .data(repeat, keyFun);

    axisHeading.enter()
        .append('g')
        .classed('axisHeading', true);

    var axisTitle = axisHeading.selectAll('.axisTitle')
        .data(repeat, keyFun);

    axisTitle.enter()
        .append('text')
        .classed('axisTitle', true)
        .attr('text-anchor', 'middle')
        .style('font-family', 'sans-serif')
        .style('font-size', 'xx-small')
        .style('cursor', 'default')
        .style('user-select', 'none')
        .style('pointer-events', 'auto');

    axisTitle
        .attr('transform', 'translate(0,' + -(c.bar.handleheight + 20) + ')')
        .text(function(d) {return d.label;});

    var axisExtent = axisOverlays.selectAll('.axisExtent')
        .data(repeat, keyFun);

    axisExtent.enter()
        .append('g')
        .classed('axisExtent', true);

    var axisExtentTop = axisExtent.selectAll('.axisExtentTop')
        .data(repeat, keyFun);

    axisExtentTop.enter()
        .append('g')
        .classed('axisExtentTop', true);

    axisExtentTop
        .attr('transform', 'translate(' + 0 + ',' + -(c.bar.handleheight - 2) + ')');

    var axisExtentTopText = axisExtentTop.selectAll('.axisExtentTopText')
        .data(repeat, keyFun);

    function formatExtreme(d) {
        return d.ordinal ? d3.format('.0s') : d3.format('.3s');
    }

    axisExtentTopText.enter()
        .append('text')
        .classed('axisExtentTopText', true)
        .attr('alignment-baseline', 'after-edge')
        .call(styleExtentTexts);

    axisExtentTopText
        .text(function(d) {return formatExtreme(d)(d.domainScale.domain().slice(-1)[0]);});

    var axisExtentBottom = axisExtent.selectAll('.axisExtentBottom')
        .data(repeat, keyFun);

    axisExtentBottom.enter()
        .append('g')
        .classed('axisExtentBottom', true);

    axisExtentBottom
        .attr('transform', function(d) {return 'translate(' + 0 + ',' + (d.model.height + c.bar.handleheight - 2) + ')';});

    var axisExtentBottomText = axisExtentBottom.selectAll('.axisExtentBottomText')
        .data(repeat, keyFun);

    axisExtentBottomText.enter()
        .append('text')
        .classed('axisExtentBottomText', true)
        .attr('alignment-baseline', 'before-edge')
        .call(styleExtentTexts);

    axisExtentBottomText
        .text(function(d) {return formatExtreme(d)(d.domainScale.domain()[0]);});

    var axisBrush = axisOverlays.selectAll('.axisBrush')
        .data(repeat, keyFun);

    var axisBrushEnter = axisBrush.enter()
        .append('g')
        .classed('axisBrush', true);

    axisBrush
        .each(function(d) {
            if(!d.brush) {
                d.brush = d3.svg.brush()
                    .y(d.unitScale)
                    .on('brushstart', axisBrushStarted)
                    .on('brush', axisBrushMoved)
                    .on('brushend', axisBrushEnded);
                if(d.filter[0] !== 0 || d.filter[1] !== 1) {
                    d.brush.extent(d.filter);
                }
                d3.select(this).call(d.brush);
            }
        });

    axisBrushEnter
        .selectAll('rect')
        .attr('x', -c.bar.capturewidth / 2)
        .attr('width', c.bar.capturewidth);

    axisBrushEnter
        .selectAll('rect.extent')
        .attr('fill', 'url(#filterBarPattern)')
        .filter(function(d) {return d.filter[0] === 0 && d.filter[1] === 1;})
        .attr('y', -100); //  // zero-size rectangle pointer issue workaround

    axisBrushEnter
        .selectAll('.resize rect')
        .attr('height', c.bar.handleheight)
        .attr('opacity', 0)
        .style('visibility', 'visible');

    axisBrushEnter
        .selectAll('.resize.n rect')
        .attr('y', c.bar.handleoverlap - c.bar.handleheight);

    axisBrushEnter
        .selectAll('.resize.s rect')
        .attr('y', c.bar.handleoverlap);

    var justStarted = false;
    var contextShown = false;

    function axisBrushStarted() {
        justStarted = true;
        domainBrushing = true;
    }

    function axisBrushMoved(dimension) {
        linePickActive = false;
        var p = dimension.parent;
        var extent = dimension.brush.extent();
        var dimensions = p.dimensions;
        var filter = dimensions[dimension.xIndex].filter;
        var reset = justStarted && (extent[0] === extent[1]);
        if(reset) {
            dimension.brush.clear();
            d3.select(this).select('rect.extent').attr('y', -100); // zero-size rectangle pointer issue workaround
        }
        var newExtent = reset ? [0, 1] : extent.slice();
        if(newExtent[0] !== filter[0] || newExtent[1] !== filter[1]) {
            dimensions[dimension.xIndex].filter = newExtent;
            p.focusLineLayer && p.focusLineLayer.render(p.panels, true);
            var filtersActive = someFiltersActive(p);
            if(!contextShown && filtersActive) {
                p.contextLineLayer && p.contextLineLayer.render(p.panels, true);
                contextShown = true;
            } else if(contextShown && !filtersActive) {
                p.contextLineLayer && p.contextLineLayer.render(p.panels, true, true);
                contextShown = false;
            }
        }
        justStarted = false;
    }

    function axisBrushEnded(dimension) {
        var p = dimension.parent;
        var extent = dimension.brush.extent();
        var empty = extent[0] === extent[1];
        var dimensions = p.dimensions;
        var f = dimensions[dimension.xIndex].filter;
        if(!empty && dimension.ordinal) {
            f[0] = ordinalScaleSnap(dimension.ordinalScale, f[0]);
            f[1] = ordinalScaleSnap(dimension.ordinalScale, f[1]);
            if(f[0] === f[1]) {
                f[0] = Math.max(0, f[0] - 0.05);
                f[1] = Math.min(1, f[1] + 0.05);
            }
            d3.select(this).transition().duration(150).call(dimension.brush.extent(f));
            p.focusLineLayer.render(p.panels, true);
        }
        p.pickLineLayer && p.pickLineLayer.render(p.panels, true);
        linePickActive = true;
        domainBrushing = 'ending';
        if(callbacks && callbacks.filterChanged) {
            var invScale = dimension.domainToUnitScale.invert;

            // update gd.data as if a Plotly.restyle were fired
            var gdDimension = p.model._gdDimensionsOriginalOrder[dimension.crossfilterDimensionIndex];
            var gdConstraintRange = gdDimension.constraintrange;
            if(!gdConstraintRange || gdConstraintRange.length !== 2) {
                gdConstraintRange = gdDimension.constraintrange = [];
            }
            gdConstraintRange[0] = invScale(f[0]);
            gdConstraintRange[1] = invScale(f[1]);
            callbacks.filterChanged();
        }
    }

    return tweakables;
};
