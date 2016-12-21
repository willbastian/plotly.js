/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var lineLayerMaker = require('./lines');
var Lib = require('../../lib');
var d3 = require('d3');

var overdrag = 40;
var legendWidth = 80;
var integerPadding = 0;
var verticalPadding = 2; // otherwise, horizontal lines on top or bottom are of lower width

var filterBar = {
    width: 4, // Visible width of the filter bar
    capturewidth: 20, // Mouse-sensitive width for interaction (Fitts law)
    fillcolor: 'magenta', // Color of the filter bar fill
    fillopacity: 1, // Filter bar fill opacity
    strokecolor: 'white', // Color of the filter bar side lines
    strokeopacity: 1, // Filter bar side stroke opacity
    strokewidth: 1, // Filter bar side stroke width in pixels
    handleheight: 16, // Height of the filter bar vertical resize areas on top and bottom
    handleopacity: 1, // Opacity of the filter bar vertical resize areas on top and bottom
    handleoverlap: 0 // A larger than 0 value causes overlaps with the filter bar, represented as pixels.'
};

function keyFun(d) {return d.key;}

function repeat(d) {return [d];}

function visible(dimension) {return !('visible' in dimension) || dimension.visible;}

function dimensionExtent(dimension) {

    var lo = dimension.range ? dimension.range[0] : d3.min(dimension.values);
    var hi = dimension.range ? dimension.range[1] : d3.max(dimension.values);

    // avoid a degenerate (zero-width) domain
    if(lo === hi) {
        if(lo === 0) {
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

function domainScale(height, padding, integerPadding, dimension) {
    var extent = dimensionExtent(dimension);
    return dimension.integer ?
        d3.scale.ordinal()
            .domain(d3.range(Math.round(extent[0]), Math.round(extent[1] + 1)))
            .rangePoints([height - padding, padding], integerPadding) :
        d3.scale.linear()
            .domain(extent)
            .range([height - padding, padding]);
}

function unitScale(height, padding) {return d3.scale.linear().range([height - padding, padding]);}
function domainToUnitScale(dimension) {return d3.scale.linear().domain(dimensionExtent(dimension));}

function integerScale(integerPadding, dimension) {
    var extent = dimensionExtent(dimension);
    return dimension.integer && d3.scale.ordinal()
            .domain(d3.range(0, Math.round(extent[1] + 1) - Math.round(extent[0]))
                .map(function(d, _, a) {return d / (a.length - 1);}))
            .rangePoints([0, 1], integerPadding);
}

function model(layout, d, i) {

    var canvasPixelRatio = d.lines.pixelratio;

    var lines = Lib.extendDeep(d.lines, {
        color: d.line.color.map(domainToUnitScale({values: d.line.color})),
        blockLineCount: d.blocklinecount,
        canvasOverdrag: overdrag * canvasPixelRatio
    });

    var layoutWidth = layout.width * (d.domain.x[1] - d.domain.x[0]);
    var layoutHeight = layout.height * (d.domain.y[1] - d.domain.y[0]);

    var padding = d.padding || 80;
    var width = layoutWidth - 2 * padding - legendWidth; // leavig room for the colorbar
    var height = layoutHeight - 2 * padding;

    return {
        key: i,
        dimensions: d.dimensions,
        tickDistance: d.tickdistance,
        unitToColor: d.unitToColor,
        lines: lines,
        translateX: (d.domain.x[0] || 0) * layout.width,
        translateY: (d.domain.y[0] || 0) * layout.height,
        padding: padding,
        canvasWidth: width * canvasPixelRatio + 2 * lines.canvasOverdrag,
        canvasHeight: height * canvasPixelRatio,
        width: width,
        height: height,
        canvasPixelRatio: canvasPixelRatio
    };
}

function viewModel(model) {

    var lines = model.lines;
    var width = model.width;
    var height = model.height;
    var dimensions = model.dimensions;
    var canvasPixelRatio = model.canvasPixelRatio;

    var xScale = d3.scale.ordinal().domain(d3.range(dimensions.filter(visible).length)).rangePoints([0, width], 0);

    var unitPad = verticalPadding / (height * canvasPixelRatio);
    var unitPadScale = (1 - 2 * unitPad);
    var paddedUnitScale = function(d) {return unitPad + unitPadScale * d;};

    var viewModel = {
        key: model.key,
        xScale: xScale,
        model: model
    };

    viewModel.panels = dimensions.filter(visible).map(function(dimension, i) {
        var domainToUnit = domainToUnitScale(dimension);
        return {
            key: dimension.id || dimension.label,
            label: dimension.label,
            integer: dimension.integer,
            scatter: dimension.scatter,
            xIndex: i,
            originalXIndex: i,
            height: height,
            values: dimension.values,
            paddedUnitValues: dimension.values.map(domainToUnit).map(paddedUnitScale),
            xScale: xScale,
            x: xScale(i),
            canvasX: xScale(i) * canvasPixelRatio,
            unitScale: unitScale(height, verticalPadding),
            domainScale: domainScale(height, verticalPadding, integerPadding, dimension),
            integerScale: integerScale(lines.integerpadding, dimension),
            domainToUnitScale: domainToUnit,
            pieChartCheat: dimension.pieChartCheat,
            filter: dimension.constraintrange ? dimension.constraintrange.map(domainToUnit) : [0, 1],
            parent: viewModel,
            model: model
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

module.exports = function(root, styledData, layout, callbacks) {

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
            .attr('width', filterBar.capturewidth)
            .attr('height', function(d) {return d.model.height;})
            .attr('x', -filterBar.width)
            .attr('patternUnits', 'userSpaceOnUse');

        var filterBarPatternGlyph = filterBarPattern.selectAll('rect')
            .data(repeat, keyFun);

        filterBarPatternGlyph.enter()
            .append('rect')
            .attr('shape-rendering', 'crispEdges')
            .attr('width', filterBar.width)
            .attr('height', function(d) {return d.model.height;})
            .attr('x', filterBar.width / 2)
            .attr('fill', filterBar.fillcolor)
            .attr('fill-opacity', filterBar.fillopacity)
            .attr('stroke', filterBar.strokecolor)
            .attr('stroke-opacity', filterBar.strokeopacity)
            .attr('stroke-width', filterBar.strokewidth);
    }

    var parcoordsModel = d3.select(root).selectAll('.parcoordsModel')
        .data(styledData.map(model.bind(0, layout)), keyFun);

    parcoordsModel.enter()
        .append('div')
        .style('position', 'relative')
        .classed('parcoordsModel', true);

    var parcoordsViewModel = parcoordsModel.selectAll('.parcoordsViewModel')
        .data(viewModel, keyFun);

    parcoordsViewModel.enter()
        .append('div')
        .classed('parcoordsViewModel', true)
        .style('transform', function(d) {return 'translate(' + d.model.translateX + 'px,' + d.model.translateY + 'px)';});

    var parcoordsLineLayer = parcoordsViewModel.selectAll('.parcoordsLineLayer')
        .data(function(vm) {
            return [true, false].map(function(context) {
                return {
                    key: context ? 'contextLineLayer' : 'focusLineLayer',
                    context: context,
                    viewModel: vm,
                    model: vm.model
                };
            });
        }, keyFun);

    var tweakables = {renderers: [], dimensions: []};

    parcoordsLineLayer.enter()
        .append('canvas')
        .classed('parcoordsLineLayer', true)
        .style('transform', 'translate(' + (-overdrag) + 'px, 0)')
        .style('float', 'left')
        .style('clear', 'both')
        .style('left', 0)
        .style('overflow', 'visible')
        .style('position', function(d, i) {return i > 0 ? 'absolute' : 'static';});

    parcoordsLineLayer
        .style('padding', function(d) {return d.viewModel.model.padding + 'px';})
        .attr('width', function(d) {return d.viewModel.model.canvasWidth;})
        .attr('height', function(d) {return d.viewModel.model.canvasHeight;})
        .style('width', function(d) {return (d.viewModel.model.width + 2 * overdrag) + 'px';})
        .style('height', function(d) {return d.viewModel.model.height + 'px';})
        .each(function(d) {
            d.lineLayer = lineLayerMaker(this, d.model.lines, d.model.canvasWidth, d.model.canvasHeight, d.viewModel.panels, d.model.unitToColor, d.context);
            d.viewModel[d.key] = d.lineLayer;
            tweakables.renderers.push(function() {d.lineLayer.render(d.viewModel.panels, true);});
            d.lineLayer.render(d.viewModel.panels, !d.context, d.context && !someFiltersActive(d.viewModel));
        });

    var parcoordsControlOverlay = parcoordsViewModel.selectAll('.parcoordsControlOverlay')
        .data(repeat, keyFun);

    parcoordsControlOverlay.enter()
        .append('svg')
        .classed('parcoordsControlOverlay', true)
        .attr('overflow', 'visible')
        .attr('width', function(d) {return d.model.width + 2 * d.model.padding;})
        .attr('height', function(d) {return d.model.height + 2 * d.model.padding;})
        .style('position', 'absolute')
        .style('left', 0)
        .style('overflow', 'visible')
        .style('shape-rendering', 'crispEdges')
        .call(enterSvgDefs);

    var parcoordsControlView = parcoordsControlOverlay.selectAll('.parcoordsControlView')
        .data(repeat, keyFun);

    parcoordsControlView.enter()
        .append('g')
        .attr('transform', function(d) {return 'translate(' + d.model.padding + ',' + d.model.padding + ')';})
        .classed('parcoordsControlView', true);

    var clearFix = parcoordsViewModel.selectAll('.clearFix')
        .data(repeat, keyFun);

    clearFix.enter()
        .append('br')
        .classed('clearFix', true)
        .style('clear', 'both');

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
                d.x = Math.max(-overdrag, Math.min(d.model.width + overdrag, d3.event.x));
                d.canvasX = d.x * d.model.canvasPixelRatio;
                panel
                    .sort(function(a, b) {return a.x - b.x;})
                    .each(function(dd, i) {
                        dd.xIndex = i;
                        dd.x = d === dd ? dd.x : dd.xScale(dd.xIndex);
                        dd.canvasX = dd.x * dd.model.canvasPixelRatio;
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
                d.canvasX = d.x * d.model.canvasPixelRatio;
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
            var wantedTickCount = d.model.height / d.model.tickDistance;
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
        .attr('transform', 'translate(0,' + -(filterBar.handleheight + 20) + ')')
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
        .attr('transform', 'translate(' + 0 + ',' + -(filterBar.handleheight - 2) + ')');

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
        .attr('transform', function(d) {return 'translate(' + 0 + ',' + (d.model.height + filterBar.handleheight - 2) + ')';});

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
                d3.select(this).call(d.brush).call(d.brush.event);
            }
        });

    axisBrushEnter
        .selectAll('rect')
        .attr('x', -filterBar.capturewidth / 2)
        .attr('width', filterBar.capturewidth);

    axisBrushEnter
        .selectAll('rect.extent')
        .attr('fill', 'url(#filterBarPattern)')
        .filter(function(d) {return d.filter[0] === 0 && d.filter[1] === 1;})
        .attr('y', -100); //  // zero-size rectangle pointer issue workaround

    axisBrushEnter
        .selectAll('.resize rect')
        .attr('height', filterBar.handleheight)
        .attr('opacity', 0)
        .style('visibility', 'visible');

    axisBrushEnter
        .selectAll('.resize.n rect')
        .attr('y', filterBar.handleoverlap - filterBar.handleheight);

    axisBrushEnter
        .selectAll('.resize.s rect')
        .attr('y', filterBar.handleoverlap);

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
        var panels = dimension.parent.panels;
        var f = panels[dimension.xIndex].filter;
        if(!empty && dimension.integer) {
            f[0] = ordinalScaleSnap(dimension.integerScale, f[0]);
            f[1] = ordinalScaleSnap(dimension.integerScale, f[1]);
            if(f[0] === f[1]) {
                f[0] = Math.max(0, f[0] - 0.05);
                f[1] = Math.min(1, f[1] + 0.05);
            }
            d3.select(this).transition().duration(150).call(dimension.brush.extent(f));
            dimension.parent.focusLineLayer.render(panels, true);
        }
        domainBrushing = false;
        if(callbacks && callbacks.filterChangedCallback) {
            callbacks.filterChangedCallback({
                changedDimension: {
                    key: dimension.key,
                    label: dimension.label,
                    domainFilter: f.map(dimension.domainToUnitScale.invert),
                    fullDomain: f[0] === 0 && f[1] === 1
                },
                allDimensions: panels.map(function(p) {
                    return {
                        key: p.key,
                        label: p.label,
                        domainFilter: p.filter.map(p.domainToUnitScale.invert),
                        fullDomain: p.filter[0] === 0 && p.filter[1] === 1
                    };
                })
            });
        }
    }

    return tweakables;
};
