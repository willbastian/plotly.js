/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var lineLayerMaker = require('./lines');
var utils = require('./utils');
var Lib = require('../../lib');
var d3 = require('d3');

function keyFun(d) {
    return d.key;
}

function repeat(d) {
    return [d];
}

function makeDomainScale(height, padding, integerPadding, dimension) {
    var lo = d3.min(dimension.values);
    var hi = d3.max(dimension.values);
    // convert a zero-domain to a proper domain
    if(!dimension.integer && lo === hi) {
        lo *= 0.9;
        hi *= 1.1;
    }
    return dimension.integer ?
        d3.scale.ordinal()
        .domain(d3.range(Math.round(lo), Math.round(hi + 1)))
        .rangePoints([height - padding, padding], integerPadding) :
        d3.scale.linear()
        .domain([lo, hi])
        .range([height - padding, padding]);
}

function makeUnitScale(height, padding) {
    return d3.scale.linear()
        .range([height - padding, padding]);
}

function makeIntegerScale(integerPadding, dimension) {
    return dimension.integer && d3.scale.ordinal()
            .domain(
                d3.range(0, Math.round(d3.max(dimension.values) + 1) - Math.round(d3.min(dimension.values)))
                    .map(function(d, _, a) {return d / (a.length - 1);})
            )
            .rangePoints([0, 1], integerPadding);
}

function makeDomainToUnitScale(values) {
    var extent = d3.extent(values);
    if(extent[0] === extent[1]) {
        extent[0]--;
        extent[1]++;
    }
    var a = 1 / (extent[1] - extent[0]);
    var b = -a * extent[0];
    return function(x) {return a * x + b;};
}

function viewModel(lines, width, height, model) {

    var xScale = d3.scale.ordinal().domain(d3.range(model.dimensions.length)).rangePoints([0, width], 0);

    var viewModel = {
        key: model.key,
        xScale: xScale
    };

    viewModel.panels = model.dimensions.map(function(dimension, i) {
        return {
            key: dimension.id || (dimension.label + ' ' + Math.floor(1e6 * Math.random())),
            label: dimension.label,
            integer: dimension.integer,
            scatter: dimension.scatter,
            xIndex: i,
            originalXIndex: i,
            height: height,
            values: dimension.values,
            xScale: xScale,
            x: xScale(i),
            unitScale: makeUnitScale(height, lines.verticalpadding),
            domainScale: makeDomainScale(height, lines.verticalpadding, lines.integerpadding, dimension),
            integerScale: makeIntegerScale(lines.integerpadding, dimension),
            domainToUnitScale: makeDomainToUnitScale(dimension.values),
            pieChartCheat: dimension.pieChartCheat,
            filter: [0, 1], // dimension.filter || (dimension.filter = [0, 1]),
            // one more problem: context lines get stuck
            parent: viewModel
        };
    });

    return [viewModel];
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

module.exports = function(root, styledData, layout) {

    var unitToColor = styledData.unitToColor;

    var data = styledData.dimensions;
    var tickDistance = styledData.tickdistance;
    var coloringDomainToUnitScale = makeDomainToUnitScale(styledData.line.color);
    var overdrag = 40;
    var lines = Lib.extendDeep(styledData.lines, {
        color: styledData.line.color.map(coloringDomainToUnitScale),
        overdrag: overdrag
    });

    var layoutWidth = layout.width * (styledData.domain.x[1] - styledData.domain.x[0]);
    var layoutHeight = layout.height * (styledData.domain.y[1] - styledData.domain.y[0]);

    var legendWidth = 80;
    var padding = styledData.padding || 80;
    var translateX = (styledData.domain.x[0] || 0) * layout.width;
    var translateY = (styledData.domain.y[0] || 0) * layout.height;
    var width = layoutWidth - 2 * padding - legendWidth; // leavig room for the colorbar
    var height = layoutHeight - 2 * padding;

    var canvasPixelRatio = lines.pixelratio;
    var canvasWidth = (width + 2 * overdrag) * canvasPixelRatio;
    var canvasHeight = height * canvasPixelRatio;

    var resizeHeight = styledData.filterbar.handleheight;
    var brushVisibleWidth = styledData.filterbar.width;
    var brushCaptureWidth = styledData.filterbar.capturewidth || Math.min(32, brushVisibleWidth + 16);

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
            .attr('width', brushCaptureWidth)
            .attr('height', height)
            .attr('x', -brushVisibleWidth)
            .attr('patternUnits', 'userSpaceOnUse');

        var filterBarPatternGlyph = filterBarPattern.selectAll('rect')
            .data(repeat, keyFun);

        filterBarPatternGlyph.enter()
            .append('rect')
            .attr('shape-rendering', 'crispEdges')
            .attr('width', brushVisibleWidth)
            .attr('height', height)
            .attr('x', brushVisibleWidth / 2)
            .attr('fill', styledData.filterbar.fillcolor)
            .attr('fill-opacity', styledData.filterbar.fillopacity)
            .attr('stroke', styledData.filterbar.strokecolor)
            .attr('stroke-opacity', styledData.filterbar.strokeopacity)
            .attr('stroke-width', styledData.filterbar.strokewidth);
    }

    var lastApproached = null;

    var parcoordsModel = d3.select(root).selectAll('.parcoordsModel')
        .data([{key: 0, dimensions: data}], keyFun);

    parcoordsModel.enter()
        .append('div')
        .classed('parcoordsModel', true);

    var parcoordsViewModel = parcoordsModel.selectAll('.parcoordsViewModel')
        .data(viewModel.bind(0, lines, width, height), keyFun);

    parcoordsViewModel.enter()
        .append('div')
        .classed('parcoordsViewModel', true)
        .style('transform', 'translate(' + translateX + 'px,' + translateY + 'px)');

    var parcoordsLineLayer = parcoordsViewModel.selectAll('.parcoordsLineLayer')
        .data(function(vm) {
            return [true, false].map(function(context) {
                return {
                    key: context ? 'contextLineLayer' : 'focusLineLayer',
                    context: context,
                    viewModel: vm
                };
            });
        }, keyFun);

    parcoordsLineLayer.enter()
        .append('canvas')
        .classed('parcoordsLineLayer', true)
        .style('transform', 'translate(' + (-overdrag) + 'px, 0)')
        .style('position', 'absolute')
        .style('padding', padding + 'px')
        .style('overflow', 'visible')
        .attr('width', canvasWidth)
        .attr('height', canvasHeight)
        .style('width', (width + 2 * overdrag) + 'px')
        .style('height', height + 'px');

    var tweakables = {renderers: [], dimensions: []};

    parcoordsLineLayer
        .each(function(d) {
            var lineLayer = lineLayerMaker(this, lines, canvasWidth, canvasHeight, d.viewModel.panels, unitToColor, d.context);
            d.viewModel[d.key] = lineLayer;
            tweakables.renderers.push(function() {lineLayer.render(d.viewModel.panels, true);});
            lineLayer.render(d.viewModel.panels, !d.context, d.context && !someFiltersActive(d.viewModel));
        });

    var parcoordsControlOverlay = parcoordsViewModel.selectAll('.parcoordsControlOverlay')
        .data(repeat, keyFun);

    parcoordsControlOverlay.enter()
        .append('svg')
        .classed('parcoordsControlOverlay', true)
        .attr('overflow', 'visible')
        .attr('width', width + 2 * padding)
        .attr('height', height + 2 * padding)
        .style('position', 'absolute')
        .style('overflow', 'visible')
        .style('shape-rendering', 'crispEdges')
        .call(enterSvgDefs);

    var parcoordsControlView = parcoordsControlOverlay.selectAll('.parcoordsControlView')
        .data(repeat, keyFun);

    parcoordsControlView.enter()
        .append('g')
        .attr('transform', 'translate(' + padding + ',' + padding + ')')
        .classed('parcoordsControlView', true);

    var panel = parcoordsControlView.selectAll('.panel')
        .data(function(vm) {return vm.panels;}, keyFun);

    var domainBrushing = false;

    function someFiltersActive(view) {
        return view.panels.some(function(p) {return p.filter[0] !== 0 || p.filter[1] !== 1;});
    }

    panel.enter()
        .append('g')
        .classed('panel', true)
        .each(function(d) {tweakables.dimensions.push(d);});

    panel
        .attr('transform', function(d) {return 'translate(' + d.xScale(d.xIndex) + ', 0)';});

    panel
        .call(d3.behavior.drag()
            .origin(function(d) {return d;})
            .on('drag', function(d) {
                if(domainBrushing) {
                    return;
                }
                d.x = Math.max(-overdrag, Math.min(width + overdrag, d3.event.x));
                panel
                    .sort(function(a, b) {return a.x - b.x;})
                    .each(function(dd, i) {
                        dd.xIndex = i;
                        dd.x = d === dd ? dd.x : dd.xScale(dd.xIndex);
                    });
                panel.filter(function(dd) {return Math.abs(d.xIndex - dd.xIndex) !== 0;})
                    .attr('transform', function(d) {return 'translate(' + d.xScale(d.xIndex) + ', 0)';});
                d3.select(this).attr('transform', 'translate(' + d.x + ', 0)');
                panel.each(function(d, i) {d.parent.panels[i] = d;});
                d.parent.contextLineLayer.render(d.parent.panels, false, !someFiltersActive(d.parent));
                d.parent.focusLineLayer.render(d.parent.panels);
            })
            .on('dragend', function(d) {
                if(domainBrushing) {
                    return;
                }
                d.x = d.xScale(d.xIndex);
                d3.select(this)
                    .attr('transform', function(d) {return 'translate(' + d.x + ', 0)';});
                d.parent.contextLineLayer.render(d.parent.panels, false, !someFiltersActive(d.parent));
                d.parent.focusLineLayer.render(d.parent.panels);
            })
        );

    panel.exit()
        .remove();

    var axisOverlays = panel.selectAll('.axisOverlays')
        .data(repeat, keyFun);

    axisOverlays.enter()
        .append('g')
        .classed('axisOverlays', true);

    var axis = axisOverlays.selectAll('.axis')
        .data(repeat, keyFun);

    var axisEnter = axis.enter()
        .append('g')
        .classed('axis', true)
        .each(function(d) {
            var wantedTickCount = height / tickDistance;
            var scale = d.domainScale;
            var dom = scale.domain();
            d3.select(this)
                .call(d3.svg.axis()
                    .orient('left')
                    .tickSize(4)
                    .outerTickSize(2)
                    .ticks(wantedTickCount, '3s') // works for continuous scales only...
                    .tickValues(d.integer ? // and this works for ordinal scales
                        dom.filter(function(d, i) {return !(i % Math.round((dom.length / wantedTickCount)));}) :
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
        .attr('transform', 'translate(0,' + -(styledData.filterbar.handleheight + 20) + ')')
        .text(function(d) {return d.label;})
        .attr('text-anchor', 'middle')
        .style('font-family', 'sans-serif')
        .style('font-size', 'xx-small')
        .style('cursor', 'default')
        .style('user-select', 'none');

    var axisExtent = axisOverlays.selectAll('.axisExtent')
        .data(repeat, keyFun);

    axisExtent.enter()
        .append('g')
        .classed('axisExtent', true);

    var axisExtentTop = axisExtent.selectAll('.axisExtentTop')
        .data(repeat, keyFun);

    axisExtentTop.enter()
        .append('g')
        .classed('axisExtentTop', true)
        .attr('transform', 'translate(' + 0 + ',' + -(styledData.filterbar.handleheight - 2) + ')');

    var axisExtentTopText = axisExtentTop.selectAll('.axisExtentTopText')
        .data(repeat, keyFun);

    function formatExtreme(d) {
        return d.integer ? d3.format('.0s') : d3.format('.3s');
    }

    axisExtentTopText.enter()
        .append('text')
        .classed('axisExtentTopText', true)
        .text(function(d) {return formatExtreme(d)(d.domainScale.domain().slice(-1)[0]);})
        .attr('alignment-baseline', 'after-edge')
        .call(styleExtentTexts);

    var axisExtentBottom = axisExtent.selectAll('.axisExtentBottom')
        .data(repeat, keyFun);

    axisExtentBottom.enter()
        .append('g')
        .classed('axisExtentBottom', true)
        .attr('transform', 'translate(' + 0 + ',' + (height + styledData.filterbar.handleheight - 2) + ')');

    var axisExtentBottomText = axisExtentBottom.selectAll('.axisExtentBottomText')
        .data(repeat, keyFun);

    axisExtentBottomText.enter()
        .append('text')
        .classed('axisExtentBottomText', true)
        .text(function(d) {return formatExtreme(d)(d.domainScale.domain()[0]);})
        .attr('alignment-baseline', 'before-edge')
        .call(styleExtentTexts);

    var axisBrush = axisOverlays.selectAll('.axisBrush')
        .data(repeat, keyFun);

    var axisBrushEnter = axisBrush.enter()
        .append('g')
        .classed('axisBrush', true)
        .on('mouseenter', function approach(dimension) {
            if(dimension !== lastApproached) {
                dimension.parent.focusLineLayer.approach(dimension);
                lastApproached = dimension;
            }
        });

    axisBrush
        .each(function(d) {
            if(!d.brush) {
                d.brush = d3.svg.brush()
                    .y(d.unitScale)
                    .on('brushstart', axisBrushStarted)
                    .on('brush', axisBrushMoved)
                    .on('brushend', axisBrushEnded);
                d3.select(this).call(d.brush);
            }
        });

    axisBrushEnter
        .selectAll('rect')
        .attr('x', -brushCaptureWidth / 2)
        .attr('width', brushCaptureWidth);

    axisBrushEnter
        .selectAll('rect.extent')
        .attr('fill', 'url(#filterBarPattern)')
        .attr('y', -100); //  // zero-size rectangle pointer issue workaround

    axisBrushEnter
        .selectAll('.resize rect')
        .attr('height', resizeHeight)
        .attr('opacity', 0)
        .style('visibility', 'visible');

    axisBrushEnter
        .selectAll('.resize.n rect')
        .attr('y', -resizeHeight + styledData.filterbar.handleoverlap);

    axisBrushEnter
        .selectAll('.resize.s rect')
        .attr('y', -styledData.filterbar.handleoverlap);

    var justStarted = false;
    var contextShown = false;

    function axisBrushStarted() {
        justStarted = true;
        domainBrushing = true;
    }

    function axisBrushMoved(dimension) {
        var extent = dimension.brush.extent();
        var panels = dimension.parent.panels;
        var filter = panels[dimension.xIndex].filter;
        var reset = justStarted && (extent[0] === extent[1]);
        if(reset) {
            dimension.brush.clear();
            d3.select(this).select('rect.extent').attr('y', -100); // zero-size rectangle pointer issue workaround
        }
        var newExtent = reset ? [0, 1] : extent.slice();
        if(newExtent[0] !== filter[0] || newExtent[1] !== filter[1]) {
/*          // the 1st dimension is special: brushing on it changes the color projection
            if(dimension.originalXIndex === 0) {
                dimension.parent['focusLineLayer'].setColorDomain(newExtent);
            }
*/
            panels[dimension.xIndex].filter = newExtent;
            dimension.parent.focusLineLayer.render(panels, true);
            var filtersActive = someFiltersActive(dimension.parent);
            if(!contextShown && filtersActive) {
                dimension.parent.contextLineLayer.render(panels, true);
                contextShown = true;
            } else if(contextShown && !filtersActive) {
                dimension.parent.contextLineLayer.render(panels, true, true);
                contextShown = false;
            }
        }
        justStarted = false;
    }

    function axisBrushEnded(dimension) {
        var extent = dimension.brush.extent();
        var empty = extent[0] === extent[1];
        if(!empty && dimension.integer) {
            var panels = dimension.parent.panels;
            var f = panels[dimension.xIndex].filter;
            f[0] = utils.d3OrdinalScaleSnap(dimension.integerScale, f[0]);
            f[1] = utils.d3OrdinalScaleSnap(dimension.integerScale, f[1]);
            if(f[0] === f[1]) {
                f[0] = Math.max(0, f[0] - 0.05);
                f[1] = Math.min(1, f[1] + 0.05);
            }
            d3.select(this).transition().duration(150).call(dimension.brush.extent(f));
            dimension.parent.focusLineLayer.render(panels, true);
        }
        domainBrushing = false;
    }

    return tweakables;
};
