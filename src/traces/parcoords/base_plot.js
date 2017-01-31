/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Plots = require('../../plots/plots');
var Registry = require('../../registry');
var xmlnsNamespaces = require('../../constants/xmlns_namespaces');

exports.name = 'parcoords';

exports.attr = 'parcoords';

exports.idRoot = 'parcoords';

exports.idRegex = /^parcoords([2-9]|[1-9][0-9]+)?$/;

exports.attrRegex = /^parcoords([2-9]|[1-9][0-9]+)?$/;

exports.plot = function(gd) {
    var Parcoords = Registry.getModule('parcoords');
    var calcData = Plots.getSubplotCalcData(gd.calcdata, 'parcoords', void(0));

    if(calcData.length) Parcoords.plot(gd, calcData);
};

exports.clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    oldFullLayout._paperdiv.selectAll('.parcoords-line-layers').remove();
    oldFullLayout._paperdiv.selectAll('.parcoords-line-layers').remove();
    oldFullLayout._paperdiv.selectAll('.parcoords').remove();
    oldFullLayout._paperdiv.selectAll('.parcoords').remove();
};

exports.toSVG = function(gd) {

    function canvasToImage(canvas) {
        var rect = canvas.getBoundingClientRect();
        var bodyStyle = window.getComputedStyle(document.body, null);
        var canvasStyle = window.getComputedStyle(canvas, null);
        var canvasContentOriginX = parseFloat(canvasStyle.getPropertyValue('padding-left')) + rect.left;
        var canvasContentOriginY = parseFloat(canvasStyle.getPropertyValue('padding-top')) + rect.top;

        var imageData = canvas.toDataURL('image/png');
        var image = gd._fullLayout._glimages.append('svg:image');

        image.attr({
            xmlns: xmlnsNamespaces.svg,
            'xlink:href': imageData,
            x: canvasContentOriginX - parseFloat(bodyStyle.getPropertyValue('margin-left')),
            y: canvasContentOriginY - parseFloat(bodyStyle.getPropertyValue('margin-top')),
            width: parseFloat(canvasStyle.getPropertyValue('width')),
            height: parseFloat(canvasStyle.getPropertyValue('height'))
        });
    }

    var canvases = Array.prototype.slice.call(document.querySelectorAll('.parcoords-lines.context, .parcoords-lines.focus'));

/*
    var svgs = Array.prototype.slice.call(document.querySelectorAll('.main-svg'));
    document.querySelectorAll('.axisTitle')[0].setAttribute('text-anchor', 'begin');
    document.querySelectorAll('.axisTitle')[0].style['font-size'] = '16px';
    document.querySelectorAll('.axisTitle')[0].innerHTML = svgs.length;
    svgs.forEach(function(s) {
        //s.style.opacity = 0.1;
        //s.style.display = 'none'
        //s.parentElement.removeChild(s)
    })
*/

    canvases.forEach(canvasToImage);
};
